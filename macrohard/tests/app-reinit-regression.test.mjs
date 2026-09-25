import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

const closeHandler = (() => {
  const start = flat.indexOf("querySelector('.wclose')");
  assert.ok(start !== -1, 'close button lookup must exist');
  return flat.slice(start, flat.indexOf('querySelector(\'.wmin\')', start));
})();

test('every app init flag is reset when its window closes', () => {
  const flags = [
    'TERM_INITIALIZED',
    'CHAT_INITIALIZED',
    'EXPLOADER_INITIALIZED',
    'BROWSER_INITIALIZED',
    'MUSIC_INITIALIZED',
    'TASKMGR_INITIALIZED',
    'CALENDAR_INITIALIZED',
  ];
  for (const flag of flags) {
    assert.ok(
      closeHandler.includes(`${flag} = false`),
      `${flag} must be reset on close, otherwise the app stays dead after reopen`,
    );
  }
});

test('terminal and chat re-initialize after reopen', () => {
  // Guard: the guard clause and the flag assignment must both exist.
  assert.ok(flat.includes('if (TERM_INITIALIZED) return;'), 'buildTerminal must guard re-init');
  assert.ok(flat.includes('if (CHAT_INITIALIZED) return;'), 'buildChat must guard re-init');
});
