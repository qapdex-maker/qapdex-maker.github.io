import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

/*
 * Regression: exportPaintPNG() existed but nothing ever called it.
 * The Paint toolbar offered Undo/Redo/Clear only, so the documented
 * "Paint: Export PNG" feature was unreachable in the UI.
 * Fix: buildPaint() puts a PNG button in the toolbar that calls it.
 *
 * This test runs the real buildPaint() against a DOM stub and then fires the
 * button's click listener, so it fails if the button is missing OR if the
 * button is present but not wired to the export.
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

function makeCtxEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    className: '',
    innerHTML: '',
    textContent: '',
    title: '',
    value: '3',
    width: 400,
    height: 260,
    style: { cssText: '' },
    dataset: {},
    children: [],
    _listeners: [],
    classList: {
      _set: new Set(),
      add(c) {
        this._set.add(c);
      },
      remove(c) {
        this._set.delete(c);
      },
      contains(c) {
        return this._set.has(c);
      },
    },
    parentNode: null,
    appendChild(c) {
      this.children.push(c);
      c.parentNode = this;
      return c;
    },
    insertBefore(node) {
      this.children.push(node);
      node.parentNode = this;
      return node;
    },
    addEventListener(type, fn) {
      this._listeners.push({ type, fn });
    },
    dispatch(type, event) {
      for (const l of this._listeners) if (l.type === type) l.fn.call(this, event || {});
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: this.width, height: this.height };
    },
  };
  return el;
}

function makeContext(elements) {
  const downloads = [];
  const toasts = [];
  const ctx = {
    console,
    Math,
    JSON,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    String,
    Number,
    Array,
    Object,
    toast: (msg) => toasts.push(msg),
    document: {
      createElement: (tag) => {
        const el = makeCtxEl(tag);
        if (String(tag).toLowerCase() === 'a') {
          el.click = () => downloads.push({ download: el.download, href: el.href });
        }
        return el;
      },
      getElementById: (id) => {
        // #ptLW is injected via innerHTML, so in a real DOM it is queryable by
        // id after the toolbar is built. Only that one is faked; every other
        // lookup stays strict so a missing element still fails the test.
        if (id === 'ptLW' && !elements[id]) elements[id] = makeCtxEl('input');
        return elements[id] || null;
      },
    },
  };
  ctx.window = ctx;
  ctx.__downloads = downloads;
  ctx.__toasts = toasts;
  return vm.createContext(ctx);
}

function fakeCtx2D(canvas) {
  return {
    canvas,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: '',
    globalAlpha: 1,
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    save() {},
    restore() {},
    setLineDash() {},
    ellipse() {},
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData() {},
    toDataURL: () => 'data:image/png;base64,AAA',
  };
}

function setup() {
  const colors = makeCtxEl('div');
  colors.id = 'ptColors';
  const canvas = makeCtxEl('canvas');
  canvas.id = 'ptCanvas';
  canvas.toDataURL = () => 'data:image/png;base64,AAA';
  canvas.getContext = () => fakeCtx2D(canvas);
  const host = makeCtxEl('div');
  host.appendChild(colors);
  host.appendChild(canvas);
  colors.parentNode = host;
  canvas.parentNode = host;

  const elements = { ptColors: colors, ptCanvas: canvas };
  const ctx = makeContext(elements);

  const pieces = [
    'let paintColor = "#000", pTool = "pen", pShape = null, pCtx = null;',
    extractFunction(source, 'buildPaint'),
    extractFunction(source, 'floodFill'),
    extractFunction(source, 'drawShapePreview'),
    extractFunction(source, 'commitShape'),
    extractFunction(source, 'exportPaintPNG'),
  ];
  for (const p of pieces) {
    assert.ok(p, 'paint source fragment must exist in app.js');
    vm.runInContext(p, ctx);
  }
  vm.runInContext('buildPaint()', ctx);
  return { ctx, colors, canvas, host };
}

function findButton(root, label) {
  const stack = [...root.children];
  while (stack.length) {
    const el = stack.shift();
    if (el.tagName === 'BUTTON' && (el.textContent === label || el.title === label)) return el;
    stack.push(...el.children);
  }
  return null;
}

test('paint toolbar offers a PNG export button', () => {
  const { colors, host } = setup();
  // Guard against a vacuous scan: the toolbar really is built.
  const painted = colors.children.filter((c) => c.tagName === 'BUTTON');
  assert.ok(painted.length >= 20, `color palette must be rendered: ${painted.length}`);
  const toolbar = host.children.find((c) => c.className === 'ptToolbar');
  assert.ok(toolbar, 'a .ptToolbar must be inserted next to the palette');
  const btn = findButton(toolbar, 'PNG') || findButton(toolbar, 'Als PNG exportieren');
  assert.ok(btn, 'the paint toolbar must contain a PNG export button');
});

test('clicking the PNG export button downloads the canvas as paint.png', () => {
  const { ctx, host } = setup();
  const toolbar = host.children.find((c) => c.className === 'ptToolbar');
  const btn = findButton(toolbar, 'PNG') || findButton(toolbar, 'Als PNG exportieren');
  assert.ok(btn, 'the paint toolbar must contain a PNG export button');
  assert.ok(
    btn._listeners.some((l) => l.type === 'click'),
    'the PNG button must have a click listener',
  );
  btn.dispatch('click');
  assert.equal(ctx.__downloads.length, 1, 'exactly one download must be triggered');
  assert.equal(ctx.__downloads[0].download, 'paint.png');
  assert.match(ctx.__downloads[0].href, /^data:image\/png/, 'must be a PNG data URL');
  assert.ok(
    ctx.__toasts.includes('PNG exportiert'),
    `export must confirm in the UI, got: ${JSON.stringify(ctx.__toasts)}`,
  );
});

test('exportPaintPNG is still reachable and not a duplicate implementation', () => {
  // The button must reuse the existing helper, not re-implement the download.
  const { ctx } = setup();
  const toolbarFn = extractFunction(source, 'buildPaint');
  const refs = [...toolbarFn.matchAll(/addEventListener\('click',\s*([A-Za-z0-9_$]+)\)/g)].map(
    (m) => m[1],
  );
  assert.ok(refs.length >= 2, `toolbar must wire several click handlers: ${refs.join(',')}`);
  assert.ok(
    refs.includes('exportPaintPNG'),
    `buildPaint must wire exportPaintPNG directly, got: ${refs.join(',')}`,
  );
  assert.equal(typeof ctx.exportPaintPNG, 'function', 'exportPaintPNG must still exist');
});
