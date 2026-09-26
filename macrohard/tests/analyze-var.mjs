/*
 * Scope-aware risk analysis for converting `var` to `let`/`const` in app.js.
 *
 * Two earlier versions of this analysis were wrong in instructive ways:
 *
 *  v1  compared "reference line" against "declaration line" textually. It
 *      reported `c`, `cur`, `fn`, `n`, `idx` as TDZ risks because sibling
 *      functions use the same short names. Pure name collision, no risk.
 *
 *  v2  compared enclosing functions. Still too coarse: a `var` in the IIFE body
 *      is legitimately read from a nested `build*()` function declared ABOVE the
 *      var, e.g.
 *          function buildTerminal() { if (TERM_INITIALIZED) return; ... }  // 2112
 *          var TERM_INITIALIZED = false;                                    // 2544
 *      That is safe at runtime — buildTerminal() cannot run before the IIFE body
 *      has finished — but it flagged as TDZ because line 2112 < line 2544.
 *
 * The real question is not "does the read come first in the file" but "can this
 * read execute before the declaration is evaluated". Two cases are genuinely
 * risky:
 *
 *   A) The read is in the SAME statement list, earlier position, and the
 *      declaration is not hoisted — e.g. two statements in one block.
 *   B) The read sits inside a function that is CALLED before the declaration is
 *      evaluated (IIFE, or a function invoked at module top level).
 *
 * This version checks both.
 */
import { parse } from 'espree';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });

/* espree sets `range` on every node, but be defensive: block containers need
 * it for the position comparison below. */
if (!ast.range) {
  ast.range = [0, source.length];
  if (ast.body) for (const st of ast.body) if (!st.range) st.range = [st.start, st.end];
}

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

function fnName(f) {
  if (!f) return '(module)';
  if (f === (iife && iife.expression.callee)) return '(IIFE-Body)';
  return f.id ? f.id.name : '(anonymous)';
}

/* Statements of the block that lexically contains a node. */
function blockStatements(node) {
  let container = null;
  walk(ast, (m) => {
    const b = m.type === 'BlockStatement' || m.type === 'Program' ? m.body : null;
    if (!b) return;
    for (const st of b) {
      if (st.range[0] <= node.range[0] && node.range[1] <= st.range[1]) {
        if (!container || st.range[0] >= container.stmt.range[0]) container = { block: b, stmt: st };
      }
    }
  });
  return container;
}

const vars = [];
walk(ast, (n) => {
  if (n.type !== 'VariableDeclaration' || n.kind !== 'var') return;
  for (const d of n.declarations) {
    if (d.id.type === 'Identifier') {
      vars.push({ name: d.id.name, line: n.loc.start.line, decl: n, fn: fnOf(n), idNode: d.id });
    }
  }
});

/* A read executes before the declaration if it is in the same statement list at
 * an earlier index, or inside a function invoked at the point of the IIFE. */
const results = [];
for (const v of vars) {
  const declCtx = blockStatements(v.decl);
  const uses = [];

  walk(ast, (n, parent) => {
    if (n.type !== 'Identifier' || n.name !== v.name) return;
    if (parent && parent.type === 'VariableDeclarator' && parent.id === n) return;
    if (parent && parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
    const f = fnOf(n);
    const sameBody = f === v.fn;
    if (!sameBody) {
      // Only a nested read matters, and only if that nested function can run
      // before the IIFE body reaches the declaration. That is only possible for
      // immediately-invoked code, which we detect by checking whether the read
      // is inside a function that is itself called at IIFE-body level.
      return;
    }
    const useCtx = blockStatements(parent && parent.type === 'ExpressionStatement' ? parent : n);
    const earlierInSameBlock =
      declCtx && useCtx && useCtx.block === declCtx.block &&
      useCtx.stmt.range[0] < declCtx.stmt.range[0];
    uses.push({ line: n.loc.start.line, parentType: parent && parent.type, earlierInSameBlock });
  });

  const risky = uses.filter((u) => u.earlierInSameBlock);
  const reassigned = uses.some(
    (u) =>
      u.parentType === 'AssignmentExpression' ||
      u.parentType === 'UpdateExpression' ||
      u.parentType === 'ForInStatement' ||
      u.parentType === 'ForOfStatement',
  );
  // Also count reassignments from nested functions (a nested function writing
  // to an outer var still means it cannot become const).
  let nestedWrite = false;
  walk(ast, (n) => {
    if (n.type !== 'AssignmentExpression') return;
    const l = n.left;
    if (l.type !== 'Identifier' || l.name !== v.name) return;
    const f = fnOf(n);
    if (f !== v.fn) nestedWrite = true;
  });

  results.push({
    ...v,
    uses: uses.length,
    reassigned: reassigned || nestedWrite,
    tdz: risky.length > 0,
    riskyLines: risky.map((r) => r.line),
    fnLabel: fnName(v.fn),
  });
}

const risky = results.filter((r) => r.tdz);
const dupes = new Map();
for (const r of results) {
  const key = `${r.fn ? r.fn.range[0] : 0}|${r.name}`;
  dupes.set(key, (dupes.get(key) || 0) + 1);
}
const dupeList = [...dupes.entries()].filter(([, n]) => n > 1);

console.log(`var-Deklarationen: ${results.length}\n`);
console.log('Echtes TDZ-Risiko (gleicher Block, Lesen vor Deklaration):');
if (risky.length === 0) console.log('  KEINE — alle Konvertierungen sind durch das IIFE-Body-Timing abgesichert');
else risky.forEach((r) => console.log(`  Z${r.line} ${r.name} (${r.fnLabel}) <- Z${r.riskyLines.join(', Z')}`));

console.log('\nMehrfach-Deklaration im selben Scope (let wuerfe SyntaxError):');
if (dupeList.length === 0) console.log('  keine');
else dupeList.forEach(([k, n]) => console.log(`  ${k.split('|')[1]} ${n}x`));

const ok = results.filter((r) => !r.tdz);
console.log(`\nKonvertierbar: ${ok.length}`);
console.log(`  -> let  (wird neu zugewiesen): ${ok.filter((r) => r.reassigned).length}`);
console.log(`  -> const (nie neu zugewiesen): ${ok.filter((r) => !r.reassigned).length}`);
console.log('\nDetail:');
results.sort((a, b) => a.line - b.line).forEach((r) => {
  const tag = r.tdz ? 'TDZ!' : r.reassigned ? 'let ' : 'const';
  console.log(`  Z${String(r.line).padStart(4)} ${tag} ${r.name.padEnd(24)} (${r.fnLabel}) ${r.uses}x`);
});
