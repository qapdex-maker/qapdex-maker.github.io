import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('global music close handler does not access buildMusic-local setupDone', () => {
  assert.ok(!flat.includes("if (wId === 'music') { MUSIC_INITIALIZED = false; setupDone = false; }"));
  assert.ok(flat.includes("if (wId === 'music') { MUSIC_INITIALIZED = false; }"));
});

test('music close button delegates to the standard window close control', () => {
  assert.match(flat, /musCloseBtn[\s\S]*querySelector\(['"]\.wclose['"]\)[\s\S]*\.click\(\)/);
});
