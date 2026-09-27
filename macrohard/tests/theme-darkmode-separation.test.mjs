import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Dark mode and the colour presets are two different things, and the UI said
 * "Theme" for both.
 *
 * What the code actually does (checked, not assumed):
 *   html.ocean / .forest / .mono / .ignite  -> colour palettes, all light
 *   html[data-theme="dark"]                 -> a full dark colour scheme
 *
 * They are two separate layers and they compose: dark surfaces plus a
 * palette accent. That is the right model. The problem is what dark mode
 * overrode.
 *
 * Measured in Chromium 2026-09-26 with class="ocean" and data-theme="dark":
 *
 *   ocean, light        --accent  #0066cc   --accent-2 #00ccff
 *   ocean + dark        --accent  #4a8aff   --accent-2 #ffd400
 *   forest + dark       --accent  #4a8aff   --accent-2 #ffd400
 *   forest, light       --accent  #2d6a4f
 *
 * html.ocean and html[data-theme="dark"] have the SAME specificity (0,1,1),
 * and data-theme comes later in the file, so dark wins. Choosing a palette in
 * dark mode therefore changed nothing about the accent colour — the button
 * promises a visible change and delivers none.
 *
 * Fix: dark mode sets surfaces, ink and shadows only. The accent belongs to
 * the palette (or the default), and the default dark accent is defined so
 * that a dark desktop without a chosen palette still reads correctly.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

/*
 * Read a rule block. The selector arrives already escaped for a regex —
 * callers pass 'html\\.ocean', not 'html.ocean' — so escaping it again here
 * would produce a literal backslash and match nothing. That mistake cost a
 * full round of false reds.
 */
function block(selector) {
  const pat = selector.includes('\\')
    ? selector
    : selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`${pat}\\s*\\{([^}]*)\\}`).exec(css);
  return m ? m[1] : null;
}

test('precondition: dark mode and the palettes are separate rules', () => {
  assert.ok(block('html\\.ocean'), 'the ocean palette must exist');
  assert.ok(block('html\\[data-theme="dark"\\]'), 'the dark scheme must exist');
  assert.match(app, /dataset\.theme\s*=\s*'dark'/, 'the dark mode is driven by data-theme');
  // The palette is applied through setColorScheme(), not by assigning
  // className directly — that is the change that makes reset safe.
  assert.match(
    app,
    /function setColorScheme\(name\)/,
    'palettes must go through a helper, not a raw className assignment',
  );
});

test('dark mode does not hijack the palette accent colour', () => {
  const dark = block('html\\[data-theme="dark"\\]');
  assert.ok(dark, 'the dark block must exist');
  assert.doesNotMatch(
    dark,
    /--accent\s*:/,
    'dark mode must not define --accent: with equal specificity it overrides ' +
      'html.ocean etc., so choosing a palette in dark mode silently did nothing',
  );
  assert.doesNotMatch(
    dark,
    /--accent-2\s*:/,
    'the secondary accent belongs to the palette as well',
  );
});

test('dark mode still owns the surfaces, ink and shadows', () => {
  const dark = block('html\\[data-theme="dark"\\]');
  for (const prop of ['--ink', '--paper', '--surface', '--muted', '--line', '--tb']) {
    assert.match(dark, new RegExp(`${prop}\\s*:`), `dark mode must still set ${prop}`);
  }
  assert.match(dark, /--shadow/, 'dark mode needs its own shadow colour');
});

test('a dark desktop without a chosen palette still has a readable accent', () => {
  // Since dark no longer sets --accent, the :root default is used. That default
  // was tuned for a light surface, so it needs a dark counterpart that applies
  // when no palette class is present.
  assert.match(
    css,
    /html\[data-theme="dark"\]\s*\{[^}]*--accent/,
    'a dark accent default must exist, otherwise dark mode loses its accent entirely',
  );
});

test('the dark accent default does not override a chosen palette', () => {
  // :not() keeps the specificity honest: the fallback applies only when no
  // palette is selected, so html.ocean still wins for the accent.
  assert.match(
    css,
    /html\[data-theme="dark"\]\s*(?::not\(\.(?:ignite|ocean|forest|mono)\))?/,
    'the fallback must be scoped so a chosen palette takes precedence',
  );
  const pal = block('html\\.ocean');
  assert.match(pal, /--accent\s*:/, 'the palette must define the accent');
});

test('the UI names the two things differently', () => {
  // "Theme" for both is what made this feel mixed up. The dark mode switch is
  // a display mode, the palettes are colour schemes.
  assert.match(app, /Dunkles Design/, 'the dark mode control must be named as such');
  assert.match(
    app,
    /Farbschema|Farbpaletten|Paletten/,
    'the palette section must be named as colour schemes',
  );
});

test('the dark mode control shows the real state when Settings opens', () => {
  // Found via screenshot: with forest + dark active, the "Dunkles Design"
  // checkbox rendered UNCHECKED while the desktop was plainly dark. The mode
  // can be toggled from the taskbar, the context menu and Ctrl+Shift+L, so the
  // control has to read the state on open, not a hardcoded default.
  assert.match(
    app,
    /stDarkEl\.checked\s*=\s*document\.documentElement\.dataset\.theme === 'dark'/,
    'the dark checkbox must mirror data-theme when the settings pane builds',
  );
  assert.doesNotMatch(
    app,
    /<input type="checkbox" id="stDark"\s+checked>/,
    'the dark checkbox must not be hardcoded to checked in the markup',
  );
});

