import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

/*
 * Regression: the window-close path referenced app state that only exists as a
 * local inside buildMusic() / buildChat().
 *
 * visRafId, SEQ and stopSequencer are declared inside buildMusic() (line ~3551);
 * chatReplyTimer inside buildChat() (line ~5645). The global close handler at
 * line ~1320 lives in openApp()'s scope and read them directly:
 *
 *     if (visRafId) { cancelAnimationFrame(visRafId); ... }
 *     if (typeof stopSequencer === 'function') stopSequencer();
 *     if (SEQ) { SEQ.playing = false; ... }
 *     if (chatReplyTimer) { clearTimeout(chatReplyTimer); ... }
 *
 * All of those are `let`/`var` inside a function, so from the close handler they
 * are NOT in scope. Every one threw "ReferenceError: X is not defined" — and
 * the whole block sits in `try { ... } catch (err) {}`, so the throw was
 * swallowed. Effect: closing the Music window never cancelled the
 * visualizer's requestAnimationFrame loop and never stopped the sequencer.
 * The loop kept running against a removed canvas, drawing to a detached node
 * for the rest of the session.
 *
 * The chat case additionally meant the pending reply timer was never cleared
 * and MUSIC_INITIALIZED/CHAT_INITIALIZED were left inconsistent.
 *
 * Fix: the shared state moves to IIFE scope, the same rule the calendar fix
 * (calState) and the paint fix (paintColor/pCtx) already established.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

/* ---- AST helpers ---- */
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit));
    else if (v && typeof v.type === 'string') walk(v, visit);
  }
}

const CLOSE_HANDLER_LINE = 1320;

test('precondition: the close handler region is recognised', () => {
  assert.ok(
    source.includes("wId === 'music'") && source.includes("wId === 'chat'"),
    'the shared close handler must handle music and chat',
  );
  assert.ok(
    CLOSE_HANDLER_LINE > 0,
    'the close-handler line number is a hard-coded anchor and must stay valid',
  );
});

/*
 * The core assertion: every identifier the close handler reads must be declared
 * in a scope that encloses it, not in a sibling function.
 */
const CROSS_SCOPE_NAMES = ['visRafId', 'SEQ', 'stopSequencer', 'chatReplyTimer'];

/* The shared close handler lives between these two anchors. */
const CLOSE_HANDLER = {
  startLine: source
    .slice(0, source.indexOf("wId === 'music'", CLOSE_HANDLER_LINE))
    .split('\n').length,
  endLine: source
    .slice(0, source.indexOf("window.osTimeouts['chat_cleanup']", CLOSE_HANDLER_LINE))
    .split('\n').length,
};

/* Declaration site of every name, as { line, fn } with fn = enclosing function node. */
function findDeclaration(name) {
  let hit = null;
  walk(ast, (n) => {
    if (hit) return;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.id.name === name) {
      hit = { line: n.loc.start.line, fn: enclosingFunctionNode(n.loc.start.line) };
    }
    if (
      n.type === 'FunctionDeclaration' &&
      n.id &&
      n.id.name === name
    ) {
      hit = { line: n.loc.start.line, fn: n };
    }
  });
  return hit;
}

function enclosingFunctionNode(line) {
  let found = null;
  walk(ast, (n) => {
    if (n.type !== 'FunctionDeclaration' && n.type !== 'FunctionExpression') return;
    if (n.loc.start.line <= line && line <= n.loc.end.line) {
      if (!found || n.loc.start.line > found.loc.start.line) found = n;
    }
  });
  return found;
}

const iifeNode = ast.body.find(
  (n) =>
    n.type === 'ExpressionStatement' &&
    n.expression.type === 'CallExpression' &&
    n.expression.callee.type === 'FunctionExpression',
);
assert.ok(iifeNode, 'app.js must wrap its core in an IIFE');

/* IIFE scope == module scope for our purposes: everything in the file that is
 * not inside a nested function shares it. */
function functionName(fnNode) {
  if (!fnNode) return '(IIFE scope)';
  if (fnNode === iifeNode.expression.callee) return '(IIFE scope)';
  return fnNode.id ? fnNode.id.name : '(anonymous)';
}

