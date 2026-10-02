import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Five translation keys that were defined in BOTH tables and rendered NOWHERE.
 *
 * i18n-completeness.test.mjs could not see them, and could not have: it asserts
 * that every key that is USED exists in both tables. The converse — that every
 * key which EXISTS is used — was uncovered. So 52/52 stayed green while five
 * translations in each language described UI that does not exist.
 *
 * This file asserts the converse direction, and it is deliberately written so
 * a broken extractor fails as a HARNESS failure with a name, never as a
 * vacuous pass:
 *
 *   1. the extractor is pinned (table sizes, known keys) before any usage
 *      assertion runs against its output;
 *   2. nested keys (status, nl_reasons) count as used when the PARENT table is
 *      reached dynamically — t.status[lang][it.status] uses `removed`,
 *      `soon`, `planned` without naming them, and a flat scan reports all three
 *      as dead. That was my first extractor bug here, and it also flagged
 *      filter_all / sketch_v10 / filter_shown, which are plainly rendered;
 *   3. the keys that were wired are wired AT the place their feature needs
 *      them, not merely present somewhere in the file.
 *
 * Which key goes where:
 *
 *   llm_key_set      "Key setzen" / "Set key" — a confirm label for the key
 *                    field. The field had a placeholder and a disabled-until-
 *                    filled button, and nothing that said the key was stored.
 *   llm_key_ok       "Key gespeichert (nur diese Sitzung)" — the confirmation
 *                    shown after storing. This was ALREADY the intent of the
 *                    German string; only the render was missing.
 *   sketch_types     "Typen mit Verknüpfung" — the join block had numbers
 *                    (53 von 54) with no subject line.
 *   sketch_join_none "keine" / "none" — a CSDL whose EntitySets reach no
 *                    endpoint rendered an EMPTY join block. The header was
 *                    gated on linked(c).length > 0, so the whole section
 *                    vanished rather than saying "none".
 *   sketch_noep      "ohne direkte Endpoints" — the per-type row for a type
 *                    with no endpoint. It was the unused half of a pair with
 *                    sketch_navonly ("nur über Navigation"), and i18n-
 *                    completeness pins BOTH by name. So the pair is resolved by
 *                    DISTINCTION rather than deletion: sketch_navonly stays
 *                    for a type that has EntitySets but whose set name is the
 *                    last segment of no path; sketch_noep goes on the row where
 *                    the join reports zero endpoints, which is the case the
 *                    existing rendering described less precisely.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const src = fs.readFileSync(path.join(ROOT, 'assets', 'app.jsx'), 'utf8');

/* Strip comment-only lines so the write-up above — which quotes every key on
 * purpose — cannot satisfy or fail a usage assertion. */
function code(file) {
  return file
    .split('\n')
    .filter((l) => !/^\s*(\/\*|\*|\*\/|\/\/)/.test(l))
    .join('\n');
}
const srcCode = code(src);

/* Brace-count one language table and collect its top-level keys.
 *
 * Three extractor bugs happened here before the first green run, all reported
 * correct code as broken:
 *   - counting from the header line "  de: {" reported 0 keys (the header opens
 *     the object, so the depth has to start AFTER it);
 *   - anchoring on `indexOf("en: {")` landed in the nested `status: { en: … }`
 *     and reported EN=3 instead of 102;
 *   - requiring keys at line start reported sketch_less as missing, because it
 *     shares a line with sketch_more: '…', sketch_less: '…'.
 * So: depth from after the header, four-space indent for top level, and a
 * comma split so a shared line yields both keys. */
