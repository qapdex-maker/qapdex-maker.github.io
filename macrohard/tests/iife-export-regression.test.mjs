import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

const ast = parse(source, {
  ecmaVersion: 2022,
  sourceType: 'script',
  loc: true,
  range: true,
});

const iifeNode = ast.body.find(
  (n) =>
    n.type === 'ExpressionStatement' &&
    n.expression.type === 'CallExpression' &&
    n.expression.callee.type === 'FunctionExpression',
);
assert.ok(iifeNode, 'app.js must wrap its core in an IIFE');

const iifeBody = iifeNode.expression.callee.body;

/* Walk the AST collecting every node. */
function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit, node));
    else if (v && typeof v.type === 'string') walk(v, visit, node);
  }
}

/* All function declarations at a given AST depth path. */
function isInsideIifeBody(node) {
  let cur = node;
  while (cur) {
    if (cur === iifeBody) return true;
    cur = null;
    break;
  }
  return false;
}

/* Names declared as top-level statements of the IIFE body. */
const iifeTopLevelNames = new Set();
for (const stmt of iifeBody.body) {
  if (stmt.type === 'FunctionDeclaration' && stmt.id) iifeTopLevelNames.add(stmt.id.name);
}

/*
 * Names bound as locals somewhere outside the IIFE (function parameters,
 * var/let/const, catch params). Those shadow any same-named IIFE helper and are
 * therefore not cross-boundary references — e.g. buildTaskmgr's
 * `tabs.forEach(function (t) {...})` has nothing to do with an IIFE helper `t`.
 */
function locallyBoundNames() {
  const bound = new Set();
  walk(ast, (node) => {
    if (node.range[0] >= iifeNode.range[0] && node.range[1] <= iifeNode.range[1]) return;
    const bind = (id) => {
      if (id && id.type === 'Identifier') bound.add(id.name);
    };
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      node.params.forEach(bind);
      bind(node.id);
    }
    if (node.type === 'ArrowFunctionExpression') node.params.forEach(bind);
    if (node.type === 'VariableDeclarator') bind(node.id);
    if (node.type === 'CatchClause') bind(node.param);
    if (node.type === 'ClassDeclaration') bind(node.id);
  });
  return bound;
}

/* References to IIFE helpers from outside the IIFE that are not shadowed. */
function collectOutsideRefs() {
  const shadowed = locallyBoundNames();
  const refs = new Map();
  walk(ast, (node, parent) => {
    if (node.type !== 'Identifier' || !iifeTopLevelNames.has(node.name)) return;
    if (shadowed.has(node.name)) return;
    if (parent && parent.type === 'FunctionDeclaration' && parent.id === node) return;
    if (node.range[0] >= iifeNode.range[0] && node.range[1] <= iifeNode.range[1]) return;
    if (!refs.has(node.name)) refs.set(node.name, []);
    refs.get(node.name).push(node.loc.start.line);
  });
  return refs;
}

/* Which globals does app.js assign on window? */
function windowAssignedNames() {
  const names = new Set();
  walk(ast, (node) => {
    if (
      node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      node.left.object.type === 'Identifier' &&
      node.left.object.name === 'window' &&
      node.left.property.type === 'Identifier'
    ) {
      names.add(node.left.property.name);
    }
  });
  return names;
}

const outsideRefs = collectOutsideRefs();
const windowNames = windowAssignedNames();

/*
 * Regression: apps living outside the main IIFE (buildGame, buildCalendar,
 * buildNotes, ...) call helpers defined inside it. Only some were exported to
 * `window`, so the rest threw ReferenceError at runtime — concretely, clicking
 * the 4x4 toggle in Tic-Tac-Toe threw "ReferenceError: toast is not defined".
 */
test('precondition: the IIFE and its top-level helpers are detected', () => {
  assert.ok(iifeBody.body.length > 0, 'the IIFE body must not be empty');
  assert.ok(
    iifeTopLevelNames.has('toast'),
    'toast must be a top-level function inside the IIFE',
  );
  assert.ok(
    outsideRefs.size > 0,
    'there must be at least one cross-boundary reference to detect',
  );
});

test('every IIFE helper used outside the IIFE is reachable on window', () => {
  const unexported = [...outsideRefs.keys()].filter((n) => !windowNames.has(n));
  assert.deepEqual(
    unexported,
    [],
    `referenced outside the IIFE but never assigned to window: ${unexported.join(', ')}`,
  );
});

test('toast is exported to window (the Tic-Tac-Toe 4x4 toggle depends on it)', () => {
  assert.ok(
    windowNames.has('toast'),
    'window.toast must be assigned, otherwise apps outside the IIFE throw',
  );
  // And it must be the actual IIFE toast, not a different function.
  const assignments = [];
  walk(ast, (node) => {
    if (
      node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      node.left.object.name === 'window' &&
      node.left.property.name === 'toast' &&
      node.right.type === 'Identifier' &&
      node.right.name === 'toast'
    ) {
      assignments.push(node.loc.start.line);
    }
  });
  assert.ok(assignments.length > 0, 'window.toast = toast must exist somewhere');
});

test('toast() creates its own container when #osToast is absent', () => {
  const toastFn = iifeBody.body.find(
    (n) => n.type === 'FunctionDeclaration' && n.id && n.id.name === 'toast',
  );
  assert.ok(toastFn, 'toast must be declared inside the IIFE');
  const calls = [];
  walk(toastFn, (n) => {
    if (
      n.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      n.callee.object.name === 'document'
    ) {
      const first = n.arguments[0];
      const literal =
        first && first.type === 'Literal' ? String(first.value) : '';
      calls.push(n.callee.property.name + '(' + literal + ')');
    }
  });
  assert.ok(
    calls.some((c) => c.startsWith('getElementById(') && c.includes('osToast')),
    `toast must look for an existing container first (got: ${calls.join(' | ')})`,
  );
  assert.ok(
    calls.some((c) => c.startsWith('createElement(')),
    'toast must build its own container when none exists',
  );
});

test('the taskmanager openApp wrapper keeps a reference to the original', () => {
  // The taskmanager intentionally re-wraps window.openApp for app-history
  // tracking. It must capture the original instead of losing it.
  let captured = false;
  let wrapped = false;
  walk(ast, (node) => {
    if (
      node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      node.left.property.type === 'Identifier'
    ) {
      const prop = node.left.property.name;
      if (prop === '_tmOriginalOpenApp') captured = true;
      if (
        prop === 'openApp' &&
        node.right.type === 'FunctionExpression'
      ) {
        wrapped = true;
      }
    }
  });
  assert.ok(captured, 'the original openApp must be stashed before wrapping');
  assert.ok(wrapped, 'the taskmanager must install its wrapper');
});

test('app.js still parses cleanly with the project toolchain', () => {
  assert.doesNotThrow(() => parse(source, { ecmaVersion: 2022, sourceType: 'script' }));
});
