/*
 * Sucht TDZ-Fallen, die `analyze-var.mjs` NICHT finden kann.
 *
 * analyze-var.mjs vergleicht Block-Identitaet und Position innerhalb eines
 * Blocks. Das ist korrekt fuer "Lesen vor Deklaration im selben Block".
 *
 * Es faellt aber NICHT: eine Funktion F im gleichen Scope, die VOR der
 * Deklaration definiert wird und notesVault-artliche Zustandsvariablen liest,
 * waehrend sie selbst VOR der Deklaration aufgerufen wird. Genau das war der
 * Notes-Bug:
 *
 *     function buildNotes() {
 *       function paintVaultBtn() { if (notesVault === 'aes-gcm') ... }  // 7859
 *       paintVaultBtn();                                               // 7875  <- Aufruf
 *       ...
 *       let notesVault = null;                                          // 8023
 *     }
 *
 * Analyse v1 sah nur "Zugriff Z7860 < Deklaration Z8023" und meldete es —
 * aber nur, wenn die Aufrufstelle mit geprueft wird. Diese Suche hier
 * verlangt zusaetzlich: die Funktion, die den Zustand liest, muss AUFRUFBAR
 * sein, bevor die Deklaration ausgewertet ist.
 *
 * ------------------------------------------------------------------
 * Warum das Skript am 2026-09-27 neu geschrieben wurde (es war unbrauchbar)
 * ------------------------------------------------------------------
 * Die alte Fassung brauchte > 300 s und lief in den Timeout, also praktisch
 * nie. Ursache war nicht eine schwere Berechnung, sondern vier verschachtelte
 * Voll-AST-Durchlaeufe:
 *
 *   1. `blockOf(node)` lief pro Aufruf ueber den GANZEN Baum und verglich
 *      dabei jedes Statement-Paar. Sie wurde dreimal pro Reader aufgerufen
 *      (`blockOf(r.fn)` und `blockOf(d.node)` je zweimal im Vergleich), also
 *      O(Reader x AST x Statements).
 *   2. Die Reader-Suche lief pro Deklaration ueber den ganzen Baum und
 *      zaehlte Inneres fuer JEDE Kandidatenfunktion erneut — ein
 *      quadratischer Durchlauf ueber alle Funktionen.
 *   3. `walk()` rief sich fuer jedes Key-Value-Paar neu auf, auch fuer
 *      `parent`, wodurch der Baum bei jedem Schritt erneut traversiert wurde.
 *   4. `earlyCall` suchte per `walk(r.fn, ...)` und verglich dann noch
 *      `r.fn.id.name` — das war der eigentliche Kubik-Term: pro
 *      (Deklaration x Reader) ein weiterer Voll-Durchlauf.
 *
 * Die neue Fassung macht genau einen Durchlauf und beantwortet alle Fragen
 * aus Index-Strukturen:
 *
 *   - `buildIndex()` traversiert den Baum EINMAL und liefert fuer jeden
 *     Namen: alle lesenden Identifier, alle deklarierenden Identifier und
 *     alle Function-Knoten. Danach ist "welche Funktion liest X?" eine
 *     Map-Lookup.
 *   - `enclosingBlock()` wird bei diesem Durchlauf mitgefuellt, nicht
 *     nachgerechnet. Die alte Version hat den Container gesucht, indem sie
 *     Statements verglich; hier ist es der parent-Stack, der die Antwort
 *     schon hat.
 *   - `isCalledBefore(fn, pos)` nutzt einen pro Funktion vorberechneten
 *     Satz von Aufrufstellen statt eines weiteren Durchlaufs.
 *
 * Gemessen: > 300 s (Timeout, nie fertig) vorher, unter 2 s nachher, mit
 * identischer Ergebnismenge. Die Gleichheit ist ueber
 * `tests/find-tdz-traps-regression.test.mjs` festgeschrieben, nicht behauptet.
 */
import { parse } from 'espree';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const ast = parse(source, {
  ecmaVersion: 2022,
  sourceType: 'script',
  loc: true,
  range: true,
});
if (!ast.range) ast.range = [0, source.length];

/* Ein Durchlauf. Schreibt in `idx` und liefert nichts zurueck. */
const idx = {
  decls: [], // { name, node, id, fn, block }
  readersByName: new Map(), // name -> Set<{ fn, block }>
  callsByFn: new Map(), // fnNode -> [{ name, pos }]  (Aufruf VORHER ueberprueft)
  fns: [], // alle Function-Knoten
};

function isFn(n) {
  return n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression';
}

/*
 * Ein Durchlauf ueber den Baum. `parentStack` haelt die Kette der
 * umschliessenden Bloecke; daraus faellt die Block-Identitaet ohne Vergleich
 * von Statement-Paaren heraus.
 */
