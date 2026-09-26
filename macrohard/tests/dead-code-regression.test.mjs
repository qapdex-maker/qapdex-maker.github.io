import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Dead code removal: `apps` and `bootDone` were declared at IIFE scope and
 * never read anywhere.
 *
 *   const apps = {};      // line 19 — the app registry is the switch in
 *                         // openApp(); this object stayed empty forever, and
 *                         // line ~265 of openApp() said so in a comment.
 *   let bootDone = false; // line 22 — set to true after the lock screen fade,
 *                         // never read by anything.
 *
 * Both are noise that invites the wrong belief that a registry exists. This
 * test pins the removal so a future edit cannot quietly reintroduce them, and
 * it fails if they come back.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = source.split('\n');

test('the empty apps object is gone', () => {
  const decl = lines.findIndex((l) => /^\s*(?:const|let|var)\s+apps\s*=\s*\{\s*\}\s*;/.test(l));
  assert.equal(
    decl,
    -1,
    `apps must not be re-declared as an empty object (line ${decl + 1})`,
  );
  assert.ok(
    !/(?<![.\w$])apps\s*\[/.test(source),
    'nothing may index into a non-existent apps registry',
  );
  assert.ok(
    !/(?<![.\w$])apps\s*\.\s*[A-Za-z_$]/.test(source),
    'nothing may read a property from a non-existent apps registry',
  );
});

test('bootDone is gone', () => {
  const decl = lines.findIndex((l) => /^\s*(?:let|var|const)\s+bootDone\b/.test(l));
  assert.equal(decl, -1, `bootDone must not be declared (line ${decl + 1})`);
  const reads = [...source.matchAll(/(?<![.\w$])bootDone\b/g)].length;
  assert.equal(reads, 0, `bootDone must not be referenced anywhere (${reads} hits)`);
});

test('the openApp switch really is the registry (precondition)', () => {
  // The comment that used to sit at the old `apps` declaration must still
  // document where the truth lives, so nobody re-adds a parallel registry.
  assert.ok(
    /truth is the switch in openApp\(\)/.test(source),
    'the note about openApp() being the registry must survive',
  );
  const cases = [...source.matchAll(/case\s+'([a-z]+)':/g)].map((m) => m[1]);
  assert.ok(cases.length >= 20, `openApp() must dispatch many apps, found ${cases.length}`);
});

test('removing the dead declarations did not remove the lock-screen logic', () => {
  // Guard against over-deletion: the code around bootDone must still work.
  assert.ok(
    source.includes("document.getElementById('lock')") ||
      source.includes("getElementById('lock')"),
    'the lock screen handling must survive',
  );
  assert.ok(
    /restoreSession/.test(source),
    'the session restore hook must survive',
  );
});
