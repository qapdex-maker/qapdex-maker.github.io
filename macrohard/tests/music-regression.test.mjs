import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

test('sequencer keeps the context used to decode samples', () => {
  assert.match(source, /if \(!SEQ\.ctx\)[^]*SEQ\.ctx\s*=\s*new AC\(\)/);
  assert.doesNotMatch(source, /if \(window\.audioCtx\)[\s\S]{0,180}SEQ\.ctx = window\.audioCtx/);
  assert.doesNotMatch(source, /SEQ\.ctx = new AC\(\);\s*window\.audioCtx = SEQ\.ctx;/);
});

test('synthesized sequencer starts oscillator before stopping it', () => {
  const fn = source.match(/function playSample\(trackIdx, when\) \{[\s\S]*?\n    \}\n\n    function scheduleNote/);
  assert.ok(fn);
  const body = fn[0];
  assert.ok(body.indexOf('o.start(t)') < body.indexOf('o.stop(t + 0.05)'));
});

test('radio fallback is explicitly bounded', () => {
  const match = source.match(/var fallbackStations=\[([\s\S]*?)\];\n\s*var radioServers/);
  assert.ok(match, 'fallbackStations block must exist');
  const urls = [...match[1].matchAll(/u:'([^']+)'/g)].map((item) => item[1]);
  assert.ok(urls.length > 0);
  assert.ok(urls.length <= 20, `fallback list should not grow without verification: ${urls.length}`);
  assert.ok(urls.every((url) => /^https:\/\//.test(url)));
});
