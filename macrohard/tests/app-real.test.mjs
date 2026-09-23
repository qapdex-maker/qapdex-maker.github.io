import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApp } from './app-loader.mjs';

const app = getApp();

/* ============================================================
   Test Suite: Real app.js Function Imports
   Tests run against functions extracted from assets/app.js
   ============================================================ */

// --- storeSet / storeGet / storeDel ---

test('storeSet: stores value in localStorage', () => {
  assert.equal(typeof app.storeSet, 'function', 'storeSet should be a function');
  const result = app.storeSet('test_key', 'hello');
  assert.equal(result, true, 'storeSet returns true on success');
});

test('storeGet: retrieves value from localStorage', () => {
  app.storeSet('test_key', 'world');
  const value = app.storeGet('test_key');
  assert.equal(value, 'world', 'storeGet retrieves stored value');
});

test('storeGet: returns null for non-existent keys', () => {
  const value = app.storeGet('nonexistent_key_xyz');
  assert.equal(value, null, 'returns null for missing key');
});

test('storeDel: removes value from storage', () => {
  app.storeSet('to_delete', 'temp');
  assert.equal(app.storeGet('to_delete'), 'temp');
  app.storeDel('to_delete');
  assert.equal(app.storeGet('to_delete'), null, 'value removed after storeDel');
});

test('storeSet: large values work', () => {
  const large = 'x'.repeat(10000);
  const result = app.storeSet('large_key', large);
  assert.equal(result, true);
  assert.equal(app.storeGet('large_key'), large);
});

// --- safeEvalCalc ---

test('safeEvalCalc: basic arithmetic', () => {
  assert.equal(app.safeEvalCalc('1+1'), 2);
  assert.equal(app.safeEvalCalc('2*3'), 6);
  assert.equal(app.safeEvalCalc('10/2'), 5);
  assert.equal(app.safeEvalCalc('10-3'), 7);
});

test('safeEvalCalc: operator precedence', () => {
  assert.equal(app.safeEvalCalc('2+3*4'), 14);
  assert.equal(app.safeEvalCalc('(2+3)*4'), 20);
  assert.equal(app.safeEvalCalc('100/4'), 25);
  assert.equal(app.safeEvalCalc('(1+2)*(3+4)'), 21);
});

test('safeEvalCalc: decimals', () => {
  assert.equal(app.safeEvalCalc('1.5+2.5'), 4);
  assert.ok(Math.abs(app.safeEvalCalc('0.1+0.2') - 0.3) < 1e-10);
});

test('safeEvalCalc: Math constants', () => {
  assert.equal(app.safeEvalCalc('Math.PI'), Math.PI);
  assert.equal(app.safeEvalCalc('Math.E'), Math.E);
  assert.equal(app.safeEvalCalc('π'), Math.PI);
  assert.ok(Math.abs(app.safeEvalCalc('φ') - (1+Math.sqrt(5))/2) < 1e-10);
});

test('safeEvalCalc: Math functions', () => {
  assert.equal(app.safeEvalCalc('Math.sqrt(16)'), 4);
  assert.equal(app.safeEvalCalc('Math.sin(0)'), 0);
  assert.equal(app.safeEvalCalc('Math.cos(0)'), 1);
  assert.equal(app.safeEvalCalc('Math.pow(2,3)'), 8);
  assert.equal(app.safeEvalCalc('Math.log(1)'), 0);
  assert.equal(app.safeEvalCalc('Math.abs(-5)'), 5);
});

test('safeEvalCalc: complex expressions', () => {
  assert.ok(Math.abs(app.safeEvalCalc('Math.PI*2') - Math.PI*2) < 1e-10);
  assert.equal(app.safeEvalCalc('Math.sqrt(9)+Math.sqrt(16)'), 7);
});

test('safeEvalCalc: unary minus', () => {
  assert.equal(app.safeEvalCalc('-5+3'), -2);
  assert.equal(app.safeEvalCalc('-(3+2)'), -5);
});

test('safeEvalCalc: security - blocks eval', () => {
  assert.throws(() => app.safeEvalCalc('eval(1)'));
});

test('safeEvalCalc: security - blocks alert', () => {
  assert.throws(() => app.safeEvalCalc('alert(1)'));
});

test('safeEvalCalc: security - blocks console', () => {
  assert.throws(() => app.safeEvalCalc('console.log(1)'));
});

test('safeEvalCalc: security - blocks __proto__', () => {
  assert.throws(() => app.safeEvalCalc('__proto__'));
});

test('safeEvalCalc: security - blocks Function constructor', () => {
  assert.throws(() => app.safeEvalCalc('Function("return 1")()'));
});

// --- shuffleArray ---

test('shuffleArray: preserves length', () => {
  const arr = [1, 2, 3, 4, 5];
  const shuffled = app.shuffleArray(arr);
  assert.equal(shuffled.length, arr.length, 'length preserved');
});

test('shuffleArray: preserves all elements', () => {
  const arr = [1, 2, 3, 4, 5];
  const shuffled = app.shuffleArray(arr);
  for (const el of arr) {
    assert.ok(shuffled.includes(el), `element ${el} still present`);
  }
});

test('shuffleArray: does not modify original', () => {
  const arr = [1, 2, 3, 4, 5];
  const original = [...arr];
  app.shuffleArray(arr);
  assert.deepEqual(arr, original, 'original array not modified');
});

test('shuffleArray: empty array', () => {
  assert.deepEqual(app.shuffleArray([]), []);
});

test('shuffleArray: single element', () => {
  assert.deepEqual(app.shuffleArray([42]), [42]);
});

test('shuffleArray: produces different order (probabilistic)', () => {
  const arr = Array.from({length: 100}, (_, i) => i);
  const shuffled = app.shuffleArray(arr);
  let moved = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== shuffled[i]) moved++;
  }
  assert.ok(moved > 10, `expected significant movement, got ${moved}/100`);
});
