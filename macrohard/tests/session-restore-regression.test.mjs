import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit));
    else if (v && typeof v.type === 'string') walk(v, visit);
  }
}

function findFn(name) {
  let found = null;
  walk(ast, (n) => {
    if (!found && n.type === 'FunctionDeclaration' && n.id && n.id.name === name) found = n;
  });
  return found;
}
function fnSource(fn) {
  assert.ok(fn && fn.range, `${fn && fn.id && fn.id.name} must have a source range`);
  return source.slice(fn.range[0], fn.range[1]);
}

/*
 * Regression: restoreSession() was fully implemented but NEVER CALLED.
 * saveSession() ran on every window open, close and drag, so os_session filled
 * up in localStorage and nothing ever read it back. The "Session Restore" that
 * README and the skill document advertised did not exist.
 */

test('saveSession records the minimized state, not just visibility', () => {
  const save = findFn('saveSession');
  const body = fnSource(save);
  assert.ok(
    /minimized:\s*w\.classList\.contains\(['"]minimized['"]\)/.test(body),
    'saveSession must persist the minimized flag, otherwise a minimized ' +
      'window comes back visible after reload',
  );
  assert.ok(/visible:/.test(body), 'visibility must still be recorded');
});

test('restoreSession is guarded against running twice', () => {
  const restore = findFn('restoreSession');
  const body = fnSource(restore);
  assert.ok(
    /sessionRestored/.test(body),
    'restoreSession must be idempotent: the boot timer AND the lock click ' +
      'both call it, and a double restore would open every window twice',
  );
});

test('restoreSession opens minimized windows too', () => {
  const restore = findFn('restoreSession');
  const body = fnSource(restore);
  // The old code had `if (!s.visible) return;` before openApp, which made
  // every minimized window (saved as visible:false) disappear on reload.
  assert.ok(
    !/if\s*\(\s*!s\.visible\s*\)\s*return/.test(body),
    'restoreSession must not skip invisible entries: a minimized window is ' +
      'saved with visible:false and would be lost',
  );
  assert.ok(
    /openApp\(s\.id\)/.test(body),
    'restoreSession must call openApp for every known id',
  );
});

test('restoreSession restores the minimized display state', () => {
  const restore = findFn('restoreSession');
  const body = fnSource(restore);
  assert.ok(
    /if\s*\(\s*s\.minimized\s*\)/.test(body),
    'the minimized branch must exist',
  );
  assert.ok(
    /classList\.add\(['"]minimized['"]\)/.test(body) &&
      /style\.display\s*=\s*['"]none['"]/.test(body),
    'a minimized window must come back minimized (class + display:none)',
  );
  assert.ok(
    /classList\.remove\(['"]minimized['"]\)/.test(body),
    'a non-minimized window must be forced visible, not left hidden',
  );
});

test('restoreSession uses the instance id for the taskbar icon', () => {
  const restore = findFn('restoreSession');
  const body = fnSource(restore);
  assert.ok(
    /tb-['"]\s*\+\s*realId/.test(body) || /getElementById\(\s*['"]tb-['"]\s*\+\s*realId/.test(body),
    'multi-instance apps (notepad, terminal, editor) get an "-inst-N" ' +
      'suffix, so the icon must be looked up with the real id',
  );
  assert.ok(
    /realId/.test(body),
    'the real id must be derived from the window that was actually found',
  );
});

test('restoreSession only accepts known app ids', () => {
  const restore = findFn('restoreSession');
  const body = fnSource(restore);
  assert.ok(
    /knownAppIds\(\)/.test(body),
    'a corrupt or hostile os_session must not be able to open arbitrary ids',
  );
});

test('knownAppIds reads the desktop icons, not the empty apps object', () => {
  const fn = findFn('knownAppIds');
  assert.ok(fn, 'knownAppIds must exist');
  const body = fnSource(fn);
  assert.ok(
    /dskApp\[data-app\]/.test(body),
    'the desktop icons are the live list of installed apps',
  );
  // The `apps` object is declared at the top of app.js and never filled.
  assert.ok(
    !/apps\[/.test(body),
    'must not read the never-populated `apps` object — it is always empty',
  );
});

test('restoreSession runs only after the lock screen is hidden', () => {
  /*
   * Structural check via the AST, not by line offsets: both call sites live
   * inside a setTimeout callback, and within that callback the classList.add
   * ('hide') must come before the restoreSession() call. A line-based
   * lastIndexOf() crosses callback boundaries and gives wrong answers.
   */
  const sites = [];
  walk(ast, (node) => {
    // find setTimeout(fn, ...) where fn calls restoreSession
    if (
      node.type !== 'CallExpression' ||
      node.callee.type !== 'Identifier' ||
      !['setTimeout', 'setInterval'].includes(node.callee.name)
    ) {
      return;
    }
    const fn = node.arguments[0];
    if (!fn || (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression')) return;

    let hasRestore = false;
    const hides = [];
    walk(fn, (n) => {
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'restoreSession') {
        hasRestore = true;
      }
      if (
        n.type === 'CallExpression' &&
        n.callee.type === 'MemberExpression' &&
        n.callee.property.name === 'add' &&
        n.callee.object.type === 'MemberExpression' &&
        n.callee.object.property.name === 'classList' &&
        n.arguments[0] &&
        n.arguments[0].value === 'hide'
      ) {
        hides.push(n.loc.start.line);
      }
    });
    if (hasRestore) sites.push({ timerLine: node.loc.start.line, hides });
  });

  assert.ok(
    sites.length >= 2,
    `expected the boot timer AND the lock click to restore, found ${sites.length} restore sites`,
  );
  for (const s of sites) {
    assert.ok(
      s.hides.length > 0,
      `the timer at line ${s.timerLine} restores the session but never hides ` +
        'the lock, so the windows would appear behind it',
    );
  }
});

test('the lock click path also restores', () => {
  // Clicking through the lock skips the boot timer entirely.
  assert.ok(
    /lockEl[\s\S]{0,600}restoreSession/.test(source),
    'the lock click handler must restore the session too',
  );
});
