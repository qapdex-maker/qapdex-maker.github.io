import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const lines = source.split('\n');

const ctxIdx = lines.findIndex((l) => /function showFileContextMenu\(/.test(l));
const ctxBody = ctxIdx === -1 ? '' : lines.slice(ctxIdx, ctxIdx + 90).join('\n');

test('the Explorer file menu actually opens the file', () => {
  // Regression: "Öffnen" only did toast('Öffne: ' + f). The virtual FS stored
  // bare name strings, so there was no content to show and nothing to save.
  // Measured in Chromium before the fix: the context menu offered
  // open/rename/copy/move/delete and clicking "open" produced nothing but the
  // toast "Öffne: index.html".
  assert.ok(ctxIdx !== -1, 'showFileContextMenu must exist');
  assert.match(
    ctxBody,
    /act === 'open'[\s\S]{0,120}openExplorerFile\(/,
    'the open action must call openExplorerFile, not just toast the name',
  );
  assert.doesNotMatch(
    ctxBody,
    /act === 'open'[\s\S]{0,80}toast\('Öffne/,
    'the open action must not be a toast-only placeholder',
  );
});

test('a double click on a file opens it', () => {
  // Measured before the fix: dispatching dblclick on .feFile did nothing.
  const renderIdx = lines.findIndex((l) => /function renderExplorer\(/.test(l));
  assert.ok(renderIdx !== -1, 'renderExplorer must exist');
  const fileLoop = lines.slice(renderIdx, renderIdx + 260).join('\n');
  assert.match(
    fileLoop,
    /feFile[\s\S]{0,400}addEventListener\(\s*'dblclick'[\s\S]{0,120}openExplorerFile\(/,
    'a double click on a file tile must open it',
  );
});

test('the virtual FS stores file bodies, not just names', () => {
  assert.match(
    source,
    /const fsContent = \{\}/,
    'a content store next to fsData must exist',
  );
  assert.match(
    source,
    /fsContent\[key\]\s*=/,
    'opening a file must seed or read its body',
  );
});

test('openExplorerFile routes by extension and writes back on save', () => {
  const openIdx = lines.findIndex((l) => /function openExplorerFile\(/.test(l));
  assert.ok(openIdx !== -1, 'openExplorerFile must exist');
  const body = lines.slice(openIdx, openIdx + 70).join('\n');

  assert.match(body, /EXPLORER_IMAGE_EXT/, 'images must be routed');
  assert.match(body, /openApp\('notepad'\)/, 'text must land in the notepad');
  assert.match(body, /dataset\.fsKey\s*=/, 'the editor must learn which file it edits');
  assert.match(
    body,
    /__explorerSave[\s\S]{0,400}fsContent\[a\.dataset\.fsKey\]\s*=\s*a\.value/,
    'saving must write the body back into the virtual FS',
  );
});

test('the notepad save button also persists to the virtual FS', () => {
  const saveIdx = lines.findIndex((l) => /id === 'npSaveBtn'|getElementById\('npSaveBtn'\)/.test(l));
  assert.ok(saveIdx !== -1, 'the notepad save button must exist');
  const body = lines.slice(saveIdx, saveIdx + 25).join('\n');
  assert.match(
    body,
    /__explorerSave/,
    'the save button must call the explorer save path for explorer-opened files',
  );
});

test('save handles a missing fsKey instead of writing undefined', () => {
  // A notepad that was not opened from the explorer has no dataset.fsKey.
  // Writing fsContent[undefined] would poison the store.
  const openIdx = lines.findIndex((l) => /__explorerSave = function/.test(l));
  assert.ok(openIdx !== -1, 'the save handler must exist');
  const body = lines.slice(openIdx, openIdx + 12).join('\n');
  assert.match(
    body,
    /if \(!a \|\| !a\.dataset\.fsKey\) return false/,
    'the save handler must bail out when no file is bound',
  );
});
