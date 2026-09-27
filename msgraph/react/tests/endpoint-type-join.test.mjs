import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Join the CSDL entity types to the endpoint list — the thing a metadata hub
 * exists for. "accessReview" exists as a type AND as 58 endpoints; only one of
 * those facts is visible today.
 *
 * Where the join actually lives (checked, not assumed):
 *
 *   The 2.5MB index.v1.0.json / 4.5MB index.beta.json have NO type reference
 *   at all. Every operation is exactly:
 *       { method, summary, operationId }
 *   I grepped for "schema", "$ref", "response" — the first is 74 hits of
 *   unrelated text, the latter two 2 and 0. The join cannot come from there.
 *
 *   The 40MB openapi.yaml DOES carry it, in responses:
 *       $ref: '#/components/schemas/microsoft.graph.admin'
 *   but 40MB is exactly the thing the worker exists to avoid loading.
 *
 *   The ring CSDL files carry it too, and that is what this uses:
 *       <EntitySet Name="accessReviews" EntityType="microsoft.graph.accessReview" />
 *
 *   Measured on beta-Mooncake.csdl: 54 entity types have an EntitySet, 53 of
 *   them have at least one endpoint whose last path segment equals the set
 *   name. That is the join.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsx = fs.readFileSync(path.join(root, 'assets', 'app.jsx'), 'utf8');
const built = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'assets', 'worker.js'), 'utf8');
/** worker.js without its comments, so a comment may name a forbidden thing. */
function workerCode() {
  return worker
    .split('\n')
    .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
    .join('\n');
}

const SCHEMAS = path.join(process.env.HOME, 'github/repo/metadata-msgraph/schemas');
const haveSchemas = fs.existsSync(SCHEMAS);

/** The EntitySet -> type mapping, read from a real ring file. */
function entitySets(file) {
  const x = fs.readFileSync(path.join(SCHEMAS, file), 'utf8');
  const map = new Map();
  for (const [, name, type] of x.matchAll(
    /<EntitySet\s+Name="([^"]+)"\s+EntityType="([A-Za-z0-9_.]+)"/g,
  )) {
    const t = type.split('.').pop();
    if (!map.has(t)) map.set(t, new Set());
    map.get(t).add(name);
  }
  return map;
}

test('precondition: the index JSON carries no type reference at all', () => {
  // If a future regeneration ever adds one, this join becomes unnecessary and
  // this test says so instead of leaving two mechanisms in place.
  const f = path.join(root, 'data', 'index.v1.0.json');
  if (!fs.existsSync(f)) return;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const keys = new Set();
  for (const ops of Object.values(d.paths)) {
    for (const o of ops) Object.keys(o).forEach((k) => keys.add(k));
  }
  assert.deepEqual(
    [...keys].sort(),
    ['method', 'operationId', 'summary'],
    'the index gained a key — check whether the CSDL join is still the right ' +
      `way to link types to endpoints. Found: ${[...keys].join(', ')}`,
  );
});

test('the CSDL files really carry the EntitySet join', () => {
  assert.ok(haveSchemas, `metadata-msgraph/schemas not found at ${SCHEMAS}`);
  const sets = entitySets('beta-Mooncake.csdl');
  assert.ok(sets.size > 40, `expected 50+ types with an EntitySet, got ${sets.size}`);
  const ar = sets.get('accessReview');
  assert.ok(ar, 'accessReview must have an EntitySet');
  assert.ok(ar.has('accessReviews'), 'the set name is the plural of the type');
});

test('the worker extracts the entity sets, not just the counts', () => {
  assert.match(worker, /EntitySet/, 'the worker must read the EntitySet elements');
  assert.match(
    worker,
    /entitySets|entityTypeSets/,
    'the worker must return the sets alongside the counts',
  );
  // Both prefixes occur in the data and must be handled: the EntitySet uses
  // the full "microsoft.graph.x" while Action parameters use the short
  // "graph.x". Stripping only one of them leaves every set unresolved.
  assert.match(worker, /split\('\.'\)\.pop\(\)|split\("\."\)\.pop\(\)/,
    'the type prefix must be stripped, not compared literally');
  assert.ok(
    worker.includes('microsoft.graph') || worker.includes("split('.')"),
    'the full "microsoft.graph.x" prefix must be handled',
  );
});

