import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const samplesDir = path.join(root, 'assets', 'samples');

const libBlock = app.match(/const SAMPLE_LIBRARY = \[([\s\S]*?)\];/)[1];
const entries = [...libBlock.matchAll(/n:\s*'([^']+)',\s*c:\s*'[^']+',\s*file:\s*'([^']+)'/g)].map((m) => ({
  name: m[1],
  file: m[2],
}));

test('sample library has grown with the musicpack one-shots', () => {
  assert.ok(entries.length >= 49, `expected at least 49 samples, got ${entries.length}`);
  const mp = entries.filter((e) => e.file.startsWith('mp/'));
  assert.ok(mp.length >= 18, `expected 18 musicpack samples, got ${mp.length}`);
});

test('every sample file exists on disk', () => {
  const missing = entries
    .map((e) => e.file)
    .filter((f) => !fs.existsSync(path.join(samplesDir, `${f}.mp3`)));
  assert.deepEqual(missing, [], `missing sample files: ${missing.join(', ')}`);
});

test('the eight default tracks use musicpack samples', () => {
  const match = app.match(/let seqTracks = \[([^\]]+)\]/);
  assert.ok(match, 'seqTracks must exist');
  const idx = match[1].split(',').map((n) => parseInt(n.trim(), 10));
  assert.equal(idx.length, 8, 'there must be eight tracks');
  for (const i of idx) {
    assert.ok(entries[i], `track index ${i} is out of range`);
    assert.ok(entries[i].file.startsWith('mp/'), `track ${i} must be a musicpack sample`);
  }
});

test('sample fetch keeps sub-paths and encodes nothing twice', () => {
  assert.ok(
    app.includes("fetch('./assets/samples/' + libEntry.file + '.mp3')"),
    'fetchSample must append the file name directly so mp/ sub-paths work',
  );
  assert.ok(
    !app.includes('encodeURIComponent(libEntry.file)'),
    'encoding the whole name would escape the sub-path separator',
  );
});

test('radio fallback grew and contains no duplicate stream URLs', () => {
  const block = app.match(/const fallbackStations = \[([\s\S]*?)\];/)[1];
  const urls = [...block.matchAll(/u:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(urls.length >= 25, `expected a larger station list, got ${urls.length}`);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  assert.deepEqual(dupes, [], `duplicate stream urls: ${dupes.join(', ')}`);
});

test('stations known to be dead are gone', () => {
  const block = app.match(/const fallbackStations = \[([\s\S]*?)\];/)[1];
  for (const dead of [
    'stream.planetradio.co.uk',      // 404
    'media-ice.musicradio.com',      // 405 on HEAD
    'stream-kiss.planetradio.co.uk', // DNS/connect fail
    'fdn0.subcity.org',              // connect fail
    'live.m3u8',                     // HLS, not a direct stream
  ]) {
    assert.ok(!block.includes(dead), `${dead} must not be listed`);
  }
});

test('Radio Bob is present and Planet Radio is replaced, not resurrected', () => {
  const block = app.match(/const fallbackStations = \[([\s\S]*?)\];/)[1];
  assert.match(block, /name: 'Radio Bob'/, 'Radio Bob works and must be listed');
  assert.ok(!block.includes('stream.planetradio.co.uk'), 'Planet Radio is dead (404)');
  // The station list grew with verified alternatives instead.
  assert.match(block, /name: 'Radio Paradise Main'/);
  assert.match(block, /name: 'FluxFM'/);
  assert.match(block, /name: 'FM4 \(ORF\)'/);
});