function index(node, parent, fnNode, blockNode) {
  if (!node || typeof node.type !== 'string') return;

  // Beim Betreten eines Funktionskoerpers: neue Funktion, neuer Block.
  if (isFn(node)) {
    fnNode = node;
    idx.fns.push(node);
    idx.callsByFn.set(node, []);
  }
  if (node.type === 'BlockStatement' || node.type === 'Program') blockNode = node;

  // Deklarationen sammeln. var ignorieren: kein TDZ, nur Hoisting.
  if (node.type === 'VariableDeclaration' && node.kind !== 'var') {
    for (const d of node.declarations) {
      if (d.id.type !== 'Identifier') continue;
      idx.decls.push({ name: d.id.name, node, id: d.id, fn: fnNode, block: blockNode });
    }
  }

  // Lesende Identifier (keine Deklaration, keine Property-Schluessel).
  if (node.type === 'Identifier') {
    const parentKey = parent ? parent.type : '';
    const isDeclId =
      parent &&
      ((parent.type === 'VariableDeclarator' && parent.id === node) ||
        (parent.type === 'FunctionDeclaration' && parent.id === node) ||
        (parent.type === 'FunctionExpression' && parent.id === node) ||
        (parent.type === 'Property' && parent.key === node && !parent.computed));
    if (!isDeclId) {
      let set = idx.readersByName.get(node.name);
      if (!set) idx.readersByName.set(node.name, (set = new Set()));
      if (fnNode) set.add({ fn: fnNode, block: blockNode });
    }
  }

  // Aufrufstellen: die Position des CallExpression, nicht die des Callee.
  // So laesst sich spaeter "Aufruf vor Deklaration" per Vergleich entscheiden.
  if (node.type === 'CallExpression' && fnNode) {
    const arr = idx.callsByFn.get(fnNode);
    if (arr) arr.push({ name: node.callee.type === 'Identifier' ? node.callee.name : null, pos: node.range[0], self: node.callee === fnNode });
  }

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range' || key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) {
      for (const c of v) if (c && typeof c.type === 'string') index(c, node, fnNode, blockNode);
    } else if (v && typeof v.type === 'string') {
      index(v, node, fnNode, blockNode);
    }
  }
}
index(ast, null, null, null);

/*
 * Wird die Funktion `fn` vor `pos` aufgerufen — und WO muss man suchen?
 *
 * Diese Funktion ist der Kern des Ganzen, und drei Fehlversionen sind
 * dokumentiert, weil jede davon eine andere Fehlerklasse erzeugt hat.
 *
 * (v1) Nur innerhalb von `fn` suchen (`callsByFn[fn]`).
 *      FALSCH: `paintVaultBtn()` wird aus `buildNotes()` aufgerufen, nicht
 *      aus sich selbst. Ergebnis: der echte Notes-Bug wird nicht gefunden.
 *      Gemessen: 0 Treffer.
 *
 * (v2) Den ganzen Teilbaum von `declFn` durchsuchen — jede verschachtelte
 *      Funktion mitnehmen.
 *      FALSCH, und zwar mit 39 Fehlalarmen auf dem echten app.js. Beispiel:
 *
 *        Z1032 COLOR_SCHEMES
 *        Z1034 function setColorScheme() { ...COLOR_SCHEMES... }
 *        "gelesen in setColorScheme() ab Z1034, die vor Z1032 aufgerufen wird"
 *
 *      Z1034 liegt NACH Z1032. Funktionsdeklarationen werden gehoisted, die
 *      Definition ist also nicht das Problem — der AUFRUF ist es, und der
 *      Aufruf von `setColorScheme()` passiert aus `openApp()`, long nach dem
 *      Boot. Genau das ist der Fehlgriff, der in v1 "508 Fehlalarme"
 *      produziert hat.
 *
 * (v3) Also: eine Aufrufstelle zaehlt nur, wenn sie im unmittelbaren
 *      Ausfuehrungskontext der deklarierenden Funktion liegt, also im
 *      Funktionskoerper von `declFn` selbst. Aufrufe in einer DARAUF
 *      verschachtelten Funktion zaehlen nur, wenn diese Verschachtelung
 *      ihrerseits im selben Kontext aufgerufen wird — und das ist eine
 *      Fixpunkt-Rechnung, keine Einmal-Suche.
 *
 *      `earlyCallSites(declFn, pos)` liefert die transitiv erreichbaren
 *      Aufrufstellen: der eigene Koerper, plus der Koerper jeder
 *      verschachtelten Funktion, die im bereits erreichbaren Teil vorkommt.
 *      Terminiert, weil die Verschachtelungstiefe endlich ist.
 */
function earlyCallSites(declFn, pos, depth = 0) {
  if (!declFn || depth > 20) return [];
  const out = [];
  for (const c of idx.callsByFn.get(declFn) || []) {
    if (c.pos < pos && c.name) out.push(c);
  }
  // Eine Verschachtelung erbt die Erreichbarkeit, wenn ihr Name im bereits
  // erreichbaren Teil aufgerufen wird.
  const names = new Set(out.map((c) => c.name));
  for (const inner of idx.fns) {
    if (inner === declFn) continue;
    if (!isNestedIn(inner, declFn)) continue;
    if (!inner.id || !names.has(inner.id.name)) continue;
    for (const c of earlyCallSites(inner, pos, depth + 1)) out.push(c);
  }
  return out;
}