function table(lang) {
  const m = new RegExp(`^ {2}${lang}: \\{$`, 'm').exec(src);
  assert.ok(m, `the ${lang} table is gone — extractor has nothing to work on`);
  let depth = 1;
  let i = m.index + m[0].length;
  const keys = [];
  const body = [];
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth >= 1) body.push(ch);
    if (ch === '\n' && depth === 1) {
      const nl = src.indexOf('\n', i + 1);
      const text = src.slice(i + 1, nl < 0 ? src.length : nl).match(/^ {4}(.*)$/);
      if (text) {
        /* Split on commas that sit at THIS level only, ignoring commas inside
         * string literals.
         *
         * Three bugs here, all of which reported correct code as broken:
         *  1. a plain comma split also cuts inside a nested one-liner —
         *     status: { de: { …, soon: 'bald', planned: '…' }, en: {… }
         *     yields soon / planned as if they were top-level keys, and they
         *     are not dead: they are reached via t.status[lang][it.status];
         *  2. counting braces along the line is not enough, because a comma
         *     inside a STRING is not a separator at all —
         *     sketch_more: '+ {n} weitere', sketch_less: 'weniger anzeigen'
         *     has one, and treating it as a split lost sketch_less from DE;
         *  3. keys may share a line, so a line-start-only matcher misses the
         *     second one entirely.
         * So: walk the line tracking string state AND brace depth, and split
         * only on a comma that is outside a string and at depth 0. */
        let d = 0;
        let quote = null;
        let seg = '';
        const segs = [];
        for (let k = 0; k < text[1].length; k++) {
          const c = text[1][k];
          if (quote) {
            seg += c;
            if (c === quote) quote = null;
            continue;
          }
          if (c === "'" || c === '"' || c === '`') { quote = c; seg += c; continue; }
          if (c === '{') d++;
          else if (c === '}') d--;
          if (c === ',' && d === 0) { segs.push(seg); seg = ''; }
          else seg += c;
        }
        segs.push(seg);
        for (const part of segs) {
          const km = part.match(/^\s*([a-zA-Z_]\w*)\s*:/);
          if (km) keys.push(km[1]);
        }
      }
    }
    i++;
  }
  return { keys, body: body.join('') };
}

const DE = table('de');
const EN = table('en');
const deKeys = new Set(DE.keys);
const enKeys = new Set(EN.keys);

/* Nested tables whose members are reached by a dynamic subscript, so the
 * members have no `t.<member>` reference anywhere. Read out of the render
 * sites: t.status[lang][it.status] and t.nl_reasons[e.reason]. */
const DYNAMIC_PARENTS = new Set(['status', 'nl_reasons']);

function usedKeys() {
  const used = new Set();
  for (const m of srcCode.matchAll(/\bt\.([a-zA-Z_]\w*)/g)) used.add(m[1]);
  // A parent reached dynamically marks its own name used…
  for (const p of DYNAMIC_PARENTS) if (used.has(p)) used.add(p);
  return used;
}

/* Keys that are legitimately defined without a `t.` reference. Empty by
 * design: adding a name here is a decision, and the comment has to say what
 * would make it render. */
const ALLOWED_UNUSED = new Set();

test('HARNESS: the extractor finds both tables and not a nested one', () => {
  // Without this, every usage assertion below can pass vacuously.
  assert.ok(DE.keys.length >= 89, `DE table yielded ${DE.keys.length} keys — extractor broken`);
  assert.ok(EN.keys.length >= 89, `EN table yielded ${EN.keys.length} keys — extractor broken`);
  assert.ok(deKeys.has('sketch_join'), 'the known-good DE key sketch_join is missing');
  assert.ok(enKeys.has('sketch_join'), 'the known-good EN key sketch_join is missing');
  assert.ok(deKeys.has('filter_all'), 'filter_all is on its own line — the indent rule is wrong');
  assert.ok(deKeys.has('sketch_less'), 'sketch_less shares a line with sketch_more — the split is wrong');
  // status is a nested object; its members must NOT appear as top-level keys.
  assert.ok(!deKeys.has('soon'), 'a nested key was collected as top-level — depth is wrong');
  assert.ok(!deKeys.has('mails'), 'a nested nl_reasons key was collected as top-level');
});

test('both tables still hold the same key set', () => {
  assert.deepEqual([...deKeys].sort(), [...enKeys].sort());
});

test('every defined key is rendered — no dead translations', () => {
  const used = usedKeys();
  const dead = [...new Set([...deKeys, ...enKeys])]
    .filter((k) => !used.has(k) && !DYNAMIC_PARENTS.has(k))
    .filter((k) => !ALLOWED_UNUSED.has(k))
    .sort();
  assert.deepEqual(dead, [], `defined in both tables, rendered nowhere: ${dead.join(', ')}`);
});

