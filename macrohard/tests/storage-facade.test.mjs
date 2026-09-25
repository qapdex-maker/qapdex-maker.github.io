import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'js', 'storage.js'), 'utf8');

test('storage facade exposes the production storage contract', () => {
  assert.match(source, /global\.storeSet\s*=/);
  assert.match(source, /global\.storeGet\s*=/);
  assert.match(source, /global\.storeDel\s*=/);
  assert.match(source, /global\.storeHas\s*=/);
  assert.doesNotMatch(source, /\bexport\b/);
});

test('storage facade falls back from localStorage to sessionStorage', () => {
  const data = { local: {}, session: {} };
  const localStorage = {
    getItem(key) { return data.local[key] ?? null; },
    setItem(key, value) { data.local[key] = value; },
    removeItem(key) { delete data.local[key]; },
  };
  const sessionStorage = {
    getItem(key) { return data.session[key] ?? null; },
    setItem(key, value) { data.session[key] = value; },
    removeItem(key) { delete data.session[key]; },
  };
  const oldLocalSet = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  const scope = { window: { localStorage, sessionStorage } };
  new Function('window', source)(scope.window);
  assert.equal(scope.window.storeSet('key', 'value'), true);
  assert.equal(scope.window.storeGet('key'), 'value');
  localStorage.setItem = oldLocalSet;
});