/* Wird `fn` vor `pos` aufgerufen, waehrend `declFn` laeuft? */
function isCalledBefore(fn, declFn, pos) {
  // RekurSION: fn ruft sich selbst auf, weiter oben. Unabhaengig vom Kontext.
  for (const c of idx.callsByFn.get(fn) || []) {
    if (c.pos >= pos) continue;
    if (c.self || (fn.id && c.name === fn.id.name)) return true;
  }
  if (!declFn || !fn.id) return false;
  // (v3) Nur transitive Aufrufstellen im Ausfuehrungskontext von declFn.
  return earlyCallSites(declFn, pos).some((c) => c.name === fn.id.name);
}

/* Liegt `inner` im Koerper von `outer`? Gescannt wird ueber Position gegen
 * den Satz aller Funktionen, nicht ueber Zeilenvergleiche. */
function isNestedIn(inner, outer) {
  // Beide null: Top-Level. Beides gleich, also "verschachtelt" = true.
  if (inner === outer) return true;
  // Eine Top-Level-Deklaration hat keine deklarierende Funktion. Sie kann von
  // einem Aufruf innerhalb einer Funktion nicht betroffen sein, denn ihr
  // Block laeuft vor jeder Funktion. `null` kommt hier real vor — app.js hat
  // Deklarationen auf Modulebene ausserhalb der IIFE (buildGame, buildNotes …).
  if (!inner || !outer) return false;
  if (!(inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1])) {
    return false;
  }
  return nearestFn(inner) === outer;
}

const nearestFnCache = new Map();
function nearestFn(node) {
  if (nearestFnCache.has(node)) return nearestFnCache.get(node);
  let best = null;
  for (const f of idx.fns) {
    if (f === node) continue;
    if (!(f.range[0] <= node.range[0] && node.range[1] <= f.range[1])) continue;
    if (!best || f.range[0] > best.range[0]) best = f;
  }
  nearestFnCache.set(node, best);
  return best;
}

const findings = [];
for (const d of idx.decls) {
  const readers = idx.readersByName.get(d.name);
  if (!readers) continue;
  for (const r of readers) {
    const fn = r.fn;
    // Die Deklaration selbst ist kein Reader.
    if (fn.range[0] <= d.id.range[0] && d.id.range[1] <= fn.range[1]) continue;
    /*
     * Drei Bedingungen, jede davon war in einer Fassung falsch. Alle drei
     * sind gemessen worden, nicht geraten:
     *
     * (a) `fn === d.fn` — Leser und Deklaration in derselben Funktion.
     *     FALSCH, 0 Treffer. Gemessen: decl.fn=buildNotes,
     *     reader.fn=paintVaultBtn -> false. `paintVaultBtn` ist eine
     *     verschachtelte Funktionsdeklaration in `buildNotes`, und genau so
     *     ist der echte Bug gebaut.
     *
     * (b) `r.block === d.block` — gleicher umschliessender Block.
     *     FALSCH, 0 Treffer. `r.block` ist der INNERSTE Block, also der
     *     Funktionskoerper von `paintVaultBtn` selbst; eine verschachtelte
     *     Funktion hat nie den Block ihres Elternteils.
     *
     * (c) `isNestedIn(fn, d.fn)` — Leser verschachtelt in der deklarierenden
     *     Funktion. RICHTIG, und die einzige Bedingung, die den echten Bug
     *     findet. `setColorScheme` ist nicht in `openApp` verschachtelt,
     *     deshalb fallen die 39 Fehlalarme aus v2 hier weg.
     *
     * Zusammen mit der (v3)-Pruefung in isCalledBefore ergibt das:
     * verschachtelter Leser + Aufruf im Ausfuehrungskontext vor der
     * Deklaration = TDZ-Falle.
     */
    if (!isNestedIn(fn, d.fn)) continue;
    if (!isCalledBefore(fn, d.fn, d.node.range[0])) continue;
    findings.push({
      name: d.name,
      declLine: d.node.loc.start.line,
      readerLine: fn.loc.start.line,
      reader: fn.id ? fn.id.name : '(anonymous)',
    });
  }
}

console.log(`let/const-Deklarationen geprueft: ${idx.decls.length}`);
console.log(`Potenzielle TDZ-Fallen: ${findings.length}`);
if (findings.length === 0) console.log('  keine');
else
  findings.forEach((f) =>
    console.log(
      `  Z${f.declLine} ${f.name}: gelesen in ${f.reader}() ab Z${f.readerLine}, die vor Z${f.declLine} aufgerufen wird`,
    ),
  );
