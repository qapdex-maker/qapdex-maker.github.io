import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const samplesDir = path.join(root, 'assets', 'samples');

// Structure-independent checks: only look for identifiers, not declaration syntax.
const flat = source.replace(/\s+/g, ' ');
const has = (needle) => flat.includes(needle);

const libraryFiles = [...flat.matchAll(/file:\s*["']([^"']+)["']/g)].map((item) => item[1]);

test('every sequencer sample entry points to a real mp3 file', () => {
  assert.ok(libraryFiles.length >= 31, `expected full sample library, found ${libraryFiles.length}`);
  const missing = libraryFiles.filter((file) => !fs.existsSync(path.join(samplesDir, `${file}.mp3`)));
  assert.deepEqual(missing, [], `missing sample files: ${missing.join(', ')}`);
});

test('mp3 samples are not excluded from git', () => {
  const ignorePath = path.join(samplesDir, '.gitignore');
  if (fs.existsSync(ignorePath)) {
    assert.doesNotMatch(fs.readFileSync(ignorePath, 'utf8'), /\*\.mp3/);
  }
});

test('sample fetch uses the explicit file name and encodes spaces', () => {
  assert.ok(has('encodeURIComponent(libEntry.file)'), 'fetchSample must use the file field');
});

test('loadSamples decodes the buffer that fetchSample already resolved', () => {
  const start = flat.indexOf('function loadSamples()');
  assert.ok(start !== -1, 'loadSamples must exist');
  const body = flat.slice(start, flat.indexOf('function playSample', start));
  assert.ok(!body.includes('.arrayBuffer()'), 'fetchSample already returns an ArrayBuffer');
  assert.ok(body.includes('decodeAudioData'), 'loadSamples must decode the fetched buffer');
});

test('settings import is limited to allow-listed preference keys', () => {
  const start = flat.indexOf('SETTINGS_IMPORT_KEYS = [');
  assert.ok(start !== -1, 'SETTINGS_IMPORT_KEYS must exist');
  const end = flat.indexOf(']', start);
  const keys = [...flat.slice(start, end).matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
  for (const key of ['os_dark', 'os_scan', 'os_accent', 'os_fs', 'os_lang', 'os_wall']) {
    assert.ok(keys.includes(key), `whitelist missing ${key}`);
  }
  const handler = flat.match(/JSON\.parse\(ev\.target\.result\)(.*?)location\.reload/);
  assert.ok(handler, 'import handler must exist');
  assert.ok(handler[1].includes('SETTINGS_IMPORT_KEYS'), 'import must iterate the whitelist');
  assert.ok(
    handler[1].includes('hasOwnProperty.call(data'),
    'each key must be checked before writing',
  );
  const writes = [...handler[1].matchAll(/localStorage\.setItem\(/g)];
  assert.equal(writes.length, 1, 'import must have exactly one write site inside the whitelist loop');
});

test('markdown renderer escapes html before adding markup', () => {
  const start = flat.indexOf('function mdRender(md)');
  assert.ok(start !== -1, 'mdRender must exist');
  const body = flat.slice(start, flat.indexOf('function ', start + 10));
  const escape = body.indexOf("replace(/&/g, '&amp;')");
  const heading = body.indexOf('replace(/^### ');
  assert.ok(escape !== -1 && heading !== -1, 'escape and heading steps must exist');
  assert.ok(escape < heading, 'escaping must happen before markup insertion');
});

test('docs preview escapes user text before line breaks', () => {
  const match = flat.match(/preview\.innerHTML = body\.innerText(.*?); preview\.style\.display = 'block'/);
  assert.ok(match, 'docs preview assignment must exist');
  const chain = match[1];
  const amp = chain.indexOf("'&amp;'");
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
  assert.ok(body.includes('Array.isArray'), 'loadEvents must guard against non-array data');
});
