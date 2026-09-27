import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * deploy-hygiene.js is the Phase-5 gate for this whole monorepo. It blocked a
 * push on 2026-09-27 with two failures that were both bugs IN THE GATE.
 *
 * A gate that cries wolf is worse than no gate: it trains you to skip it, and
 * the one day it is right you skip it too. So these tests pin what the gate
 * must actually accept, using the real files in the repo.
 *
 * FAILURE 1 — the sw.js cache-version check is too narrow.
 *   The check is  /CACHE\s*=\s*['"]macrohard-v\d['"]/  — exactly one digit.
 *   sw.js has contained "macrohard-v2-11-50" for several releases, so the
 *   regex never matched and the gate reported a missing cache version. The
 *   cache WAS versioned. A false positive that has been sitting there since
 *   the naming scheme grew a second dot-separated group.
 *
 * FAILURE 2 — the Babel check requires a module that is not a dependency.
 *   require('@babel/standalone') throws MODULE_NOT_FOUND on a clean checkout
 *   because @babel/standalone is not in package.json. The skill documents the
 *   working Termux recipe (fetch babel.min.js from unpkg, evaluate it, read
 *   .exports) precisely because node_modules is not available here. So the
 *   gate can never pass on this machine, for a reason unrelated to the code
 *   it is supposed to check.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gate = fs.readFileSync(path.join(root, 'deploy-hygiene.js'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'macrohard', 'sw.js'), 'utf8');
// There is NO package.json in the monorepo root — the version source lives in
// macrohard/package.json. Discovered while writing this test: reading the root
// one throws ENOENT and takes the whole file down before a single assertion
// runs. The release version is a macrohard thing.
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'macrohard', 'package.json'), 'utf8'),
);

/** Run a source-level regex from the gate against a given text. */
function runGateRegex(source, text) {
  return new RegExp(source).test(text);
}

/**
 * The gate's own cache-version regex, read out of the source.
 *
 * Line-based on purpose: a greedy /if \(\/(\/.+)\/\.test\(swJs\)/ spans
 * several lines and swallows the NEXT regex literal in the file, which is how
 * the first version of this helper returned a pattern that had nothing to do
 * with the cache check.
 */
function gateCachePattern() {
  // Accept both `.test(swJs)` and `.exec(swJs)`: the fixed gate captures the
  // version so it can also compare it against package.json.
  const line = gate
    .split('\n')
    .find((l) => /\.(test|exec)\(swJs\)/.test(l) && l.includes('CACHE'));
  assert.ok(line, 'the gate must test or exec swJs against a CACHE pattern');
  const m = /(?:const\s+\w+\s*=\s*)?\/(.+)\/\.(?:test|exec)\(swJs\)/.exec(line);
  assert.ok(m, `could not extract the pattern from: ${line.trim()}`);
  return m[1];
}

test('the sw.js cache-version check accepts the real cache name', () => {
  // Do not restate the pattern: extract the gate's own regex source and run it
  // against the real sw.js. That is the actual question — "would the gate pass
  // on the file it is meant to check?" — and it keeps working after the fix.
  const gatePattern = gateCachePattern();
  const value = /CACHE\s*=\s*['"]([^'"]+)['"]/.exec(swJs);
  assert.ok(value, 'sw.js must declare a CACHE name');

  assert.ok(
    new RegExp(gatePattern).test(swJs),
    `the gate's own pattern /${gatePattern}/ rejects the real cache name ` +
      `"${value[1]}" — it has been failing for several releases over a naming ` +
      `scheme change, not a real regression`,
  );
});

