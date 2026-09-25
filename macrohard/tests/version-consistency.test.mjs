import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const packageData = JSON.parse(read('package.json'));
const version = packageData.version;

test('package version is the single release version source', () => {
  assert.match(version, /^2\.11\.\d+$/);
  assert.match(read('index.html'), new RegExp(`v${version.replaceAll('.', '\\.')}`));
  assert.match(read('assets/app.js'), new RegExp(`MakerOS v${version.replaceAll('.', '\\.')}`));
});

test('service worker cache contains the release version', () => {
  assert.match(read('sw.js'), new RegExp(`macrohard-v${version.replaceAll('.', '-')}`));
});
