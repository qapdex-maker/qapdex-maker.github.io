import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Three things reported after the icon/grid fix, on the same phone.
 *
 * 1. Window size cannot be changed on a phone. Measured in Chromium at
 *    393x851: setting .wnd to 200x150 via inline style left it at 334x638,
 *    because the phone breakpoint sets
 *
 *      .wnd{position:fixed;left:7.5vw!important;top:6vh!important;
 *           width:85vw!important;height:75vh!important}
 *
 *    with !important. Every inline width — from the resize grip, from the
 *    maximize button, from a restored session — loses against it. The grip and
 *    pinch-to-zoom are therefore dead on a phone: they move the element and
 *    the stylesheet snaps it back. The user could not resize the editor.
 *
 * 2. The maximize button is hidden on a phone (.wmax{display:none}), so even
 *    a working resize would have no full-screen escape.
 *
 * 3. The focus glow is a soft yellow halo on the window control dots
 *    (.wnd.focused .wact). It fights the flat neo-brutalist look — the whole
 *    theme is hard edges and offset shadows — and it is the one place a glow
 *    survived.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

function phoneBlock() {
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
        if (body.includes('.wnd{')) return body;
        break;
      }
    }
  }
  assert.fail('no phone breakpoint contains .wnd{');
}

test('precondition: the phone window rule and the resize handlers exist', () => {
  const block = phoneBlock();
  assert.ok(block, 'the phone breakpoint must style .wnd');
  assert.match(block, /\.wnd-resize/, 'the resize handle must exist');
  assert.match(
    app,
    /class="wnd-resize"/,
    'the markup must contain the handle',
  );
  assert.match(app, /touchstart/, 'touch resize must be wired');
});

test('the phone window rule does not pin the size with !important', () => {
  const rule = /\.wnd\{([^}]*)\}/.exec(phoneBlock());
  assert.ok(rule, 'the phone .wnd rule must exist');
  assert.doesNotMatch(
    rule[1],
    /width:[^;]*!important/,
    'width:...!important beats every inline size, so resizing cannot work',
  );
  assert.doesNotMatch(
    rule[1],
    /height:[^;]*!important/,
    'height:...!important has the same effect',
  );
});

test('the phone window defaults are still concrete, not just unset', () => {
  // Dropping !important must not leave the window at auto size — the desktop
  // rule gives it a px size that is wrong on a phone.
  const rule = /\.wnd\{([^}]*)\}/.exec(phoneBlock());
  assert.match(rule[1], /width:\s*85vw/, 'the phone default width stays');
  assert.match(rule[1], /height:\s*75vh/, 'the phone default height stays');
});

test('the maximize button stays reachable on a phone', () => {
  assert.doesNotMatch(
    phoneBlock(),
    /\.wmax\{[^}]*display:\s*none/,
    'a hidden maximize button leaves no way to full-screen a window',
  );
});

test('the focus glow is gone', () => {
  assert.doesNotMatch(
    css,
    /\.wnd\.focused \.wact\{[^}]*box-shadow:[^;]*0 0 /,
    'the yellow halo on the window dots fights the flat neo-brutalist look',
  );
});

test('no other glow was left behind on the window chrome', () => {
  // Keep the scope tight: the terminal, the CRT page and the portal are
  // separate documents and are not touched here.
  const wndRules = css.match(/\.wnd[^{]*\{[^}]*\}/g) || [];
  for (const rule of wndRules) {
    assert.doesNotMatch(
      rule,
      /box-shadow:[^;]*0 0 [0-9]/,
      'window chrome must stay flat: ' + rule.slice(0, 40),
    );
  }
});
