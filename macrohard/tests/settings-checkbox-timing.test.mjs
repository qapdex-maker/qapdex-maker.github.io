import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * The Settings checkboxes that mirror existing state never got it.
 *
 * The state-mirroring change (see theme-darkmode-separation.test.mjs) replaced
 * the hardcoded `checked` attribute with a read of the real state:
 *
 *     const gridLabel = document.createElement('label');
 *     gridLabel.innerHTML = '<input type="checkbox" id="stGrid"> ...';
 *     const gridEl = document.getElementById('stGrid');     // <-- here
 *     if (gridEl) gridEl.checked = ...;
 *     grid.appendChild(gridLabel);                           // <-- attached here
 *
 * innerHTML on a DETACHED element does not put it in the document, so
 * getElementById cannot see it and returns null. The `if (gridEl)` guard then
 * swallows the miss and the box is left unchecked. Same for stShowIcons.
 *
 * Measured in Chromium 2026-09-27, fresh boot, desktop icons visible, grid
 * enabled — both controls rendered UNCHECKED:
 *
 *   os_icons        null
 *   #deskIcons      class=""  display:flex   (icons ARE visible)
 *   #stShowIcons    false      <-- contradicts reality
 *   #stGrid         false      <-- contradicts reality
 *
 * The failure is silent by construction: the null guard that was meant to
 * make the code robust is what hides the bug. So this test does not look for a
 * null guard, it looks at the ORDER: the element must be attached before it is
 * looked up, or the lookup must be scoped to the element that owns it.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

/* The appearance pane builder, from its own definition to the next function. */
const pane = app.slice(
  app.indexOf('/* Theme Presets */'),
  app.indexOf('function refreshUI()'),
);

/**
 * Position of the first occurrence of a needle, or -1.
 */
function pos(needle, from = 0) {
  return pane.indexOf(needle, from);
}

/**
 * For a checkbox id, assert that its state is read at a point where the
 * element is actually reachable. Two acceptable shapes:
 *
 *   a) the label is appended to the DOM before the lookup, or
 *   b) the lookup is scoped to the label itself (gridLabel.querySelector),
 *      which works on a detached element.
 */
test('a settings checkbox must be reachable when its state is read', () => {
  for (const [id, owner] of [
    ['stGrid', 'gridLabel'],
    ['stShowIcons', 'iconsLabel'],
  ]) {
    const inner = new RegExp(`${owner}\\.innerHTML\\s*=\\s*'[^']*id="${id}"`).exec(pane);
    assert.ok(inner, `${owner} must build the #${id} checkbox via innerHTML`);

    const lookup = new RegExp(
      `document\\.getElementById\\('${id}'\\)|${owner}\\.querySelector\\('#${id}'\\)`,
    ).exec(pane);
    assert.ok(lookup, `#${id} must be looked up somewhere in the pane`);

    const scoped = lookup[0] === `${owner}.querySelector('#${id}')`;
    const append = new RegExp(`appendChild\\(${owner}\\)`).exec(pane);

    if (scoped) {
      // Scoped lookups are correct on a detached element by definition.
      continue;
    }

    assert.ok(
      append,
      `#${id}: the lookup is global, so ${owner} must be attached to the DOM ` +
        `first — otherwise getElementById returns null and the state is never set`,
    );
    assert.ok(
      append.index < lookup.index,
      `#${id}: ${owner} is attached at offset ${append.index} but #${id} is ` +
        `looked up at ${lookup.index} — the lookup happens while the element is ` +
        `still detached, so it returns null and the control shows the wrong state`,
    );
  }
});

test('the appearance pane does not guard the state read with a silent null check', () => {
  // The `if (gridEl)` guard is what turns a hard failure into a wrong UI. A
  // correct ordering makes the element exist, so the guard is dead code that
  // only exists to hide the bug — it must not be the only safety net.
  // Scoped lookups are correct on a detached element, so the guard may stay.
  for (const [id, varName, owner] of [
    ['stGrid', 'gridEl', 'gridLabel'],
    ['stShowIcons', 'showIconsEl', 'iconsLabel'],
  ]) {
    // Match the guard for THIS variable only — matching `gridEl` would also
    // hit the `gridEl` inside `showIconsEl` and misattribute the failure.
    const guarded = new RegExp(`if \\(${varName}\\) ${varName}\\.checked =`).test(pane);
    if (!guarded) continue;
    const scoped = pane.includes(`${owner}.querySelector('#${id}')`);
    assert.ok(
      scoped,
      `the null guard for #${id} swallows a lookup that cannot succeed — ` +
        `either attach ${owner} before the lookup or scope it to the label`,
    );
  }
});