test('the join must not pretend every type has endpoints', () => {
  // message is the most obvious counter-case: /me/messages exists as an
  // endpoint, but `message` has no EntitySet in any ring file — it is only
  // reachable as a NavigationProperty of `user`. Measured, not assumed.
  assert.ok(haveSchemas);
  for (const f of ['beta-Mooncake.csdl', 'v1.0-Prod.csdl', 'beta-Prod.csdl']) {
    const p = path.join(SCHEMAS, f);
    if (!fs.existsSync(p)) continue;
    const sets = entitySets(f);
    assert.equal(
      sets.has('message'),
      false,
      `${f}: 'message' now HAS an EntitySet — the panel text that calls it ` +
        'navigation-only is wrong and must be updated',
    );
  }
  // And the honest number: not every type with a set has endpoints either.
  const idx = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'index.beta.json'), 'utf8'),
  );
  const seg = new Set();
  for (const p of Object.keys(idx.paths)) seg.add(p.replace(/\/$/, '').split('/').pop());
  const sets = entitySets('beta-Mooncake.csdl');
  const without = [...sets.keys()].filter((t) =>
    [...sets.get(t)].every((s) => !seg.has(s)),
  );
  assert.ok(
    without.length > 0,
    'every type with a set has an endpoint now — the panel must stop ' +
      'distinguishing the two cases',
  );
});

test('the join counts ENDPOINTS, not the number of sets', () => {
  // The first implementation asked the worker for a Set of path segments and
  // counted 1 per matching set name. That is the wrong question: an EntitySet
  // is a container, and one container carries many endpoints. accessReview is
  // a single EntitySet and 58 endpoints, so every type in the panel reported
  // "1 Endpoints" and the column carried no information at all.
  //
  // Measured on beta-GovSG: administrativeUnit has one EntitySet
  // ("administrativeUnits") and TWO paths ending in that segment. The Set-based
  // version showed 1.
  assert.ok(haveSchemas);
  const idx = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'index.beta.json'), 'utf8'),
  );
  const counts = {};
  for (const p of Object.keys(idx.paths)) {
    const seg = p.replace(/\/$/, '').split('/').pop();
    counts[seg] = (counts[seg] || 0) + 1;
  }
  // At least one segment must appear more than once, or this test could never
  // tell the two implementations apart.
  const multi = Object.values(counts).filter((n) => n > 1);
  assert.ok(
    multi.length > 50,
    `expected many multi-path segments, got ${multi.length} — if the index ` +
      'changed so every segment is unique, the set-vs-count distinction is moot',
  );

  // The worker must send a MAP of segment -> path count, not a Set.
  assert.doesNotMatch(
    workerCode(),
    /const segs = new Set\(\)/,
    'a Set cannot express "how many endpoints" — it only says "at least one"',
  );
  assert.match(
    workerCode(),
    /segs\[seg\] = \(segs\[seg\] \|\| 0\) \+ 1/,
    'the worker must count paths per segment',
  );
  // And the panel must read the number, not test membership.
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.indexOf('// ---------- App shell'));
  assert.doesNotMatch(
    panel,
    /segments\.has\(/,
    'membership testing is the bug this test pins',
  );
  assert.match(
    panel,
    /segments\[set\] \? segments\[set\] : 0/,
    'the join must add the path count of every set of that type',
  );
});

