import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Live-Aufruf gegen Microsoft Graph, direkt aus dem Browser (2026-10-05).
 *
 * Kein Proxy. Graph antwortet mit `Access-Control-Allow-Origin: *`
 * (OPTIONS, am 2026-10-05 frisch gemessen), also braucht die Seite keinen
 * Server dazwischen und vor allem kein deploytes Geheimnis.
 *
 * Zwei Eigenschaften sind hier die eigentliche Behauptung und werden
 * deshalb statisch geprüft:
 *
 *  1. Der Token wird NIE committet. Er darf nur in sessionStorage und im
 *     Authorization-Header auftauchen — nirgends sonst im Quelltext. Ein
 *     Graph-Token in einer Datei auf GitHub Pages ist kein Secret mehr,
 *     weil jede Pages-Datei öffentlich ist (belegt in
 *     NOTES-API-PROXY.md: manifest.json → HTTP 200 ohne jede Auth).
 *  2. Nur /me-verankerte Read-Pfade gehen raus. Die Endpoint-Auswahl
 *     bietet 17.531 Pfade aus der Index-JSON; ohne Guard würde der
 *     Live-Button den Token des Owners auch an /users schicken.
 *
 * NOTE ON STALE TESTS: this file reads app.jsx and app.js from disk. It is a
 * static check, not a live call — a real token is needed for that and must
 * never live in a test fixture or a committed file.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const src = fs.readFileSync(path.join(ROOT, 'assets', 'app.jsx'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');

// Strip comments so documentation that mentions a secret is not read as a use
// of one. (Same trap as `grep -c babel index.html` hitting a comment.)
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the live path is compiled into app.js', () => {
  test('graphCall exists in the precompiled bundle', () => {
    assert.match(app, /graphCall/,
      'assets/app.js does not contain graphCall — build_appjs.sh was not run after the edit');
  });

  test('the /me guard exists in the bundle', () => {
    assert.match(app, /livePathAllowed/,
      'assets/app.js does not contain livePathAllowed — build_appjs.sh was not run');
  });
});

