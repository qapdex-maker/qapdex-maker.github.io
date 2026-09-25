import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

const libraryBlock = source.match(/var SAMPLE_LIBRARY\s*=\s*\[([\s\S]*?)\n\s*\];/);
const libraryEntries = libraryBlock
  ? [...libraryBlock[1].matchAll(/file:\s*["']([^"']+)["']/g)].map((item) => item[1])
  : [];

test('sequencer keeps the context used to decode samples', () => {
  assert.match(source, /if \(!SEQ\.ctx\)/);
  assert.doesNotMatch(source, /if \(window\.audioCtx\)[\s\S]{0,180}SEQ\.ctx = window\.audioCtx/);
  assert.doesNotMatch(source, /SEQ\.ctx = new AC\(\);\s*window\.audioCtx = SEQ\.ctx;/);
});

test('synthesized sequencer starts oscillator before stopping it', () => {
  const start = source.indexOf('o.start(t)');
  const stop = source.indexOf('o.stop(t + 0.05)');
  assert.ok(start !== -1, 'oscillator must be started');
  assert.ok(stop !== -1, 'oscillator must be stopped');
  assert.ok(start < stop, 'start must come before stop');
});

test('radio fallback is explicitly bounded', () => {
  const match = source.match(/var fallbackStations\s*=\s*\[([\s\S]*?)\n\s*\];/);
  assert.ok(match, 'fallbackStations block must exist');
  const urls = [...match[1].matchAll(/u:\s*["']([^"']+)["']/g)].map((item) => item[1]);
  assert.ok(urls.length > 0);
  assert.ok(urls.length <= 20, `fallback list should not grow without verification: ${urls.length}`);
  assert.ok(urls.every((url) => /^https:\/\//.test(url)));
});

test('sample library is not truncated by formatting', () => {
  assert.ok(libraryEntries.length >= 31, `expected 31 samples, found ${libraryEntries.length}`);
});
