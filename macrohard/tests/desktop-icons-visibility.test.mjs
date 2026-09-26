import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Desktop icons can be hidden, for a desktop that looks tidy.
 *
 * The requirement had a trap in it: hiding the only icon column leaves no
 * visible way to bring it back, because the context menu that offers the
 * toggle is reached by right-clicking the desktop — which is fine — but the
 * Settings checkbox alone would mean clearing the preference by hand in
 * localStorage. So there must be at least two independent ways back.
 *
 * Reachability while hidden is part of the contract, not a detail: the start
 * menu, Ctrl+K search and the taskbar must still open the apps.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');

test('precondition: the desktop icon column exists', () => {
  assert.match(css, /#deskIcons\{/, '#deskIcons must exist in the stylesheet');
  assert.match(app, /getElementById\('deskIcons'\)/, 'app.js must reach the icon column');
});

test('the hidden state has a CSS rule that actually hides it', () => {
  assert.match(
    css,
    /#deskIcons\.hidden\s*\{\s*display:\s*none/,
    'the .hidden class must remove the icon column from the layout',
  );
});

test('the toggle is reachable from the desktop context menu', () => {
  assert.match(
    app,
    /data-action="toggle-icons"/,
    'the context menu must offer the toggle — it is the primary way back',
  );
  assert.match(
    app,
    /act === 'toggle-icons'/,
    'the context menu action must be wired to a handler',
  );
});

test('the toggle is also reachable from Settings', () => {
  assert.match(app, /id="stShowIcons"/, 'Settings needs the checkbox');
  assert.match(
    app,
    /setDesktopIconsHidden\(\s*!document\.getElementById\('stShowIcons'\)\.checked\s*\)/,
    'the Settings checkbox must drive the same function as the context menu',
  );
});

test('the context menu label reflects the current state', () => {
  // A menu that always says "ausblenden" while the icons are already hidden
  // is a small lie that makes the feature feel broken.
  assert.match(app, /id="deskCtxIconLabel"/, 'the label needs an id to be updated');
  assert.match(
    app,
    /Desktop-Icons anzeigen/,
    'there must be a label for the restore action',
  );
  assert.match(
    app,
    /Desktop-Icons ausblenden/,
    'there must be a label for the hide action',
  );
  assert.match(
    app,
    /label\.textContent\s*=\s*desktopIconsHidden[\s\S]{0,200}anzeigen[\s\S]{0,200}ausblenden/,
    'the label must flip with the state',
  );
});

test('the preference persists and is restored on boot', () => {
  assert.match(
    app,
    /storeSet\(\s*'os_icons'/,
    'the state must be written through the storage facade, not localStorage directly',
  );
  assert.match(app, /storeGet\(\s*'os_icons'\s*\)/, 'the state must be read back');
  assert.match(
    app,
    /function restoreDesktopIcons\(\)/,
    'a dedicated restore function keeps the boot path readable',
  );
  assert.match(
    app,
    /restoreDesktopIcons\(\);/,
    'the restore must actually be called at boot',
  );
  // It must run after initDesktop, otherwise #deskIcons does not exist yet and
  // the class is applied to nothing.
  const boot = /initShell\(\);[\s\S]{0,200}initDesktop\(\);[\s\S]{0,200}restoreDesktopIcons\(\);/.exec(
    app,
  );
  assert.ok(boot, 'restoreDesktopIcons must run after initDesktop');
});

test('the default is visible, so a fresh install shows icons', () => {
  assert.match(
    app,
    /let desktopIconsHidden = false/,
    'the default must be icons shown',
  );
  // os_icons is '0' when hidden, so a missing key means shown.
  assert.match(
    app,
    /if \(v === '0'\) setDesktopIconsHidden\(true\)/,
    'only an explicit "0" may hide the icons',
  );
});

test('os_icons is importable and restorable via Settings', () => {
  const keys = /SETTINGS_IMPORT_KEYS = \[([^\]]*)\]/.exec(app);
  assert.ok(keys, 'the import whitelist must exist');
  assert.match(
    keys[1],
    /'os_icons'/,
    'os_icons belongs in the import whitelist so an exported config round-trips',
  );
});

test('the state query helper exists and is used', () => {
  assert.match(app, /function isDesktopIconsHidden\(\)/, 'a read accessor avoids stale flags');
  assert.match(app, /isDesktopIconsHidden\(\)/, 'it must actually be used');
});

test('hiding the icons does not disable the other app launchers', () => {
  // The whole point is a tidy desktop, not a broken one. The start menu and
  // the global search must be untouched by this feature.
  assert.match(app, /#startMenu|smHeader/, 'the start menu must still exist');
  assert.match(app, /function globalSearch|smSearch/, 'global search must still exist');
  assert.doesNotMatch(
    css,
    /#startMenu[^{]*\.hidden\s*\{[^}]*display:\s*none[^}]*\}[^@]*#startMenu/,
    'the icon rule must not touch the start menu',
  );
});