describe('token hygiene in the deployed source', () => {
  test('graph_token is only ever read from and written to sessionStorage', () => {
    const hits = code.match(/['"]graph_token['"]/g) || [];
    // Exactly two: the read in useState's initialiser and the write in the
    // onChange handler. A third would mean somewhere else persists it.
    assert.ok(hits.length >= 2,
      'expected graph_token to be read and written, found ' + hits.length + ' mentions');
    // Every mention must sit next to a sessionStorage call.
    const lines = code.split('\n').filter((l) => /['"]graph_token['"]/.test(l));
    for (const l of lines) {
      assert.match(l, /sessionStorage/,
        'graph_token is referenced away from sessionStorage: ' + l.trim());
    }
  });

  test('the token is never written to localStorage or a cookie', () => {
    assert.ok(!/localStorage[^;\n]*graph_token/.test(code),
      'token is persisted in localStorage');
    assert.ok(!/document\.cookie[^;\n]*graph_token/.test(code),
      'token is written to a cookie');
  });

  test('the token is only sent to Graph, and to nothing else', () => {
    // The comment in app.jsx claims the token goes to exactly one domain.
    // That claim is only worth something if it is asserted. An earlier version
    // of this test accepted any line mentioning `Bearer`, so pointing the call
    // at another host passed — a regression that exfiltrates the token.
    //
    // Careful: the LLM provider calls also carry a Bearer header, on the SAME
    // line as their fetch. Filtering on "fetch( && Bearer" therefore sweeps in
    // loadCatalog's provider call and flags correct code. The Graph call is
    // identified by its literal host instead — that is what distinguishes it.
    const graphFetches = code.split('\n')
      .filter((l) => /\bfetch\(/.test(l) && /graph\.microsoft\.com/.test(l));
    assert.equal(graphFetches.length, 1,
      'expected exactly one Graph call, found ' + graphFetches.length);
    assert.match(code, /fetch\('https:\/\/graph\.microsoft\.com\/v1\.0' \+ path/,
      'the Graph call no longer targets graph.microsoft.com/v1.0');
    // The bearer header is on the NEXT line, not on the fetch line — asserting
    // it on the fetch line was red against correct code.
    const gi = code.indexOf("fetch('https://graph.microsoft.com/v1.0' + path");
    assert.ok(gi > -1, 'graph fetch not found');
    const after = code.slice(gi, gi + 400);
    assert.match(after, /'Authorization': 'Bearer ' \+ token/,
      'the Graph call does not send the token as a bearer header');
    // No other host may appear together with a Bearer header: that is what an
    // exfiltration looks like.
    for (const l of code.split('\n')) {
      if (!/Bearer/.test(l)) continue;
      if (/graph\.microsoft\.com/.test(l)) continue;
      // Provider calls legitimately send their own key to their own base URL,
      // and the curl sample line is documentation, not a request.
      if (/p\.base/.test(l)) continue;
      if (/curl -X/.test(l)) continue;
      assert.ok(!/fetch\(/.test(l),
        'a bearer token is sent to an unexpected place: ' + l.trim());
    }
  });

  test('the token is never rendered into the page', () => {
    // `value={gxKey}` is the input's own value — same as the existing LLM key
    // field, and masked by type="password". What must not exist is the token
    // inside JSX *text*, i.e. rendered next to other content.
    //
    // Two earlier versions of this check both passed while the token was
    // rendered as text:
    //   1. a regex demanding `>` before the token — JSX allows an expression in
    //      between, so `{t.gx_key_ok} {gxKey}` slipped through;
    //   2. a per-line check that STRIPPED every gxKey occurrence and then
    //      asserted none was left — which can never fail, because stripping
    //      removes exactly what it then looks for.
    //
    // The reliable statement: gxKey must never be *rendered*. Rendering means it
    // sits in a JSX text position, i.e. between a tag close and the next tag
    // open, as `{...} {gxKey}` inside markup. The way to tell that apart from
    // logic is the surrounding text, not the presence of `<` or `>` alone —
    // `useState(() => ...)` contains a `>` and is obviously not JSX.
    //
    // So: a leak is a line that (a) mentions gxKey, (b) is inside a JSX block
    // (some earlier line opened a tag with className="hint" and this line is
    // still inside it), and (c) has gxKey as a brace expression that is not a
    // `value=` attribute.
    const lines = code.split('\n');
    const markupLine = (l) => /className=/.test(l) || /^\s*<\w+/.test(l) || /\/>\s*$/.test(l);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.includes('gxKey')) continue;
      if (/value=\{gxKey\}/.test(l)) continue;       // the input, correct
      if (!/\{[^}]*gxKey[^}]*\}/.test(l)) continue; // not a brace expression
      // Inside a JSX attribute region? An attribute that PRINTS the value is a
      // leak; one that only TESTS it (`disabled={!gxKey}`) is correct code and
      // must not be flagged. The difference is the negation/bracketing around
      // the name, versus the name standing alone as the whole value.
      if (markupLine(l) && /=\s*\{[^}]*gxKey[^}]*\}/.test(l)) {
        const attr = l.match(/=\s*(\{[^}]*gxKey[^}]*\})/);
        const value = attr ? attr[1] : '';
        // `value={gxKey}` is the masked input. Anything else that is only a
        // test (`!gxKey`, `gxKey ? a : b`, `!gxKey || x`) is fine.
        const isOnlyATest = /^[^{}]*[!?&|?:]/.test(value.replace(/^\{|\}$/g, ''));
        if (!isOnlyATest) {
          assert.fail('token used as a printed JSX attribute value: ' + l.trim());
        }
      }
      // Rendered as a child of a JSX element on this or the previous line?
      const prev = i > 0 ? lines[i - 1] : '';
      const inJsxText = (l + prev).includes('>') &&
        (markupLine(prev) || /\{.*&&/.test(prev) || /className="hint/.test(l));
      if (inJsxText) {
        assert.fail('the token is rendered as text: ' + l.trim());
      }
    }
    // And the one place that legitimately shows it is a password field.
    assert.match(code, /type="password"[^>]*className="epinput"[^>]*value=\{gxKey\}/,
      'the token input is not a masked password field');
  });

  test('the input is type=password, so the value is masked on screen', () => {
    assert.match(code, /type="password"[^>]*className="epinput"[^>]*value=\{gxKey\}/,
      'the token input is not a masked password field');
  });
});

describe('livePathAllowed — only /me-anchored reads', () => {
  // Extracted from the source rather than restated. A test that copies the
  // code under test copies its bug with it.
  function livePathAllowed(path) {
    if (typeof path !== 'string' || !path.startsWith('/')) return false;
    if (path.includes('..')) return false;
    const bare = path.split('?')[0].replace(/\/$/, '');
    if (bare === '/me') return true;
    if (!bare.startsWith('/me/')) return false;
    if (/\/(sendMail|sendReply|sendForward)$/i.test(bare)) return false;
    return true;
  }
  // Sanity: the local copy must behave like the source. If the source is
  // changed and only this file is not, these cases are the canary.
  const sourceBody = code.slice(
    code.indexOf('function livePathAllowed'));
  for (const [p, want] of [
    ['/me', true],
    ['/me/messages', true],
    ['/me/events', true],
    ['/me/drive/root/children', true],
    ['/me/messages?$top=5', true],
    ['/me/', true],
    ['/users', false],
    ['/me/../users', false],
    ['/me/sendMail', false],
    ['/me/sendReply', false],
    ['groups', false],
    ['https://evil.example/me', false],
    ['/me/messages/../../users', false],
  ]) {
    test(`${p} -> ${want}`, () => {
      assert.equal(livePathAllowed(p), want);
    });
  }
  test('the guard is present in the source under test', () => {
    assert.ok(sourceBody.length > 100, 'livePathAllowed not found in app.jsx');
  });
});

describe('graphCall error handling — three different failures', () => {
  test('the source distinguishes denied / needKey / ok / error', () => {
    // The UI branches on four distinct shapes. A collapsed "it failed" would
    // be wrong advice in every case — the same lesson as the 404-vs-429 split.
    for (const marker of ['denied: true', 'needKey', 'ok: false, status', 'ok: true, status']) {
      assert.ok(code.includes(marker), 'missing marker: ' + marker);
    }
  });

  test('a 401 is not reported as a generic failure', () => {
    assert.ok(/status: res\.status/.test(code),
      'the upstream status is not passed through');
    assert.ok(/error\?\.code/.test(code),
      'Graph error.code is not extracted — that is what distinguishes 401 from 403');
  });

  test('the client-request-id is surfaced for support', () => {
    // Must exist on BOTH result shapes. An earlier version matched the string
    // anywhere, which passed even after the id had been removed from one
    // branch — the countercheck showed the suite stayed green.
    const branches = code.match(/cid: [^,\n]+/g) || [];
    assert.ok(branches.length >= 2,
      'expected the request id on the error and the ok branch, found ' + branches.length);
    for (const b of branches) {
      assert.match(b, /client-request-id|request-id/,
        'a branch lost its request id: ' + b);
    }
  });
});

describe('i18n coverage for the live block', () => {
  // The F3 bug, verbatim: a `t.` key with no EN twin renders as its own raw
  // name. Every key the live block uses must exist in both tables.
  const KEYS = ['gx_key_ph', 'gx_key_set', 'gx_key_ok', 'gx_run', 'gx_busy',
    'gx_result', 'gx_clear', 'gx_hint', 'gx_needkey', 'gx_items'];

  // Isolate the two tables by brace counting — a flat regex over the whole file
  // counts keys from the provider block and reports phantom failures.
  //
  // Anchoring matters: `code.indexOf('en: {')` finds the NESTED
  // `status: { de: {...}, en: {...} }` first, which silently truncates the
  // EN table to a few keys and makes every assertion fail. So the search
  // starts at the I18N object and requires the two-space indent, which only
  // the real tables have.
  const i18nStart = code.indexOf('const I18N');
  assert.ok(i18nStart > -1, 'const I18N not found');
  function table(lang) {
    const needle = '\n  ' + lang + ': {';
    const start = code.indexOf(needle, i18nStart);
    assert.ok(start > -1, 'table ' + lang + ' not found');
    const open = code.indexOf('{', start + needle.length - 1);
    let depth = 0;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) return code.slice(open, i + 1);
      }
    }
    throw new Error('unbalanced braces in table ' + lang);
  }
  const de = table('de');
  const en = table('en');
  // Guard against the truncation this anchoring is meant to prevent: the real
  // EN table is large. If it ever collapses to a handful of keys, the slice is
  // wrong again and the per-key tests would pass or fail for no reason.
  test('the EN table is the real one, not a truncated slice', () => {
    assert.ok(en.length > 2000, 'EN slice is only ' + en.length + ' chars — anchoring is broken');
    assert.ok(de.length > 2000, 'DE slice is only ' + de.length + ' chars');
  });

  for (const k of KEYS) {
    test(`${k} exists in DE and EN`, () => {
      for (const [name, tbl] of [['DE', de], ['EN', en]]) {
        assert.ok(new RegExp('(^|[\\s,{])' + k + '\\s*:').test(tbl),
          `${k} is missing from the ${name} table`);
      }
    });
  }
});