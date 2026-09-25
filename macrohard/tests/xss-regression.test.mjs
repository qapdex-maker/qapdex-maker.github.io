import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

test('stored chat messages use textContent instead of innerHTML', () => {
  assert.doesNotMatch(source, /d\.innerHTML='<span class="chatBubbleText">'\+m\.text/);
  assert.doesNotMatch(source, /d\.innerHTML='<span class="chatBubbleTime">'\+m\.time/);
});

test('imported link labels and categories do not use innerHTML interpolation', () => {
  assert.doesNotMatch(source, /a\.innerHTML='<span class="clIco">🔗<\/span><span>'\+l\.n/);
});
