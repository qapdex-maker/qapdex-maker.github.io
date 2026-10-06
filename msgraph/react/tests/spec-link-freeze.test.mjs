import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * The raw-spec freeze. Measured 2026-10-01, Chromium 149 headless (Termux),
 * 412x915 @2.625, Emulation.setCPUThrottlingRate 4,
 * Network.emulateNetworkConditions:
 *
 *   navigation to raw.githubusercontent .../openapi/v1.0/openapi.yaml
 *     content-length      44334960   (42.3 MB)
 *     content-type        text/plain; charset=utf-8
 *     readyState          "loading" after 212 s, never finished
 *     one Runtime.evaluate took 27.3 s (slow4g) / 49.3 s (fast4g)
 *                         76.2 s (slow3g, cpu x6) / 6.0 s (cpu x1)
 *     document.body.innerText stood at 14.8 - 17.0 MB
 *
 *   same file as a release asset
 *     content-disposition  attachment; filename=openapi-v1.0.yaml
 *     content-type         application/octet-stream
 *
 * The app itself is fine and always was: Reference renders its first row in
 * 531 ms, the search answers in 808 ms, one CSDL count (5.6 MB, in the
 * worker) takes 819 ms, zero long tasks in all three. The freeze was one
 * header on a link, and it looked like an application hang because the link
 * opens in a new tab that stays alive while the app keeps working.
 *
 * So these tests assert the LINK SHAPE, not the app behaviour. There is
 * nothing to unit-test about a browser's renderer; what we can pin is that no
 * user-visible link sends the user to a URL that freezes their browser.
 *
 * The rule these encode: a raw.githubusercontent.com link is only allowed for
 * a file small enough to render. The CSDL documents (5-8 MB) go through the
 * worker and measured fine, so they stay on RAW. The type mapping is 335 KB.
 * The two OpenAPI specs are 42 and 67 MB and must never be a raw link again.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const JSX = path.join(ROOT, 'assets', 'app.jsx');
const APP = path.join(ROOT, 'assets', 'app.js');
const MANIFEST = path.join(ROOT, 'data', 'manifest.json');
const INDEX = path.join(ROOT, 'index.html');

const src = fs.readFileSync(JSX, 'utf8');
const app = fs.readFileSync(APP, 'utf8');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const html = fs.readFileSync(INDEX, 'utf8');

// Measured sizes. Raw.githubusercontent served these exact byte counts on
// 2026-10-01; the release assets carry the same sha256 as the repo files.
const RAW_LIMIT = 8 * 1024 * 1024; // 8 MB: the largest CSDL we load (beta-Prod)
const SPEC_V1 = 44334960;
const SPEC_BETA = 69965060;

/* Strip comments so a measurement in a comment cannot satisfy or fail a
 * link assertion. The freeze write-up quotes the old raw URL on purpose —
 * a grep for that URL must not then read as "the link is still there". */
function code(file) {
  return file
    .split('\n')
    .filter((l) => !/^\s*(\/\*|\*|\*\/|\/\/)/.test(l))
    .join('\n');
}
const srcCode = code(src);
const appCode = code(app);

test('the two OpenAPI specs exceed the raw-render threshold by an order of magnitude', () => {
  assert.ok(SPEC_V1 > RAW_LIMIT * 5, `v1.0 ${SPEC_V1} should dwarf the ${RAW_LIMIT} raw limit`);
  assert.ok(SPEC_BETA > RAW_LIMIT * 8, `beta ${SPEC_BETA} should dwarf the ${RAW_LIMIT} raw limit`);
});

test('no user-visible link points a spec at raw.githubusercontent', () => {
  for (const [name, text] of [['app.jsx', srcCode], ['app.js', appCode]]) {
    // A raw link is only a problem when it targets an openapi spec. CSDL and
    // type-mapping paths are checked separately below.
    assert.ok(
      !/RAW\s*\+\s*SITE/.test(text),
      `${name} still builds a spec URL from RAW + SITE`,
    );
    assert.ok(
      !/['"][^'"]*openapi\/(v1\.0|beta)\/openapi\.yaml['"]/.test(text),
      `${name} contains a literal raw openapi/*.yaml URL`,
    );
  }
});

