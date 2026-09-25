import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('all desktop apps use the shared window close handler', () => {
  const start = flat.indexOf("querySelector('.wclose')");
  assert.ok(start !== -1, 'close button lookup must exist');
  const handler = flat.slice(start, start + 2600);
  assert.ok(handler.includes("classList.add('closing')"), 'close must trigger the closing animation');
  assert.ok(handler.includes('wnd.remove()'), 'close must remove the window element');
});