test('the desktop-icons checkbox reads the same state the desktop uses', () => {
  // Both the setter and the checkbox must agree on one source of truth. If the
  // checkbox were derived from the DOM class while the desktop is driven by the
  // `desktopIconsHidden` variable (or vice versa) they can drift, which is the
  // bug this file is about.
  assert.match(
    app,
    /function isDesktopIconsHidden\(\)\s*\{\s*return desktopIconsHidden;/,
    'isDesktopIconsHidden must report the variable the setter writes',
  );
  const setFn = app.slice(
    app.indexOf('function setDesktopIconsHidden(hidden)'),
    app.indexOf('function isDesktopIconsHidden()'),
  );
  assert.match(
    setFn,
    /desktopIconsHidden = !!hidden;/,
    'the setter must update the variable, not only the class',
  );
  assert.match(
    setFn,
    /classList\.toggle\('hidden', desktopIconsHidden\)/,
    'the class must follow the variable, never the other way round',
  );
  // Two writers are fine as long as both derive from the SAME variable — the
  // pane sets the initial value, the setter keeps it in sync afterwards. What
  // must not happen is a second, independent source (e.g. the DOM class), which
  // is how the two could drift apart.
  const setSync = /getElementById\('stShowIcons'\)\) box\.checked = !desktopIconsHidden;/.test(
    setFn,
  );
  const paneDerives = /showIconsEl\.checked = !isDesktopIconsHidden\(\)/.test(pane);
  assert.ok(
    paneDerives,
    'the appearance pane must seed #stShowIcons from isDesktopIconsHidden()',
  );
  if (setSync) {
    // Both paths exist — assert they agree on the variable, not the class.
    assert.match(
      setFn,
      /box\.checked = !desktopIconsHidden;/,
      'the setter must sync the checkbox from the same variable the pane reads',
    );
  }
  // And whichever wins, it must be the variable, not the DOM class.
  assert.doesNotMatch(
    pane,
    /stShowIcons[\s\S]{0,120}classList\.contains\('hidden'\)/,
    'the checkbox must not be derived from the DOM class — the variable is ' +
      'the source of truth (the class follows the variable)',
  );
});

