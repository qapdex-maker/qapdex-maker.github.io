import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = source.split('\n');

const notesStart = lines.findIndex((l) => /function buildNotes\(\)/.test(l));
const renderList = lines.findIndex((l) => /function renderList\(/.test(l));
const renderTags = lines.findIndex((l) => /function renderTags\(/.test(l));
const renderPreview = lines.findIndex((l) => /function renderPreview\(/.test(l));

test('notes render helpers are all defined', () => {
  for (const [name, idx] of [
    ['renderList', renderList],
    ['renderTags', renderTags],
    ['renderPreview', renderPreview],
  ]) {
    assert.ok(idx !== -1, `${name} must be defined`);
  }
  for (const idx of [renderList, renderTags, renderPreview]) {
    assert.ok(idx > notesStart, 'render helpers must live inside buildNotes');
  }
});

test('notes never calls a bare render()', () => {
  // The notes body is bounded by the next app-level function after buildNotes.
  const next = lines.findIndex(
    (l, i) =>
      i > renderPreview && /^\s{2}(function|var|let|const)\s/.test(l) && !/^\s{4}/.test(l),
  );
  const end = next === -1 ? notesStart + 800 : next;
  assert.ok(end > renderPreview, 'must locate the end of the notes body');
  const offenders = lines
    .slice(notesStart, end)
    .map((l, i) => [i + notesStart + 1, l])
    .filter(([, l]) => /(?<![.\w])render\(\)/.test(l))
    .map(([n, l]) => `${n}: ${l.trim()}`);
  assert.deepEqual(offenders, [], 'notes must call renderList() instead of render()');
});

test('notes tag filter keeps notes that carry the selected tag', () => {
  const start = lines.findIndex((l) => /function renderList\(/.test(l));
  const body = lines.slice(start, start + 20).join('\n');
  assert.match(
    body,
    /if \(filterTag && \(n\.tags \|\| \[\]\)\.indexOf\(filterTag\) === -1\) return false;/,
    'tag filter must exclude only notes without the tag',
  );
});
