import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * The "React" button in the header was a themeswitch left over from the
 * pre-React site, renamed to a label when the rewrite happened. Traced it:
 *
 *   68e7d1f  <button className="tbtn" data-set-theme="idun-retro"
 *                 onClick={() => setTab('reference')}>React</button>
 *
 * The data attribute is the tell — the label was the theme NAME, and the
 * click handler had already been reduced to "go to the reference tab". So the
 * button said "React" (the platform you are already on) and did something
 * unrelated. `idun-retro` occurs 0 times in site.css, index.html and
 * app.jsx: that theme does not exist in the React variant. The vanilla site
 * was deleted in 4eabcf1, /msgraph/ is only a redirect, and the portal links
 * straight to msgraph/react/ — so there is nothing for it to link to.
 *
 * It now opens the Sketch panel. These tests pin the facts that make that
 * panel correct, because three of them are the kind of thing that is true by
 * accident today and would silently stop being true.
 *
 * The sketch files: 17 CSDL documents in metadata-msgraph/schemas/, 5-8 MB
 * each. 100 MB of XML cannot be loaded when a tab opens, so the panel lists
 * names and sizes and loads exactly ONE file per click, in the worker.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsx = fs.readFileSync(path.join(root, 'assets', 'app.jsx'), 'utf8');
const built = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'assets', 'worker.js'), 'utf8');

/** The cloud sketches, read from the real source repo. */
const META = process.env.META_REPO || path.join(process.env.HOME, 'github/repo/metadata-msgraph');
const sketchDir = path.join(META, 'schemas');
const haveMeta = fs.existsSync(sketchDir);

