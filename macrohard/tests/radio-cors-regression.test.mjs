import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('fallback stations are limited to a verified set', () => {
  const start = flat.indexOf('fallbackStations = [');
  assert.ok(start !== -1, 'fallbackStations must exist');
  const end = flat.indexOf('];', start);
  const body = flat.slice(start, end);
  const urls = [...body.matchAll(/u:\s*["']([^"']+)["']/g)].map((item) => item[1]);
  assert.ok(urls.length > 0, 'fallback list must not be empty');
  assert.ok(urls.length >= 25, `station list should have grown: ${urls.length}`);
  assert.ok(urls.length <= 40, `station list should stay curated: ${urls.length}`);
  for (const url of urls) {
    assert.ok(url.startsWith('https://'), `station must be https: ${url}`);
  }
});

test('stations without CORS headers are removed', () => {
  assert.ok(!flat.includes('media-ice.musicradio.com/ClassicFMMP3'), 'Classic FM sends no CORS header');
  assert.ok(!flat.includes('media-ice.musicradio.com/CapitalMP3'), 'Capital FM sends no CORS header');
});

test('every station is https', () => {
  const start = flat.indexOf('fallbackStations = [');
  const body = flat.slice(start, flat.indexOf('];', start));
  const urls = [...body.matchAll(/u:\s*["']([^"']+)["']/g)].map((item) => item[1]);
  for (const url of urls) {
    assert.ok(url.startsWith('https://'), `station must use https: ${url}`);
  }
});
