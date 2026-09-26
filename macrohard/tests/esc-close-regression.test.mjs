import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', loc: true });

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit));
    else if (v && typeof v.type === 'string') walk(v, visit);
  }
}

/*
 * The Esc-Close handler: the keydown LISTENER that checks `e.key === 'Escape'`.
 * Match on the argument, not on any enclosing function — otherwise the whole
 * IIFE matches, because it transitively contains that listener.
 */
function isEscapeCheck(node) {
  return (
    node.type === 'BinaryExpression' &&
    node.operator === '===' &&
    node.left.type === 'MemberExpression' &&
    node.left.property.name === 'key' &&
    node.right.type === 'Literal' &&
    node.right.value === 'Escape'
  );
}

/*
 * Collect listener functions in ONE traversal. A nested walk() inside the
 * traversal callback re-enters the same shared visitor state and silently
 * drops nodes, so pairing is done afterwards on the collected lists instead.
 */
const listenerCandidates = [];
const escapeNodes = [];
walk(ast, (node) => {
  if (isEscapeCheck(node)) escapeNodes.push(node);
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
    if (node.callee.property.name !== 'addEventListener') return;
    // arguments[0] is the EVENT NAME ('keydown', 'click', ...); the listener
    // function is arguments[1].
    const arg = node.arguments[1];
    if (arg && (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression')) {
      listenerCandidates.push(arg);
    }
  }
});

/* A listener is the Esc handler if an Escape check sits inside its body. */
const escHandlers = listenerCandidates.filter((fn) => {
  const hits = [];
  collectInto(fn.body, isEscapeCheck, hits);
  return hits.length > 0;
});

/* Non-reentrant collector: independent of walk(). */
function collectInto(node, predicate, out) {
  if (!node || typeof node.type !== 'string') return;
  if (predicate(node)) out.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => collectInto(c, predicate, out));
    else if (v && typeof v.type === 'string') collectInto(v, predicate, out);
  }
}

/*
 * Regression: `focused` holds an app id STRING (set as `focused = id` on every
 * window open, focus and taskbar click), but the Esc-Close branch did
 *   if (focused && focused._escClose) focused._escClose();
 * A string has no _escClose property, so Escape never closed a window.
 */
test('the Esc-Close handler exists and is reachable', () => {
  assert.ok(escHandlers.length > 0, 'an Escape keydown handler must exist');
});

/*
 * The one global Esc handler: it unwinds start menu -> task view -> help
 * overlay before touching windows. Other functions also test e.key === 'Escape'
 * (e.g. the notepad search overlay), so identify this one by its start-menu
 * branch rather than by the key check alone.
 */
function globalEscHandler() {
  const h = escHandlers.find((fn) => {
    // 'startMenu' is a string literal; taskViewOpen / helpOverlayOpen are
    // identifiers. Check for both forms.
    let hasMenu = false;
    walk(fn, (n) => {
      if (n.type === 'Literal' && n.value === 'startMenu') hasMenu = true;
      if (n.type === 'Identifier' && n.name === 'taskViewOpen') hasMenu = true;
      if (n.type === 'Identifier' && n.name === 'helpOverlayOpen') hasMenu = true;
    });
    return hasMenu;
  });
  assert.ok(h, 'the global Esc handler must be identifiable by its overlay branches');
  return h;
}

test('Esc-Close does not read properties off the focused id string', () => {
  const handler = globalEscHandler();

  // Any `focused.<prop>` read is the bug: `focused` is a string.
  const offenders = [];
  walk(handler, (n) => {
    if (
      n.type === 'MemberExpression' &&
      n.object.type === 'Identifier' &&
      n.object.name === 'focused' &&
      !(n.object === n.parent?.left && n.parent?.type === 'AssignmentExpression')
    ) {
      offenders.push({ line: n.loc.start.line, prop: n.property.name || '(computed)' });
    }
  });
  assert.deepEqual(
    offenders,
    [],
    `\`focused\` is an app id string; these property reads are always undefined: ${offenders
      .map((o) => `line ${o.line} -> focused.${o.prop}`)
      .join('; ')}`,
  );
});

test('Esc-Close clicks the real close button of the focused window', () => {
  // Driving the .wclose button (rather than removing the node directly) is
  // what runs interval cleanup and the per-app init-flag reset.
  // `.wclose` is looked up via querySelector('.wclose') — a string argument,
  // not a property name, so match either form.
  const handler = globalEscHandler();
  let hasWclose = false;
  walk(handler, (n) => {
    // the selector literal is '.wclose' (with the leading dot)
    if (n.type === 'Literal' && n.value === '.wclose') hasWclose = true;
    if (
      n.type === 'MemberExpression' &&
      n.property.type === 'Identifier' &&
      n.property.name === 'wclose'
    ) {
      hasWclose = true;
    }
  });
  assert.ok(
    hasWclose,
    'Esc-Close must close through the .wclose button so cleanup runs',
  );
  let clicks = 0;
  walk(handler, (n) => {
    if (
      n.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      n.callee.property.name === 'click'
    ) {
      clicks++;
    }
  });
  assert.ok(clicks >= 1, 'the Esc handler must actually click something');
});

test('Esc-Close has a topmost-window fallback', () => {
  // With nothing focused, Escape must still close something rather than
  // silently doing nothing.
  const handler = globalEscHandler();
  let comparesZ = false;
  walk(handler, (n) => {
    if (
      n.type === 'MemberExpression' &&
      n.property.name === 'zIndex' &&
      n.object.type === 'MemberExpression' &&
      n.object.property.name === 'style'
    ) {
      comparesZ = true;
    }
  });
  assert.ok(comparesZ, 'the fallback must compare window z-index to find the topmost');
});

test('the focused variable is assigned string ids, not elements', () => {
  // Documents the invariant the Esc fix relies on. If this ever changes, the
  // Esc handler above must be revisited.
  const kinds = new Set();
  walk(ast, (node) => {
    if (
      node.type === 'AssignmentExpression' &&
      node.left.type === 'Identifier' &&
      node.left.name === 'focused'
    ) {
      const r = node.right;
      if (r.type === 'Identifier') kinds.add('id:' + r.name);
      else if (r.type === 'Literal') kinds.add('literal:' + String(r.value));
      else if (r.type === 'MemberExpression') kinds.add('property');
      else kinds.add(r.type);
    }
  });
  const nonNull = [...kinds].filter((k) => k !== 'literal:null');
  assert.ok(nonNull.length > 0, 'focused must be assigned somewhere');
  for (const k of nonNull) {
    assert.ok(
      k.startsWith('id:') || k === 'property',
      `focused is assigned a ${k} — if it ever becomes a DOM node, ` +
        'the Esc handler must be re-checked',
    );
  }
});
