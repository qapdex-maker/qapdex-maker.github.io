import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = source.split('\n');

// ---------------------------------------------------------------------------
// Behavioural harness for Paint's getPos().
//
// getPos maps a viewport point onto the canvas BITMAP. The old implementation
// was `clientX - rect.left`, which ignores both the CSS scale factor and the
// border width that getBoundingClientRect() includes. Measured in Chromium at
// 412x915: bitmap 400x260, CSS box 419x273.8, border 2px — so a tap at bitmap
// coordinate (50,50) landed at roughly (50,50) * 1.05 + 2 = (54.4, 54.5) on
// screen, and anything further out drifted proportionally.
//
// These tests run the REAL getPos extracted from app.js against a DOM stub
// that reproduces the measured geometry. They fail against the old code.
// ---------------------------------------------------------------------------

/** Minimal canvas stub matching the measured production geometry. */
function makeCanvasStub({ bitmapW, bitmapH, cssW, cssH, border, left, top }) {
  return {
    width: bitmapW,
    height: bitmapH,
    getBoundingClientRect: () => ({
      left,
      top,
      width: cssW,
      height: cssH,
    }),
    _style: { borderLeftWidth: `${border}px`, borderTopWidth: `${border}px` },
  };
}

const GEOMETRY = {
  bitmapW: 400,
  bitmapH: 260,
  cssW: 419,
  cssH: 273.8,
  border: 2,
  left: 40.5,
  top: 218.7,
};

/**
 * Extract getPos from app.js and rebuild it as a standalone function over a
 * canvas stub. Returns null when the function shape is not found.
 */
function loadGetPos() {
  const start = lines.findIndex((l) => /function getPos\(e\)/.test(l));
  assert.ok(start !== -1, 'getPos must exist in app.js');
  const body = [];
  let depth = 0;
  let opened = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    body.push(line);
    for (const ch of line) {
      if (ch === '{') {
        depth++;
        opened = true;
      } else if (ch === '}') {
        depth--;
        if (opened && depth === 0) {
          return body.join('\n');
        }
      }
    }
  }
  assert.fail('could not extract the getPos body');
}

// Rebuild getPos in a scope where `canvas` and `window` are our stubs.
function makeGetPos(canvasStub) {
  const src = loadGetPos();
  const factory = new Function(
    'canvas',
    'window',
    `${src}\nreturn getPos;`,
  );
  return factory(canvasStub, { getComputedStyle: () => canvasStub._style });
}

test('getPos maps a CSS-pixel tap onto the bitmap coordinate (no scale drift)', () => {
  const canvas = makeCanvasStub(GEOMETRY);
  const getPos = makeGetPos(canvas);

  // Aim at bitmap coordinate (50,50). The screen point therefore must be
  // border + 50 * (cssInner / bitmap) — and the result must come back as
  // exactly (50,50).
  const innerW = GEOMETRY.cssW - 2 * GEOMETRY.border;
  const innerH = GEOMETRY.cssH - 2 * GEOMETRY.border;
  const screenX = GEOMETRY.left + GEOMETRY.border + 50 * (innerW / GEOMETRY.bitmapW);
  const screenY = GEOMETRY.top + GEOMETRY.border + 50 * (innerH / GEOMETRY.bitmapH);

  const p = getPos({ clientX: screenX, clientY: screenY, touches: null });
  assert.ok(
    Math.abs(p.x - 50) < 0.5,
    `x should round-trip to 50, got ${p.x} (screenX=${screenX})`,
  );
  assert.ok(
    Math.abs(p.y - 50) < 0.5,
    `y should round-trip to 50, got ${p.y} (screenY=${screenY})`,
  );
});

test('getPos corrects the border offset', () => {
  const canvas = makeCanvasStub(GEOMETRY);
  const getPos = makeGetPos(canvas);

  // Tapping the very top-left pixel of the canvas (inside the border) must
  // map to bitmap (0,0), not to a negative or border-shifted value.
  const p = getPos({ clientX: GEOMETRY.left, clientY: GEOMETRY.top, touches: null });
  assert.equal(p.x, 0, 'the canvas top-left must map to bitmap 0');
  assert.equal(p.y, 0, 'the canvas top-left must map to bitmap 0');
});

test('getPos clamps a tap that leaves the canvas', () => {
  const canvas = makeCanvasStub(GEOMETRY);
  const getPos = makeGetPos(canvas);

  // A finger sliding far past the edge must not produce a stroke thousands of
  // pixels away. The old unclamped version returned the raw overflow.
  const p = getPos({ clientX: GEOMETRY.left + 5000, clientY: GEOMETRY.top + 5000, touches: null });
  assert.ok(p.x <= GEOMETRY.bitmapW, `x must clamp to the bitmap width, got ${p.x}`);
  assert.ok(p.y <= GEOMETRY.bitmapH, `y must clamp to the bitmap height, got ${p.y}`);
});

test('getPos falls back to changedTouches when there are no live touches', () => {
  // touchend has an empty touches list. Reading only touches[0] would throw
  // or produce NaN there.
  const canvas = makeCanvasStub(GEOMETRY);
  const getPos = makeGetPos(canvas);
  const innerW = GEOMETRY.cssW - 2 * GEOMETRY.border;
  const innerH = GEOMETRY.cssH - 2 * GEOMETRY.border;
  const screenX = GEOMETRY.left + GEOMETRY.border + 10 * (innerW / GEOMETRY.bitmapW);
  const screenY = GEOMETRY.top + GEOMETRY.border + 10 * (innerH / GEOMETRY.bitmapH);

  const p = getPos({
    clientX: 0,
    clientY: 0,
    touches: [],
    changedTouches: [{ clientX: screenX, clientY: screenY }],
  });
  assert.ok(!Number.isNaN(p.x), 'x must not be NaN on touchend');
  assert.ok(
    Math.abs(p.x - 10) < 0.5,
    `x should round-trip to 10 on touchend, got ${p.x}`,
  );
});

test('the touchend shape path reuses getPos instead of subtracting raw', () => {
  // The touchend handler used to compute its own position, so shapes drawn by
  // touch stayed offset even after getPos was fixed.
  const touchendIdx = lines.findIndex((l) => /'touchend'/.test(l));
  assert.ok(touchendIdx !== -1, 'a touchend handler must exist');
  const window_ = lines.slice(touchendIdx, touchendIdx + 25).join('\n');
  assert.match(window_, /getPos\(e\)/, 'touchend must use getPos(e)');
  assert.doesNotMatch(
    window_,
    /changedTouches\[0\][\s\S]{0,80}getBoundingClientRect/,
    'touchend must not recompute the position from a raw rect',
  );
});
