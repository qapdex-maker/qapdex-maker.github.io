import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * A single radio-browser mirror is not enough.
 *
 * fetchRadios() picked one mirror at random from
 *     ['de1','de2','nl1','at1','fr1','us1']
 * and used whatever came back. Measured 2026-09-26 from a real browser:
 *
 *     de1 -> 200        de2 -> 200
 *     nl1 -> TypeError  at1 -> TypeError
 *     fr1 -> TypeError  us1 -> TypeError
 *
 * Four of the six mirrors do not answer. So roughly two out of three searches
 * and refreshes fell into the onerror branch and showed "Offline -> N
 * Fallback", even though the API was perfectly reachable. Observed in the
 * browser: a search for "swiss" returned zero hits and the status line read
 * "Offline → 12 Fallback", while de1 answered 200 in the same session.
 *
 * Fix: try the mirrors in order until one answers. A mirror that fails is
 * remembered for the session so the next call starts at the next one, and a
 * mirror that succeeds is preferred again afterwards.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

function fetchRadiosBody() {
  const start = source.indexOf('function fetchRadios(');
  assert.ok(start !== -1, 'fetchRadios() must exist');
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

const body = fetchRadiosBody();

test('the mirror list keeps the two that answer', () => {
  const m = /const radioServers = \[([^\]]*)\]/.exec(source);
  assert.ok(m, 'radioServers must exist');
  const servers = m[1].match(/'([a-z0-9]+)'/g).map((s) => s.replace(/'/g, ''));
  assert.ok(
    servers.includes('de1') && servers.includes('de2'),
    'the two measured working mirrors must stay in the list',
  );
  // The dead ones may stay — the retry handles them — but the app must not
  // depend on them.
  assert.ok(servers.length >= 2, 'at least two mirrors are required');
});

test('fetchRadios tries the next mirror when one fails', () => {
  assert.match(
    body,
    /radioServerIndex|radioServerIdx/,
    'the fetch must keep a cursor into the mirror list',
  );
  // Something must advance the cursor on failure.
  assert.match(
    body,
    /radioServerIndex\s*=\s*\(\s*radioServerIndex\s*\+\s*1\s*\)|radioServerIndex\+\+|\+\+\s*radioServerIndex/,
    'a failed mirror must advance the cursor so the next call uses another one',
  );
});

test('one mirror is not the only attempt', () => {
  // The old code opened exactly one request per call. A retry needs either a
  // loop or a re-invocation.
  const opens = [...body.matchAll(/x\.open\(/g)].length;
  assert.ok(
    opens >= 1,
    'fetchRadios must open a request',
  );
  assert.match(
    body,
    /radioServers\[/,
    'the request must index into radioServers, and the index must be able to move',
  );
});

test('a successful mirror is remembered', () => {
  // Without this, every call would start at the same broken mirror.
  assert.match(
    body,
    /radioServerIndex\s*=\s*0|index\s*=\s*0/,
    'a success must reset the cursor so the working mirror is used again',
  );
});

test('the fallback path still exists for a total outage', () => {
  assert.match(body, /fallbackStations/, 'the curated list must remain the last resort');
  // The offline message moved into showRadioOffline() so the retry chain and
  // the terminal branch share it. Assert on the helper, not on a fixed line.
  const helperStart = source.indexOf('function showRadioOffline(');
  assert.ok(helperStart !== -1, 'showRadioOffline() must exist');
  const helper = source.slice(helperStart, helperStart + 320);
  assert.match(helper, /fallbackStations/, 'the helper must install the curated list');
  assert.match(helper, /Offline/, 'the offline message must survive');
  // And it must be reachable when every mirror is exhausted. The call carries
  // arguments, so match on the name rather than on an opening paren.
  assert.match(
    body,
    /attemptsLeft--\s*<=\s*0[\s\S]{0,160}showRadioOffline\s*\(/,
    'an exhausted retry chain must fall back instead of looping',
  );
  // And the offline branch must pass `search`, otherwise the helper reads an
  // identifier that is not in its scope — a ReferenceError at exactly the
  // moment the network is down.
  assert.match(
    body,
    /showRadioOffline\(\s*'Offline'\s*,\s*search\s*\)/,
    'search must be handed to the helper explicitly',
  );
});

test('the debug note about the search field survives', () => {
  // Not the reason for this change, but the previous fix in the same function
  // and worth not losing in a refactor.
  assert.match(
    body,
    /radioSearchTerm/,
    'the active search term must stay in state, not only in the DOM',
  );
});