test('the type list is collapsed to the top 5, not fully expanded', () => {
  // Measured on beta-Mooncake, 2026-09-27: a counted card is 2510 px tall
  // because the join lists all 53 types. A phone viewport is ~640 px, so the
  // next card sits at y=2032 — far outside the view. Nine counted cards make
  // the panel ~42000 px inside a 520 px scroll container.
  //
  // The user reported "an empty page" on first click; the cause turned out to
  // be a stale browser cache, but this height is a real usability defect
  // independent of that. Expanded-by-default is the wrong default.
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.indexOf('// ---------- App shell'));
  assert.match(
    panel,
    /const TOP = 5|slice\(0, ?5\)|TOP_N/,
    'the list must be capped at a small number of rows',
  );
  // And there must be a way to see the rest.
  assert.match(
    panel,
    /mehr|more|showAll|expand/i,
    'there must be a control that reveals the remaining types',
  );
  // The count of hidden rows must be stated, not implied by a "..." — the
  // panel already states join coverage precisely, and a bare ellipsis would
  // be the opposite of that.
  assert.match(
    panel,
    /\{rest\.length\}|\+\{|length - TOP|rest\.length/,
    'the control must state how many types are hidden',
  );
  // Collapsing must not lose the information that a type has no endpoint:
  // those rows are the reason the join is honest.
  assert.match(
    panel,
    /no-ep/,
    'the no-endpoint marking must survive the collapse',
  );
});

test('data URLs survive a query string and a hash', () => {
  // The join silently produced nothing when the page URL had a query string.
  // `location.href.replace(/index\.html?$/, '')` leaves "?v=1" in place, so the
  // worker fetched ".../?v=1data/index.beta.json", the server returned the 404
  // HTML page, and res.json() threw
  //   SyntaxError: Unexpected token '<' ... is not valid JSON
  // The worker reported ok:false, the panel dropped the error without showing
  // it, and the join column was simply absent. Nothing threw in the UI.
  //
  // This is not hypothetical: adding ?v=1 for cache-busting is the normal way
  // to test a deploy, and it is exactly when the feature would disappear.
  assert.match(
    jsx,
    /const dataUrl = \(rel\)/,
    'there must be one helper that builds a data URL',
  );
  const m = /const dataUrl = \(rel\) => ([^;]+);/.exec(jsx);
  assert.ok(m, 'dataUrl must be a single expression');
  assert.match(
    m[1],
    /split\(\/\[\?#\]\/\)/,
    `dataUrl must strip the query string and hash, found: ${m[1].trim()}`,
  );
  // And both callers must use it. The Reference panel had the identical
  // expression and the identical latent bug.
  const uses = [...jsx.matchAll(/dataUrl\('([^']+)'\)/g)].map((x) => x[1]);
  for (const f of ['data/index.beta.json', 'data/index.v1.0.json']) {
    assert.ok(uses.includes(f), `${f} must be built through dataUrl, not inline`);
  }
  assert.doesNotMatch(
    jsx,
    /location\.href\.replace\(\/index\.html\?\$\/, ''\)/,
    'the old base-URL expression is back somewhere — it breaks on any query string',
  );
});

test('the join header states "N of M", not just N', () => {
  // Showing only the linked count made a file with a dead type look complete:
  // beta-Mooncake has 54 types with an EntitySet, 53 of which reach endpoints
  // and one (connectorGroup) does not. "54 / 54" in the browser came from
  // using the total on both sides of the fraction.
  assert.ok(haveSchemas);
  const sets = entitySets('beta-Mooncake.csdl');
  const idx = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'index.beta.json'), 'utf8'),
  );
  const cnt = {};
  for (const p of Object.keys(idx.paths)) {
    const seg = p.replace(/\/$/, '').split('/').pop();
    cnt[seg] = (cnt[seg] || 0) + 1;
  }
  const dead = [...sets.keys()].filter((t) =>
    [...sets.get(t)].every((s) => !cnt[s]),
  );
  assert.deepEqual(
    dead,
    ['connectorGroup'],
    `expected exactly connectorGroup to have no endpoint, got ${dead.join(', ')}`,
  );

  // So the two numbers differ, which is the whole point.
  assert.equal(sets.size, 54, 'the joinable type count changed');
  assert.equal(sets.size - dead.length, 53, 'the linked type count changed');

  // The panel must compute the two separately and print both.
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.indexOf('// ---------- App shell'));
  assert.match(
    panel,
    /const linked = \(c\) => join\(c\)\.filter\(\(r\) => r\.n > 0\)/,
    'the linked count must filter on n > 0 — a type with 0 endpoints is not linked',
  );
  assert.match(
    panel,
    /sketch_join[\s\S]{0,200}linked\(c\)\.length[\s\S]{0,200}entitySetCount/,
    'the header must show the linked count AND the joinable total',
  );
});

