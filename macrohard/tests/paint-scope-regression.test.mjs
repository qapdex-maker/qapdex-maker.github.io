import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = source.split('\n');

const paintStart = lines.findIndex((l) => /function buildPaint\(\)/.test(l));
const fillStart = lines.findIndex((l) => /function floodFill\(/.test(l));
const previewStart = lines.findIndex((l) => /function drawShapePreview\(/.test(l));
const commitStart = lines.findIndex((l) => /function commitShape\(/.test(l));

test('paint helpers that share state exist', () => {
  for (const [name, idx] of [
    ['buildPaint', paintStart],
    ['floodFill', fillStart],
    ['drawShapePreview', previewStart],
    ['commitShape', commitStart],
  ]) {
    assert.ok(idx !== -1, `${name} must exist`);
  }
});

test('shared paint state is declared at IIFE scope, not inside buildPaint', () => {
  // The helpers live outside buildPaint, so the state they share must too.
  const beforeBuildPaint = lines.slice(0, paintStart).join('\n');
  for (const name of ['paintColor', 'pTool', 'pShape', 'pCtx']) {
    assert.match(
      beforeBuildPaint,
      new RegExp(`\\b${name}\\b`),
      `${name} must be declared before buildPaint so the outer helpers can read it`,
    );
  }
  const inside = lines.slice(paintStart, fillStart).join('\n');
  assert.doesNotMatch(
    inside,
    /^\s*(let|const|var)\s+paintColor\s*[=;]/m,
    'paintColor must not be redeclared inside buildPaint',
  );
  assert.doesNotMatch(
    inside,
    /^\s*(let|const|var)\s+pCtx\s*[=;]/m,
    'pCtx must not be redeclared inside buildPaint',
  );
});

test('paint state declarations precede the helpers that use them', () => {
  const declLine = lines.findIndex((l) => /\bpCtx\b/.test(l) && /\bnull\b/.test(l));
  assert.ok(declLine !== -1, 'pCtx must be initialized at IIFE scope');
  assert.ok(declLine < fillStart, 'pCtx declaration must precede floodFill');
  assert.ok(declLine < previewStart, 'pCtx declaration must precede drawShapePreview');
  assert.ok(declLine < commitStart, 'pCtx declaration must precede commitShape');
});
