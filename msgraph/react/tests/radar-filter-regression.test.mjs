import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Two defects in the Breaking-Change-Radar, both found on 2026-09-27 by
 * clicking through the deployed page in Chromium. Neither shows up in a test
 * suite that only checks "the component renders".
 *
 * DEFECT 1 — the "Bald / Soon" filter does nothing.
 *
 *   The filter compares the data's status against the STRING 'soon':
 *     <button onClick={() => setFilter('soon')}>{t.filter_soon}</button>
 *     const items = (data?.items || []).filter(it => filter === 'all' || it.status === filter);
 *
 *   but the data never uses 'soon'. Measured on data/deprecations.v1.0.json:
 *     count field 85, items 85, distribution {removed: 47, planned: 38}
 *
 *   So 'soon' matches nothing and the list stays at all 85 entries. Measured
 *   in the browser, clicking through the controls in order:
 *
 *     ALLE      -> 85 cards
 *     BALD      -> 85 cards   <-- filter had no effect at all
 *     ENTFERNT  -> 47 cards   (correct)
 *
 *   The i18n table at line 51/80 is where the confusion started: it maps BOTH
 *   'soon' and 'planned', so the codebase appears to know about two states
 *   while the data only ever produces one. Line 387 has the same mismatch —
 *   it styles a card as 'soon' when it.status === 'soon', a branch that can
 *   never be taken.
 *
 * DEFECT 2 — the count badge ignores the filter.
 *
 *   <span className="badge">{data?.count || 0} {t.dep} ({variant})</span>
 *
 *   data.count is the TOTAL for the variant, not the filtered subset. So after
 *   clicking ENTFERNT the page shows 47 cards next to a badge reading
 *   "85 Deprecations (v1.0)". The badge is not wrong about the file, but it
 *   is wrong about what the user is currently looking at.
 *
 * The fix for both is small. These tests are written so they fail now and pass
 * after the fix, and so that a fix which merely hides the symptom (e.g. an
 * empty state, or a badge that lies in the other direction) does not pass.
 */

// This test lives in msgraph/react/tests/, so '..' is already msgraph/react.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsx = fs.readFileSync(path.join(root, 'assets', 'app.jsx'), 'utf8');
const built = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

const radar = jsx.slice(jsx.indexOf('function Radar'), jsx.length);
/** Every status value the shipped data actually contains. */
const dataStatuses = new Set();
for (const f of ['data/deprecations.v1.0.json', 'data/deprecations.beta.json']) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const it of d.items || []) dataStatuses.add(it.status);
}

/** Statuses per variant file, read from the shipped data. */
function statusesOf(variant) {
  const d = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'deprecations.' + variant + '.json'), 'utf8'),
  );
  const s = {};
  for (const i of d.items || []) s[i.status] = (s[i.status] || 0) + 1;
  return s;
}

test('precondition: the deprecation data is readable and asymmetric', () => {
  const v1 = statusesOf('v1.0');
  const beta = statusesOf('beta');
  // Measured 2026-09-27:
  //   v1.0  85 items  {removed: 47, planned: 38}
  //   beta 1792 items {removed: 1617, soon: 137, planned: 38}
  // The asymmetry is the whole point: "soon" exists ONLY in beta, so a filter
  // on "soon" is silently empty on the v1.0 tab.
  assert.ok(v1.removed > 0 && v1.planned > 0, 'v1.0 must have removed and planned');
  assert.ok(beta.removed > 0 && beta.planned > 0, 'beta must have removed and planned');
  assert.ok(
    beta.soon > 0,
    'beta is expected to carry a "soon" status; if that changed this file ' +
      'needs re-reading',
  );
  assert.equal(
    v1.soon,
    undefined,
    'v1.0 is expected to have NO "soon" entries — that is the bug. If this ' +
      'now fails, the data was fixed and the filter question changes.',
  );
});

