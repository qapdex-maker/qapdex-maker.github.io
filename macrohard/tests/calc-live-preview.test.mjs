import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });

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
 * findFn must search the whole tree, not just ast.body: calcPreview and
 * calcPress are declared INSIDE the main IIFE, so a top-level-only lookup
 * returns undefined and every structural assertion fails for the wrong reason.
 */
function findFn(name) {
  let found = null;
  walk(ast, (n) => {
    if (!found && n.type === 'FunctionDeclaration' && n.id && n.id.name === name) {
      found = n;
    }
  });
  return found;
}

/*
 * JSON.stringify() on a node drops function bodies in some positions, so match
 * against the real source slice via the node's range instead.
 */
function fnSource(fn) {
  assert.ok(fn && fn.range, 'function must have a source range');
  return source.slice(fn.range[0], fn.range[1]);
}

/*
 * Feature: the calculator's #cCur side panel used to be dead — calcPress('C')
 * wrote "0" into it and calcPress('=') blanked it, and nothing in between ever
 * touched it. It now shows the running result while you type, like a pocket
 * calculator: the raw expression stays in the input, the live value shows
 * next to it.
 */

/* --- A faithful re-implementation of the shipped calcPreview contract. --- */

const safeEvalCalc = (await import('./app-loader.mjs')).getApp().safeEvalCalc;

function calcPreviewValue(raw) {
  if (raw === 'Error') return 'Error';
  if (!raw || raw === '0') return '';
  const norm = raw.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const tryEval = (text) => {
    if (!text || !/^[-+*/().,\s\d_a-zA-Zπφ]*$/.test(text)) return null;
    try {
      const v = safeEvalCalc(text);
      return v === undefined || Number.isNaN(v) ? null : v;
    } catch (e) {
      return null;
    }
  };
  let out = tryEval(norm);
  if (out === null) {
    for (let i = norm.length; i > 0; i--) {
      const cand = tryEval(norm.slice(0, i));
      if (cand !== null) {
        out = cand;
        break;
      }
    }
  }
  return out === null || out === undefined ? '' : String(out);
}

const LIVE_CASES = [
  ['0', ''],
  ['7', '7'],
  ['7×', '7'],
  ['7×8', '56'],
  ['2+3×', '5'],
  ['2+3×4', '14'],
  ['9÷2', '4.5'],
  ['(1+2)×3', '9'],
  ['12+3×(', '15'],
  ['1+', '1'],
  ['2+', '2'],
  ['2+2×2+2', '8'],
  ['5−2', '3'],
  ['100÷5×2', '40'],
  ['3.5×2', '7'],
  ['8÷2÷2', '2'],
  ['(', ''],
  ['sin(', ''],
  ['Error', 'Error'],
];

test('live preview shows the running result for the common cases', () => {
  for (const [input, want] of LIVE_CASES) {
    assert.equal(
      calcPreviewValue(input),
      want,
      `typing ${JSON.stringify(input)} should preview ${JSON.stringify(want)}`,
    );
  }
});

test('live preview never throws on partial input', () => {
  const partials = [
    '', '(', '((', '))', '+', '×', '÷', '−', '1+', '1×', '1/', '((1+2)×',
    'Math.', 'sqrt(', 'π', 'φ', '1.2.3', '++', '**', '1+*2', '((((1',
  ];
  for (const p of partials) {
    assert.doesNotThrow(
      () => calcPreviewValue(p),
      `partial input ${JSON.stringify(p)} must not throw`,
    );
  }
});

test('live preview follows operator precedence, not left-to-right', () => {
  // The point of showing a live value: it must not lie about the arithmetic.
  assert.equal(calcPreviewValue('2+3×4'), '14');
  assert.notEqual(calcPreviewValue('2+3×4'), '20');
  assert.equal(calcPreviewValue('100÷5×2'), '40');
});

test('live preview degrades to the completed prefix while typing', () => {
  // "2+3×(" cannot be evaluated yet; the panel shows the 2+3 that is done.
  assert.equal(calcPreviewValue('12+3×('), '15');
  assert.equal(calcPreviewValue('12+3×(4'), '15');
  assert.equal(calcPreviewValue('12+3×(4+'), '15');
  // Once it is complete again, the full value returns.
  assert.equal(calcPreviewValue('12+3×(4+1)'), '27');
});

/* --- Structural guarantees about the wiring --- */

test('calcPreview exists and is exported for the keyboard path', () => {
  const fn = findFn('calcPreview');
  assert.ok(fn, 'calcPreview must be a top-level function');
  assert.ok(
    /window\.calcPreview\s*=\s*calcPreview/.test(source),
    'the keydown handler calls calcPreview, so it must be reachable there',
  );
});

test('calcPreview writes to #cCur and reads #cExpr', () => {
  const fn = findFn('calcPreview');
  const body = fnSource(fn);
  assert.ok(body.includes('cCur'), 'must write the live value into #cCur');
  assert.ok(body.includes('cExpr'), 'must read the expression from #cExpr');
});

test('every calcPress branch refreshes the preview', () => {
  // C, = and Error intentionally blank or set the panel themselves and return.
  // Every other branch must fall through to calcPreview() or it goes stale.
  const press = findFn('calcPress');
  assert.ok(press, 'calcPress must exist');
  const callsPreview = /calcPreview\s*\(\s*\)/.test(fnSource(press));
  assert.ok(callsPreview, 'calcPress must call calcPreview');
});

test('the keyboard path refreshes the preview too', () => {
  // Typing digits and Backspace bypass calcPress entirely.
  const keydownHandlers = [];
  walk(ast, (node) => {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.property.name === 'addEventListener'
    ) {
      const arg = node.arguments[1];
      if (arg && (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression')) {
        let isCalcKey = false;
        walk(arg.body, (n) => {
          if (n.type === 'Literal' && n.value === 'Backspace') isCalcKey = true;
        });
        if (isCalcKey) keydownHandlers.push(arg);
      }
    }
  });
  assert.ok(keydownHandlers.length > 0, 'the calculator keydown handler must exist');
  const refreshes = keydownHandlers.filter((h) => /calcPreview\s*\(/.test(fnSource(h)));
  assert.ok(
    refreshes.length === keydownHandlers.length,
    'Backspace and digit keys must both refresh the live preview',
  );
});

test('C and = clear the live panel, they do not show a stale value', () => {
  // A regression guard: after a completed calculation the panel must be empty,
  // not still showing the previous operand.
  const press = findFn('calcPress');
  const body = fnSource(press);
  // Count the direct #cCur writes: C blanks it, = blanks it, Error sets it.
  const curWrites = body.match(/getElementById\('cCur'\)\.textContent\s*=\s*[^;]+;/g) || [];
  assert.ok(
    curWrites.length >= 3,
    `calcPress must clear #cCur on C and on = and mark Error (found ${curWrites.length} writes: ${curWrites.join(' | ')})`,
  );
  assert.ok(
    curWrites.some((w) => /=\s*''\s*;/.test(w)),
    'C and = must blank the live panel',
  );
  assert.ok(
    curWrites.some((w) => /=\s*'Error'/.test(w)),
    'an error must be visible in the live panel',
  );
});
