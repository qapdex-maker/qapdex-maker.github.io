// Tests für die drei jsmol-Seiten.
//
// Regel für diesen Test: Die Konfiguration wird aus der SEITE gezogen, nicht
// neben ihr abgelegt. Eine Kopie geht mit, wenn der Original driftet — dann
// testet der Test eine Datei, die es nicht mehr gibt.
//
// Ein zweiter Grund, nicht mit Regex auf den Quelltext zu arbeiten: die
// Änderung am 2026-10-02, die den Struktur-Bereich einführte, hat die
// Seiten mit einem Fehler grün gemacht. Die Zahlen standen in der Seite,
// der Test las ein anderes Feld und fand nichts, meldete "0 Dateien
// geprüft" und war grün. Ein Test, der nichts geprüft hat, ist schlimmer
// als keiner — er behauptet eine Sicherung, die nicht da ist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSMOL = path.join(ROOT, 'jsmol');
const PAGES = ['index.html', 'grid.html', 'sandbox.html'];

const read = (p) => fs.readFileSync(path.join(JSMOL, p), 'utf8');

/** Der inline <script>-Block einer Seite (nicht der src=). */
function inlineScript(page) {
  const src = read(page);
  const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length > 0, `${page}: kein inline <script>-Block gefunden`);
  return blocks.map((m) => m[1]).join('\n');
}

/** JavaScript aus dem HTML holen und mit new Function auf Syntax prüfen. */
function assertParses(page) {
  const js = inlineScript(page);
  try {
    // eslint-disable-next-line no-new-func
    new Function(js);
  } catch (e) {
    assert.fail(`${page}: inline Script ist kein gültiges JavaScript — ${e.message}`);
  }
}

// BEKANNTE LÜCKEN DIESER TESTS (Gegenprobe am 2026-10-02, nicht behebbar
// durch mehr Regex — die Kriterien prüfen Struktur, nicht Verhalten):
//
//   a) "nur eine Nachmessung" bleibt grün. Das Fenster ruft measureCell
//      rekursiv auf, eine Zählung von setTimeout-Stellen sieht beides nicht
//      unterscheiden.
//   b) "die zweite Messung entfernt" bleibt grün. Vor der Messung steht ein
//      Optionalwert, nicht zwingend colorPct().
//   c) MEASURE_MIN entfernt bleibt grün, weil der Wert in einem Vergleich
//      steckt, den ein anderer Test abdeckt.
//
// Was das heisst: diese Tests schützen vor dem, was am 2026-10-02 wirklich
// passiert ist (fehlende Datei, verschobener Kern, Syntaxfehler, toter Pfad,
// falscher j2sPath, unbegrenzte Instanzen). Sie beweisen NICHT, dass das
// Nachmess-Fenster im Browser wirkt — das wurde gemessen, 7,86 -> 67,56 %
// über 18 Sekunden, steht aber in keinem Test.

test('alle drei Seiten sind vorhanden und nicht leer', () => {
  for (const p of PAGES) {
    const f = path.join(JSMOL, p);
    assert.ok(fs.existsSync(f), `jsmol/${p} fehlt`);
    assert.ok(fs.statSync(f).size > 2000, `jsmol/${p} ist verdächtig klein`);
  }
});

test('inline Script jeder Seite ist syntaktisch gültig', () => {
  // Diese Prüfung hat einen echten Fehler gefangen: eine Regex hatte den
  // "//"-Präfix eines Kommentars mitgefressen, es blieb eine nackte Linie
  // aus Bindestrichen, und die Seite war tot OHNE Fehlermeldung im Browser.
  for (const p of PAGES) assertParses(p);
});

test('j2s-Kern liegt neben JSmol.min.js, nicht in einem Unterordner', () => {
  // Jmol lädt den Kern über j2sPath relativ zur Seite. Ein verschobenes
  // j2s/ lässt den Viewer laden und nichts anzeigen — ohne Fehlermeldung.
  assert.ok(fs.existsSync(path.join(JSMOL, 'JSmol.min.js')));
  assert.ok(fs.existsSync(path.join(JSMOL, 'j2s', 'core', 'corejmol.z.js')));
  assert.ok(fs.existsSync(path.join(JSMOL, 'j2s', 'Jmol.properties')));
});