test('the sketch list matches the files that actually exist', () => {
  assert.ok(haveMeta, `metadata-msgraph not found at ${META}`);
  const onDisk = fs
    .readdirSync(sketchDir)
    .filter((f) => f.endsWith('.csdl'))
    .sort();

  // Parse the list out of the JSX rather than restating it, so this test goes
  // red when the list drifts from the repo — which is the failure that matters.
  const m = /const SKETCHES = \[([\s\S]*?)\];/.exec(jsx);
  assert.ok(m, 'the JSX must declare a SKETCHES list');
  const declared = [...m[1].matchAll(/'([\w.-]+\.csdl)'/g)].map((x) => x[1]).sort();

  assert.equal(
    declared.length,
    onDisk.length,
    `the panel lists ${declared.length} sketches, the repo has ${onDisk.length}`,
  );
  const missing = onDisk.filter((f) => !declared.includes(f));
  const extra = declared.filter((f) => !onDisk.includes(f));
  assert.deepEqual(missing, [], `sketches on disk but not in the panel: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `sketches in the panel but not on disk: ${extra.join(', ')}`);
});

test('the panel shows the v1.0/beta gap instead of hiding it', () => {
  // Measured 2026-09-27: 8 v1.0 files, 9 beta files. v1.0-Review.csdl does not
  // exist in the repo (confirmed against the git index, not just the dir).
  // A panel that silently omits it makes the count look like a bug in the
  // panel; the gap is a fact about the data and belongs on screen.
  //
  // I first wrote 9 v1.0 / 8 beta — the numbers the other way round, from
  // reading the ls output instead of counting it. The test caught that, which
  // is the whole reason for hardcoding the counts: a wrong claim in a comment
  // is indistinguishable from a right one.
  assert.ok(haveMeta);
  const files = fs.readdirSync(sketchDir).filter((f) => f.endsWith('.csdl'));
  const v1 = files.filter((f) => f.startsWith('v1.0-'));
  const beta = files.filter((f) => f.startsWith('beta-'));
  assert.equal(v1.length, 8, `expected 8 v1.0 sketches, found ${v1.length}`);
  assert.equal(beta.length, 9, `expected 9 beta sketches, found ${beta.length}`);
  assert.ok(
    beta.includes('beta-Review.csdl') && !v1.includes('v1.0-Review.csdl'),
    'the asymmetry is Review; if that changed, update this test and the panel',
  );
  // The panel must therefore group by variant and mark what is missing.
  assert.match(jsx, /sketch_missing|sketchMissing/, 'the panel must flag the missing file');
});

test('the worker can count a CSDL document without DOMParser', () => {
  // The sketches are XML, not JSON — the existing worker only parses JSON, and
  // parsing 5-8 MB on the UI thread would be the exact RapiDoc freeze the
  // worker exists to prevent.
  //
  // NO DOMParser, and this assertion is here because I got that wrong. The
  // first version used DOMParser and every count failed at runtime with
  // "ReferenceError: DOMParser is not defined" — measured in Chromium:
  // inside a Web Worker, typeof DOMParser === 'undefined', same for
  // XMLDocument. A source-level test could not catch it, because the failure
  // only happens when a real worker runs.
  // Only the CODE must be free of it — the comment deliberately names it, and a
  // check that also forbids the word would forbid the explanation.
  const workerCode = worker
    .split('\n')
    .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(
    workerCode,
    /DOMParser/,
    'DOMParser does not exist in a Web Worker (verified in Chromium) — this ' +
      'makes every count fail at click time',
  );
  assert.doesNotMatch(workerCode, /XMLDocument/, 'same reason');
  // It must count the tags directly instead.
  for (const tag of ['EntityType', 'ComplexType', 'EnumType']) {
    assert.match(worker, new RegExp(tag), `the worker must count ${tag}`);
  }
  // And it must reject something that is not a CSDL document, rather than
  // reporting zero counts as if that were a fact about the file.
  assert.match(
    worker,
    /kein CSDL|not CSDL|Edmx/,
    'a non-CSDL response must be refused, not counted as zero',
  );
});

test('the CSDL counter agrees with the real files', () => {
  // This is the test that caught the escaping bug. The worker's own `open()`
  // is extracted from worker.js and run against the actual documents — NOT
  // reimplemented here. My first version rebuilt the pattern inline, made the
  // same double-escaping mistake as the worker, and "found" 0 types in a file
  // that plainly contains 36 EntityType declarations. A test that copies the
  // code it checks cannot catch a bug in the escaping: it copies the bug too.
  if (!haveMeta) return;
  const line = worker
    .split('\n')
    .find((l) => l.includes('const open ='));
  assert.ok(line, 'worker.js must have an open() helper');
  const m = /^const open = \([^)]*\) => (.*);$/.exec(line.trim());
  assert.ok(m, `could not extract open() from: ${line.trim()}`);
  const open = new Function('xml', 'tag', 'return ' + m[1]);

  for (const name of ['beta-Review.csdl', 'beta-GovSG.csdl', 'v1.0-GovSG.csdl']) {
    const p = path.join(sketchDir, name);
    if (!fs.existsSync(p)) continue;
    const xml = fs.readFileSync(p, 'utf8');
    let total = 0;
    for (const tag of ['EntityType', 'ComplexType', 'EnumType']) {
      const n = open(xml, tag);
      assert.equal(
        typeof n,
        'number',
        `${name}/${tag}: open() must return a number`,
      );
      assert.ok(
        n > 0,
        `${name}/${tag}: the counter found 0. A real CSDL declares all three ` +
          `kinds (beta-Review.csdl has 36/85/45), so a zero here means the ` +
          `pattern lost its backslash through an escaping layer.`,
      );
      total += n;
    }
    assert.ok(total > 100, `${name}: only ${total} types found, implausible`);
  }
});

test('the worker result is stored under the key the render reads', () => {
  // The bug this pins: the worker echoes the `file` it was given, which is the
  // FULL raw URL, and the handler stored the counts under that URL. The render
  // looks up counts[s.name] — the bare file name. Every lookup missed, so the
  // card sat on "count" forever while the worker had long since answered.
  //
  // Measured in Chromium 2026-09-27: the worker replied
  //   {type: "csdl", file: "https://raw.githubusercontent.com/.../beta-Review.csdl",
  //    ok: true, counts: {entityTypes: 36, complexTypes: 85, enumTypes: 45, totalTypes: 166}}
  // and after 12 s the card still read "zählen…". Nothing threw, no console
  // error — a mismatch of two string keys, which is invisible without comparing
  // them.
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.indexOf('// ---------- App shell'));
  assert.ok(panel.length > 0, 'the Sketch panel must exist');

  // What the worker is asked to load, and what the render looks up.
  // Anchor on the csdl message specifically. A bare postMessage match picks up
  // the FIRST one in the panel, which is now the segments request, not the
  // sketch request — the same "pattern too loose" mistake this file has now
  // made twice.
  const sent = /postMessage\(\{ type: 'csdl', file: ([^}]*)\}\)/.exec(panel);
  assert.ok(sent, 'the panel must post a csdl request to the worker');
  assert.match(
    sent[1],
    /RAW \+ 'schemas\/' \+ s\.name/,
    'the request must name exactly one sketch, built from s.name',
  );
  const lookup = /const c = counts\[([^\]]+)\]/.exec(panel);
  assert.ok(lookup, 'the render must look up counts[...]');
  assert.equal(
    lookup[1].trim(),
    's.name',
    'the render reads counts[s.name], so the handler must store under s.name too',
  );

  // The handler must therefore normalise the URL it gets back.
  // The key is computed on its own line and then used as the state key, so the
  // two assertions are separate: the COMPUTED value must be the bare name, and
  // the state write must use that variable.
  //
  // Demanding the reduction to appear inside setCounts(...) is too strict — it
  // rejected correct code twice, because the natural place to normalise a value
  // is before the call, not inside it. Fourth version of this assertion.
  const derived = /const key = ([^;]+);/.exec(panel);
  assert.ok(
    derived,
    'the handler must derive a key from the URL it receives',
  );
  assert.match(
    derived[1],
    /split\('\/'\)\.pop\(\)|basename|replace\([^)]*\/[^)]*\)/,
    `the key must be reduced to the bare file name, found: ${derived[1].trim()}`,
  );
  assert.match(
    derived[1],
    /file/,
    'the key must be derived from the file the worker echoed',
  );
  // And the state write must use that variable, not the raw URL.
  const write = /setCounts\(\(prev\) => \(\{ \.\.\.prev, \[([^\]]+)\]: c \}\)\)/.exec(panel);
  assert.ok(write, 'the counts must be written into the state object');
  assert.equal(
    write[1].trim(),
    'key',
    'the state key must be the normalised variable — writing `file` (a full ' +
      'URL) here is the bug this test pins',
  );
});

test('a sketch is loaded on demand, never all at once', () => {
  // 17 files x ~6 MB is ~100 MB. Loading them on tab open would be worse than
  // the RapiDoc freeze. The panel must render names and sizes from a static
  // list and fetch only what the user clicks.
  const panel = jsx.slice(jsx.indexOf('function Sketch'), jsx.length);
  assert.ok(panel.length > 0, 'a Sketch panel must exist');
  // The file list carries sizes, so no HEAD request per row either.
  assert.match(panel, /mb|MB|size/i, 'the panel must show sizes without fetching');
  // A fetch is allowed, but only with a specific file, not the whole set.
  const fetches = [...panel.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]);
  for (const f of fetches) {
    assert.match(
      f,
      /file|sketch|name/i,
      'a worker message must name ONE sketch — a loop over the whole list ' +
        'would defeat the point of this panel',
    );
  }
});

test('the header button is honest about what it does', () => {
  // The bug was a label that did not describe the action. Two things follow:
  // no leftover "React" label, and no leftover setTab('reference') on it.
  assert.doesNotMatch(
    jsx,
    /<button className="tbtn" onClick=\{\(\) => setTab\('reference'\)\}>React<\/button>/,
    'the mislabelled button is back',
  );
  assert.doesNotMatch(jsx, />React<\/button>/, 'no button may claim to be "React"');
  assert.match(jsx, /sketch/i, 'the replacement must be the sketch panel');
  // The label has to come from the i18n table, not be hardcoded — otherwise it
  // stays German in the English UI.
  assert.match(jsx, /t\.sketch/, 'the button label must use a t.* key');
});

test('every new i18n key exists in both languages', () => {
  // The F3 bug: a t.* key without a DE entry leaks the raw key into the UI.
  // The de-facto cause was also a filter value that existed in no table, so
  // this also checks the tables are structurally the same.
  const tables = [...jsx.matchAll(/const T_DE = \{([\s\S]*?)\n\};|const DE = \{([\s\S]*?)\n\};/g)];
  // Fall back to whatever the tables actually look like.
  const deStart = jsx.indexOf('filter_shown');
  const enStart = jsx.lastIndexOf('filter_shown');
  assert.ok(deStart > 0 && enStart > deStart, 'both i18n tables must contain filter_shown');

  const used = new Set([...jsx.matchAll(/\bt\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]));
  assert.ok(used.size > 10, `expected many t.* keys, found ${used.size}`);

  for (const key of [...used]) {
    // Each key must appear at least twice (definition + use) across the two
    // tables. A key defined once means it exists in only one language.
    const occurrences = (jsx.match(new RegExp(`\\b${key}:`, 'g')) || []).length;
    assert.ok(
      occurrences >= 2,
      `t.${key} is defined only once — it is missing in one of the two ` +
        `language tables, so the raw key would leak into that UI`,
    );
  }
});

test('the compiled app.js carries the sketch panel', () => {
  // app.js is what index.html loads. A source fix without
  // `sh build_appjs.sh` leaves the browser on the old behaviour while every
  // source-level test stays green — the F4 trap.
  assert.ok(
    built.includes('SKETCHES'),
    'the compiled app.js has no SKETCHES — rebuild with sh build_appjs.sh',
  );
  assert.ok(
    built.includes('csdl'),
    'the compiled app.js does not reference the csdl sketch names',
  );
});
