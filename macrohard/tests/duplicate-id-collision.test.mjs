import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Eine doppelte Element-ID macht jeden Lookup zum Roulette.
 *
 * `getElementById(id)` und `querySelector('#id')` liefern dann NICHT das
 * Element, das der Entwickler meint — sie liefern die erste passende Node im
 * Dokument. Wenn ein Container und ein Steuerelement dieselbe ID tragen,
 * entscheidet die Dokumentreihenfolge über die Funktion.
 *
 * Gemessen in Chromium am 2026-09-30, alle 25 Apps geöffnet:
 *
 *   stGrid       DIV.stGrid (Settings-Container)  |  INPUT.checkbox
 *   ieRotate     BUTTON.cBtn (ImgEditor)           |  INPUT.range
 *   beatpadBpm   SELECT (Beatpad-Header)           |  INPUT.number
 *   mdPreview    BUTTON.cBtn (Docs-Toolbar)         |  DIV.mdPreview
 *
 * Daraus drei echte Fehler, jeder einzeln reproduziert:
 *
 * 1. stGrid — `classList.toggle('show-grid', div.checked)` mit `checked ===
 *    undefined` ist ein Flippen statt eines Setzens, und
 *    `undefined ? '1' : '0'` schreibt IMMER '0'. Gemessen:
 *      A) frisch geöffnt      deskClass=""          os_grid=null
 *      B) Nutzer schaltet ein deskClass="show-grid"  os_grid="0"  <-- falsch
 *      D) neu geöffnet       deskClass=""          checkbox=false <-- Einstellung weg
 *      F) nach Reload        deskClass=""
 *    Die Einstellung überlebt weder das Schließen des Fensters noch einen
 *    Reload — obwohl sie im Moment des Klicks sichtbar funktioniert.
 *
 * 2. ieRotate — `toolbar.querySelector('#ieRotate')` findet den ROTATE-Knopf,
 *    nicht den Bereichsregler. Der Regler hängt seinen `input`-Handler an
 *    `document.getElementById('ieRotate')`, der Knopf seinen `click`-Handler.
 *    Gemessen: Regler auf 90 -> "ieRotateVal" bleibt "0°"; Rotate klicken ->
 *    Canvas-Pixel unverändert (11034 -> 11034). Beides tot.
 *
 * 3. mdPreview — `querySelector('#mdPreview')` findet den TOGGLE-Knopf. Die
 *    Docs-Toolbar besitzt außerdem gar keine Verdrahtung: alle zehn Buttons
 *    (mdBold … mdPreview) kommen im restlichen Code genau einmal vor, nämlich
 *    im Markup-String. Mit markiertem Text gemessen: `boldWirkt: false`.
 *    Nur der separat in buildDocs() erzeugte "Preview"-Knopf (id mdPrev)
 *    funktioniert. Die Toolbar ist eine tote Attrappe.
 *
 * Die Assertion-Meldungen nennen bewusst nur den Fund, nicht den Quelltext —
 * ein 350 KB-Dump im Testlog ist unlesbar und wird ignoriert.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

/** Flucht für Regex-Metazeichen. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Prüft eine Bedingung mit einer kurzen, benannten Meldung. */
function require_(condition, message) {
  assert.ok(condition, message);
}

/**
 * Die openApp()-Cases und ihre Markup-Strings.
 * @returns {Map<string, string>} App-ID -> Markup
 */
function markupCases() {
  const start = app.indexOf('switch (id) {');
  const end = app.indexOf('\n    }', start);
  require_(start > 0 && end > start, 'openApp()-Markup nicht gefunden');
  const markup = app.slice(start, end);
  const byApp = new Map();
  const caseRe = /case '([a-z0-9]+)':\s*body\s*=\s*([\s\S]*?)\n\s*break;/g;
  let m;
  while ((m = caseRe.exec(markup))) byApp.set(m[1], m[2]);
  return byApp;
}

