import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('all desktop apps use the shared window close handler', () => {
  /*
   * Anchor on the close handler itself, not on the first '.wclose' occurrence
   * in the file. The Esc-Close path also queries '.wclose' and appeared above
   * this handler, so a naive indexOf() sliced the wrong region and failed for
   * the wrong reason.
   */
  const anchor = flat.indexOf("addEventListener('click', function (e) {", flat.indexOf("querySelector('.wclose')"));
  assert.ok(anchor !== -1, 'the close button click handler must exist');
  const handler = flat.slice(anchor, anchor + 2600);
  assert.ok(handler.includes("classList.add('closing')"), 'close must trigger the closing animation');
  assert.ok(handler.includes('wnd.remove()'), 'close must remove the window element');
});