test('the grid switch drives a real style rule', () => {
  // `stGrid` toggles a `show-grid` class on #deskIcons. Until 2026-09-27 the
  // class had no rule anywhere, so the switch persisted a preference and
  // changed nothing on screen. This test recorded that as a known dead
  // control and said: flip the expectation when a real rule is added.
  //
  // That is what happened. #deskIcons.show-grid now paints the icon cells as a
  // grid, in its own rule plus one for the mobile breakpoint (the icons are
  // 88x98 there, not 78x88, so the desktop cell size would not line up).
  const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const hasRule = /show-grid/.test(css) || /show-grid/.test(html);
  assert.ok(hasRule, 'show-grid lost its rule again — the switch is dead again');

  // A rule that only sets background-color would still be a no-op visually,
  // because #deskIcons sits on #desktop and the grid has to be a repeating
  // image. So the assertion is about the mechanism, not the selector alone.
  const rule = /#deskIcons\.show-grid\{([^}]*)\}/.exec(css);
  assert.ok(rule, 'the rule must be an #deskIcons.show-grid selector');
  assert.match(
    rule[1],
    /background-image/,
    'the rule must paint something — a bare background-color is invisible on ' +
      'the desktop background',
  );
  assert.match(
    rule[1],
    /background-size/,
    'a repeating grid needs a cell size, otherwise the lines are one cell apart ' +
      'for the whole icon area',
  );
  // Ohne width:max-content zieht der position:fixed-Container das Raster ueber
  // die halbe Bildschirmbreite. Im Screenshot sichtbar geworden: Linien liefen
  // rechts neben der fuenften Icon-Spalte ins Leere. Gemessen bei 1280x633:
  // Container 420px, Icon-Reihe endet bei 423px.
  assert.match(
    rule[1],
    /width:max-content/,
    'das Raster muss auf die Icon-Flaeche begrenzt werden, sonst laeuft es ' +
      'quer ueber den Desktop',
  );
  assert.match(
    rule[1],
    /max-width:calc\(100vw/,
    'max-content allein wuerde auf schmalen Fenstern ueberstehen — die ' +
      'Breite muss begrenzt bleiben',
  );

  // Zwei Regeln: Desktop und Mobil. Ohne die zweite laeuft das Raster auf
  // Handys neben den Icons vorbei (88x98 statt 78x88 plus 12px Padding).
  const rules = css.match(/#deskIcons\.show-grid\{/g) || [];
  assert.equal(
    rules.length,
    2,
    'genau zwei Regeln erwartet — Desktop und der max-width:760px-Block. ' +
      'Fehlt eine, laeuft das Raster auf dem anderen Breakpoint daneben.',
  );

  /*
   * Die Mobil-Regel muss in einem @media(max-width:760px)-Block stehen, der
   * auch .dskApp umfasst — denn es geht darum, dass die Icon-Groesse dort
   * abweicht. Es gibt fuenf Blöcke mit dieser Breite in site.css, und der
   * ERSTE ist nicht der richtige: er endet nach 289 Zeichen, also lange vor
   * der show-grid-Regel. Ein Regex-Aufruf auf den ersten Treffer war gruen
   * gebaut und hat die Regel nie gesehen — dieselbe Falle wie beim
   * Timer-Callback-Scan, nur mit Media-Queries.
   *
   * Deshalb: alle Bloecke per Klammerzaehler (Regex kann Verschachtelung nicht)
   * und derjenige, der die show-grid-Regel enthaelt.
   */
  const mediaStarts = [];
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith('@media(max-width:760px)', i)) mediaStarts.push(i);
  }
  const mediaBlocks = mediaStarts.map((s) => {
    let depth = 0;
    for (let j = s; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) return css.slice(s, j + 1);
      }
    }
    return css.slice(s);
  });
  const withGrid = mediaBlocks.filter((b) => b.includes('#deskIcons.show-grid'));
  assert.equal(
    withGrid.length,
    1,
    `die show-grid-Regel muss in genau einem Mobil-Block stehen, ` +
      `gefunden in ${withGrid.length}`,
  );
  /* Der Schalter muss auf dem Handy etwas Sichtbares erzeugen — aber nicht
   * mehr ueber background-size.
   *
   * Grund (gemessen, 29.09.): der Mobil-Launcher ist jetzt ein Grid mit
   * repeat(auto-fill,minmax(72px,1fr)). Die Spaltenbreite steht erst nach dem
   * Layout fest; eine feste background-size legte die Rasterlinien neben die
   * Kacheln statt auf sie (genau der Fehler, den die alte Regel behoben
   * hatte — nur jetzt in der anderen Richtung). Das Raster zeichnet deshalb
   * die Kachel selbst per outline, und das wandert mit dem Grid mit.
   *
   * Der Test prueft weiterhin das Schaltverhalten, nicht die Technik. */
  assert.match(
    withGrid[0],
    /#deskIcons\.show-grid \.dskApp\{[^}]*outline/,
    'die Mobil-Regel muss das Raster an die Kachel haengen',
  );
  assert.match(
    withGrid[0],
    /#deskIcons\.show-grid\{[^}]*background-image:\s*none/,
    'die alte, feste Rasterflaeche muss auf dem Handy abgeschaltet sein — ' +
      'sonst laufen Linien neben den Kacheln',
  );
  assert.match(
    withGrid[0],
    /\.dskApp\{[^}]*height/,
    'der Mobil-Block muss die Icon-Groesse mitsetzen',
  );

  // The preference is persisted and read back, so the switch survives a reload.
  assert.match(
    pane,
    /localStorage\.setItem\('os_grid'/,
    'os_grid is still written, so the state survives a reload',
  );
});
