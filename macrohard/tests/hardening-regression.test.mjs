import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const samplesDir = path.join(root, 'assets', 'samples');

// Source is formatted by prettier, so match on normalized text, not exact layout.
const flat = source.replace(/\s+/g, ' ');

const libraryEntries = [
  ...(flat.match(/var SAMPLE_LIBRARY\s*=\s*\[(.*?)\];/) ? [1] : []),
].length
  ? [...flat.matchAll(/file:\s*["']([^"']+)["']/g)].map((item) => item[1])
  : [];

test('every sequencer sample entry points to a real mp3 file', () => {
  assert.ok(libraryEntries.length >= 31, `expected full sample library, found ${libraryEntries.length}`);
  const missing = libraryEntries
    .map((file) => file)
    .filter((file) => !fs.existsSync(path.join(samplesDir, `${file}.mp3`)));
  assert.deepEqual(missing, [], `missing sample files: ${missing.join(', ')}`);
});

test('mp3 samples are not excluded from git', () => {
  const ignorePath = path.join(samplesDir, '.gitignore');
  if (fs.existsSync(ignorePath)) {
    assert.doesNotMatch(fs.readFileSync(ignorePath, 'utf8'), /\*\.mp3/);
  }
});

test('sample fetch uses the explicit file name and encodes spaces', () => {
  assert.ok(flat.includes('encodeURIComponent(libEntry.file)'), 'fetchSample must use encoded file name');
});

test('loadSamples does not call arrayBuffer twice on an ArrayBuffer', () => {
  const start = flat.indexOf('function loadSamples()');
  assert.ok(start !== -1, 'loadSamples must exist');
  const body = flat.slice(start, flat.indexOf('function playSample', start));
  assert.ok(!body.includes('.arrayBuffer()'), 'fetchSample already resolves to an ArrayBuffer');
  assert.ok(body.includes('decodeAudioData(buf)'), 'loadSamples must decode the fetched buffer');
});

test('settings import only writes allow-listed localStorage keys', () => {
  const match = flat.match(/var SETTINGS_IMPORT_KEYS\s*=\s*\[(.*?)\];/);
  assert.ok(match, 'SETTINGS_IMPORT_KEYS whitelist must exist');
  const keys = [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
  for (const key of ['os_dark', 'os_scan', 'os_accent', 'os_fs', 'os_lang', 'os_wall']) {
    assert.ok(keys.includes(key), `whitelist missing ${key}`);
  }
  assert.ok(!flat.includes('Object.keys(data).forEach(function (k) { if (SETTINGS_IMPORT_KEYS.indexOf(k) === -1) skipped++; }); localStorage.setItem'),
    'unbounded import must be removed');
  const importBlock = flat.match(/var data = JSON\.parse\(ev\.target\.result\)(.*?)location\.reload/);
  assert.ok(importBlock, 'import handler must exist');
  const handler = importBlock[1];
  assert.ok(handler.includes('SETTINGS_IMPORT_KEYS.forEach'), 'import must iterate the whitelist');
  // The only write of uploaded data must live inside the whitelist loop.
  const writes = [...handler.matchAll(/localStorage\.setItem\(/g)];
  assert.equal(writes.length, 1, 'import must write exactly one key per allowed entry');
  const whitelistIndex = handler.indexOf('SETTINGS_IMPORT_KEYS.forEach');
  const writeIndex = writes[0].index;
  assert.ok(whitelistIndex < writeIndex, 'write must happen inside the whitelist loop');
  assert.ok(
    handler.includes("Object.prototype.hasOwnProperty.call(data, k)"),
    'each key must be checked for existence before writing',
  );
});

test('markdown renderer escapes html before adding markup', () => {
  const start = flat.indexOf('function mdRender(md)');
  assert.ok(start !== -1, 'mdRender must exist');
  const body = flat.slice(start, flat.indexOf('function ', start + 10));
  const escapeIndex = body.indexOf("replace(/&/g, '&amp;')");
  const headingIndex = body.indexOf("replace(/^### ");
  assert.ok(escapeIndex !== -1, 'mdRender must escape & first');
  assert.ok(headingIndex !== -1, 'mdRender must render headings');
  assert.ok(escapeIndex < headingIndex, 'escaping must happen before markup insertion');
});

test('docs preview escapes user text before inserting line breaks', () => {
  const match = flat.match(/preview\.innerHTML = body\.innerText(.*?); preview\.style\.display = 'block'/);
  assert.ok(match, 'docs preview assignment must exist');
  const chain = match[1];
  const amp = chain.indexOf("replace(/&/g, '&amp;')");
  const lt = chain.indexOf("'&lt;'");
  const gt = chain.indexOf("'&gt;'");
  const br = chain.indexOf("'<br>'");
  assert.ok(amp !== -1 && lt !== -1 && gt !== -1 && br !== -1, 'all four replacements must be chained');
  assert.ok(amp < lt && lt < gt && gt < br, 'escape order must be &, <, >, then <br>');
});

test('calendar storage normalizes to an event array', () => {
  const start = flat.indexOf('function loadEvents()');
  assert.ok(start !== -1, 'loadEvents must exist');
  const body = flat.slice(start, flat.indexOf('function saveEvents', start));
  assert.ok(body.includes('Array.isArray(parsed)'), 'loadEvents must normalize stored data to an array');
});
