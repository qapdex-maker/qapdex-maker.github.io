import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

/*
 * Regression: the "open externally" escape hatch was unreachable.
 *
 * assets/app.js rendered a blockiert-page screen with an
 * "↗ Im externen Browser öffnen" button, but that screen was only shown
 * from two paths:
 *
 *     iframe.onerror  ->  never fires for X-Frame-Options / CSP
 *                          frame-ancestors. Browsers render their own error
 *                          document inside the frame and fire a normal load.
 *
 *     setTimeout(5000) if (!brLoaded) -> also dead, because the load event
 *                          already set brLoaded = true.
 *
 * So on a blocked page brLoaded became true, the spinner was hidden, `err`
 * stayed display:none, and the button existed in the DOM but was never
 * visible. The user was stuck in a frame with no way out and no explanation.
 *
 * Fix:
 *   1. An always-present "↗" button in the browser toolbar opens the current
 *      tab externally, so the escape hatch does not depend on detecting the
 *      block at all.
 *   2. The blocked-page screen is shown whenever the frame reports a load we
 *      cannot read (cross-origin/blocked) and stays available on demand.
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
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore(n) { this.children.push(n); n.parentNode = this; return n; },
    addEventListener(t, f) { this._listeners.push({ type: t, fn: f }); },
    dispatch(t, e) { for (const l of this._listeners) if (l.type === t) l.fn.call(this, e || {}); },
    /* The real app builds markup with innerHTML and then reaches into it with
     * querySelector. The stub mirrors that by parsing the class names and ids
     * out of whatever was assigned to innerHTML, so wiring code is exercised
     * instead of hitting null. */
    querySelector(sel) {
      const cls = sel.replace(/^\./, '');
      if (sel.startsWith('.')) {
        const re = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`, 'g');
        if (re.test(this.innerHTML)) {
          if (!this._sel) this._sel = {};
          if (!this._sel[sel]) this._sel[sel] = makeEl('div');
          return this._sel[sel];
        }
        return null;
      }
      const id = sel.replace(/^#/, '');
      if (sel.startsWith('#') && this.innerHTML.includes(`id="${id}"`)) {
        if (!this._sel) this._sel = {};
        if (!this._sel[sel]) this._sel[sel] = makeEl(id.startsWith('br') ? 'div' : 'input');
        return this._sel[sel];
      }
      return null;
    },
    querySelectorAll(sel) {
      const cls = sel.replace(/^\./, '');
      const re = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`, 'g');
      const n = (this.innerHTML.match(re) || []).length;
      return Array.from({ length: n }, () => makeEl('div'));
    },
  };
  el.parentNode = null;
  return el;
}

