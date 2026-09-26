/*
 * Konvertiert alle `var` in assets/app.js zu let/const, gefuehrt von
 * analyze-var.mjs (das die Risikofälle vorher identifiziert hat).
 *
 * Voraussetzungen, die analyze-var.mjs verifiziert hat:
 *   - kein TDZ-Risiko (kein Lesen vor Deklaration im selben Block)
 *   - keine Mehrfach-Deklaration im selben Block-Scope
 *
 * Block-Scope wurde manuell geprueft fuer: tbIcon, c, cur, fn, n, parts, np,
 * matches, idx, desk, i — jede Mehrfachnennung liegt in einem eigenen
 * if-/for-/case-Block, also in einem eigenen Scope.
 */
import { parse } from 'espree';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'assets', 'app.js');
let source = fs.readFileSync(file, 'utf8');

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

function fnOf(node) {
  let found = iife ? iife.expression.callee : null;
  walk(ast, (m) => {
    if (m.type !== 'FunctionDeclaration' && m.type !== 'FunctionExpression') return;
    if (m.range[0] <= node.range[0] && node.range[1] <= m.range[1]) {
      if (!found || m.range[0] > found.range[0]) found = m;
    }
  });
  return found;
}

/* Block-Identität: welcher Statement-Block enthält den Knoten? */
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

const targets = [];
walk(ast, (n) => {
  if (n.type !== 'VariableDeclaration' || n.kind !== 'var') return;
  targets.push({ node: n, fn: fnOf(n) });
});

/* Wird der Name (irgendwo) neu zugewiesen? Dann let, sonst const. */
function isReassigned(name, decl) {
  let reassigned = false;
  walk(ast, (n) => {
    if (reassigned) return;
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.left.name === name) {
      reassigned = true;
    }
    if (n.type === 'UpdateExpression' && n.argument.type === 'Identifier' && n.argument.name === name) {
      reassigned = true;
    }
    if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement')) {
      if (n.left && n.left.type === 'Identifier' && n.left.name === name) reassigned = true;
    }
  });
  return reassigned;
}

/* Sicherheitspruefung: gleicher Block, Lesen vor Deklaration? */
function hasTdzRisk(name, decl) {
  const declBlock = blockOf(decl);
  if (!declBlock) return false;
  let risk = false;
  walk(ast, (n, parent) => {
    if (risk) return;
    if (n.type !== 'Identifier' || n.name !== name) return;
    if (parent && parent.type === 'VariableDeclarator' && parent.id === n) return;
    if (parent && parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
    const stmt = parent && parent.type === 'ExpressionStatement' ? parent : n;
    const useBlock = blockOf(stmt);
    if (!useBlock) return;
    if (useBlock.body === declBlock.body && useBlock.stmt.range[0] < declBlock.stmt.range[0]) {
      risk = true;
    }
  });
  return risk;
}

const skipped = [];
const edits = [];
for (const t of targets) {
  if (t.node.declarations.length !== 1) {
    skipped.push(`Z${t.node.loc.start.line}: Mehrfacherklarung in einer Anweisung`);
    continue;
  }
  const d = t.node.declarations[0];
  if (d.id.type !== 'Identifier') {
    skipped.push(`Z${t.node.loc.start.line}: kein einfacher Bezeichner`);
    continue;
  }
  if (hasTdzRisk(d.id.name, t.node)) {
    skipped.push(`Z${t.node.loc.start.line} ${d.id.name}: TDZ-Risiko`);
    continue;
  }
  // `node.range` is [start, end]; the keyword is exactly 3 characters, so the
  // replacement span is [start, start+3). Do NOT use range[3] — it does not
  // exist, which silently turns the edit into an insertion.
  edits.push({
    start: t.node.range[0],
    end: t.node.range[0] + 3,
    line: t.node.loc.start.line,
    name: d.id.name,
    kind: isReassigned(d.id.name, t.node) ? 'let' : 'const',
  });
}

console.log(`Kandidaten: ${targets.length}`);
console.log(`Uebersprungen: ${skipped.length}`);
skipped.forEach((s) => console.log('  ' + s));
console.log(`Umzuwandeln: ${edits.length}`);
console.log(`  -> let:  ${edits.filter((e) => e.kind === 'let').length}`);
console.log(`  -> const: ${edits.filter((e) => e.kind === 'const').length}`);

if (process.argv.includes('--apply')) {
  // Von hinten nach vorn, damit die Offsets gueltig bleiben.
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    source = source.slice(0, e.start) + e.kind + source.slice(e.end);
  }
  fs.writeFileSync(file, source, 'utf8');
  console.log('\nGeschrieben.');
} else {
  console.log('\n(nur Analyse — mit --apply wird geschrieben)');
  console.log('Vorschau:');
  edits.sort((a, b) => a.line - b.line).forEach((e) =>
    console.log(`  Z${String(e.line).padStart(4)}  var -> ${e.kind.padEnd(5)}  ${e.name}`));
}