/** Alle id="..." eines Markup-Strings. */
function idsIn(html) {
  return [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * IDs, die openApp() ins Fenster schreibt und die der Builder ein zweites
 * Mal erzeugt — als `.id = 'x'` oder über innerHTML.
 */
function duplicateIds() {
  const found = [];
  for (const [appName, html] of markupCases()) {
    for (const id of new Set(idsIn(html))) {
      const inMarkup = (html.match(new RegExp(`id="${esc(id)}"`, 'g')) || []).length;
      // Ein Builder, der dieselbe ID noch einmal setzt:
      //   el.id = 'stGrid';   /   label.innerHTML = '... id="stGrid" ...';
      const viaAssignment = new RegExp(`\\.id\\s*=\\s*'${esc(id)}'`).test(app);
      const viaInnerHtml = new RegExp(`innerHTML[^\\n]*id="${esc(id)}"`).test(app);
      // Ein `.id = 'x'` im FALLBACK-Zweig (`a || (() => { el.id='x'; })()`) ist
      // kein Duplikat: die Node entsteht nur, wenn es die erste nicht gibt.
      const isFallback = new RegExp(`\\|\\|\\s*\\(\\(\\)\\s*=>\\s*\\{[\\s\\S]{0,200}?\\.id\\s*=\\s*'${esc(id)}'`).test(app);
      if (inMarkup > 1 || viaAssignment || viaInnerHtml) {
        // mdPrev: im Markup vorhanden UND als Fallback erzeugt — das ist
        // ausdrücklich erlaubt und kein Duplikat im Dokument.
        const onlyFallback = isFallback && inMarkup === 1 && !viaInnerHtml;
        if (onlyFallback) continue;
        found.push({
          app: appName,
          id,
          imMarkup: inMarkup,
          viaAssignment,
          viaInnerHtml,
        });
      }
    }
  }
  return found;
}

test('keine App erzeugt eine Element-ID zweimal im selben Fenster', () => {
  const dupes = duplicateIds();
  const lines = dupes.map(
    (d) =>
      `  ${d.app}: #${d.id}` +
      (d.imMarkup > 1 ? ` (${d.imMarkup}x im Markup)` : '') +
      (d.viaAssignment ? ' (zusätzlich per .id =)' : '') +
      (d.viaInnerHtml ? ' (zusätzlich per innerHTML)' : ''),
  );
  assert.deepEqual(
    dupes.map((d) => `${d.app}:${d.id}`),
    [],
    'Doppelte IDs:\n' + lines.join('\n') +
      '\ngetElementById/querySelector liefern dann die erste Node im Dokument.',
  );
});

/**
 * Der Grid-Schalter liest seinen Zustand über `getElementById('stGrid')` —
 * und das ist der DIV-Container, dessen `.checked` undefined ist. Der
 * Restore-Pfad benutzt gridEl (korrekt gescoped), der Change-Handler nicht.
 * Diese Inkonsistenz darf nicht zurückkehren.
 */
test('der Raster-Schalter liest die Checkbox, nicht den gleichnamigen Container', () => {
  const start = app.indexOf('/* Grid toggle */');
  const end = app.indexOf('function refreshUI()');
  require_(start > 0 && end > start, 'Grid-Block nicht gefunden');
  const block = app.slice(start, end);

  require_(
    !/document\.getElementById\('stGrid'\)\.checked/.test(block),
    "getElementById('stGrid') ist der DIV-Container, nicht die Checkbox: " +
      '.checked ist undefined, classList.toggle flippt statt zu setzen, ' +
      "und der Storage-Wert ist immer '0'.",
  );
  require_(
    /gridEl\.checked|gridLabel\.querySelector\('#stGrid'\)/.test(block),
    'der Handler muss die bereits gescopte Checkbox-Referenz (gridEl) benutzen',
  );
});

/**
 * Nach dem Collide-Fix bleibt eine zweite, eigenständige Lücke: es gab nur
 * einen Restore-Pfad für den AUS-Zustand (in buildSettings, `gd === '0'`).
 * os_grid='1' wurde nirgends angewendet — die Einstellung überlebte das
 * Schließen des Settings-Fensters, aber keinen Reload.
 *
 * Gemessen in Chromium 2026-09-30: nach dem ID-Fix schrieb der Schalter
 * korrekt '1', ein Reload lieferte trotzdem `#deskIcons class=""`.
 */
test('der Raster-Zustand wird auch beim Boot angewendet', () => {
  const start = app.indexOf('function restoreAppearance()');
  const end = app.indexOf('function showAboutDialog()');
  require_(start > 0 && end > start, 'restoreAppearance() nicht gefunden');
  const fn = app.slice(start, end);

  require_(
    /storeGet\('os_grid'\)|localStorage\.getItem\('os_grid'\)/.test(fn),
    "restoreAppearance() muss os_grid lesen — sonst ist der Schalter nach " +
      'einem Reload aus, obwohl er eingeschaltet war',
  );
  require_(
    /show-grid/.test(fn),
    'der Boot-Restore muss die Klasse show-grid setzen, nicht nur den Wert lesen',
  );
  // Und es muss VOR dem ersten Paint laufen, wie der Rest der Funktion.
  const boot = /DOMContentLoaded[\s\S]{0,300}restoreAppearance\(\)/.exec(app);
  require_(boot, 'restoreAppearance() muss beim Boot laufen, nicht beim Öffnen von Settings');
});

/**
 * ieRotate: Regler und Knopf teilen sich die ID. Der Regler braucht seinen
 * `input`-Handler an der RANGE-Node, der Knopf seinen `click`-Handler an der
 * BUTTON-Node — beides per querySelector auf derselben ID geht nicht.
 */
test('Dreh-Regler und Dreh-Knopf teilen sich keine ID', () => {
  /* Der Knopf darf #ieRotate behalten — er ist der erste Treffer und
   * `toolbar.querySelector('#ieRotate')` soll ihn finden. Der Regler muss eine
   * eigene ID tragen, sonst hängt sein input-Handler am Knopf. */
  const slider = /<input type="range" id="([a-zA-Z0-9]+)"[^>]*min="0" max="360"/.exec(app);
  require_(slider, 'Dreh-Bereichsregler (0-360) nicht gefunden');
  require_(
    slider[1] !== 'ieRotate',
    `der Bereichsregler trägt die ID #${slider[1]}, die der Rotate-Knopf schon ` +
      'belegt — querySelector im Toolbar findet dann den Knopf statt des Reglers',
  );
  require_(
    /ieRotateWrap\.querySelector\('#ieRotateSlider'\)\.addEventListener\('input'/.test(app) ||
      /ieRotateWrap\.querySelector\('#' \+ slider[1] \.slice\(0,0\) \|\|/.test(app) ||
      app.includes(`ieRotateWrap.querySelector('#${slider[1]}')`),
    `der input-Handler des Reglers muss über ieRotateWrap laufen, nicht global`,
  );
  require_(
    !/document\.getElementById\('ieRotate'\)\.addEventListener\('input'/.test(app),
    "getElementById('ieRotate') ist der Knopf — dessen 'input' feuert nie",
  );
});

/**
 * Die Docs-Toolbar verspricht zehn Bedienelemente. Sie sind sichtbar und tun
 * nichts, weil keines verdrahtet ist. Geprüft wird die Eigenschaft: jedes
 * Toolbar-id muss im Code AUSSERHALB des Markup-Blocks wieder vorkommen.
 */
test('jeder Docs-Toolbar-Knopf ist verdrahtet', () => {
  const cases = markupCases();
  const markup = cases.get('docs');
  require_(markup, 'Docs-Case nicht gefunden');
  const settingsAt = app.indexOf("case 'settings':");
  const docsAt = app.indexOf("case 'docs':");
  const codeOutside = app.slice(0, docsAt) + app.slice(settingsAt);

  const ids = [...new Set(idsIn(markup))].filter((id) => id.startsWith('md'));
  require_(ids.length >= 10, `erwartet >=10 Toolbar-IDs, gefunden ${ids.length}`);

  // buildDocs() verdrahtet über einen Helfer: toolbar.querySelector('#' + id).
  // Das ist eine Verdrahtung, kein Quelltext-Literal — ein Treffer auf
  // bind('mdBold' zählt daher genauso wie getElementById('mdBold').
  //
  // WICHTIG: nicht umgekehrt. Ein einzelnes `bind('md` im File beweist nichts —
  // der Test blieb so grün, als der ganze Toolbar-Block entfernt war. Geprüft
  // wird, dass JEDER der zehn Knöpfe einzeln gebunden ist.
  const bound = new Set(
    [...codeOutside.matchAll(/bind\('(md[A-Za-z]+)'/g)].map((m) => m[1]),
  );

  // Nur echte Toolbar-Knöpfe zählen als Verdrahtungslücke. Der erste Filter
  // oben (#1) bleibt als breite Warnung bestehen, dieser ist die harte
  // Gegenprobe: es müssen ALLE Knöpfe einen eigenen bind()-Aufruf haben.
  const buttonIds = new Set(
    [...markup.matchAll(/<button[^>]*id="(md[A-Za-z]+)"/g)].map((m) => m[1]),
  );
  require_(
    buttonIds.size >= 10,
    `erwartet >=10 Toolbar-Knöpfe im Markup, gefunden ${buttonIds.size}`,
  );

  const directWired = (id) =>
    new RegExp(`getElementById\\('${esc(id)}'\\)`).test(codeOutside) ||
    new RegExp(`querySelector\\([^)]*'#${esc(id)}'`).test(codeOutside) ||
    new RegExp(`querySelectorAll\\([^)]*'#${esc(id)}'`).test(codeOutside);

  const missing = [...buttonIds].filter((id) => !bound.has(id) && !directWired(id)).sort();
  assert.deepEqual(
    missing,
    [],
    'Diese Toolbar-Knöpfe haben keinen Verdrahtungsaufruf: ' +
      missing.join(', ') +
      '. Sie rendern, sie nehmen Klicks an, und nichts passiert.',
  );
});
