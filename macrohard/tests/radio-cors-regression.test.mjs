import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const stationList = fs.readFileSync(path.join(root, 'assets', 'js', 'radio-stations.js'), 'utf8');

const fallbackBlock = source.match(/var fallbackStations\s*=\s*\[([\s\S]*?)\n\s*\];/);
const urls = [...(fallbackBlock ? fallbackBlock[1].matchAll(/u:\s*["']([^"']+)["']/g) : [])].map(
  (item) => item[1],
);
const verifiedUrls = [...stationList.matchAll(/'(https:[^']+)'/g)].map((item) => item[1]);

test('fallback stations are limited to a verified set', () => {
  assert.ok(fallbackBlock, 'fallbackStations block must exist');
  assert.ok(urls.length > 0);
  assert.ok(urls.length <= 20, `too many fallback stations: ${urls.length}`);
  for (const url of urls) {
    assert.ok(verifiedUrls.includes(url), `station not CORS-verified: ${url}`);
  }
});

test('stations without CORS headers are removed', () => {
  assert.ok(!urls.includes('https://media-ice.musicradio.com/ClassicFMMP3'));
  assert.ok(!urls.includes('https://media-ice.musicradio.com/CapitalMP3'));
});

test('verified station list is documented with the measurement method', () => {
  assert.match(stationList, /Access-Control-Allow-Origin/);
  assert.match(stationList, /Re-verify before changing this list/);
});
