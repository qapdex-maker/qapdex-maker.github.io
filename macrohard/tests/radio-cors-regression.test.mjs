import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Every curated radio station must send Access-Control-Allow-Origin.
 *
 * Why this matters, concretely: radio in MakerOS is not a bare <audio> tag.
 * setupAudio() routes it through
 *     createMediaElementSource(audioEl) -> AnalyserNode -> destination
 * and the EQ is biquad filters in that same graph. A cross-origin media element
 * whose server does NOT send CORS taints the graph: the audio is audible, but
 * the AnalyserNode emits silence, the visualizer never moves, and the EQ has
 * nothing to filter. It looks like "the visualizer is broken" with no error
 * anywhere.
 *
 * Measured 2026-09-26 by probing all 22 stations over real HTTP: 20 sent
 * `Access-Control-Allow-Origin: *`, and two did not —
 *   npr-ice.streamguys1.com/live.mp3
 *   fm939.wnyc.org/wnycfm
 * Both were replaced after candidates were probed for a CORS-capable stream.
 *
 * This test cannot reach the network, so it pins what it can: the offenders
 * must be gone, the list size must hold, and a note must record the reason.
 * tests/radio-cors-live.test.mjs is the network check; run it deliberately,
 * not as part of `npm test`, because a flaky network must not fail CI.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

function fallbackStations() {
  const start = flat.indexOf('fallbackStations = [');
  assert.ok(start !== -1, 'fallbackStations must exist');
  const end = flat.indexOf('];', start);
  assert.ok(end !== -1, 'fallbackStations must be terminated');
  return flat.slice(start, end);
}

const body = fallbackStations();
const stations = [...body.matchAll(/u:\s*'([^']+)'/g)].map((m) => m[1]);

/* Hosts measured to send no CORS header. Keep this list as a tripwire: if one
 * of these ever comes back, the test fails with an explanation. */
const KNOWN_WITHOUT_CORS = [
  'https://npr-ice.streamguys1.com/live.mp3',
  'https://fm939.wnyc.org/wnycfm',
];

test('the curated list is the expected size', () => {
  assert.ok(
    stations.length >= 25 && stations.length <= 40,
    `station list should stay curated: ${stations.length}`,
  );
});

test('stations measured to send no CORS header are gone', () => {
  const present = KNOWN_WITHOUT_CORS.filter((u) => stations.includes(u));
  assert.deepEqual(
    present,
    [],
    `these streams taint the WebAudio graph and silence the analyser: ${present.join(', ')}`,
  );
});

test('every station is https', () => {
  for (const url of stations) {
    assert.ok(url.startsWith('https://'), `station must use https: ${url}`);
  }
});

test('no duplicate stream URLs', () => {
  const seen = new Set();
  const dupes = stations.filter((u) => (seen.has(u) ? true : (seen.add(u), false)));
  assert.deepEqual(dupes, [], `duplicate stream URLs: ${dupes.join(', ')}`);
});

test('the replacement is documented at the station', () => {
  // A future reader must be able to see WHY WNYC is gone, otherwise someone
  // will put it back because it is a nicer station.
  assert.ok(
    /WNYC/.test(source),
    'the comment explaining the WNYC removal must stay in app.js',
  );
  assert.ok(
    /Access-Control-Allow-Origin/.test(source),
    'the reason (a missing CORS header) must be recorded in app.js',
  );
});

test('radio really is routed through an analyser', () => {
  // The premise of this whole file. If the graph is ever changed so radio no
  // longer goes through createMediaElementSource, the CORS requirement
  // disappears and this test's motivation is void.
  assert.match(
    source,
    /createMediaElementSource/,
    'the audio pipeline must still use createMediaElementSource',
  );
  assert.match(source, /createAnalyser/, 'the pipeline must still feed an AnalyserNode');
});
