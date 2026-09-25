import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '..', 'assets', 'js', 'editor.js'), 'utf8');

function load() {
  const scope = { window: null };
  scope.window = scope;
  vm.createContext(scope);
  vm.runInContext(source, scope);
  return scope.EditorCore;
}

const E = load();

/* Das Modul läuft in einer vm-Context: dessen Objekte haben andere Prototypen.
 * deepStrictEqual würde daran scheitern, daher strukturell vergleichen. */
const same = (actual, expected, label) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), label);

test('module exposes the editor contract', () => {
  for (const fn of [
    'countStats',
    'lineNumbers',
    'createHistory',
    'replaceAll',
    'findAll',
    'findNext',
    'applyIndent',
    'fileNameFor',
  ]) {
    assert.equal(typeof E[fn], 'function', `${fn} must be a function`);
  }
});

test('countStats handles empty, single and multiline text', () => {
  same(E.countStats(''), { lineCount: 0, words: 0, chars: 0 });
  same(E.countStats('a'), { lineCount: 1, words: 1, chars: 1 });
  same(E.countStats('a b\nc'), { lineCount: 2, words: 3, chars: 5 });
  same(E.countStats('   '), { lineCount: 1, words: 0, chars: 3 });
});

test('lineNumbers counts every line including the first', () => {
  same(E.lineNumbers(''), []);
  same(E.lineNumbers('a'), ['1']);
  same(E.lineNumbers('a\nb\nc'), ['1', '2', '3']);
  same(E.lineNumbers('\n\n'), ['1', '2', '3']);
});

test('history records, undoes and redoes', () => {
  const h = E.createHistory('a');
  assert.equal(h.current(), 'a');
  assert.equal(h.canUndo(), false);
  h.push('b');
  h.push('c');
  assert.equal(h.current(), 'c');
  assert.equal(h.undo(), 'b');
  assert.equal(h.undo(), 'a');
  assert.equal(h.canUndo(), false);
  assert.equal(h.undo(), null, 'undo at the start must be a no-op');
  assert.equal(h.redo(), 'b');
  assert.equal(h.redo(), 'c');
  assert.equal(h.redo(), null);
});

test('history ignores unchanged content', () => {
  const h = E.createHistory('a');
  assert.equal(h.push('a'), false);
  assert.equal(h.size(), 1);
});

test('history caps at MAX_UNDO entries', () => {
  const h = E.createHistory('');
  for (let i = 0; i < E.MAX_UNDO + 40; i++) h.push('v' + i);
  assert.equal(h.size(), E.MAX_UNDO);
});

test('a new edit after undo drops the redo branch', () => {
  const h = E.createHistory('a');
  h.push('b');
  h.push('c');
  h.undo();
  h.push('d');
  assert.equal(h.canRedo(), false);
  assert.equal(h.current(), 'd');
});

test('replaceAll replaces every occurrence and reports the count', () => {
  same(E.replaceAll('aXbXc', 'X', '-'), { text: 'a-b-c', count: 2 });
  same(E.replaceAll('aaa', 'a', ''), { text: '', count: 3 });
  same(E.replaceAll('abc', 'z', '-'), { text: 'abc', count: 0 });
  same(E.replaceAll('abc', '', '-'), { text: 'abc', count: 0 }, 'empty search must not loop');
});

test('findAll returns non-overlapping offsets', () => {
  same(E.findAll('abcabc', 'abc'), [
    { start: 0, end: 3 },
    { start: 3, end: 6 },
  ]);
  same(E.findAll('aaaa', 'aa'), [
    { start: 0, end: 2 },
    { start: 2, end: 4 },
  ]);
  same(E.findAll('abc', 'z'), []);
  same(E.findAll('abc', ''), []);
});

test('findNext wraps around to the first hit', () => {
  const text = 'ab ab ab';
  same(E.findNext(text, 'ab', 0), { start: 0, end: 2 });
  same(E.findNext(text, 'ab', 1), { start: 3, end: 5 });
  same(E.findNext(text, 'ab', 7), { start: 0, end: 2 }, 'must wrap');
  assert.equal(E.findNext(text, 'zz', 0), null);
});

test('applyIndent inserts two spaces for a collapsed cursor', () => {
  const r = E.applyIndent('ab', 1, 1, false);
  assert.equal(r.value, 'a  b');
  assert.equal(r.start, 3);
  assert.equal(r.end, 3);
});

test('applyIndent indents every line of a selection', () => {
  const r = E.applyIndent('a\nb', 0, 3, false);
  assert.equal(r.value, '  a\n  b');
});

test('applyIndent outdents a block by two spaces', () => {
  const r = E.applyIndent('  a\n  b', 0, 7, true);
  assert.equal(r.value, 'a\nb');
});

test('fileNameFor maps the language to an extension', () => {
  assert.equal(E.fileNameFor('js', 'mein-skript'), 'mein-skript.js');
  assert.equal(E.fileNameFor('md', 'notiz.txt'), 'notiz.md');
  assert.equal(E.fileNameFor('unbekannt', 'x'), 'x.txt');
  assert.equal(E.fileNameFor('css'), 'document.css');
});
