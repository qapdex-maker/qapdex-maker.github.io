import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

test('drawAnalogClock is defined, not only called', () => {
  assert.match(
    source,
    /function drawAnalogClock\s*\(/,
    'drawAnalogClock must be implemented; the analog clock tab calls it',
  );
  const call = source.match(/drawAnalogClock\(\)/g) || [];
  const def = source.match(/function drawAnalogClock\s*\(/g) || [];
  assert.ok(def.length === 1, 'exactly one definition expected');
  assert.ok(call.length >= 1, 'the analog tab must keep calling it');
});

test('drawAnalogClock renders on the analog canvas', () => {
  const start = source.indexOf('function drawAnalogClock(');
  assert.ok(start !== -1);
  const body = source.slice(start, source.indexOf('\n  }', start));
  assert.match(body, /clkAnalogCanvas/);
  assert.match(body, /arc\(/, 'the clock face must be drawn with arcs');
  assert.match(body, /fillText/, 'hour labels must be rendered');
});

test('the analog clock is redrawn on an interval', () => {
  const start = source.indexOf('function drawAnalogClock(');
  const body = source.slice(start, source.indexOf('\n  }', start));
  assert.match(
    body,
    /setInterval|drawAnalogClock/,
    'the clock needs a redraw mechanism to show running time',
  );
});
