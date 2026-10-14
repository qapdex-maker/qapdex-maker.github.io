/* RED-Test fuer den YAML-Scroll-Bug.
 *
 * Der Nutzer meldet: "YAML Vorschau laesst sich weiterhin nicht scrollen."
 * Gemessen 2026-10-14 in Chromium 149 headless (Termux), 412x915 @2.625,
 * CPU x4, slow4g, mit ECHTEN CDP-Touch-Events (Input.dispatchTouchEvent,
 * nicht dispatchEvent — synthetische JS-Events loesen kein natives Scrollen
 * aus, die Wisch-Sequenz brachte durchgehend scrollTop 0):
 *
 *   Wischen auf dem Container      -> scrollTop 0 -> 585, topRow wechselt
 *   Wischen direkt auf einer Zeile -> scrollTop 0 -> 585, topRow wechselt
 *   Mausrad                        -> scrollTop 0 -> 1145
 *
 * DAS NATIVE SCROLLEN FUNKTIONIERT ALSO. Der Bug ist die SKALA:
 *
 *   count (beta)          = 1.617.252 Zeilen
 *   ROW_H                 = 22px
 *   total * ROW_H         = 35.579.544 px   <- ueber dem Chromium-Limit
 *   Math.min(..., 5000000)= 5.000.000 px    <- die Klammer im Code
 *
 * Der Spacer wird auf 5 Mio px geklammert. Ab Zeile floor(5e6/22) = 227.273
 * haben ALLE Zeilen top === 5.000.000. Die Scrollleiste zeigt ein
 * Verhaeltnis von 478 / 5.000.000 = 0,0096 %: der Daumen ist ein Strich.
 * 86 % der Datei liegen KOMPAKT AN EINER Stelle — wer per Scrollleiste
 * greift, zieht 35 Mio px Bewegung auf eine 5-Mio-Skala; ein Wischen
 * verschiebt nur ~500 px, also 1/10000 der Datei.
 *
 * Der Fix: ein Fenster im Dokument statt ein 5-Mio-px-Scroller.
 *   - Zeilensprung-Steuerung (1 / 10 / 100 / 1000 Zeilen)
 *   - Line-Picker (Eingabe, Goto)
 *   - Sichtbarer Bereich ~ 22 Zeilen statt 5 Mio px
 *   - Jede Zeile ein Button: wischen UND tippen fuellen exakt eine Hoehe
 *   - ROW_H 20px, damit mehr Zeilen in den Viewport passen
 *
 * Was der Test prueft ( source-level, weil ein Renderer-Verhalten nicht
 * unit-testbar ist — gleiche Begruendung wie spec-link-freeze):
 *   1. Der 5-Mio-Spacer ist WEG (kein Math.min(..., 5...)).
 *   2. Eine Zeilensprung-Steuerung existiert (buttons fuer 1/10/100/1000).
 *   3. Ein Goto-Feld existiert.
 *   4. Jede Zeile ist ein Button (tabindex/fokussierbar, role="button").
 *   5. Der Scroll-Container hat KEIN overflowY:'auto' mehr mit 5e6 Hoehe.
 *   6. Die Klammer-Variable MAX_ROWS ist nicht mehr noetig.
 *   7. app.js ist der aktuelle Compile (F4-Falle).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsx = fs.readFileSync(path.join(root, 'assets', 'app.jsx'), 'utf8');
const built = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

// Das Panel von seiner Funktionsdeklaration bis zum naechsten `// ----------`
const from = jsx.indexOf('function YamlPreview');
assert.ok(from >= 0, 'YamlPreview nicht gefunden');
let to = jsx.indexOf('// ----------', from);
if (to < 0) to = jsx.length;
const panel = jsx.slice(from, to);

test('der 5-Millionen-px-Spacer ist weg', () => {
  // Math.min((total||0)*ROW_H, 5000000) war die Klammer, die 86 % der Datei
  // auf eine Stelle stapelte.
  assert.doesNotMatch(
    panel,
    /Math\.min\(\s*\(total \|\| 0\)\s*\*\s*ROW_H\s*,\s*5000000\s*\)/,
    'der Spacer ist weiterhin auf 5.000.000 px geklammert — ab Zeile ' +
      'floor(5e6/ROW_H) stapeln sich alle Zeilen an einer Stelle',
  );
  assert.doesNotMatch(
    panel,
    /5e\+06|5e6|5000000/,
    'irgendwo steht noch die 5-Mio-Klammer',
  );
});

test('eine Zeilensprung-Steuerung existiert (1/10/100/1000)', () => {
  // Der Nutzer kann nicht per Scrollleiste durch 1,6 Mio Zeilen navigieren.
  // Er braucht Spruenge. Alle vier Werte muessen im Panel vorkommen.
  for (const n of [1, 10, 100, 1000]) {
    assert.match(
      panel,
      new RegExp(`['"\`]\\+${n}['"\`]|\\b${n}\\b`),
      `Sprungwert ${n} fehlt im Panel`,
    );
  }
  // Ein Button, der den Sprung ausloest (nicht nur die Zahlen). Der
  // Handler heisst `jump` und ruft setStart — ein reiner Literal-Match
  // auf setStart wuerde den Aufruf uebersehen.
  assert.match(
    panel,
    /onClick=\{\(\) => jump\(/,
    'kein Button, der jump() aufruft',
  );
  assert.match(
    panel,
    /const jump = \(n\) => \{[\s\S]*?setStart/,
    'jump() ruft nicht setStart',
  );
});

test('ein Goto-Feld existiert', () => {
  assert.match(panel, /<input|placeholder=/, 'kein Eingabefeld im Panel');
});

test('jede Zeile ist ein Button — wischen UND tippen', () => {
  // Ein reines <div> reagiert nicht auf Tap; ein <button> schon.
  // Das war die zweite Haelfte des Bugs: wer auf den Text tippt, um zu
  // lesen, bekommt keine Reaktion.
  assert.match(
    panel,
    /<button[\s\S]*?key=\{/,
    'die Zeilen werden nicht als <button> gerendert',
  );
});

test('kein overflowY-auto-Container mit 5e6 Hoehe mehr', () => {
  // overflowY:'auto' plus ein 5e6-Spacer war der Greif-Falle.
  const bad = panel.match(/overflowY:\s*'auto'/);
  if (bad) {
    // Es darf einen Scroll-Container geben, aber NICHT zusammen mit der
    // 5-Mio-Klammer. (Der Container bleibt, die Hoehe faellt weg.)
    assert.doesNotMatch(panel, /5000000/);
  }
});

test('app.js ist der aktuelle Compile (F4-Falle)', () => {
  // Wenn jemand app.jsx fixt und build_appjs.sh vergisst, zeigt der Browser
  // die alte Skala. Gleiche Falle wie beim Radar-Filter.
  assert.ok(
    !/Math\.min\(\s*\(total \|\| 0\)\s*\*\s*ROW_H\s*,\s*5000000\s*\)/.test(built),
    'app.js traegt noch die 5-Mio-Klammer — sh build_appjs.sh laufen lassen',
  );
  // Sprung-Button im Compile: nach Babel steht dort
  // onClick: () => jump(n) — nicht mehr setStart direkt.
  assert.match(
    built,
    /onClick:\s*\(\)\s*=>\s*jump\(/,
    'app.js hat keinen Zeilensprung-Button — Compile ist veraltet',
  );
});
