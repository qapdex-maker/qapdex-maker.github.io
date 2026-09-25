import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('global music close handler does not touch buildMusic-local setupDone', () => {
  const start = flat.indexOf("if (wId === 'music')");
  assert.ok(start !== -1, 'music close branch must exist');
  const branch = flat.slice(start, start + 120);
  assert.ok(!branch.includes('setupDone'), 'setupDone is local to buildMusic and not in scope here');
  assert.ok(branch.includes('MUSIC_INITIALIZED = false'), 'branch must reset the init flag');
});

test('music close button delegates to the standard window close control', () => {
  assert.match(flat, /musCloseBtn[\s\S]*querySelector\(['"]\.wclose['"]\)[\s\S]*\.click\(\)/);
});
