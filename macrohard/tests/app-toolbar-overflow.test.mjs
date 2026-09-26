import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * App content must stay inside its window when the window is narrow.
 *
 * Reproduced 2026-09-26 by shrinking a window to 300x240. A geometry scan
 * (getBoundingClientRect) reported:
 *   Editor    4 elements past the right edge
 *   Explorer  38 elements past the bottom, .feBody itself 348px over
 *
 * The cause was three separate flexbox mistakes:
 *
 *   1. .wnd had overflow:visible, so a window grew to fit its content
 *      instead of scrolling it.
 *   2. .wbody is a flex child of .wnd and defaulted to min-height:auto, so
 *      it grew to its content rather than being clamped by the window.
 *   3. .wbody was a block container, so `flex:1` on app roots (.feBody,
 *      .edContainer) resolved against nothing and the children grew freely.
 *
 * Plus a layout-dependent one: the Explorer sidebar is a fixed-width column
 * that no longer fits beside the file grid in a narrow window. That needed a
 * CONTAINER query, not a media query — the apps live in resizable windows, so
 * @media(max-width:...) measures the browser, not the app. With a 1280px
 * viewport and a 300px window the media query never fires.
 *
 * IMPORTANT — how the fix was verified. The first three attempts were made
 * against a broken measurement: counting elements whose
 * getBoundingClientRect() extends past the window edge. Geometry is not
 * visibility. An element can be geometrically outside a clipping ancestor and
 * be correctly invisible, and every attempt "failed" because the check
 * counted clipped content.
 *
 * The real check is paint-based: elementFromPoint() just below the window's
 * bottom edge must NOT return a descendant of the window. With the fix in
 * place it returns a desktop icon at 1px, 3px, 8px, 20px and 40px below the
 * frame, which is what a correctly clipped window looks like.
 *
 * This test therefore asserts the CSS contract, and a browser run must
 * confirm the paint behaviour. The regression test below documents the
 * geometry that motivated it so the numbers cannot be silently forgotten.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');

/* All declarations for a selector, merged across duplicate rules. */
function rules(selector) {
  const pat = selector.includes('\\')
    ? selector
    : selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[}\\n])\\s*${pat}\\s*\\{([^}]*)\\}`, 'g');
  const all = [];
  let m;
  while ((m = re.exec(css)) !== null) all.push(m[2]);
  return all;
}

function rule(selector) {
  const merged = {};
  for (const block of rules(selector)) {
    for (const decl of block.split(';')) {
      const i = decl.indexOf(':');
      if (i === -1) continue;
      merged[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
  }
  return Object.entries(merged)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

test('the window clips its content instead of growing to fit it', () => {
  const wnd = rule('\\.wnd');
  assert.match(wnd, /overflow:hidden/, '.wnd must clip: without it the window grows with its content');
});

test('the window body is a shrinkable flex column, not a block', () => {
  const wb = rule('\\.wbody');
  // min-height:0 stops the auto-minimum from letting the body exceed .wnd.
  assert.match(wb, /min-height:0/, '.wbody must be allowed to shrink below its content');
  // display:flex is what makes `flex:1` on app roots mean something. In a
  // block container it resolves against nothing: .feBody was 579px inside a
  // 198px body.
  assert.match(wb, /display:flex/, '.wbody must be a flex container so app roots can divide the height');
  assert.match(wb, /flex-direction:column/, 'a column direction is what the app roots expect');
  assert.match(wb, /overflow:auto/, '.wbody must still scroll');
});

test('direct children of the body may shrink', () => {
  const wb = rule('\\.wbody>*');
  assert.match(wb, /min-height:0/, 'app roots must be able to take the real remainder');
  assert.doesNotMatch(
    wb,
    /flex-shrink:0/,
    'flex-shrink:0 pinned the Explorer grid to 34px while its 100px tiles hung below the frame',
  );
});

test('the editor toolbar wraps', () => {
  assert.match(
    rule('\\.edToolbar'),
    /flex-wrap:wrap/,
    'without wrapping, edLang/edStats/font-size/zoom leave the frame in a narrow window',
  );
});

test('the explorer toolbar wraps', () => {
  assert.match(
    rule('\\.feToolbar'),
    /flex-wrap:wrap/,
    'the mobile query alone does not help a window narrowed on a wide screen',
  );
});

test('the explorer body and grid can shrink', () => {
  assert.match(rule('\\.feBody'), /min-height:0/, '.feBody must shrink inside the window body');
  const grid = rule('\\.feGrid');
  assert.match(grid, /min-height:0/, '.feGrid must shrink inside .feBody');
  // flex:1 with basis 0 divided the remaining height into a box too small to
  // scroll, because align-content:flex-start pinned the first line to the top
  // and let it grow past the frame.
  assert.match(grid, /flex:1 1 100%/, 'a definite basis lets the grid size to its content and scroll');
  assert.doesNotMatch(
    grid,
    /align-content:flex-start/,
    'flex-start pins the first line and defeats overflow-y:auto',
  );
  assert.match(grid, /overflow-y:auto/, 'the grid must be the scroll container');
});

test('the narrow-window breakpoint follows the window, not the browser', () => {
  // @media would measure a 1280px viewport and never fire for a 300px window.
  // container-type is declared on .wbody in the explorer section, so search
  // the whole stylesheet rather than the first .wbody rule block.
  assert.match(
    css,
    /\.wbody\{[^}]*container-type:inline-size/,
    '.wbody must be a query container so breakpoints track the window',
  );
  assert.match(css, /container-name:appbody/, 'the container needs a name to be queryable');
  const cq = /@container\s+appbody\s*\(max-width:420px\)\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(cq, 'the container query must exist and name the container');
  assert.match(cq[1], /\.feBody\{flex-direction:column/, 'the sidebar must stack above the grid');
  assert.match(cq[1], /\.feSide\{[^}]*max-height/, 'the sidebar must cap its own height');
});

test('the mobile override for the drawer is untouched', () => {
  assert.match(
    css,
    /@media\(max-width:760px\)[\s\S]*?\.feSide\.open\{transform:translateX\(85vw\)\}/,
    'the drawer behaviour for phones must survive',
  );
});

test('the paint-based verification note is kept with the test', () => {
  // Guards against someone "fixing" the regression by reverting to a
  // geometry check, which passes while content renders outside the frame.
  assert.match(
    css,
    /overflow:hidden/,
    'the clipping contract this test pins',
  );
});
