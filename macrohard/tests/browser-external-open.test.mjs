import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

/*
 * The Browser app's escape hatch for pages that refuse to be framed.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS TEST IS SHAPED THE WAY IT IS
 *
 * The first version of this suite asserted MECHANISM: "onload must probe
 * contentDocument". It passed green, and the browser was broken anyway.
 *
 * Reason, measured in Chromium rather than assumed:
 *
 *   signal                        github.com (blocked)  example.com (normal)
 *   ---------------------------------------------------------------------
 *   iframe.contentDocument        TypeError              TypeError
 *   contentWindow.location.href   SecurityError         SecurityError
 *   contentWindow.closed          false                 false
 *   contentWindow.length          0                     0
 *   Object.keys(contentWindow)    0                     0
 *   rendered size                 296x196               296x196
 *   postMessage handshake         no reply              no reply
 *
 * A frame blocked by X-Frame-Options/CSP is byte-for-byte indistinguishable
 * from a normal cross-origin frame as seen from the parent. Any test that
 * pins "contentDocument is consulted" therefore pins a bug.
 *
 * So these tests pin BEHAVIOUR that a user can observe:
 *   - a normal cross-origin page keeps rendering in the frame,
 *   - ↗ opens the current tab in the real browser, always,
 *   - ⚠ can always surface the blocked-page help,
 *   - the blocked screen itself is actionable and explains the cause.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

function extractFunction(src, name) {
  const m = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(src);
  if (!m) return null;
  let depth = 0;
  for (let i = src.indexOf('{', m.index); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(m.index, i + 1);
    }
  }
  return null;
}

const buildBrowser = extractFunction(source, 'buildBrowser');
assert.ok(buildBrowser, 'buildBrowser() must exist');

function browserMarkup() {
  const m = /case 'browser':\s*\n\s*body =\s*\n?\s*'([\s\S]*?)';\n\s*break;/.exec(source);
  assert.ok(m, "openApp() must contain the browser app markup");
  return m[1];
}

function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    className: '',
    innerHTML: '',
    textContent: '',
    value: '',
    style: { display: '', cssText: '' },
    dataset: {},
    children: [],
    _listeners: [],
    /* Has this element been registered under a class selector? buildBrowser
     * creates the blocked screen with `el.className = 'brErr'` and appends it,
     * so a querySelector('.brErr') has to walk the real child tree too. */
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) {
      this.children.push(c);
      c.parentNode = this;
      // Mirror the real DOM: a node appended here becomes findable by its
      // class from this element, which is how buildBrowser reaches .brErr.
      if (c.className) {
        for (const cls of String(c.className).split(/\s+/).filter(Boolean)) {
          if (!this._byClass) this._byClass = {};
          this._byClass[cls] = c;
        }
      }
      return c;
    },
    insertBefore(n) { this.children.push(n); n.parentNode = this; return n; },
    addEventListener(t, f) { this._listeners.push({ type: t, fn: f }); },
    dispatch(t, e) { for (const l of this._listeners) if (l.type === t) l.fn.call(this, e || {}); },
    querySelector(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        // A class selector matches either a node's own className/classList or
        // markup assigned to its innerHTML. Children are NOT walked here:
        // buildBrowser queries the tab strip it just rendered, and the app
        // queries .brErr directly on the content pane, never on a parent.
        const names = new Set([...(this.className || '').split(/\s+/), ...this.classList._s]);
        if (names.has(cls)) return this;
        if (this._byClass && this._byClass[cls]) return this._byClass[cls];
        if (new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`, 'g').test(this.innerHTML || '')) {
          if (!this._sel) this._sel = {};
          if (!this._sel[sel]) this._sel[sel] = makeEl('div');
          return this._sel[sel];
        }
        return null;
      }
      const id = sel.slice(1);
      if (this.id === id) return this;
      if ((this.innerHTML || '').includes(`id="${id}"`)) {
        if (!this._sel) this._sel = {};
        if (!this._sel[sel]) this._sel[sel] = makeEl(id.startsWith('br') ? 'div' : 'input');
        return this._sel[sel];
      }
      return null;
    },
  };
  el.parentNode = null;
  return el;
}

function setup() {
  const byId = {};
  const opened = [];
  const toasts = [];
  for (const id of ['brGo', 'brBack', 'brFwd', 'brRefresh', 'brHome', 'brBm', 'brNewTab', 'brExt', 'brWarn']) {
    byId[id] = makeEl('button');
  }
  const content = makeEl('div');
  byId.brContent = content;
  byId.brAddr = makeEl('input');
  byId.brTabs = makeEl('div');

  const ctx = {
    console, Math, JSON, Date, encodeURIComponent, parseInt, parseFloat,
    String, Number, Array, Object, RegExp,
    setTimeout: () => 0,
    clearTimeout: () => {},
    document: {
      createElement: (tag) => {
        const el = makeEl(tag);
        if (String(tag).toLowerCase() === 'a') el.click = () => opened.push(el.href);
        return el;
      },
      getElementById: (id) => {
        if (!byId[id]) byId[id] = makeEl('div');
        return byId[id];
      },
    },
    localStorage: {
      _d: {},
      getItem(k) { return k in this._d ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
    },
    toast: (m) => toasts.push(m),
    open: (url, target, feats) => opened.push(`open:${url}:${target}:${feats}`),
  };
  ctx.window = ctx;
  const context = vm.createContext(ctx);
  vm.runInContext('var BROWSER_INITIALIZED = false;', context);
  vm.runInContext(buildBrowser, context);
  vm.runInContext('buildBrowser()', context);
  return { ctx, context, byId, content, opened, toasts };
}

function navigate(context, byId, url) {
  byId.brAddr.value = url;
  byId.brGo.dispatch('click');
}

/* ------------------------------------------------------------------ *
 * 1. The toolbar controls exist and are labelled
 * ------------------------------------------------------------------ */

test('the browser toolbar has the external and help buttons', () => {
  const markup = browserMarkup();
  assert.match(markup, /id="brExt"[^>]*title="Im externen Browser öffnen"/);
  assert.match(markup, /id="brWarn"[^>]*title="Seite blockiert\? Hilfe anzeigen"/);
});

/* ------------------------------------------------------------------ *
 * 2. ↗ always works — this is the whole point of the feature
 * ------------------------------------------------------------------ */

test('↗ opens the current tab in the real browser', () => {
  const { byId, opened } = setup();
  navigate(null, byId, 'https://github.com');
  byId.brExt.dispatch('click');
  assert.ok(
    opened.some((o) => o.includes('https://github.com') && o.includes('_blank')),
    `the tab URL must open in a new browser tab, got: ${JSON.stringify(opened)}`,
  );
});

test('↗ does not depend on any load or block event', () => {
  // No frame, no onload, no detection. The button must still open the URL.
  const { byId, content, opened } = setup();
  navigate(null, byId, 'https://github.com');
  assert.equal(content.children.filter((c) => c.id === 'brFrame').length >= 0, true);
  byId.brExt.dispatch('click');
  assert.equal(opened.filter((o) => o.includes('github.com')).length, 1);
});

test('↗ uses _blank with noopener so it really escapes the frame', () => {
  const { byId, opened } = setup();
  navigate(null, byId, 'https://github.com');
  byId.brExt.dispatch('click');
  const call = opened.find((o) => o.startsWith('open:'));
  assert.ok(call, 'window.open must be used');
  assert.match(call, /:_blank:/, 'target must be _blank, not a reusable frame name');
  assert.match(call, /:noopener$/, 'features must include noopener');
});

test('↗ says so instead of failing silently on the home tab', () => {
  const { byId, opened, toasts } = setup();
  byId.brExt.dispatch('click');
  assert.deepEqual(opened, [], 'nothing may be opened without a page');
  assert.ok(toasts.some((t) => /Keine Seite/.test(t)), 'the user must get feedback');
});

test('↗ follows tab switches', () => {
  const { context, byId, opened } = setup();
  navigate(null, byId, 'https://github.com');
  navigate(null, byId, 'https://example.com');
  // The active tab is the second one.
  byId.brExt.dispatch('click');
  assert.ok(
    opened.some((o) => o.includes('https://example.com')),
    `must open the ACTIVE tab, got: ${JSON.stringify(opened)}`,
  );
});

/* ------------------------------------------------------------------ *
 * 3. A normal cross-origin page must keep rendering  ← the regression
 * ------------------------------------------------------------------ */

test('a cross-origin page is never treated as blocked', () => {
  // This is the assertion the old, green test suite failed to make. A frame
  // whose contentDocument is unreadable is the NORMAL case, not an error.
  const onload = /iframe\.onload\s*=\s*function\s*\(\)\s*\{([\s\S]*?)\n {6}\};/.exec(buildBrowser);
  assert.ok(onload, 'iframe.onload must be assigned');
  const body = onload[1];
  assert.doesNotMatch(
    body,
    /readable/,
    'onload must not decide readability and treat unreadable as blocked: ' +
      'a blocked frame and a normal cross-origin frame are indistinguishable',
  );
  // A load that arrives must leave the frame visible.
  assert.match(body, /iframe\.style\.display\s*=\s*''/, 'onload must show the frame again');
});

test('the app must not hide the frame based on a cross-origin check', () => {
  // Belt and braces: no `if (!readable)` style branch anywhere in the app.
  assert.doesNotMatch(buildBrowser, /if \(!readable\)/, 'that branch is the bug being removed');
  assert.doesNotMatch(
    buildBrowser,
    /contentDocument[\s\S]{0,200}display\s*=\s*'none'/,
    'the blocked screen must not be triggered by a contentDocument read',
  );
});

/* ------------------------------------------------------------------ *
 * 4. ⚠ can always surface the help, without detection
 * ------------------------------------------------------------------ */

test('⚠ shows the blocked screen for the current tab', () => {
  const { byId, content } = setup();
  navigate(null, byId, 'https://github.com');
  byId.brWarn.dispatch('click');
  const err = content.querySelector('.brErr');
  assert.ok(err, 'the blocked screen must exist in the DOM');
  assert.equal(err.style.display, 'flex', '⚠ must reveal the blocked screen');
});

test('⚠ is inert on the home tab', () => {
  const { byId, content, toasts } = setup();
  byId.brWarn.dispatch('click');
  assert.equal(content.querySelector('.brErr'), null, 'no frame exists yet, nothing to hide');
  assert.ok(toasts.some((t) => /Keine Seite/.test(t)));
});

/* ------------------------------------------------------------------ *
 * 5. The blocked screen itself
 * ------------------------------------------------------------------ */

test('the blocked screen offers both ways out and explains the cause', () => {
  const m = /err\.innerHTML\s*=\s*\n?\s*'([\s\S]*?)';\n/.exec(buildBrowser);
  assert.ok(m, 'the blocked screen markup must exist');
  const markup = m[1];
  assert.match(markup, /id="brOpenExt"/, 'must offer opening externally');
  assert.match(markup, /id="brRetry"/, 'must offer retrying in the frame');
  assert.match(markup, /X-Frame-Options|CSP frame-ancestors/, 'must name the reason');
  assert.match(
    markup,
    /nicht kaputt|funktioniert im normalen Browser/,
    'must make clear the site blocks it, not MakerOS',
  );
});

test('the blocked screen opens the URL in a real browser tab', () => {
  const { byId, content, opened } = setup();
  navigate(null, byId, 'https://github.com');
  const err = content.querySelector('.brErr');
  const btn = err.querySelector('#brOpenExt');
  assert.ok(btn, '#brOpenExt must exist');
  assert.ok(btn._listeners.some((l) => l.type === 'click'), '#brOpenExt must be wired');
  btn.dispatch('click');
  assert.ok(opened.some((o) => o.includes('https://github.com')));
});

test('the dead !brLoaded rescue timeout is gone', () => {
  assert.doesNotMatch(
    buildBrowser,
    /if \(!brLoaded && loading\.parentNode\)/,
    'that timeout could never fire: the load event already set brLoaded',
  );
});

test('brLoaded is declared, not only assigned', () => {
  // A missing declaration passes a syntax check in sloppy mode and then
  // throws at runtime in strict mode. Assert the declaration explicitly.
  assert.match(buildBrowser, /let brLoaded\s*=\s*false/, 'brLoaded must be declared in showTab');
});

/* ------------------------------------------------------------------ *
 * 6. Precondition: the rest of the app still works
 * ------------------------------------------------------------------ */

test('the browser app still builds and wires its original controls', () => {
  const { context } = setup();
  assert.doesNotThrow(() => vm.runInContext('buildBrowser()', context));
  for (const id of ['brGo', 'brBack', 'brFwd', 'brRefresh', 'brHome', 'brBm', 'brNewTab']) {
    assert.ok(buildBrowser.includes(`'${id}'`), `${id} must stay wired`);
  }
});

test('the app still parses with the project toolchain', async () => {
  const { parse } = await import('espree');
  assert.doesNotThrow(() => parse(source, { ecmaVersion: 2022, sourceType: 'script' }));
});
