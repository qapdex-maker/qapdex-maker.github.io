import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * The system info app rendered its section heading and then stopped.
 *
 * `APP_VERSION` is declared at line 504, INSIDE the main IIFE, which closes at
 * line 8506. `buildSysinfo()` starts after that and calls
 *
 *     addRow('OS', 'MakerOS v' + APP_VERSION + ' (Neo-Brutalist)');
 *
 * at line 8806 — outside the closure, where the constant does not exist. Every
 * other function buildSysinfo() calls is exported explicitly; this constant was
 * not, when the About dialog was switched over to it.
 *
 * Measured in Chromium on the deployed site, 2026-09-27:
 *
 *   #siBody innerHTML:
 *     <button class="siRefresh">↻ Aktualisieren</button>
 *     <div class="siSection">Betriebssystem</div>
 *
 * The section heading renders, then the first addRow throws a ReferenceError and
 * the function stops. There is no error event and nothing in the console —
 * the app just shows a heading and no rows, which looks like an empty section
 * rather than a crash. The OS row is the FIRST row, so the app loses all nine
 * sections' worth of rows, not just one line.
 *
 * ESLint caught it as `8806:30 warning 'APP_VERSION' is not defined` — filed
 * under noise next to 13 unused-variable warnings.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = app.split('\n');

const iifeEnd = lines.findIndex((l) => l.trim() === '})();') + 1;
// Mit Einrueckung: die Deklaration sitzt innerhalb der IIFE, nicht auf
// Spalte 0. Der erste Entwurf /^const APP_VERSION/ fand nichts und meldete
// 'not declared' gegen existierenden Code.
const defLine =
  lines.findIndex((l) => /^\s*const APP_VERSION\s*=/.test(l)) + 1;
const uses = lines
  .map((l, i) => ({ n: i + 1, l }))
  .filter((x) => /(?<!const )\bAPP_VERSION\b/.test(x.l) && !/const APP_VERSION/.test(x.l));

test('precondition: the IIFE closes and the constant is declared inside it', () => {
  assert.ok(iifeEnd > 0, 'could not find the IIFE end marker })();');
  assert.ok(defLine > 0, 'APP_VERSION is not declared as a top-level const');
  assert.ok(
    defLine < iifeEnd,
    `APP_VERSION at line ${defLine} is already outside the IIFE (ends ${iifeEnd})`,
  );
});

test('every use of APP_VERSION is inside the IIFE or exported to window', () => {
  for (const { n, l } of uses) {
    if (n < iifeEnd) continue; // inside the closure: fine
    // Outside, the constant must come off window.
    assert.ok(
      /window\.APP_VERSION/.test(l),
      `line ${n} uses APP_VERSION outside the IIFE (which ends at ${iifeEnd}) ` +
        `without it being exported: ${l.trim().slice(0, 70)}\n` +
        'A const in a closure is invisible outside it. Every other function ' +
        'buildSysinfo() calls is exported explicitly; this one was not.',
    );
  }
});

test('APP_VERSION is exported next to the other boundary exports', () => {
  // The export block is where openApp, toast and startOS are published. Putting
  // the version there keeps the boundary in one place and gives the test
  // something concrete to point at.
  // Der Export-Block endet bei `})();`. `lastIndexOf` von der Fundstelle aus
  // liefert deshalb eine leere Slice, sobald der Export NACH der Fundstelle
  // steht — der erste Entwurf dieser Zeile meldete "not exported" gegen
  // vorhandenen Code.
  const exportStart = app.indexOf('window.openApp = openApp');
  const block = app.slice(exportStart, app.indexOf('})();', exportStart));
  assert.ok(
    /window\.APP_VERSION\s*=/.test(block),
    'APP_VERSION must be exported in the boundary block, next to openApp and toast',
  );
  assert.match(
    block,
    /window\.APP_VERSION\s*=\s*APP_VERSION/,
    'the export must assign the constant, not a literal — a second copy of the ' +
      'version string is exactly how the About dialog drifted to 2.11.45',
  );
});

test('no other module outside the IIFE is missing a binding', () => {
  // The same class of bug: a module function referencing an inner-scope name.
  // ESLint lists 13 unused variables and exactly this one no-undef, so checking
  // that the only no-undef is gone is enough — but assert the property
  // directly rather than trusting a lint run.
  const outside = lines.slice(iifeEnd);
  const suspicious = outside.filter(
    (l) =>
      /^\s*(const|let|var)?\s*.*=\s*.*\bAPP_VERSION\b/.test(l) &&
      !/window\./.test(l) &&
      !/^\s*\/\//.test(l),
  );
  assert.deepEqual(
    suspicious,
    [],
    'an outer-scope statement uses APP_VERSION without window.',
  );
});