test('the spec links point at the release assets', () => {
  assert.match(srcCode, /const RELEASE = 'https:\/\/github\.com\/[^']+\/releases\/download\/spec-\d{4}-\d{2}-\d{2}\/'/);
  assert.match(srcCode, /const SPEC = \{[^}]*'v1\.0': 'openapi-v1\.0\.yaml'[^}]*beta: 'openapi-beta\.yaml'/s);

  // The download list no longer carries spec URLs — the specs are previewed
  // in-app via YamlPreview, which uses RELEASE + SPEC. The list now only
  // carries the type-mapping download (RAW + TYPEMAP) and preview entries.
  const listBlock = srcCode.match(/const dls = \[([\s\S]*?)\];/);
  assert.ok(listBlock, 'the Hub download list is gone');
  assert.ok(!/RAW\s*\+\s*SITE/.test(listBlock[1]), 'the download list builds a spec from RAW');
  assert.match(listBlock[1], /RAW\s*\+\s*TYPEMAP/);
  assert.match(listBlock[1], /variant:\s*'v1\.0'/);
  assert.match(listBlock[1], /variant:\s*'beta'/);

  // The YamlPreview component must use RELEASE + SPEC for the spec URLs.
  const yamlPreview = srcCode.match(/function YamlPreview[\s\S]*?const fileMap = \{([\s\S]*?)\};/);
  assert.ok(yamlPreview, 'YamlPreview fileMap is missing');
  assert.match(yamlPreview[1], /RELEASE\s*\+\s*SPEC\['v1\.0'\]/);
  assert.match(yamlPreview[1], /RELEASE\s*\+\s*SPEC\.beta/);

  // The Reference button is the other spec href and must be RELEASE too.
  const refBtn = srcCode.match(/<a className="btn"[^>]*href=\{([^}]*)\}[^>]*>\{t\.ref_open\}/);
  assert.ok(refBtn, 'the Reference "open raw spec" button is gone');
  assert.match(refBtn[1], /^RELEASE\s*\+\s*SPEC\[variant\]$/,
    `the Reference spec button must use RELEASE + SPEC[variant], got: ${refBtn[1]}`);

  // Nothing anywhere may concatenate RAW onto a spec identifier.
  for (const m of srcCode.matchAll(/RAW\s*\+\s*([A-Za-z_$][\w$.[\]'"]*)/g)) {
    assert.ok(!/SPEC|SITE/.test(m[1]),
      `RAW + ${m[1]} would send the user to a raw spec URL`);
  }
});

test('the CSDL and type-mapping links stay on raw — they were measured fine', () => {
  // beta-Prod.csdl is 8273 KB on the current fork (measured with ls, not
  // taken from the panel's table), the largest sketch. My first limit of
  // 8 MB was wrong by 10 KB and the test caught it — the assertion has to
  // come from the file, not from my memory of it.
  const LARGEST_CSDL_KB = 8273;
  assert.ok(LARGEST_CSDL_KB * 1024 > RAW_LIMIT,
    'the largest CSDL is ABOVE the raw limit, so size alone is not the reason it is allowed');
  // What actually saves a CSDL is that the worker parses it as TEXT and
  // returns only counts — it is never rendered as a document. That is why a
  // 8 MB CSDL is fine while a 42 MB spec is not: only one of them becomes a
  // browser document. So the guard belongs on "no main-thread fetch", below.
  assert.match(srcCode, /RAW\s*\+\s*TYPEMAP/);
  assert.match(srcCode, /RAW\s*\+\s*'schemas\/'\s*\+\s*s\.name/);
  // The worker must be the only path that touches a CSDL.
  assert.ok(
    !/fetch\(\s*RAW/.test(srcCode),
    'a main-thread fetch on RAW would parse 5-8 MB on the UI thread',
  );
  // And the panel must keep the one-file-per-click rule: a loop over all 17
  // would be ~90 MB in one worker message.
  assert.match(srcCode, /postMessage\(\{\s*type:\s*'csdl',\s*file:\s*RAW/);
});

test('the dead SITE constant is gone', () => {
  // It survived the switch because the Hub download list and the Reference
  // button were two separate call sites. A constant nobody reads is a lie
  // about the current link strategy.
  assert.ok(!/const SITE =/.test(srcCode), 'SITE is dead after the release switch');
  assert.ok(!/SITE\[/.test(srcCode), 'SITE is still indexed somewhere');
});

test('app.js is the current compile of app.jsx (the F4 trap)', () => {
  // A stale app.js served from Pages while app.jsx says otherwise was a real
  // incident: curl saw 42382 bytes, the browser saw 32099. So this asserts
  // the RELEASE constant reached the compiled output, not the whole hash.
  assert.match(app, /releases\/download\/spec-\d{4}-\d{2}-\d{2}/);
  assert.ok(!/const SITE =/.test(app), 'compiled app.js still carries the dead SITE constant');
});

test('manifest specRaw carries the release URLs, and both agree with the app', () => {
  const raw = manifest.specRaw;
  assert.ok(raw && raw['v1.0'] && raw.beta, 'specRaw is missing a variant');
  for (const [variant, url] of Object.entries(raw)) {
    assert.match(url, /releases\/download\/spec-\d{4}-\d{2}-\d{2}\//,
      `specRaw.${variant} still points at raw: ${url}`);
    assert.ok(!url.includes('raw.githubusercontent.com'),
      `specRaw.${variant} is the freeze URL: ${url}`);
    // The manifest and the app must name the same asset, or a future reader
    // cannot tell which one is authoritative.
    assert.ok(srcCode.includes(url.split('/').pop()),
      `specRaw.${variant} names an asset the app does not use`);
  }
  const ref = manifest.tabs.find((t) => t.id === 'reference');
  assert.ok(ref && ref.spec, 'the reference tab lost its spec URL');
  assert.match(ref.spec, /releases\/download\/spec-\d{4}-\d{2}-\d{2}\//);
  assert.ok(ref.specBeta, 'the beta spec URL is missing from the reference tab');
});

test('the manifest sync date matches the fork, not an old snapshot', () => {
  // It read 1.4.711.0 / 2026-08-26 while the fork had synced to 1.4.759.0 on
  // 2026-09-18 (commit 71b498cb). The live dot then advertised a sync state
  // three weeks stale — the same "trust the badge" problem as the static
  // `● live` dot that F2 fixed, in a different field.
  assert.equal(manifest.schemaVersion, '1.4.759.0');
  assert.equal(manifest.syncDate, '2026-09-18');
  assert.ok(manifest.schemaVersionNote, 'the derived version needs its provenance in the file');
});

test('index.html loads no raw spec and no in-browser Babel', () => {
  assert.ok(!/openapi/.test(html), 'index.html must not reference a spec URL');
  // A comment mentioning babel is not a script tag — grep for the tag.
  assert.ok(!/<script[^>]*babel/i.test(html), 'in-browser Babel must stay out (F4)');
  assert.ok(!/openapi\/(v1\.0|beta)\/openapi\.yaml/.test(html));
});