test('no settings checkbox is hardcoded to a default that can drift', () => {
  // The same class of bug: the desktop-icons, grid and scanlines controls were
  // all `checked` in the markup, so opening Settings after changing the
  // setting elsewhere showed the opposite of reality.
  for (const id of ['stDark', 'stScan', 'stGrid', 'stShowIcons']) {
    assert.doesNotMatch(
      app,
      new RegExp(`<input type="checkbox" id="${id}"\\s+checked>`),
      `${id} must not be hardcoded to checked — it must mirror the real state`,
    );
  }
  assert.match(app, /stScan\.checked\s*=\s*document\.documentElement\.classList\.contains\('scanlines'\)/);
  assert.match(app, /showIconsEl\.checked\s*=\s*!isDesktopIconsHidden\(\)/);
  assert.match(app, /gridEl\.checked\s*=/);
});

test('the display state is restored at boot, not when Settings opens', () => {
  // The real defect: the restore block lived at the end of buildSettings(), so
  // a stored dark mode was applied the first time the user opened Settings.
  // A dark desktop came up light and only turned dark on visiting the
  // settings window. Verified in Chromium: os_dark='1' plus os_theme='forest'
  // in localStorage produced dataset.theme='' and the default accent after a
  // reload.
  assert.match(
    app,
    /function restoreAppearance\(\)/,
    'there must be a dedicated boot restore',
  );
  const boot = /addEventListener\(\s*'DOMContentLoaded'[\s\S]{0,300}restoreAppearance\(\)/.exec(
    app,
  );
  assert.ok(boot, 'restoreAppearance must run on DOMContentLoaded');
  // It must run before initShell so the desktop paints dark immediately.
  const order = /restoreAppearance\(\);([\s\S]{0,120})initShell\(\)/.exec(app);
  assert.ok(
    order,
    'restoreAppearance must run BEFORE initShell, otherwise the first paint is light',
  );
  // And buildSettings must no longer apply anything.
  const bs = app.slice(
    app.indexOf('function buildSettings()'),
    app.indexOf('function refreshUI()'),
  );
  assert.doesNotMatch(
    bs,
    /localStorage\.getItem\('os_dark'\)/,
    'buildSettings must read state, not apply it — that was the bug',
  );
  assert.doesNotMatch(
    bs,
    /classList\.add\('scanlines'\)/,
    'buildSettings must not turn scanlines on as a side effect of opening',
  );
});

test('restoreAppearance covers every persisted display preference', () => {
  const fn = app.slice(
    app.indexOf('function restoreAppearance()'),
    app.indexOf('/* About Dialog */'),
  );
  for (const key of ['os_dark', 'os_scan', 'os_theme']) {
    assert.match(fn, new RegExp(key), `${key} must be restored at boot`);
  }
  assert.match(
    fn,
    /prefers-color-scheme: dark/,
    'without a stored preference the OS setting decides',
  );
  assert.match(fn, /storeGet\(/, 'reads go through the storage facade');
});

test('reset removes only the palettes, not every class on <html>', () => {
  assert.doesNotMatch(
    app,
    /documentElement\.className\s*=\s*''/,
    "a blanket className='' wipes classes other modules may have added",
  );
  // The palette list is named once, and both reset paths go through it.
  const list = /const COLOR_SCHEMES = \[([^\]]*)\]/.exec(app);
  assert.ok(list, 'the palette list must exist in one place');
  for (const scheme of ['ignite', 'ocean', 'forest', 'mono']) {
    assert.match(
      list[1],
      new RegExp(`'${scheme}'`),
      `${scheme} must be listed so reset can remove it`,
    );
  }
  assert.match(
    app,
    /function resetAppearance\(\)/,
    'a dedicated reset helper keeps the two reset buttons in step',
  );
  const calls = [...app.matchAll(/resetAppearance\(\)/g)].length;
  assert.ok(
    calls >= 3,
    `both reset buttons must call it (definition + 2 call sites), found ${calls}`,
  );
});

test('the About dialog and the system info report the same version', () => {
  // Found while looking at the theming: the About dialog hardcoded 2.11.45
  // while the system info reported 2.11.49. Two places, two answers.
  const def = /const APP_VERSION = '([^']+)'/.exec(app);
  assert.ok(def, 'there must be a single version constant');
  const version = def[1];
  // The About dialog concatenates APP_VERSION into its markup; match the
  // concatenation rather than an exact literal, so refactoring the string
  // does not break the check.
  assert.match(
    app,
    /Version ' \+\s*\n\s*APP_VERSION \+/,
    'the About dialog must read the version constant',
  );
  assert.match(
    app,
    /addRow\('OS', 'MakerOS v' \+ APP_VERSION/,
    'the system info must read it too',
  );
  // No other VERSION literal may exist. Restrict the pattern to plausible
  // release versions so IP addresses like 007.54.54 and 1.82.33 in comments
  // do not trip it.
  const literals = [...app.matchAll(/(?<![\d.])2\.\d{1,3}\.\d{1,4}(?![\d.])/g)]
    .map((m) => m[0])
    .filter((v) => v !== version);
  assert.deepEqual(
    literals,
    [],
    `no other release version literal may exist in app.js: ${literals.join(', ')}`,
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  assert.equal(version, pkg, `APP_VERSION must match package.json (${pkg})`);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(
    manifest.version,
    pkg,
    `manifest.json must match package.json too (manifest said ${manifest.version})`,
  );
});
