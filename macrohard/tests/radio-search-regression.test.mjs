import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

/*
 * Regression: one radio search permanently destroyed the station list.
 *
 * fetchRadios(search, forceRefresh) did `radioStations = found` for EVERY
 * successful response, including a search. The guard
 *   if (!forceRefresh && radioStations.length > 0 && !search) return;
 * then never refetches, so the verified 48-station list was replaced by
 * (at most) 12 search hits until the window was closed and reopened.
 * saveRadios() also persisted the truncated list to localStorage.
 *
 * Fix: search results live in a separate array; radioStations is only
 * replaced when there is no search term, and only then persisted.
 *
 * The test drives the real fetchRadios()/renderRadio() out of app.js with a
 * fake XMLHttpRequest, so it fails on the old behaviour, not on a re-creation.
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

function extractConstArray(src, name) {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*\\[`).exec(src);
  if (!m) return null;
  let depth = 0;
  for (let i = src.indexOf('[', m.index); i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
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
    style: {},
    dataset: {},
    children: [],
    _listeners: [],
    classList: {
      _s: new Set(),
      add(c) {
        this._s.add(c);
      },
      remove(c) {
        this._s.delete(c);
      },
      contains(c) {
        return this._s.has(c);
      },
    },
    appendChild(c) {
      this.children.push(c);
      this.innerHTML += `<${c.tagName.toLowerCase()} class="${c.className}">${c.innerHTML}</${c.tagName.toLowerCase()}>`;
      return c;
    },
    addEventListener(type, fn) {
      this._listeners.push({ type, fn });
    },
    dispatch(type, ev) {
      for (const l of this._listeners) if (l.type === type) l.fn.call(this, ev || {});
    },
    querySelector() {
      return makeEl('button');
    },
    querySelectorAll() {
      return [];
    },
  };
  return el;
}

const VERIFIED = [
  { name: 'SomaFM: Groove Salad', u: 'https://ice1.somafm.com/groovesalad-128-mp3', codec: 'MP3', votes: 4500 },
  { name: 'FluxFM', u: 'https://streams.fluxfm.de/fluxfm/mp3-320', codec: 'MP3', votes: 3500 },
  { name: 'FM4 (ORF)', u: 'https://orf-live.ors-shoutcast.at/fm4-q2a', codec: 'MP3', votes: 3300 },
  { name: 'NTS Radio 1', u: 'https://stream-relay-geo.ntslive.net/stream', codec: 'MP3', votes: 2200 },
];

const SEARCH_HIT = {
  name: 'BBC Radio 4',
  url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm_nonuk',
  codec: 'MP3',
  votes: 900,
  country: 'United Kingdom',
  tags: 'talk,news',
};

function setup() {
  const store = {};
  const el = makeEl('div');
  const searchInput = makeEl('input');
  const searchBtn = makeEl('button');
  const refreshBtn = makeEl('button');
  const radioStatus = makeEl('span');
  const byId = {
    musRadio: el,
    radioSearchInput: searchInput,
    radioSearchBtn: searchBtn,
    radioRefreshBtn: refreshBtn,
    musRadioStatus: radioStatus,
  };

  const requests = [];
  class FakeXHR {
    constructor() {
      this.timeout = 0;
      requests.push(this);
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    send() {
      this.sent = true;
    }
    respond(payload) {
      this.responseText = JSON.stringify(payload);
      if (this.onload) this.onload();
    }
    fail(kind) {
      if (kind === 'error' && this.onerror) this.onerror();
      else if (kind === 'timeout' && this.ontimeout) this.ontimeout();
    }
  }

  const ctx = {
    console,
    Math,
    JSON,
    Date,
    encodeURIComponent,
    parseInt,
    parseFloat,
    String,
    Number,
    Array,
    Object,
    RegExp,
    XMLHttpRequest: FakeXHR,
    document: {
      createElement: makeEl,
      getElementById: (id) => byId[id] || null,
    },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
  };
  ctx.window = ctx;
  const context = vm.createContext(ctx);
  ctx.__byId = byId;
  ctx.__store = store;
  ctx.__requests = requests;

  const pieces = [
    'let radioStations = [];',
    'let radioSearchHits = [];',
    'let radioSearchTerm = "";',
    'const radioStatus = document.getElementById("musRadioStatus");',
    extractConstArray(source, 'fallbackStations'),
    'const radioServers = ["de1"];',
    extractFunction(source, 'loadRadios'),
    extractFunction(source, 'saveRadios'),
    extractFunction(source, 'fetchRadios'),
    extractFunction(source, 'renderRadio'),
    'let isRadio = false, curStation = null, playing = false;',
    'function playRadio(s) { curStation = s; isRadio = true; }',
  ];
  for (const p of pieces) {
    assert.ok(p, 'radio source fragment must exist in app.js');
    vm.runInContext(p, context);
  }

  // Seed the verified list the way loadRadios() would on a real device.
  vm.runInContext(
    'radioStations = ' +
      JSON.stringify(VERIFIED) +
      '; saveRadios(); renderRadio();',
    context,
  );
  return { ctx, context, el, searchInput, searchBtn, refreshBtn, radioStatus };
}

test('the radio list starts out with the verified stations', () => {
  const { context, el } = setup();
  assert.equal(vm.runInContext('radioStations.length', context), VERIFIED.length);
  assert.ok(el.innerHTML.includes('Groove Salad'), 'the list must be rendered');
});

test('a successful search does not overwrite the verified station list', () => {
  const { ctx, context } = setup();
  vm.runInContext('fetchRadios("bbc radio", true)', context);
  const req = ctx.__requests[ctx.__requests.length - 1];
  assert.match(req.url, /name=bbc%20radio/, 'the search term must reach the API');
  req.respond([SEARCH_HIT]);

  assert.equal(
    vm.runInContext('radioStations.length', context),
    VERIFIED.length,
    'the verified list must survive a search',
  );
  assert.equal(
    vm.runInContext('radioStations[0].name', context),
    VERIFIED[0].name,
    'the verified order must survive a search',
  );
});

test('a search does not persist the search hits to storage', () => {
  const { ctx, context } = setup();
  const before = ctx.__store.mus_radio_v2;
  vm.runInContext('fetchRadios("bbc radio", true)', context);
  ctx.__requests[ctx.__requests.length - 1].respond([SEARCH_HIT]);
  assert.equal(
    ctx.__store.mus_radio_v2,
    before,
    'localStorage must not be rewritten by a search',
  );
});

test('search hits are shown in the UI instead of being thrown away', () => {
  const { ctx, context, el, radioStatus } = setup();
  vm.runInContext('fetchRadios("bbc radio", true)', context);
  ctx.__requests[ctx.__requests.length - 1].respond([SEARCH_HIT]);
  assert.ok(el.innerHTML.includes('BBC Radio 4'), `hits must be rendered: ${el.innerHTML}`);
  assert.ok(
    /Suche: bbc radio/.test(radioStatus.textContent),
    `status must name the search: ${radioStatus.textContent}`,
  );
});

test('clearing the search restores the verified list in the UI', () => {
  const { ctx, context, el, searchInput, refreshBtn } = setup();
  vm.runInContext('fetchRadios("bbc radio", true)', context);
  ctx.__requests[ctx.__requests.length - 1].respond([SEARCH_HIT]);
  assert.ok(el.innerHTML.includes('BBC Radio 4'));

  searchInput.value = '';
  refreshBtn.dispatch('click');
  ctx.__requests[ctx.__requests.length - 1].fail('error');
  assert.ok(
    !el.innerHTML.includes('BBC Radio 4'),
    'the stale search hit must disappear from the list',
  );
  assert.ok(
    el.innerHTML.includes('Groove Salad'),
    'the verified stations must be back',
  );
});

test('a failed search keeps the verified list untouched', () => {
  const { ctx, context } = setup();
  vm.runInContext('fetchRadios("bbc radio", true)', context);
  ctx.__requests[ctx.__requests.length - 1].fail('timeout');
  assert.equal(vm.runInContext('radioStations.length', context), VERIFIED.length);
  assert.equal(vm.runInContext('radioStations[0].name', context), VERIFIED[0].name);
});

test('a plain refresh (no search term) may replace the list', () => {
  const { ctx, context } = setup();
  vm.runInContext('fetchRadios("", true)', context);
  const req = ctx.__requests[ctx.__requests.length - 1];
  assert.doesNotMatch(req.url, /name=/, 'no search term means no name filter');
  req.respond([SEARCH_HIT]);
  assert.equal(
    vm.runInContext('radioStations.length', context),
    1,
    'an unfiltered refresh is allowed to replace the list',
  );
});