test('the segment map is stored as a map, not wrapped in a Set', () => {
  // The worker sends {segment: pathCount}. An intermediate version still did
  // `setSegments(new Set(e.data.segments))`, which turns a count map into a
  // list of key names: every lookup then misses and the panel shows
  // "nur über Navigation" for every type, while the worker is demonstrably
  // correct. Nothing throws — the join just answers a different question.
  //
  // Worth pinning separately: this is the failure a compile check cannot see.
  // `sh build_appjs.sh` reports SYNTAX OK either way, the source-level tests on
  // the worker pass either way, and only clicking the button shows the
  // difference.
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.indexOf('// ---------- App shell'));
  assert.doesNotMatch(
    panel,
    /new Set\(e\.data\.segments\)|new Set\(.*segments/,
    'the segment map must be stored as-is; wrapping it in a Set discards the ' +
      'path counts and every type looks like it has no endpoint',
  );
  assert.match(
    panel,
    /setSegments\(e\.data\.segments\)/,
    'the map must be stored unchanged',
  );
  // And the initial state must be null, not an empty object: an empty object
  // is truthy, so a join that runs before the segments arrive would silently
  // report zero endpoints for every type instead of waiting.
  assert.match(
    panel,
    /useState\(null\)[^;]*segments|const \[segments, setSegments\] = useState\(null\)/,
    'segments must start as null so the join can tell "not loaded" from "zero"',
  );
});

test('the panel shows the join, and shows its limits', () => {
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.indexOf('// ---------- App shell'));
  assert.ok(panel.length > 0, 'the Sketch panel must exist');
  // A type row that leads somewhere: the join must actually consume the
  // worker's entitySets and the segment set, and render a per-type endpoint
  // count. Matching on the word "endpoints" was too weak — it passed on a
  // translation key alone, with no join in sight.
  assert.match(
    panel,
    /entitySets/,
    'the join must read entitySets from the worker result',
  );
  // The membership form is asserted in the dedicated test above; here only
  // the shape of the lookup matters, so that a future refactor to a different
  // data structure is not reported as a missing join.
  assert.match(
    panel,
    /segments\[set\]/,
    'the join must read the endpoint count of each set name',
  );
  assert.match(
    panel,
    /\{\s*r\.n\s*\}\s*\{t\.sketch_ep\}|r\.n\s*>\s*0/,
    'each type row must show its endpoint count',
  );
  // And the honesty about the gap: types with a set but no endpoint must be
  // rendered and marked, not filtered out.
  assert.match(
    panel,
    /sketch_navonly/,
    'types without a direct endpoint must be marked as such, not dropped',
  );
  // The coverage must be stated as a fraction of the joinable types, so the
  // user can see how much of the document the join reaches.
  assert.match(
    panel,
    /entitySetCount/,
    'the panel must state how many types the join can speak about at all',
  );
});

test('every new i18n key exists in both languages', () => {
  const used = new Set([...jsx.matchAll(/\bt\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]));
  for (const key of used) {
    const n = (jsx.match(new RegExp(`\\b${key}:`, 'g')) || []).length;
    assert.ok(n >= 2, `t.${key} is defined only once — missing in one language table`);
  }
});

test('the compiled app.js carries the join', () => {
  assert.ok(built.includes('EntitySet'), 'app.js has no EntitySet handling — rebuild it');
  assert.ok(built.includes('entitySets'), 'app.js has no entitySets — rebuild it');
});
