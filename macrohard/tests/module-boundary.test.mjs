import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('legacy facades are loaded, incomplete parallel modules are not', () => {
  assert.match(index, /assets\/js\/storage\.js/);
  assert.match(index, /assets\/js\/notes-crypto\.js/);
  assert.match(index, /assets\/js\/editor\.js/);
  assert.doesNotMatch(index, /assets\/js\/(main|i18n|window-manager)\.js/);
  assert.match(index, /assets\/app\.js\?v=63/);
});

test('legacy window manager remains documented as an incomplete parallel implementation', () => {
  const source = fs.readFileSync(path.join(root, 'assets', 'js', 'window-manager.js'), 'utf8');
  assert.match(source, /rest of openApp logic will be in the main app\.js for now/);
});