test('the "soon" filter selects a real subset on BOTH tabs', () => {
  // This test is the regression pin. It asserts the CURRENT, correct
  // behaviour, so it went red against the old code:
  //
  //   old:  it.status === 'soon' literally  -> v1.0 matched nothing (85 cards
  //         before and after clicking BALD), beta matched 137.
  //   new:  "soon" means "not removed yet"  -> v1.0 gives 38, beta gives 175.
  //
  // Measured in Chromium before the fix, clicking the controls in order:
  //   ALLE 85 -> BALD 85 -> ENTFERNT 47
  // Slice from the SET, not from `const items` — the set is declared one line
  // ABOVE the filter, so starting at `const items` cut it off and produced
  // "no Set([...]) construct" against perfectly correct code. Third version of
  // this test, third way to be wrong about where the code is.
  const from = Math.min(...[jsx.indexOf('const soonSet'), jsx.indexOf('const items =')]);
  const src = jsx.slice(from, jsx.indexOf('return (', from) + 1);
  assert.match(
    src,
    /soon/,
    'the filter must still know about the "soon" filter value',
  );
  // The union has to be expressed, not a bare equality on one status — that is
  // the whole fix.
  assert.doesNotMatch(
    src,
    /filter === 'all' \|\| it\.status === filter/,
    'the literal comparison is back: on v1.0 that matches nothing',
  );
  // Match the CONSTRUCT, not its exact spelling: `new Set([...])` is what the
  // fix uses, but `soonSet.has(...)` plus both literals appearing in the same
  // construct is the real requirement. An earlier version of this assertion
  // demanded the literal text "Set([" and failed on correct code.
  const construct = /new Set\(\[[^\]]*\]\)/.exec(src);
  assert.ok(
    construct && construct[0].includes("'soon'") && construct[0].includes("'planned'"),
    '"soon" must be a set containing BOTH soon and planned — v1.0 has no ' +
      `"soon" entries, so an equality on one status matches nothing. Found: ` +
      `${construct ? construct[0] : 'no Set([...]) construct in the filter'}`,
  );

  // And the arithmetic the UI will now show, straight from the data.
  const v1 = statusesOf('v1.0');
  const beta = statusesOf('beta');
  const soonOn = (s) => (s.soon || 0) + (s.planned || 0);
  const total = (s) => Object.values(s).reduce((a, b) => a + b, 0);
  assert.equal(soonOn(v1), 38, 'v1.0: soon+planned = 38');
  assert.equal(soonOn(beta), 175, 'beta: soon+planned = 175');
  // Proper subsets on both tabs, and the two add back up to the total.
  for (const [name, s] of [['v1.0', v1], ['beta', beta]]) {
    assert.ok(soonOn(s) > 0, `${name}: the soon filter must not be empty`);
    assert.ok(soonOn(s) < total(s), `${name}: soon must be a proper subset`);
    assert.equal(soonOn(s) + s.removed, total(s), `${name}: subsets must partition the list`);
  }
});

test('the status names used in the JSX all occur in the beta data', () => {
  // Both the filter value and the card-styling branch must be real statuses.
  // The styling branch reads it.status === 'soon' ? 'soon' : ... — for v1.0
  // that branch is dead, for beta it is the only one that colours those cards.
  const beta = statusesOf('beta');
  const used = [
    /setFilter\('([a-z]+)'\)/.exec(radar)[1],
    ...[...radar.matchAll(/it\.status === '([a-z]+)'/g)].map((m) => m[1]),
  ].filter((u) => u && u !== 'all');
  for (const u of new Set(used)) {
    assert.ok(
      beta[u] > 0,
      `status "${u}" is used in the JSX but never occurs in the beta data ` +
        `(${Object.keys(beta).join(', ')})`,
    );
  }
  // v1.0 has no "soon", so a card styled from that branch is only reachable on
  // beta. Record it rather than pretend the two variants agree.
  const v1 = statusesOf('v1.0');
  if (used.includes('soon')) {
    assert.equal(
      v1.soon,
      undefined,
      'the styling branch keys on "soon", so the v1.0 tab cannot show it',
    );
  }
});

test('the count badge reflects the filtered list, not the whole file', () => {
  // The badge must be derived from the same `items` array the cards use, or
  // from items.length. data.count is the unfiltered total.
  const badge = /<span className="badge">\{([^}]*)\}\s*\{t\.dep\}/.exec(radar);
  assert.ok(badge, 'the count badge was not found');
  const expr = badge[1].trim();
  assert.doesNotMatch(
    expr,
    /data\?\.count|data\.count/,
    'the badge uses data.count, which is the TOTAL for the variant — after ' +
      'filtering it disagrees with the number of cards on screen',
  );
  assert.match(
    expr,
    /items/,
    'the badge must count the filtered items it actually renders',
  );
});

test('a filter must be able to produce a non-empty subset', () => {
  // Sanity floor for the filter machinery: the "Entfernt" filter demonstrably
  // works (85 -> 47), so filtering itself is fine. What is broken is the
  // "Bald" value. This asserts the one filter that works stays working.
  const v1 = statusesOf('v1.0');
  const total = Object.values(v1).reduce((a, b) => a + b, 0);
  const removed = v1.removed;
  assert.ok(removed > 0 && removed < total, `removed must be a proper subset, got ${removed} of ${total}`);
  // And the radar needs a defined empty state, otherwise an empty filter looks
  // identical to a hang.
  assert.match(
    radar,
    /radar-empty|keine|no_|len === 0|length === 0/,
    'the radar needs a defined empty state so an empty filter is visible',
  );
});

test('the compiled app.js carries the same filter value as the source', () => {
  // app.js is the vorkompilierte build of app.jsx. If someone fixes the JSX
  // and forgets `sh build_appjs.sh`, the browser keeps the old behaviour and
  // every source-level test stays green. This is the check that catches it.
  const jsxFilter = /setFilter\('([a-z]+)'\)/.exec(radar)[1];
  assert.ok(
    built.includes("setFilter('" + jsxFilter + "')"),
    `app.js does not contain setFilter('${jsxFilter}') — the compiled build is ` +
      'stale, run sh build_appjs.sh after editing app.jsx',
  );
});
