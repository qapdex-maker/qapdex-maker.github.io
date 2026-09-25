import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');

test('sequencer keeps the context used to decode samples', () => {
  assert.ok(flat.includes('if (!SEQ.ctx)'), 'startSequencer must reuse the decoding context');
  assert.ok(
    !flat.includes('SEQ.ctx = window.audioCtx'),
    'must not swap the context that decoded the sample buffers',
  );
});

test('synthesized sequencer starts the oscillator before stopping it', () => {
  const start = flat.indexOf('o.start(t)');
  const stop = flat.indexOf('o.stop(t + 0.05)');
  assert.ok(start !== -1, 'oscillator must be started');
  assert.ok(stop !== -1, 'oscillator must be stopped');
  assert.ok(start < stop, 'start must come before stop');
});

test('sample library keeps all entries after formatting', () => {
  const files = [...flat.matchAll(/file:\s*["']([^"']+)["']/g)].map((item) => item[1]);
  assert.ok(files.length >= 31, `expected 31 samples, found ${files.length}`);
});
