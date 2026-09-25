import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

test('calendar storage always normalizes to an event array', () => {
  assert.match(source, /var parsed\s*=\s*JSON\.parse\(localStorage\.getItem\('macrohard_calendar_events'\)\s*\|\|\s*'\[\]'\);\s*return Array\.isArray\(parsed\)\?\s*parsed:\s*\[\];/);
});

test('all desktop apps use the shared window close handler', () => {
  assert.match(source, /var closeBtn=mk\.querySelector\('\.wclose'\);/);
  assert.match(source, /wnd\.classList\.add\('closing'\);[\s\S]*setTimeout\(function\(\)\{wnd\.remove\(\);\},200\);/);
});