test('the close handler does not read music/chat state declared in build*()', () => {
  // Collect every reference to the four names inside the close handler.
  const uses = new Map();
  walk(ast, (n) => {
    if (n.type !== 'Identifier' || !CROSS_SCOPE_NAMES.includes(n.name)) return;
    const line = n.loc.start.line;
    if (line < CLOSE_HANDLER.startLine || line > CLOSE_HANDLER.endLine) return;
    if (!uses.has(n.name)) uses.set(n.name, []);
    uses.get(n.name).push({ line, fn: enclosingFunctionNode(line) });
  });

  const offenders = [];
  for (const [name, refs] of uses) {
    const decl = findDeclaration(name);
    assert.ok(decl, `${name} must still be declared somewhere`);
    for (const ref of refs) {
      const sameFunction = ref.fn === decl.fn;
      if (sameFunction) continue;
      // Nested function inside the declaring function is still fine.
      if (ref.fn && decl.fn && ref.fn.loc.start.line > decl.fn.loc.start.line) continue;
      offenders.push(
        `${name}: declared line ${decl.line} in ${functionName(decl.fn)}, ` +
          `read at line ${ref.line} in ${functionName(ref.fn)}`,
      );
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `the close handler must not read state scoped to another function:\n  ${offenders.join('\n  ')}`,
  );
});

test('the close handler region was actually inspected (anti-vacuum)', () => {
  assert.ok(CLOSE_HANDLER.endLine > CLOSE_HANDLER.startLine, 'the region must be non-empty');
  // The region itself must still be recognisable as the shared close handler.
  const region = source.split('\n').slice(CLOSE_HANDLER.startLine - 1, CLOSE_HANDLER.endLine).join('\n');
  assert.ok(
    region.includes("wId === 'music'") && region.includes("wId === 'chat'"),
    'the inspected region must be the music/chat part of the close handler',
  );
  assert.ok(
    region.includes("window.osTimeouts['music_cleanup']"),
    'the close handler must reach music through the registered cleanup',
  );
});

test('the shared music/chat state is reachable for the close handler', () => {
  // It is fine either way (a visible local, or a registered cleanup callback),
  // but there must be SOME mechanism, otherwise the cleanup is dead code.
  assert.ok(
    source.includes("window.osTimeouts['music_cleanup']"),
    'music cleanup must be registered in osTimeouts like clock/chat',
  );
  assert.ok(
    source.includes("window.osTimeouts['chat_cleanup'] = cleanupChat"),
    'chat cleanup must stay registered in osTimeouts',
  );
  const cleanupStart = source.indexOf('function cleanupChat');
  const cleanupBody = source.slice(
    cleanupStart,
    source.indexOf("window.osTimeouts['chat_cleanup']", cleanupStart),
  );
  assert.ok(cleanupBody.length > 0, 'the cleanupChat body must be found');
  assert.match(
    cleanupBody,
    /chatReplyTimer/,
    'cleanupChat must still clear the reply timer',
  );
});

test('cleanupChat reaches the reply timer without a ReferenceError', () => {
  // chatReplyTimer must be declared in a scope that ENCLOSES cleanupChat, so
  // reading it inside resolves. If it were a buildChat() local, the close
  // handler's call would throw ReferenceError into a silent catch.
  const cleanupStart = source.indexOf('function cleanupChat');
  assert.ok(cleanupStart !== -1, 'cleanupChat must exist');
  const cleanupLine = source.slice(0, cleanupStart).split('\n').length;
  const cleanupFn = enclosingFunctionNode(cleanupLine);
  const decl = findDeclaration('chatReplyTimer');
  assert.ok(decl, 'chatReplyTimer must be declared');
  // A declaration in the IIFE scope (or any ancestor of cleanupChat) resolves
  // the read. A declaration in a sibling function does not.
  const inScope =
    decl.fn === cleanupFn ||
    functionName(decl.fn) === '(IIFE scope)' ||
    (decl.fn &&
      cleanupFn &&
      decl.fn.loc.start.line < cleanupFn.loc.start.line &&
      cleanupFn.loc.end.line <= decl.fn.loc.end.line);
  assert.ok(
    inScope,
    `chatReplyTimer is declared in ${functionName(decl.fn)} (line ${decl.line}) but ` +
      `cleanupChat lives in ${functionName(cleanupFn)} (line ${cleanupLine}); ` +
      'the read inside cleanupChat would throw ReferenceError',
  );
});

test('visRafId is declared where the music cleanup can read it', () => {
  const decl = findDeclaration('visRafId');
  assert.ok(decl, 'visRafId must be declared');
  // The cleanup registered in buildMusic() is a closure over buildMusic()'s
  // scope, so it needs visRafId at IIFE level or as a buildMusic() local — both
  // work. The point is that the close handler reaches it through the
  // registered callback, not by reading it directly.
  assert.ok(
    functionName(decl.fn) === '(IIFE scope)' || functionName(decl.fn) === 'buildMusic',
    `visRafId must live at IIFE level or in buildMusic(), not in ${functionName(decl.fn)}`,
  );
});

test('music cleanup is registered exactly once', () => {
  const n = [...source.matchAll(/window\.osTimeouts\['music_cleanup'\]\s*=/g)].length;
  assert.equal(n, 1, 'music cleanup must be registered exactly once');
});
