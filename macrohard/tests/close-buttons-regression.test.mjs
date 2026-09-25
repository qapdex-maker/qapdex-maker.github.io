import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('calendar storage always normalizes to an event array', () => {
  assert.match(flat, /var parsed = JSON\.parse\([\s\S]*?\)[\s\S]*?Array\.isArray\(parsed\)/);
});

test('all desktop apps use the shared window close handler', () => {
  assert.match(flat, /var closeBtn = mk\.querySelector\(['"]\.wclose['"]\);/);
  assert.match(flat, /wnd\.classList\.add\(['"]closing['"]\)[\s\S]*?wnd\.remove\(\)/);
});
