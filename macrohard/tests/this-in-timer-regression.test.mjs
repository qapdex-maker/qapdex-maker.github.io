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

/* Every `setTimeout(fn, ...)` / `setInterval(fn, ...)` call in the file. */
const timerCalls = [];
walk(ast, (node) => {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    ['setTimeout', 'setInterval'].includes(node.callee.name)
  ) {
    timerCalls.push({ line: node.loc.start.line, fn: node.arguments[0], node });
  }
});

/*
 * Regression: clicking Shuffle in the Music app threw
 *   TypeError: Cannot set properties of undefined (setting 'background')
 * at the `this.style.background = ''` inside the setTimeout callback. Inside a
 * plain function callback `this` is the global object, so `this.style` is
 * undefined. The button is now captured in a local const first.
 */
test('no plain-function timer callback dereferences this', () => {
  const offenders = [];
  for (const call of timerCalls) {
    const fn = call.fn;
    // Arrow callbacks inherit `this` from the enclosing handler — safe.
    if (!fn || fn.type === 'ArrowFunctionExpression') continue;
    walk(fn, (n) => {
      if (
        n.type === 'MemberExpression' &&
        n.object.type === 'ThisExpression'
      ) {
        offenders.push({
          line: n.loc.start.line,
          prop: n.property.name || '(computed)',
          timerLine: call.line,
        });
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `these timer callbacks use \`this\`, which is the global object there: ${offenders
      .map((o) => `line ${o.line} (timer at ${o.timerLine}) -> this.${o.prop}`)
      .join('; ')}`,
  );
});

test('the timer-callback scan is not vacuous', () => {
  assert.ok(
    timerCalls.length > 20,
    `expected many timer calls, found only ${timerCalls.length} — the scan is broken`,
  );
  const nonArrow = timerCalls.filter((c) => c.fn && c.fn.type !== 'ArrowFunctionExpression');
  assert.ok(
    nonArrow.length > 5,
    'expected several plain-function callbacks, otherwise this guard proves nothing',
  );
});

test('the music shuffle handler captures the button in a local', () => {
  // Locate the shuffle handler: it maps songs to indices and shuffles them.
  const handlers = [];
  walk(ast, (node) => {
    if (
      node.type === 'FunctionExpression' &&
      node.body &&
      /shuffleArray/.test(JSON.stringify(node.body).slice(0, 4000))
    ) {
      handlers.push(node);
    }
  });
  assert.ok(handlers.length > 0, 'the shuffle handler must exist');

  const handler = handlers.find((h) =>
    h.body.body.some(
      (s) =>
        s.type === 'ExpressionStatement' &&
        s.expression.type === 'AssignmentExpression' &&
        s.expression.left.type === 'MemberExpression' &&
        s.expression.left.property.name === 'background',
    ),
  );
  assert.ok(handler, 'the shuffle handler must set a background highlight');

  // The setTimeout callback inside it must NOT touch `this`.
  const timers = [];
  walk(handler, (node) => {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      ['setTimeout', 'setInterval'].includes(node.callee.name)
    ) {
      timers.push(node);
    }
  });
  assert.ok(timers.length > 0, 'the shuffle handler must use a timer to clear the highlight');

  for (const t of timers) {
    const cb = t.arguments[0];
    if (!cb || cb.type === 'ArrowFunctionExpression') continue;
    let usesThis = false;
    walk(cb, (n) => {
      if (n.type === 'MemberExpression' && n.object.type === 'ThisExpression') usesThis = true;
    });
    assert.ok(
      !usesThis,
      `shuffle setTimeout callback at line ${cb.loc.start.line} still uses \`this\``,
    );
  }
});