/* Build a DOM stub that also answers the #id lookups inside innerHTML. */
function setup() {
  const byId = {};
  const opened = [];
  const toasts = [];
  const wins = {};

  const doc = {
    createElement: (tag) => {
      const el = makeEl(tag);
      if (String(tag).toLowerCase() === 'a') {
        el.click = () => opened.push(el.href);
      }
      return el;
    },
    getElementById: (id) => {
      if (!byId[id]) byId[id] = makeEl(id.startsWith('br') ? 'div' : 'input');
      return byId[id];
    },
  };

  // The toolbar buttons the app wires up on init.
  for (const id of ['brGo', 'brBack', 'brFwd', 'brRefresh', 'brHome', 'brBm', 'brNewTab']) {
    byId[id] = makeEl('button');
  }
  const content = makeEl('div');
  const addr = makeEl('input');
  const tabsEl = makeEl('div');
  byId.brContent = content;
  byId.brAddr = addr;
  byId.brTabs = tabsEl;

  const ctx = {
    console, Math, JSON, Date, encodeURIComponent, parseInt, parseFloat,
    String, Number, Array, Object, RegExp,
    setTimeout: () => 0,
    clearTimeout: () => {},
    document: doc,
    localStorage: {
      _d: {},
      getItem(k) { return k in this._d ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
    },
    toast: (m) => toasts.push(m),
    open: (url, target) => opened.push('window.open:' + url + ':' + target),
  };
  ctx.window = ctx;
  const context = vm.createContext(ctx);
  ctx.__byId = byId;
  ctx.__opened = opened;
  ctx.__content = content;
  ctx.__toasts = toasts;
  ctx.__wins = wins;

  const pieces = [
    'var BROWSER_INITIALIZED = false;',
    extractFunction(source, 'buildBrowser'),
  ];
  for (const p of pieces) {
    assert.ok(p, 'browser source fragment must exist in app.js');
    vm.runInContext(p, context);
  }
  vm.runInContext('buildBrowser()', context);
  return { ctx, context, byId, content, opened, toasts };
}

/* The browser app builds its whole chrome — tabs, toolbar, content pane — from
 * the `case 'browser':` branch in openApp(), not from index.html. */
function browserMarkup() {
  const m = /case 'browser':\s*\n\s*body =\s*\n?\s*'([\s\S]*?)';\n\s*break;/.exec(source);
  assert.ok(m, "openApp() must contain the browser app markup");
  return m[1];
}

test('the browser toolbar has a permanent open-externally button', () => {
  const markup = browserMarkup();
  assert.ok(markup.includes('id="brContent"'), 'the content pane must exist');
  assert.match(
    markup,
    /id="brExt"/,
    'the toolbar must contain the #brExt open-externally button',
  );
  assert.match(
    markup,
    /id="brExt"[^>]*title="Im externen Browser öffnen"/,
    '#brExt must say what it does',
  );
});

test('the external button opens the current tab in the real browser', () => {
  const { context, byId, opened } = setup();
  // Navigate the way a user does: type the URL, press Go. openUrl() is a local
  // of buildBrowser(), so the address bar is the real entry point.
  const addr = byId.brAddr;
  addr.value = 'https://github.com';
  byId.brGo.dispatch('click');
  assert.ok(
    opened.length === 0,
    `navigating must not open anything externally yet, got: ${JSON.stringify(opened)}`,
  );

  const ext = byId.brExt;
  assert.ok(ext, '#brExt must exist in the toolbar');
  assert.ok(
    ext._listeners.some((l) => l.type === 'click'),
    '#brExt must have a click handler',
  );
  ext.dispatch('click');
  assert.ok(
    opened.some((o) => String(o).includes('https://github.com')),
    `the current tab URL must be opened externally, got: ${JSON.stringify(opened)}`,
  );
});

test('the external button is inert on the home tab', () => {
  const { context, byId, opened, ctx } = setup();
  // No navigation: the browser starts on the home tab.
  byId.brExt.dispatch('click');
  assert.deepEqual(opened, [], 'nothing may be opened when no page is loaded');
  assert.ok(
    ctx.__toasts.some((t) => /Keine Seite/.test(t)),
    'the user must be told why nothing happened',
  );
});

test('the external button uses a real browser window, not a named frame', () => {
  // window.open(url, '_blank') opens the user's actual browser. A named target
  // would reuse a frame and defeat the purpose.
  const body = extractFunction(source, 'buildBrowser');
  const handler = /brExt[\s\S]{0,400}?open\(/.exec(body);
  assert.ok(handler, '#brExt must be wired to window.open');
  assert.match(
    body,
    /window\.open\(\s*t\.url\s*,\s*'_blank'\s*(?:,\s*'noopener'\s*)?\)/,
    'the blocked-page screen must open with _blank in the user browser',
  );
});

test('the blocked-page screen is not gated behind iframe.onerror alone', () => {
  const body = extractFunction(source, 'buildBrowser');
  // The dead rescue: a timeout that only acts when brLoaded is still false.
  assert.ok(
    !/if \(!brLoaded && loading\.parentNode\)/.test(body),
    'the !brLoaded timeout rescue is dead code: the load event already fired',
  );
  // A blocked frame fires load with an unreadable document. That must surface
  // the screen, otherwise the escape hatch is never visible.
  assert.match(
    body,
    /contentDocument/,
    'the loader must probe the frame document to notice a block',
  );
});

test('the blocked screen explains why and offers both ways out', () => {
  const body = extractFunction(source, 'buildBrowser');
  const m = /err\.innerHTML\s*=\s*([\s\S]*?);\n/.exec(body);
  assert.ok(m, 'the blocked screen markup must exist');
  const markup = m[1];
  assert.match(markup, /id="brOpenExt"/, 'the screen must keep its external button');
  assert.match(markup, /id="brRetry"/, 'the screen must offer a retry inside the frame');
  assert.match(
    markup,
    /CSP|X-Frame-Options|frame-ancestors/,
    'the screen must name the reason so it is not just a dead end',
  );
});

test('the browser app still wires its own controls (precondition)', () => {
  const { context } = setup();
  assert.doesNotThrow(() => vm.runInContext('buildBrowser()', context));
  const body = extractFunction(source, 'buildBrowser');
  for (const id of ['brGo', 'brBack', 'brFwd', 'brRefresh', 'brHome', 'brBm', 'brNewTab']) {
    assert.ok(body.includes(`'${id}'`), `${id} must stay wired`);
  }
});