test('the cache-version pattern is not pinned to a single digit', () => {
  const gatePattern = gateCachePattern();
  // The bug was "exactly one digit after macrohard-v" (\\d followed by the
  // closing quote). The real name has several groups (v2-11-50). If the gate now
  // captures the version, that is the right shape; if it only tests, the
  // pattern must still allow multiple groups.
  const captures = /\(\?:/.test(gatePattern) || /\[\d\]/.test(gatePattern);
  if (captures) {
    // New form: it captures so it can compare against package.json. Assert the
    // capture exists and is not the old single-digit-only form.
    assert.doesNotMatch(
      gatePattern,
      /\\d\['"]/,
      'the capture must allow the full dotted version, not a single digit',
    );
    // Require a numeric version in EITHER form: \d or a [\d] character class.
    // The real pattern uses ([\d]+(?:[.-][\d]+)*) — a class inside a group.
    assert.match(
      gatePattern,
      /\\d|\[\\d\]/,
      'the pattern must still require a numeric version',
    );
  } else {
    assert.doesNotMatch(
      gatePattern,
      /\\d\['"]/,
      'the pattern must not require exactly one digit — the cache name carries ' +
        'the full dotted version',
    );
  }
});

test('the cache name in sw.js tracks the package version', () => {
  // macrohard-v2-11-50 must belong to 2.11.50. A stale cache name means
  // returning visitors keep the old app.js — the failure mode the buster and
  // this name exist to prevent.
  const m = /macrohard-v([\d.-]+)/.exec(swJs);
  assert.ok(m, 'sw.js must have a versioned cache name');
  const fromCache = m[1].replace(/[.-]/g, (ch, i) => (ch === '.' ? '.' : '.'));
  const pkgParts = pkg.version.split('.');
  const cacheParts = fromCache.split('.');
  assert.equal(
    cacheParts.length,
    pkgParts.length,
    `cache name ${m[0]} has ${cacheParts.length} groups, package version ` +
      `${pkg.version} has ${pkgParts.length}`,
  );
  assert.equal(cacheParts.join('.'), pkg.version, `cache name must encode ${pkg.version}`);
});

test('a missing Babel compiler degrades to a warning, never a failure', () => {
  // The gate needs a JSX compiler. It is a browser bundle, not in package.json,
  // so on this machine `require` always throws. The rule is therefore not "the
  // dependency is declared" but "an absent compiler cannot fail the deploy".
  const babelBlock = gate.slice(gate.indexOf('function checkBabel'), gate.indexOf('// 2. relative Pfade'));

  // No bare failm for an unavailable tool anywhere in that block.
  assert.doesNotMatch(
    babelBlock,
    /failm\([^)]*MODULE_NOT_FOUND/,
    'a missing module must not be a hard failure',
  );
  // A tool problem goes through warnm.
  assert.match(
    babelBlock,
    /warnm\(/,
    'an unavailable compiler must produce a visible WARN, not silence',
  );
  // A real syntax error in the JSX must STILL fail the deploy.
  assert.match(
    babelBlock,
    /failm\([^)]*[Bb]abel transpile/,
    'a genuine JSX problem must still block — the fix must not mute the check',
  );
  // And it must have some way to get a compiler.
  assert.match(
    babelBlock,
    /require\('@babel\/standalone'\)|unpkg\.com/,
    'the gate must try to obtain a compiler (node require or the documented fetch)',
  );
});

test('the gate has a documented offline path for the Babel check', () => {
  // @babel/standalone is a browser bundle, not a normal node module. The
  // working recipe on Termux is documented in the msgraph-react-evolution
  // skill: curl babel.min.js from unpkg, evaluate it, read .exports. The gate
  // must either do that or skip with a clear message — never fail the push for
  // a missing tool.
  const babelBlock = gate.slice(
    gate.indexOf('// Babel'),
    gate.indexOf('// 2. relative Pfade'),
  );
  assert.ok(babelBlock, 'the Babel block must exist');
  const fatal = /failm\(['"]msgraph\/react Babel/.test(babelBlock);
  const hasFallback =
    /unpkg\.com|readFileSync.*_babel|skip/i.test(babelBlock) || !fatal;
  assert.ok(
    hasFallback,
    'the Babel check must degrade to a skip when the compiler is unavailable, ' +
      'not block the push',
  );
  // Whatever it does, it must not be silent.
  assert.match(
    babelBlock,
    /ok\(|failm\(|console\.(log|warn)/,
    'the Babel check must report something either way',
  );
});

test('the gate still checks the things that actually matter', () => {
  // Guard against "fixing" the two false positives by deleting checks. These
  // look for the SUBJECT of each check, not for a magic word: a previous
  // version of this test searched for the string "SW", which only ever
  // appeared in a comment — the real check says "Strategien".
  for (const [what, re] of [
    ['the relative-path check', /absolut/],
    ['the sw.js cache check', /CACHE/],
    ['the sw.js fetch-strategy check', /stale-while-revalidate|Strategien/],
    ['the sw.js offline fallback', /FALLBACK|Offline/],
    ['the manifest version check', /version=/],
    ['the manifest buildDate check', /buildDate/],
    ['the git sync check', /git local == remote/],
  ]) {
    assert.match(gate, re, `the gate must keep ${what}`);
  }
});