test('j2sPath zeigt auf das j2s-Verzeichnis neben der Seite', () => {
  for (const p of PAGES) {
    const js = inlineScript(p);
    const m = js.match(/j2sPath\s*:\s*'([^']+)'/);
    assert.ok(m, `${p}: kein j2sPath gefunden`);
    assert.equal(m[1], 'j2s', `${p}: j2sPath ist "${m[1]}", erwartet "j2s"`);
  }
});

test('keine absoluten /jsmol-Pfade in den Seiten', () => {
  // Eine Subpage mit absolutem /assets oder /jsmol läuft unter
  // qapdex-maker.github.io/jsmol/ nicht.
  for (const p of PAGES) {
    const src = read(p);
    assert.ok(!/(src|href)="\/jsmol/.test(src),
      `${p}: absoluter /jsmol-Pfad — die Seite braucht relative Pfade`);
  }
});

test('jeder in der Seite gelistete data/-Pfad existiert im Repo', () => {
  for (const p of PAGES) {
    const js = inlineScript(p);
    const files = [...new Set([...js.matchAll(/'(data\/[^']+)'/g)].map((m) => m[1]))];
    assert.ok(files.length > 0,
      `${p}: keine data/-Pfade gefunden — der Test prüft dann nichts und wäre grün`);
    for (const f of files) {
      assert.ok(fs.existsSync(path.join(JSMOL, f)),
        `${p}: ${f} ist gelistet, aber nicht vorhanden`);
    }
  }
});

test('index.html listet genau die Strukturen, die im data/-Ordner liegen', () => {
  // Beide Seiten muessen zusammenpassen: eine Datei im Ordner ohne
  // Listeneintrag ist toter Bestand, ein Eintrag ohne Datei ist ein 404
  // beim Klick (der Gate-Check auf PAGES oben faengt nur die zweite
  // Haelfte).
  const js = inlineScript('index.html');
  const listed = new Set([...js.matchAll(/'data\/([^']+)'/g)].map((m) => `data/${m[1]}`));
  const onDisk = new Set(
    fs.readdirSync(path.join(JSMOL, 'data'))
      .filter((f) => !f.startsWith('.'))
      .map((f) => `data/${f}`));
  const missing = [...listed].filter((f) => !onDisk.has(f));
  const unlisted = [...onDisk].filter((f) => !listed.has(f));
  assert.deepEqual(missing, [], `gelistet, aber nicht da: ${missing.join(', ')}`);
  assert.deepEqual(unlisted, [],
    `im Ordner, aber nicht gelistet (toter Bestand): ${unlisted.join(', ')}`);
});

test('sandbox.html und grid.html nutzen dieselbe Struktur-Liste wie index.html', () => {
  // grid.html hat eine eigene POOL-Liste, sandbox.html eine FILES-Liste.
  // Wenn eine Struktur in einer Seite fehlt, ist das kein Fehler — aber
  // eine Datei, die in allen drei fehlt, wird nie erreichbar.
  const sets = PAGES.map((p) => {
    const js = inlineScript(p);
    return new Set([...js.matchAll(/'data\/([^']+)'/g)].map((m) => m[1]));
  });
  const all = new Set();
  for (const s of sets) for (const f of s) all.add(f);
  assert.ok(all.size >= 19, `nur ${all.size} Strukturen gesamt, erwartet mindestens 19`);
});

test('DE/EN: jede data-de hat ein data-en und umgekehrt', () => {
  for (const p of PAGES) {
    const src = read(p);
    // Paarweise vergleichen, nicht nur zaehlen. Zaehler allein liess einen
    // halb uebersetzten Button zu, wenn ein data-de entfernt und ein
    // data-en stehen blieb — gleiche Anzahl, andere Elemente.
    const pairs = [...src.matchAll(/data-de="([^"]*)"[^>]*?data-en="([^"]*)"/g)];
    const de = [...src.matchAll(/data-de="([^"]*)"/g)].map((m) => m[1]);
    const en = [...src.matchAll(/data-en="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(de.length > 0, `${p}: keine i18n-Attribute gefunden`);
    assert.equal(de.length, en.length,
      `${p}: ${de.length} data-de gegen ${en.length} data-en — eine Sprache fehlt`);
    assert.equal(pairs.length, de.length,
      `${p}: nur ${pairs.length} von ${de.length} Elementen tragen beide Attribute — ` +
      'die Sprachumschaltung würde einen Text unveraendert lassen');
    // Ein Wortgleichstand ist kein Fehler, wenn das Wort in beiden
    // Sprachen gleich lautet — Produktnamen ("JSmol Workbench", "MolGrid",
    // "MolSandbox"), das Lehnwort "Screenshot", oder "Portal", das auf
    // Deutsch und Englisch identisch ist. Alle zehn Vorkommen in den drei
    // Seiten sind am 2026-10-02 von Hand geprueft.
    //
    // Ein Befund waere ein Wortgleichstand bei einem Satz, der sich
    // uebersetzen laesst: "Zurücksetzen" statt "Reset" heisst, der
    // englische Text fehlt. Das faellt unter "leer" nicht, also wird es
    // hier getrennt geprueft: mindestens eine Seite muss einen Text haben,
    // der laenger ist als ein einzelnes Wort — sonst ist die Seite
    // unvollstaendig uebersetzt.
    for (const [m, d, e] of pairs) {
      assert.ok(d.trim().length > 0, `${p}: leerer deutscher Text bei ${m[0].slice(0, 40)}`);
      assert.ok(e.trim().length > 0, `${p}: leerer englischer Text bei ${m[0].slice(0, 40)}`);
    }
    // Mindestens eine echte Uebersetzung je Seite (mehrwoertrige Labels).
    const translated = pairs.filter(([d, e]) => d.trim() !== e.trim());
    assert.ok(translated.length >= 8,
      `${p}: nur ${translated.length} von ${pairs.length} Labels haben einen ` +
      'eigenen Text je Sprache — die Seite ist ueberwiegend unuebersetzt');
    // Und die andere Richtung: keine Sprache darf ausfallen. Ein Element
    // mit laengerem DE-Text und EN-Text "x" ist unuebersetzt.
    // Ein fehlender EN-Text faellt als Ein-Buchstaben-Rest auf ("S" statt
    // "Structures"). Fuer jede Seite pruefen, dass es mindestens ein Label
    // mit langem DE-Text UND eigenem langem EN-Text gibt — ein Label, bei
    // dem nur eine Seite uebersetzt wurde, faellt hier auf.
    for (const [m, d, e] of pairs) {
      assert.ok(!(d.trim().length > 6 && e.trim().length <= 2),
        `${p}: EN-Text fehlt fuer "${d}" (gefunden: "${e}")`);
      assert.ok(!(e.trim().length > 6 && d.trim().length <= 2),
        `${p}: DE-Text fehlt fuer "${e}" (gefunden: "${d}")`);
    }
    const bothTranslated = pairs.filter(([d, e]) =>
      d.trim().length > 6 && e.trim().length > 6 && d.trim() !== e.trim());
    assert.ok(bothTranslated.length >= 5,
      `${p}: nur ${bothTranslated.length} Labels sind in beiden Sprachen ` +
      'ausgeschrieben — die Sprachumschaltung trifft kaum einen Text');
  }
});

test('das inline Script jeder Seite ist ausgewogen', () => {
  // Warum nicht selbst zaehlen: Klammern in Regex-Literalen sind keine
  // Klammern. "/^\\s*screenshot\\s+(\\w+)/i" hat eine offene "(" im
  // Regex und eine schliessende fuer den Aufruf — ein eigener Zaehler
  // meldete hier "Rest 2" auf korrektem Code (gemessen am 2026-10-02).
  //
  // Warum new Function allein nicht reicht: eine unbalancierte Klammer am
  // Dateiende ergibt einen leeren Block mit gueltiger Syntax. Die Seite tut
  // nichts mehr, und new Function sagt nichts. Genau das war der Zustand,
  // in dem sandbox.html nach dem Entfernen des Upload-Blocks stand.
  //
  // Die Kombination: new Function muss durchlaufen (kein Syntaxfehler mitten
  // im Code) UND der Block muss einen Funktionskoerper enthalten, der
  // tatsaechlich etwas aufruft. Ein leerer Block faellt durch "kein boot()".
  for (const p of PAGES) {
    const js = inlineScript(p);
    assertParses(p);

    // Ein Block, der nichts aufruft, ist ein toter Block.
    assert.ok(/\bboot\(\)/.test(js) || /DOMContentLoaded/.test(js),
      `${p}: der inline Script-Block ruft nichts auf — die Seite ist tot ` +
      '(genau der Zustand nach dem Regex-Vorfall vom 2026-10-02)');

    // Und: es gibt eine Funktion, die den Viewer baut.
    assert.ok(/getAppletHtml/.test(js),
      `${p}: kein getAppletHtml — kein JSmol-Applet wird erzeugt`);
    assert.ok(/getAppletHtml\([^)]*info\s*\)|getAppletHtml\(\s*id\s*,/.test(js),
      `${p}: getAppletHtml wird ohne Info-Objekt oder ohne Variablenname aufgerufen`);
  }
});

test('sandbox.html meldet keine Erfolge, die sie nicht geprueft hat', () => {
  // Jmol.script() gibt keine Rueckgabe: ein unbekannter Befehl geht durch.
  // Die Seite darf deshalb kein bedingungsloses "ok" schreiben, sondern
  // muss die Farbquote vergleichen.
  const js = inlineScript('sandbox.html');
  assert.ok(/colorPct\(\)/.test(js), 'sandbox.html: colorPct() fehlt');
  const logOk = /log\('ok'/.test(js);
  assert.ok(logOk, 'sandbox.html: keine ok-Meldung im Log');
  // Jede ok-Meldung muss an eine Messung gebunden sein.
  assert.ok(/before/.test(js) && /after/.test(js),
    'sandbox.html: kein vorher/nachher-Vergleich — die ok-Meldung waere eine Behauptung');
  // Anwesenheitspruefung reichte nicht: im Gegenlauf am 2026-10-02 reichte
  // "var before = null", die beiden Namen standen weiter im Text und der
  // Test blieb gruen. Geprueft wird die Reihenfolge: der Wert wird
  // GEMESSEN, dann verglichen, und die ok-Meldung haengt am Vergleich.
  // Messen, vergleichen, melden — in dieser Reihenfolge, und an beiden
  // Stellen (Befehl und Strukturwechsel).
  const measures = (js.match(/=\s*colorPct\(\)/g) || []).length;
  const compares = (js.match(/Math\.abs\(\s*after\s*-\s*before\s*\)/g) || []).length;
  const sameVars = (js.match(/var same = before !== null/g) || []).length;
  assert.ok(measures >= 2, `sandbox.html: ${measures} Messung(en) — Befehl und Dateiwechsel muessen beide messen`);
  assert.ok(compares >= 1, 'sandbox.html: before/after werden nicht verglichen');
  assert.ok(sameVars >= 1, 'sandbox.html: kein "same"-Vergleich — der Befehl wird nicht als unwirksam erkannt');
  // Die ok-Zeile muss hinter einem Vergleich liegen, nicht davor.
  const okIdx = js.indexOf("log('ok', t('ok')");
  const cmpIdx = js.search(/Math\.abs\(\s*after\s*-\s*before\s*\)/);
  assert.ok(okIdx > -1 && cmpIdx > -1 && okIdx > cmpIdx,
    'sandbox.html: die ok-Meldung steht vor dem Vergleich — sie kann das Ergebnis nicht kennen');
  // Und: es darf keinen Weg geben, der ohne Vergleich "ok" schreibt.
  assert.ok(!/log\('ok'[^\n]*\)\s*;\s*\n\s*\}/.test(js) ||
             /before/.test(js),
    'sandbox.html: eine ok-Meldung ohne Messbezug');
  // und: es gibt eine Meldung fuer "kein sichtbarer Unterschied"
  assert.ok(/noVisible/.test(js),
    'sandbox.html: kein Hinweis auf einen Befehl ohne sichtbaren Effekt');
});

test('die verworfenen Upload-Wege sind nicht als Code vorhanden', () => {
  // Vier Wege wurden am 2026-10-02 gemessen und verworfen. Sie duerfen nicht
  // wieder auftauchen — die Begriffe stehen nur im Kommentar.
  const js = inlineScript('sandbox.html').replace(/\/\/[^\n]*/g, '');
  for (const dead of ['createObjectURL', 'load inline', 'data:text/plain']) {
    assert.ok(!js.includes(dead),
      `sandbox.html: "${dead}" ist wieder im Code — der Weg war verworfen`);
  }
  assert.ok(!fs.existsSync(path.join(JSMOL, 'drop-sw.js')),
    'jsmol/drop-sw.js existiert — der Cache-Weg konnte den Kern nicht lesen');
});

test('grid.html begrenzt die Instanzen und misst jede Zelle selbst', () => {
  const js = inlineScript('grid.html');
  const m = js.match(/MAX_INSTANCES\s*=\s*(\d+)/);
  assert.ok(m, 'grid.html: MAX_INSTANCES nicht gefunden');
  const max = Number(m[1]);
  assert.ok(max >= 4 && max <= 24,
    `MAX_INSTANCES ist ${max} — gemessen tragen 32 (2D-Pfad), 12 ist der sichere Wert`);
  assert.ok(/measureCell/.test(js),
    'grid.html: keine Selbstmessung der Zellen — eine ready-meldung ohne Bild ist ein Loch');
  assert.ok(/RETRIES/.test(js) && /MEASURE_MIN/.test(js),
    'grid.html: kein Nachmess-Fenster — die Tunnel-Zelle wurde als failed markiert, bevor sie fertig war');
  // Und es muss wirklich ein Fenster sein: RETRIES = 0 heisst "einmal
  // messen und bei Bedarf aufgeben", also genau der Zustand, der die
  // 11-von-12-Anzeige erzeugt hat. Bei der Gegenprobe am 2026-10-02 blieb
  // ein Test mit RETRIES > 0 als blosse Anwesenheitspruefung gruen.
  const retries = /var RETRIES = (\d+)/.exec(js);
  assert.ok(retries && Number(retries[1]) >= 3,
    `grid.html: RETRIES ist ${retries ? retries[1] : 'unbekannt'} — ` +
    'mit 0 oder 1 faellt die nachladende Zelle wieder durch');
  const retryCall = (js.match(/setTimeout\(\s*function\s*\(\)\s*\{\s*measureCell/g) || []).length;
  assert.ok(retryCall >= 2,
    `grid.html: measureCell wird ${retryCall}-mal per setTimeout nachgerufen — ` +
    'ein Aufruf ist kein Fenster (bei der Gegenprobe am 2026-10-02 blieb ' +
    'ein Test mit einem einzigen Aufruf gruen, obwohl ohne Nachmessen die ' +
    'nachladende Zelle durchfaellt)');
});

test('die Budget-Grenze im Gate passt zur tatsächlichen Größe', () => {
  const gate = fs.readFileSync(path.join(ROOT, 'deploy-hygiene.js'), 'utf8');
  const m = gate.match(/JSMOL_BUDGET_MB\s*=\s*(\d+)/);
  assert.ok(m, 'deploy-hygiene.js: JSMOL_BUDGET_MB nicht gefunden');
  const budget = Number(m[1]);
  const mb = Number(execSync(`du -sm "${JSMOL}" | cut -f1`).toString().trim());
  assert.ok(mb <= budget,
    `jsmol/ ist ${mb} MB, Budget ${budget} MB — die Ausschlussliste greift nicht mehr`);
  assert.ok(budget - mb < 20,
    `Budget ${budget} MB ist ${budget - mb} MB über dem Stand — zu weit, ein Unfall fällt nicht auf`);
});
