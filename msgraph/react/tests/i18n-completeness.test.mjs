import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * i18n completeness, and the duplicate-key bug it exposed.
 *
 * The rule is old and from F3: a `t.*` key without a twin in the other
 * language leaks the RAW key into the UI. F3 was `reason: 'llm'` missing from
 * `nl_reasons[en]`, which rendered the literal string "NL: llm".
 *
 * Checking for that by clicking through the app in both languages does not
 * scale, and nobody had clicked through the sketch panel in English at all.
 * So this test parses the I18N tables and compares them.
 *
 * WHAT IT FOUND (2026-10-01), which is why it exists:
 *
 *   1. Seven keys existed only in DE: sketch_join, sketch_join_none,
 *      sketch_ep, sketch_noep, sketch_navonly, sketch_types, sketch_more.
 *      Four of them are rendered (sketch_join, sketch_ep, sketch_more,
 *      sketch_navonly), so the sketch cards showed "sketch_join" and
 *      "sketch_ep" as visible text in EN mode.
 *
 *   2. The DE table contained the join block TWICE — once in English, once in
 *      German:
 *          // Type -> endpoint join (2026-09-27) — see the DE table.
 *          sketch_join: '{a} of {b} types with endpoints',   <- English copy
 *          ...
 *          sketch_join: '{a} von {b} Typen mit Endpoints',   <- German copy
 *      In JS the later key wins, so DE rendered correctly by accident — the
 *      German copy was last. The English copy was invisible dead weight that
 *      looked like a missing EN table. Remove it and the EN entries have to
 *      live in the EN table, which is where they belong.
 *
 * TWO WRONG VERSIONS OF THIS TEST, both instructive:
 *
 *   A regex over the WHOLE file reported 25 missing keys. Those were object
 *   keys from the LLM provider block (`model:`, `free:`, `base:`) — not
 *   language keys at all. The table has to be sliced out first, by counting
 *   braces from "  de: {" and "  en: {". A `src.indexOf("en: {")` alone is not
 *   enough either: the provider block below also contains `openrouter:`, so a
 *   naive marker match lands in the wrong object.
 *
 *   A matcher requiring keys at the start of a line reported `sketch_less`
 *   as missing from DE. It was present in both tables, on the same line as
 *   `sketch_more`. Correct code, wrong assertion — the file legitimately uses
 *   both `key: v,` on its own line and two keys on one line.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JSX = path.join(HERE, '..', 'assets', 'app.jsx');
const src = fs.readFileSync(JSX, 'utf8');

/* Slice one language table by brace counting. A regex cannot do this: the
 * provider object further down contains keys that look exactly like table
 * keys. */
function sliceTable(marker) {
  const body = src.slice(src.indexOf('const I18N = {'));
  const i = body.indexOf(marker);
  assert.notEqual(i, -1, `${marker} not found in app.jsx`);
  let j = i + marker.length;
  let depth = 1;
  while (depth > 0) {
    const c = body[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
    assert.ok(j < body.length, `unbalanced braces after ${marker}`);
  }
  return body.slice(i, j);
}

const DE = sliceTable('  de: {');
const EN = sliceTable('  en: {');

/* A key at the start of a line, or after a comma on such a line. The file
 * uses both styles and both are correct. */
function tableKeys(block) {
  return new Set([...block.matchAll(/(?:^|,)\s+([a-zA-Z0-9_]+):/gm)].map((m) => m[1]));
}

const kd = tableKeys(DE);
const ke = tableKeys(EN);

// Every t.* the app actually reads.
const used = new Set([...src.matchAll(/\bt\.([a-zA-Z0-9_]+)/g)].map((m) => m[1]));

test('every language key exists in both tables', () => {
  const onlyDe = [...kd].filter((k) => !ke.has(k));
  const onlyEn = [...ke].filter((k) => !kd.has(k));
  assert.deepEqual(onlyDe, [],
    `these keys exist only in DE: ${onlyDe.join(', ')}`);
  assert.deepEqual(onlyEn, [],
    `these keys exist only in EN: ${onlyEn.join(', ')}`);
});

test('the seven sketch-join keys are in BOTH tables', () => {
  // Named explicitly, because these are the ones that leaked. A generic
  // "tables are equal" test would catch them today, but if someone later
  // removes both copies the generic test goes green again while the panel
  // silently loses its type→endpoint join column.
  for (const k of ['sketch_join', 'sketch_join_none', 'sketch_ep', 'sketch_noep',
    'sketch_navonly', 'sketch_types', 'sketch_more', 'sketch_less']) {
    assert.ok(kd.has(k), `${k} missing from DE`);
    assert.ok(ke.has(k), `${k} missing from EN`);
  }
});

test('the DE table holds no duplicate key', () => {
  // The English copy of the join block sat above the German one, so DE
  // rendered German only by luck of ordering. Count, don't trust.
  //
  // Only keys at nesting DEPTH 1 count. The tables legitimately contain
  // nested objects whose members share names with top-level keys:
  //     status: { de: {...}, en: {...} }     -> de, en, removed, soon, planned
  //     nl_reasons: { ..., llm: '...' }       -> llm
  //     en: 'EN', de: 'DE'                    -> the language labels
  // A flat scan calls all of those duplicates and reports six false ones.
  // The duplicate bug is about two keys at the SAME level, which is exactly
  // what a depth-aware scan distinguishes.
  for (const [name, block] of [['DE', DE], ['EN', EN]]) {
    const counts = {};
    let depth = 0;
    const re = /(\{|\})|(?:^|,)\s+([a-zA-Z0-9_]+):/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      if (m[1] === '{') depth++;
      else if (m[1] === '}') depth--;
      else if (depth === 1) counts[m[2]] = (counts[m[2]] || 0) + 1;
    }
    const dups = Object.entries(counts).filter(([, n]) => n > 1).map(([k]) => k);
    assert.deepEqual(dups, [], `${name} declares these keys twice: ${dups.join(', ')}`);
  }
});

test('a one-sided key that is actually rendered is a leak', () => {
  // The distinction that matters: a one-sided key nobody reads is harmless
  // clutter; a one-sided key the UI reads shows up as literal text. Report
  // the second kind by name so it cannot be dismissed.
  const leaking = [...used].filter((k) => (kd.has(k) !== ke.has(k)));
  assert.deepEqual(leaking, [],
    `these keys are read by the UI but exist in only one language: ${leaking.join(', ')}`);
});

test('the German join text is German', () => {
  // The duplicate block means DE carried an English string. Assert the VALUE,
  // not just the presence, because presence was never the problem.
  assert.match(DE, /sketch_join: '\{a\} von \{b\} Typen mit Endpoints'/);
  assert.match(EN, /sketch_join: '\{a\} of \{b\} types with endpoints'/);
  assert.ok(!/sketch_join: '\{a\} of \{b\} types/.test(DE),
    'the DE table still contains the English join label');
});

test('nl_reasons covers every reason the console can emit', () => {
  // nlMap() emits: calendar, teams, mails, onedrive, photo, default.
  // callLLM/llmParse emit: llm. All seven need a label in both languages or
  // the meta row reads "NL: llm" — the original F3 bug.
  const reasons = ['calendar', 'teams', 'mails', 'onedrive', 'photo', 'default', 'llm'];
  for (const r of reasons) {
    const inDe = new RegExp(`nl_reasons:[^}]*\\b${r}:`).test(DE);
    const inEn = new RegExp(`nl_reasons:[^}]*\\b${r}:`).test(EN);
    assert.ok(inDe, `nl_reasons.de is missing "${r}"`);
    assert.ok(inEn, `nl_reasons.en is missing "${r}"`);
  }
});