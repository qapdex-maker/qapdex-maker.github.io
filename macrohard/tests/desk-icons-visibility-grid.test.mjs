import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Three defects reported from a real phone (Screenshot_20260929_144701_Edge.jpg,
 * qapdex-maker.github.io, 393x851 CSS px, portrait):
 *
 * 1. The desktop icons were painted with stroke="#fff" while the tile behind
 *    them is var(--surface) — white. White on white. The icons were visible
 *    only as the drop-shadow. svgIcon() is shared by the desktop column AND
 *    the start menu, which is white too, so both launchers were affected.
 *
 * 2. On a phone the launcher was a fixed 3-column row of 88px tiles:
 *    3 * 88 + 2 * 12 gap + 24 padding = 312px of a 393px viewport, and the
 *    content was 1056px tall against 720px of visible height. The launcher
 *    therefore ate most of the width and had to scroll to reach Notes.
 *
 * 3. The editor surfaces (.npArea, .edArea, .ieContainer) hardcoded
 *    #1a1a1e / #e0e0e0 instead of using tokens. That is a dark editor inside
 *    a light OS — the very "dark mode leaking into Notepad" the report
 *    describes — and it could never follow the chosen palette.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');

/* The launcher rules live in the @media(max-width:760px) block that also
 * mentions #deskIcons — other blocks of the same size only cover single apps
 * (terminal, explorer). Picking the first one matched the terminal. */
const phoneBlock = () => {
  const re = /@media\(max-width:760px\)\{/g;
  let m;
  while ((m = re.exec(css))) {
    const start = m.index + m[0].length;
    let depth = 1;
    for (let j = start; j < css.length && depth > 0; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      if (depth === 0) {
        const body = css.slice(start, j);
        if (body.includes('#deskIcons')) return body;
        break;
      }
    }
  }
  assert.fail('no phone breakpoint contains #deskIcons');
};

test('precondition: the icon factory and the tile stylesheet exist', () => {
  assert.match(app, /function svgIcon\(/);
  assert.match(css, /\.dskApp\{/);
});

test('desktop and start-menu icons are not painted white on white', () => {
  const factory = /function svgIcon\(name\) \{([\s\S]*?)\n  \}/.exec(app);
  assert.ok(factory, 'svgIcon must be readable on its own');
  assert.doesNotMatch(
    factory[1],
    /stroke="#fff"/,
    'a hardcoded white stroke is invisible on the white tile and start menu',
  );
  assert.match(
    factory[1],
    /stroke="currentColor"/,
    'the icons must inherit the text colour of their container',
  );
});

test('the tile and the start-menu item hand their icons a visible colour', () => {
  const tile = /\.dskApp\{([^}]*)\}/.exec(css);
  assert.ok(tile, '.dskApp must exist');
  assert.match(
    tile[1],
    /color:\s*var\(--ink\)/,
    'the tile must set color, that is what currentColor resolves against',
  );
  // .smItem already sets color:var(--ink) — guard it so it cannot regress.
  const item = /\.smItem\{([^}]*)\}/.exec(css);
  assert.ok(item && /color:\s*var\(--ink\)/.test(item[1]));
});

test('the launcher is a grid whose columns fit the viewport', () => {
  const mobile = phoneBlock();
  assert.match(
    mobile,
    /#deskIcons\{[^}]*grid-template-columns/,
    'the phone launcher must be a real grid, not a fixed-width wrap row',
  );
  assert.match(
    mobile,
    /repeat\(auto-fill,\s*minmax\(/,
    'the column count must follow the available width',
  );
  // A fixed 88px tile cannot shrink on a 320px phone; the tile must be able to.
  const tile = /\.dskApp\{([^}]*)\}/.exec(mobile);
  assert.ok(tile, 'the phone tile rule must exist');
  assert.doesNotMatch(
    tile[1],
    /width:\s*88px/,
    'a hardcoded tile width overflows narrow phones',
  );
});

test('the launcher scrolls only inside the desktop area, not behind the taskbar', () => {
  const mobile = phoneBlock();
  assert.match(
    mobile,
    /#deskIcons\{[^}]*overflow-y:\s*auto/,
    'long launcher content must be scrollable instead of clipped',
  );
  assert.match(
    css,
    /--tb-h:\s*52px/,
    'the taskbar height is the anchor for the reserved strip',
  );
});

test('the editor surfaces use tokens instead of hardcoded dark colours', () => {
  for (const sel of ['.npArea{', '.edArea{', '.ieContainer{']) {
    const m = new RegExp(sel.replace('.', '\\.') + '([^}]*)\\}').exec(css);
    assert.ok(m, sel + ' must exist');
    assert.doesNotMatch(
      m[1],
      /#1a1a1e|#e0e0e0/,
      sel + ' hardcodes a dark surface and can never follow the palette',
    );
    assert.match(m[1], /var\(--/, sel + ' must read its colours from the theme');
  }
});

test('the terminal keeps its own terminal colours', () => {
  // The terminal is the one place where a dark background is correct — it is
  // a terminal. It must not be caught by the token sweep above.
  assert.match(css, /\.termOut\{[^}]*background:#0a0a0a[^}]*color:#0f0/);
});
