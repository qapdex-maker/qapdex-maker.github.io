import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'assets', 'editor-adapter.js'), 'utf8');

test('editor modules load before app.js and in dependency order', () => {
  const editor = index.indexOf('assets/js/editor.js');
  const ui = index.indexOf('assets/editor-adapter.js');
  const appJs = index.indexOf('assets/app.js');
  assert.ok(editor !== -1, 'editor.js must be referenced');
  assert.ok(ui !== -1, 'editor-adapter.js must be referenced');
  assert.ok(editor < ui, 'editor.js (logic) must load before the adapter');
  assert.ok(ui < appJs, 'both must load before app.js');
});

test('buildEditor is now a thin delegation', () => {
  const match = app.match(/function buildEditor\(\) \{[\s\S]*?\n  \}/);
  assert.ok(match, 'buildEditor must exist');
  assert.match(match[0], /window\.EditorUI/, 'buildEditor must delegate to the adapter');
  assert.ok(
    match[0].length < 200,
    `buildEditor must stay tiny, got ${match[0].length} chars`,
  );
});

test('adapter exposes EditorUI and uses the tested core', () => {
  assert.match(adapter, /global\.EditorUI = EditorUI;/);
  assert.ok(adapter.includes('global.EditorCore'), 'adapter must use EditorCore');
  assert.ok(adapter.includes('Core.'), 'adapter must delegate to the core helpers');
});

test('editor no longer calls blocking prompt dialogs', () => {
  const uiStart = adapter.indexOf('function EditorUI()');
  const body = adapter.slice(uiStart);
  assert.doesNotMatch(body, /[^.\w]prompt\(/, 'search and replace must not call prompt()');
  assert.ok(adapter.includes('edSearchBox'), 'search overlay must exist');
});

test('font size selector always gets a change handler', () => {
  const uiStart = adapter.indexOf('function EditorUI()');
  const body = adapter.slice(uiStart);
  const idx = body.indexOf("querySelector('#edFont')");
  assert.ok(idx !== -1, 'font selector must be queried');
  const after = body.slice(idx);
  const outsideIf = after.indexOf("edFontBtn.addEventListener('change'");
  assert.ok(outsideIf !== -1, 'change handler must be registered outside the create-if-missing branch');
});

test('dead syntax highlighting is gone', () => {
  assert.doesNotMatch(app, /function updateSyntax\(\)/, 'updateSyntax stub must be removed');
  assert.doesNotMatch(app, /Simple highlight: wrap keywords in span - disabled/);
});
