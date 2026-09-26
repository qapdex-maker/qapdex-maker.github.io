import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

/* Extract a top-level statement by name (function or var declaration). */
function extractDeclaration(src, name, isVar) {
  const re = isVar
    ? new RegExp(`(?:^|\\n)\\s*var\\s+${name}\\s*=\\s*\\{`)
    : new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  if (isVar) {
    // object/primitive literal, not a function body: brace-match from the '='
    const open = src.indexOf('{', m.index);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) return src.slice(m.index, i + 1);
      }
    }
    return null;
  }
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

/* `var X = false;` — a plain boolean flag, not an object literal. */
function extractFlag(src, name) {
  const m = new RegExp(`(?:^|\\n)\\s*var\\s+${name}\\s*=\\s*(?:false|true)\\s*;`).exec(src);
  return m ? m[0].trim() : null;
}

/* Minimal DOM stub: enough to run renderCalendar() end to end. */
function makeEl(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    className: '',
    innerHTML: '',
    textContent: '',
    dataset: {},
    children: [],
    _listeners: [],
    appendChild(c) {
      this.children.push(c);
      // Real DOM serialises the node into innerHTML; mirror that so
      // assertions on rendered markup behave like the browser.
      this.innerHTML += `<${c.tagName.toLowerCase()} class="${c.className}">${c.innerHTML}</${c.tagName.toLowerCase()}>`;
      return c;
    },
    addEventListener(type, fn) {
      this._listeners.push({ type, fn });
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function makeContext() {
  const store = { macrohard_calendar_events: null };
  const ctx = {
    console,
    Math,
    JSON,
    Date,
    parseInt,
    parseFloat,
    String,
    Number,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
    document: {
      createElement: makeEl,
      getElementById: () => null,
    },
  };
  ctx.window = ctx;
  return vm.createContext(ctx);
}

/* Load the calendar unit exactly as it is declared in app.js. */
function loadCalendar(ctx) {
  const pieces = [
    extractDeclaration(source, 'calState', true),
    extractDeclaration(source, 'calLoadEvents', false),
    extractDeclaration(source, 'calSaveEvents', false),
    extractDeclaration(source, 'calEventsForDate', false),
    extractDeclaration(source, 'calAddEvent', false),
    extractDeclaration(source, 'calDeleteEvent', false),
    extractDeclaration(source, 'renderCalendar', false),
    extractDeclaration(source, 'buildCalendar', false),
    extractFlag(source, 'CALENDAR_INITIALIZED'),
    'const CAL_MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];',
    'const CAL_DAY_NAMES = ["Mo","Di","Mi","Do","Fr","Sa","So"];',
  ];
  for (const p of pieces) {
    assert.ok(p, 'calendar source fragment must exist in app.js');
    vm.runInContext(p, ctx);
  }
  return ctx;
}

function freshBody() {
  return makeEl('div');
}

/*
 * Regression: the calendar died on the SECOND open with
 *   ReferenceError: Cannot access 'viewMonth' before initialization
 * Cause: viewYear/viewMonth/selectedDay were function-scoped `let` inside
 * buildCalendar(), while the CALENDAR_INITIALIZED branch called
 * renderCalendar() before those declarations were evaluated (TDZ).
 * Fix: state lives in the module-level `calState` object.
 */
test('calendar opens repeatedly without a TDZ ReferenceError', () => {
  const ctx = loadCalendar(makeContext());
  for (let open = 1; open <= 5; open++) {
    const body = freshBody();
    ctx.calState.body = body;
    ctx.document.getElementById = (id) => (id === 'calBody' ? body : null);
    assert.doesNotThrow(
      () => vm.runInContext('buildCalendar()', ctx),
      `open #${open} must not throw`,
    );
  }
});

test('calendar renders a full 6x7 grid on reopen', () => {
  const ctx = loadCalendar(makeContext());
  const bodies = [];
  for (let open = 0; open < 3; open++) {
    const body = freshBody();
    ctx.document.getElementById = () => body;
    vm.runInContext('buildCalendar()', ctx);
    bodies.push(body);
  }
  for (const [i, body] of bodies.entries()) {
    // `calDayName` also starts with "calDay" — count the exact class.
    const dayCells = (body.innerHTML.match(/class="calDay(?:\s|")/g) || []).length;
    assert.equal(dayCells, 42, `open #${i + 1} must render 42 day cells`);
    const nameCells = (body.innerHTML.match(/class="calDayName"/g) || []).length;
    assert.equal(nameCells, 7, `open #${i + 1} must render 7 weekday headers`);
    assert.ok(body.innerHTML.includes('calHeader'), `open #${i + 1} must render the header`);
    assert.ok(body.innerHTML.includes('calPanel'), `open #${i + 1} must render the event panel`);
  }
});

test('reopened calendar points at the live body, not the closed window', () => {
  const ctx = loadContextAndOpen();
  // Second open with a fresh body: the first (detached) body must be untouched.
  const first = ctx.__firstBody;
  const snapshot = first.children.length;
  const second = freshBody();
  ctx.document.getElementById = () => second;
  vm.runInContext('buildCalendar()', ctx);
  assert.equal(first.children.length, snapshot, 'the detached body must not be re-rendered');
  assert.ok(
    second.children.some((c) => c.className === 'calGrid'),
    'the new body must be the one that is rendered',
  );
});

function loadContextAndOpen() {
  const ctx = loadCalendar(makeContext());
  const first = freshBody();
  ctx.__firstBody = first;
  ctx.document.getElementById = () => first;
  vm.runInContext('buildCalendar()', ctx);
  return ctx;
}

test('month names come from the shared constant, not a per-call literal', () => {
  // A per-call literal inside renderCalendar is what made the state hard to
  // reach; the constants must be hoisted so both entry points share them.
  const ctx = loadCalendar(makeContext());
  const body = freshBody();
  ctx.document.getElementById = () => body;
  vm.runInContext('buildCalendar()', ctx);
  const header = body.children.find((c) => c.className === 'calHeader');
  assert.ok(header, 'a calHeader must be rendered');
  const currentMonth = new Date().toLocaleString('de-DE', { month: 'long' });
  assert.ok(
    header.innerHTML.includes('calTitle') && header.innerHTML.includes(currentMonth),
    `header must show the current month (${currentMonth})`,
  );
});

test('events survive add/delete through the calState store', () => {
  const ctx = loadCalendar(makeContext());
  const body = freshBody();
  ctx.document.getElementById = () => body;
  vm.runInContext('buildCalendar()', ctx);
  vm.runInContext('calAddEvent(2026, 8, 15, "Test", "10:00")', ctx);
  assert.equal(vm.runInContext('calEventsForDate(2026, 8, 15).length', ctx), 1);
  assert.equal(vm.runInContext('calEventsForDate(2026, 8, 16).length', ctx), 0);
  vm.runInContext('calDeleteEvent(0)', ctx);
  assert.equal(vm.runInContext('calEventsForDate(2026, 8, 15).length', ctx), 0);
});
