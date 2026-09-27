import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/*
 * Regressionstest fuer tests/find-tdz-traps.mjs.
 *
 * Der Scanner wurde am 2026-09-27 neu geschrieben, weil die alte Fassung
 * > 300 s brauchte und nie fertig wurde. Ein schneller Scanner, der zu wenig
 * findet, ist schlimmer als der langsame — er taeuscht eine gruene Pruefung
 * vor. Deshalb wird hier nicht die Laufzeit geprueft, sondern die
 * Treffermenge an zwei Extremen:
 *
 *   1. Ein synthetischer Fall, der EXAKT dem echten Notes-Bug entspricht
 *      (Funktion liest Zustand, Aufruf vor Deklaration). MUSS gefunden werden.
 *   2. Ein synthetischer Fall, der harmlos ist (Aufruf NACH der Deklaration,
 *      oder Leser in einer anderen Funktion). MUSS NICHT gefunden werden.
 *
 * Der reale app.js-Bestand wird zusaetzlich auf eine plausible untere
 * Schranke geprueft — 1330 Deklarationen, 0 Treffer. Ohne diese Schranke
 * koennte der Scanner 0 Deklarationen melden und "keine" sagen, und niemand
 * wuerde es merken.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanner = path.join(root, 'tests', 'find-tdz-traps.mjs');

/*
 * Das Skript importiert 'espree'. Wird es in ein Verzeichnis unter os.tmpdir()
 * kopiert, findet Node das Paket nicht ("Cannot find package 'espree'") und
 * der Test schlaegt an der Aufloesung fehl statt an der Logik. Deshalb wird
 * die Kopie innerhalb des Repos abgelegt, wo node_modules aufloesbar ist.
 */
const tmpRoot = path.join(root, 'tests', '.tmp-tdz');
fs.mkdirSync(tmpRoot, { recursive: true });

// Die Fixtures werden einzeln wieder entfernt. Das Basisverzeichnis bleibt als
// leerer Ordner liegen, weil es das Aufloesen von 'espree' ermoeglicht (es
// liegt im Repo, os.tmpdir() tut das nicht) — und wird am Ende mitgenommen.
process.on('exit', () => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* Aufraeumen ist optional; ein Rest ist harmlos, weil git leere Ordner
       ohnehin nicht versioniert. */
  }
});

function runScannerOn(source) {
  // Das Skript liest assets/app.js fest. Fuer den Test wird ein Verzeichnis
  // gebaut, das wie das Repo-Root aussieht, aber im Repo liegt.
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'case-'));
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'app.js'), source);
  fs.copyFileSync(scanner, path.join(dir, 'tests', 'find-tdz-traps.mjs'));
  try {
    return execFileSync('node', [path.join(dir, 'tests', 'find-tdz-traps.mjs')], {
      encoding: 'utf8',
      timeout: 120000,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('der Scanner findet den echten Notes-TDZ-Bug', () => {
  // Wortwörtlich die Form aus dem Kommentar des Scanners: paintVaultBtn()
  // liest notesVault, wird vor der Deklaration aufgerufen, und die
  // Deklaration steht weiter unten in derselben Funktion.
  const src = `
function buildNotes() {
  function paintVaultBtn() {
    if (notesVault === 'aes-gcm') { /* ... */ }
  }
  paintVaultBtn();
  let notesVault = null;
}
`;
  const out = runScannerOn(src);
  assert.match(out, /Potenzielle TDZ-Fallen: 1/, `Scanner meldete:\n${out}`);
  assert.match(out, /notesVault/, `Scanner meldete:\n${out}`);
  // Und er muss die Zeilen nennen, sonst ist die Meldung nutzlos. Die
  // Fixture beginnt mit einem Leerzeichen-Zeilenumbruch, deshalb ist die
  // Deklaration Zeile 7, nicht 6.
  assert.match(
    out,
    /Z\d+ notesVault: gelesen in paintVaultBtn\(\)/,
    `Scanner meldete:\n${out}`,
  );
  assert.match(
    out,
    /paintVaultBtn\(\) ab Z\d+/,
    `Scanner nennt die Fundstelle der lesenden Funktion nicht:\n${out}`,
  );
});

test('der Scanner meldet keinen Aufruf NACH der Deklaration', () => {
  // Gleiche Form, aber der Aufruf steht hinter der Deklaration. Das ist
  // legaler Code und darf nicht als Falle gelten.
  const src = `
function buildNotes() {
  let notesVault = null;
  function paintVaultBtn() {
    if (notesVault === 'aes-gcm') { /* ... */ }
  }
  paintVaultBtn();
}
`;
  assert.match(runScannerOn(src), /Potenzielle TDZ-Fallen: 0/);
});

test('der Scanner meldet keinen Leser in einer anderen Funktion', () => {
  // `helper()` liest `state`, wird aber erst aufgerufen, nachdem `build()`
  // fertig ist. `helper` steht im gleichen Block, wird also nicht als
  // early-call erkannt — genau der Fehlgriff, der in v1 508 Fehlalarme
  // erzeugt hat.
  const src = `
function outer() {
  function helper() {
    return state;
  }
  function build() {
    let state = 1;
    helper();
  }
  build();
}
`;
  assert.match(runScannerOn(src), /Potenzielle TDZ-Fallen: 0/);
});

test('der Scanner sieht den echten app.js vollstaendig', () => {
  // Anti-Vakuum: der Scanner muss den ganzen Bestand traversieren, nicht
  // nur die ersten paar Zeilen. 1330 ist der gemessene Wert fuer die
  // Fassung von 2.11.51; die Schwelle liegt bewusst darunter, damit ein
  // normaler Diff nicht alarmiert, ein kaputter Traverser aber schon.
  const out = execFileSync('node', [scanner], { encoding: 'utf8', timeout: 120000 });
  const m = /let\/const-Deklarationen geprueft: (\d+)/.exec(out);
  assert.ok(m, `keine Zaehlzeile in:\n${out}`);
  const n = Number(m[1]);
  assert.ok(n >= 1200, `nur ${n} Deklarationen gesehen — Traversierung bricht ab`);
  assert.match(out, /Potenzielle TDZ-Fallen: 0/, `app.js hat plötzlich Fallen:\n${out}`);
});

test('der Scanner braucht keine Zeit mehr', () => {
  // Vorher > 300 s (Timeout). Ohne diese Schranke koennte jemand die alte
  // Fassung zurueckkopieren und niemand wuerde es bemerken.
  const t0 = Date.now();
  execFileSync('node', [scanner], { encoding: 'utf8', timeout: 60000 });
  const ms = Date.now() - t0;
  assert.ok(ms < 20000, `Scanner brauchte ${ms} ms — die alte O(n^3)-Fassung?`);
});
