import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');

// Strip comments before parsing. site.css documents its own traps in long
// block comments, and those contain braces and the words "@media" and ".wnd-
// resize" — a parser that does not strip them reads comment text as rules and
// loses every rule after the first comment. That is what made two earlier
// revisions of this test report a state that was false.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * The window resize grip, as measured on the real phone layout
 * (500px viewport, screenshot 2026-10-05).
 *
 * These tests read the declarations out of the source text. A previous revision
 * of this file tried to parse the stylesheet properly and reported a state that
 * was false twice in a row: a brace walker that lost every rule inside an
 * @media, and a regex that matched `.wnd-resize` but then demanded `{` right
 * after — which is exactly the `.wnd-resize::after` case. Both versions left the
 * pseudo-element rules unseen, so the assertion that guards them could not
 * fail. A text scan below keeps the check honest about what it can see, and the
 * browser check in tests/app-smoke.browser.mjs is what actually measures the
 * rendered grip.
 */

/**
 * Every declaration block whose selector is exactly `target`, with its @media condition.
 *
 * The parser walks the CSS text character by character, tracking the @media
 * condition stack. When it encounters a selector followed by `{`, it records
 * the block. When it encounters `}`, it pops the stack. This handles nested
 * @media blocks correctly — the previous regex-based approach failed because
 * it could not distinguish between a `}` that closes a rule and a `}` that
 * closes an @media block.
 */
function blocksFor(target) {
  const out = [];
  let i = 0;
  const condStack = [];

  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    // @media or @supports or @keyframes
    if (css[i] === '@') {
      const atMatch = /@(\w+)[^{]*\{/.exec(css.slice(i));
      if (atMatch) {
        const cond = `@${atMatch[1]} ${atMatch[0].slice(0, -1).trim()}`;
        condStack.push(cond);
        i += atMatch[0].length;
        continue;
      }
      // Unknown at-rule, skip to next {
      const braceIdx = css.indexOf('{', i);
      if (braceIdx === -1) break;
      i = braceIdx + 1;
      continue;
    }

    // Find the next { or }
    const braceIdx = css.indexOf('{', i);
    const closeIdx = css.indexOf('}', i);

    if (braceIdx === -1 && closeIdx === -1) break;

    if (closeIdx !== -1 && (braceIdx === -1 || closeIdx < braceIdx)) {
      // Closing brace — pop the condition stack
      if (condStack.length > 0) condStack.pop();
      i = closeIdx + 1;
      continue;
    }

    // Opening brace — this is a rule
    const selector = css.slice(i, braceIdx).trim();
    // Find the matching closing brace
    let depth = 1;
    let j = braceIdx + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const decls = css.slice(braceIdx + 1, j - 1);

    if (selector.split(',').some((s) => s.trim() === target)) {
      out.push({ cond: condStack.length > 0 ? condStack[condStack.length - 1] : null, decls });
    }

    i = j;
  }
  return out;
}

function isTouch(cond) {
  return cond !== null && /pointer\s*:\s*coarse|hover\s*:\s*none/.test(cond);
}

function px(decls, prop) {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?[\\d.]+)px`).exec(decls);
  return m ? parseFloat(m[1]) : null;
}

test('sanity: the scan finds both the box and the pseudo-element rules', () => {
  const box = blocksFor('.wnd-resize');
  const glyph = blocksFor('.wnd-resize::after');
  assert.ok(box.length >= 3, `expected at least 3 .wnd-resize blocks, found ${box.length}`);
  assert.ok(glyph.length >= 3, `expected at least 3 .wnd-resize::after blocks, found ${glyph.length}`);
  assert.ok(
    box.some((b) => b.cond === null),
    'a top-level .wnd-resize block must be found',
  );
  assert.ok(
    box.some((b) => isTouch(b.cond)),
    'a coarse-pointer .wnd-resize block must be found',
  );
  assert.ok(
    glyph.some((b) => isTouch(b.cond)),
    'a coarse-pointer .wnd-resize::after block must be found — if this fails the scan is blind, not the CSS',
  );
});

test('the resize grip is big enough to hit on a touch screen', () => {
  // The regression: the coarse-pointer block said 24px and comes after the
  // max-width:760px block that says 48px, so on the handset the 48px hit area
  // never applied. 24px is below any sane touch-target floor, and on a phone
  // the grip is one of only two ways to resize a window.
  const touch = blocksFor('.wnd-resize').filter((b) => isTouch(b.cond));
  assert.ok(touch.length >= 1, 'there must be a coarse-pointer block for .wnd-resize');

  for (const b of touch) {
    const w = px(b.decls, 'width');
    const h = px(b.decls, 'height');
    assert.ok(w !== null, `touch block must set an explicit width (${b.cond})`);
    assert.ok(
      w >= 44,
      `touch grip must be at least 44px wide, got ${w}px in "${b.cond}" — a smaller value ` +
        'silently overrides the phone-width rule because it comes later in the file',
    );
    assert.ok(
      h >= 44,
      `touch grip must be at least 44px high, got ${h}px in "${b.cond}"`,
    );
  }
});

test('the grip glyph is visible instead of a faint grey mark', () => {
  // Measured on the phone layout: opacity .5 on a grey "⬢" against a light
  // surface was indistinguishable from nothing at all.
  const base = blocksFor('.wnd-resize::after').find((b) => b.cond === null);
  assert.ok(base, 'there must be a top-level .wnd-resize::after block');

  const opacity = /opacity\s*:\s*([\d.]+)/.exec(base.decls);
  assert.ok(opacity, 'the glyph block must set an explicit opacity');
  assert.ok(
    parseFloat(opacity[1]) === 1,
    `the glyph must be fully opaque, got ${opacity[1]} — .5 reads as invisible`,
  );

  const borderColor = /border-right\s*:\s*2px solid ([^;]+)/.exec(base.decls);
  assert.ok(borderColor, 'the glyph must carry a right border');
  assert.match(
    borderColor[1].trim(),
    /^var\(--ink\)$/,
    `the glyph border must use the solid ink colour, got "${borderColor[1].trim()}" — ` +
      'var(--muted) sits too close to the surface to be seen',
  );
});

test('the touch block scales the glyph too, not only the hit box', () => {
  // The base ::after stays at 8px/10px. Without its own override the phone
  // would get a 48px hit area that still shows an 8px glyph — a large invisible
  // target with a tiny visible dot in it.
  const touchGlyph = blocksFor('.wnd-resize::after').filter((b) => isTouch(b.cond));
  assert.ok(touchGlyph.length >= 1, 'the coarse-pointer block must also style ::after');

  const b = touchGlyph[0];
  const w = px(b.decls, 'width');
  assert.ok(w !== null && w >= 16, `the touch glyph must grow beyond the base 8px, got ${w}px`);

  const fontSize = px(b.decls, 'font-size');
  assert.ok(
    fontSize !== null && fontSize >= 14,
    `the touch glyph font-size must grow, got ${fontSize}px`,
  );

  const borderWidth = /border-width\s*:\s*([\d.]+)px/.exec(b.decls);
  assert.ok(
    borderWidth && parseFloat(borderWidth[1]) >= 3,
    `the touch glyph border must thicken, got ${borderWidth ? borderWidth[1] : 'none'}px`,
  );
});