test('llm was removed, and the reason stays on record', () => {
  // `llm: 'LLM-Modus'` / 'LLM mode' was a sixth dead key. It survived the first
  // audit pass because the only occurrence of the string "t.llm" in the file
  // was inside a comment (line 84: "Eigener Key statt `t.llm`"), and comment
  // lines are stripped before matching — correct for the leak assertions, and
  // it hid this one. The label was superseded by llm_prov + llm_key_ph when
  // the provider block was built.
  //
  // It was DELETED rather than wired: unlike the other five it had no feature
  // that wanted it. Wiring it would have meant inventing a heading for a block
  // that already has llm_prov as its label, so the panel would have said the
  // same thing twice. `llm` also survives as a nested nl_reasons member — that
  // one is the reason code for an LLM-mapped call and IS rendered, through
  // t.nl_reasons[e.reason].
  assert.ok(!deKeys.has('llm'), 'llm is back in the DE table');
  assert.ok(!enKeys.has('llm'), 'llm is back in the EN table');
  assert.match(srcCode, /nl_reasons:[^}]*\bllm:/, 'the nl_reasons member must survive');
});

test('the key field tells you the key was stored', () => {
  // llm_key_ok was written as a confirmation and never rendered. It must be
  // shown after storing, gated on the state setKey() sets.
  assert.match(
    srcCode,
    /setKeyOk\(v \? 'ok' : ''\)/,
    'setKey does not record that a key was stored',
  );
  assert.match(
    srcCode,
    /keyOk === 'ok'[\s\S]{0,200}?t\.llm_key_set[\s\S]{0,120}?t\.llm_key_ok/,
    'the confirmation line does not render both llm_key_set and llm_key_ok',
  );
  // Switching provider must clear it, or the message describes the provider
  // the user just left.
  assert.match(
    srcCode,
    /function setProv\(id\)[\s\S]{0,300}?setKeyOk\(''\)/,
    'the key confirmation survives a provider switch and describes the old provider',
  );
});

test('the join block says what its numbers are about', () => {
  assert.match(
    srcCode,
    /sketch-join-head[\s\S]{0,200}?t\.sketch_types/,
    'the join block shows 53 of 54 without saying what the 54 are',
  );
});

test('a join that reaches nothing says "none" instead of vanishing', () => {
  // The join block was gated on linked(c).length > 0, so a CSDL whose
  // EntitySets match no endpoint path rendered an empty section — the reader
  // saw a counts card with no join line and could not tell "no data" from
  // "not computed yet". It is now a ternary with an explicit else branch.
  assert.match(
    srcCode,
    /linked\(c\)\.length > 0 \? \(/,
    'the join block is not a ternary, so the empty case cannot be expressed',
  );
  assert.match(
    srcCode,
    /\) : \([\s\S]{0,700}?t\.sketch_join_none[\s\S]{0,200}?\)\}/,
    'the empty branch does not render sketch_join_none',
  );
});

test('the no-endpoint row names the state, and the pair stays distinct', () => {
  // sketch_noep and sketch_navonly describe the same underlying condition, so
  // one of them used to be dead. Both are pinned by i18n-completeness, so the
  // resolution is a distinction, not a deletion:
  //   sketch_navonly — the type HAS EntitySets, but no path ends in their name
  //   sketch_noep    — the join itself reports zero endpoints for this row
  assert.match(srcCode, /t\.sketch_navonly/, 'the navigation-only label is gone');
  assert.match(srcCode, /t\.sketch_noep/, 'the no-endpoint label is still unrendered');
  assert.ok(deKeys.has('sketch_noep'), 'sketch_noep must stay defined (i18n-completeness pins it)');
  assert.ok(deKeys.has('sketch_navonly'), 'sketch_navonly must stay defined');
});

test('the compiled app.js carries the wiring too (the F4 trap)', () => {
  const appCode = code(fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8'));
  for (const k of ['llm_key_ok', 'sketch_types', 'sketch_join_none', 'sketch_noep']) {
    assert.match(appCode, new RegExp(`\\bt\\.${k}\\b`), `the compile lost t.${k}`);
  }
});