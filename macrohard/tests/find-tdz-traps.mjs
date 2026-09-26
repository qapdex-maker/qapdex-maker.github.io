/*
 * Sucht TDZ-Fallen, die `analyze-var.mjs` NICHT finden kann.
 *
 * analyze-var.mjs vergleicht Block-Identitaet und Position innerhalb eines
 * Blocks. Das ist korrekt fuer "Lesen vor Deklaration im selben Block".
 *
 * Es faellt aber NICHT: eine Funktion F im gleichen Scope, die VOR der
 * Deklaration definiert wird und notesVault-artige Zustandsvariablen liest,
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
 */
import { parse } from 'espree';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });
if (!ast.range) ast.range = [0, source.length];

const iife = ast.body.find(
  (n) =>
    n.type === 'ExpressionStatement' &&
    n.expression.type === 'CallExpression' &&
    n.expression.callee.type === 'FunctionExpression',
);

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit, node));
    else if (v && typeof v.type === 'string') walk(v, visit, node);
  }
}

/* Block-Identitaet: welcher Statement-Block enthaelt den Knoten? */
function blockOf(node) {
  let container = null;
  walk(ast, (m) => {
    const body = m.type === 'BlockStatement' || m.type === 'Program' ? m.body : null;
    if (!body) return;
    for (const st of body) {
      if (st.range[0] <= node.range[0] && node.range[1] <= st.range[1]) {
        if (!container || st.range[0] >= container.stmt.range[0]) container = { body, stmt: st };
      }
    }
  });
  return container;
}

/* Kandidat: jede let/const-Deklaration einer Variablen, die Mehrfach benutzt wird. */
const decls = [];
walk(ast, (n) => {
  if (n.type !== 'VariableDeclaration') return;
  if (n.kind === 'var') return;
  for (const d of n.declarations) {
    if (d.id.type === 'Identifier') decls.push({ name: d.id.name, node: n, id: d.id });
  }
});

/* Funktionen, die den Namen benutzen, und wo sie aufgerufen werden. */
const findings = [];
for (const d of decls) {
  const declFn = (() => {
    let f = iife ? iife.expression.callee : null;
    walk(ast, (m) => {
      if (m.type !== 'FunctionDeclaration' && m.type !== 'FunctionExpression') return;
      if (m.range[0] <= d.node.range[0] && d.node.range[1] <= m.range[1]) {
        if (!f || m.range[0] > f.range[0]) f = m;
      }
    });
    return f;
  })();

  // Lesende Funktionen: FunctionDeclaration/Expression mit diesem Namen im Body,
  // die NICHT die Deklaration selbst enthalten.
  const readers = [];
  walk(ast, (m) => {
    if (m.type !== 'FunctionDeclaration' && m.type !== 'FunctionExpression') return;
    if (m.range[0] <= d.id.range[0] && d.id.range[1] <= m.range[1]) return; // nicht die Dekl. selbst
    let uses = 0;
    walk(m, (x) => {
      if (x.type === 'Identifier' && x.name === d.name) uses++;
    });
    if (uses > 0) readers.push({ fn: m, uses });
  });

  for (const r of readers) {
    // Wird diese Funktion (oder ein Aufruf darin) vor der Deklaration ausgefuehrt?
    // Ein Aufruf zaehlt, wenn er im selben Block wie die Deklaration steht und
    // frueher liegt, ODER wenn die Funktion selbst IIFE-aufgerufen wird.
    // Ein Aufruf zaehlt nur, wenn er im GLEICHEN Block wie die Deklaration steht
    // (also waehrend des Funktionskoerpers ausgefuehrt wird) UND frueher liegt.
    // Ein Aufruf aus einer anderen Funktion heraus ist harmlos: diese Funktion
    // laeuft erst, wenn der Aufrufer sie aufruft, und das ist nach der
    // Deklaration. Genau dieser Fehlgriff erzeugte 508 Fehlalarme in v1.
    let earlyCall = false;
    if (blockOf(r.fn) && blockOf(d.node) && blockOf(r.fn).body === blockOf(d.node).body) {
      walk(r.fn, (x) => {
        if (earlyCall) return;
        if (x.type === 'CallExpression' && x.callee === r.fn && x.range[0] < d.node.range[0]) {
          earlyCall = true;
        }
        // Aufruf einer gleichnamigen Funktion im selben Block
        if (
          x.type === 'CallExpression' &&
          x.callee.type === 'Identifier' &&
          r.fn.id &&
          x.callee.name === r.fn.id.name &&
          x.range[0] < d.node.range[0]
        ) {
          earlyCall = true;
        }
      });
    }
    // (c) Die lesende Funktion wird ueber eine Variable/Property in einer
    //     frueheren addEventListener-Registrierung verdrahtet und die
    //     Deklaration kommt danach — conservative Heuristik: wenn die lesende
    //     Funktion VOR der Deklaration definiert ist UND dieselbe Funktion
    //     zusaetzlich direkt aufgerufen wird.
    if (earlyCall) {
      findings.push({
        name: d.name,
        declLine: d.node.loc.start.line,
        readerLine: r.fn.loc.start.line,
        reader: r.fn.id ? r.fn.id.name : '(anonymous)',
      });
    }
  }
}

console.log(`let/const-Deklarationen geprüft: ${decls.length}`);
console.log(`Potenzielle TDZ-Fallen: ${findings.length}`);
if (findings.length === 0) console.log('  keine');
else findings.forEach((f) =>
  console.log(`  Z${f.declLine} ${f.name}: gelesen in ${f.reader}() ab Z${f.readerLine}, die vor Z${f.declLine} aufgerufen wird`),
);
