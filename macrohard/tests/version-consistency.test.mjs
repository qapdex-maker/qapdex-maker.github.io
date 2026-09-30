import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const packageData = JSON.parse(read('package.json'));
const version = packageData.version;

test('package version is the single release version source', () => {
  assert.match(version, /^2\.11\.\d+$/);
  // app.js used to hardcode the version in two places (the About dialog and
  // the system info) which drifted apart. It now reads one APP_VERSION
  // constant; this test makes sure that constant is the package version.
  const def = /const APP_VERSION = '([^']+)'/.exec(read('assets/app.js'));
  assert.ok(def, 'app.js must define a single APP_VERSION constant');
  assert.equal(
    def[1],
    version,
    `APP_VERSION (${def[1]}) must equal package.json (${version})`,
  );
  assert.match(read('index.html'), new RegExp(version.replaceAll('.', '\\.')));
  // No other release literal may survive in app.js.
  const others = [...read('assets/app.js').matchAll(/(?<![\d.])2\.\d{1,3}\.\d{1,4}(?![\d.])/g)]
    .map((m) => m[0])
    .filter((v) => v !== version);
  assert.deepEqual(others, [], `stale version literals in app.js: ${others.join(', ')}`);
});

/*
 * Gefunden am 2026-09-30 über ein Foto vom Gerät: die Fußzeile des Startmenüs
 * zeigte "v2.11.49", die Seite war 2.11.53.
 *
 * Sie stand als festes Literal in index.html und hat vier Release-Bumps
 * überlebt. Der Test oben hat sie NICHT gefunden: `assert.match(index.html, …)`
 * prüft nur, dass die Version irgendwo vorkommt — das
 * <meta name="makeros-version"> erfüllt das. Eine zweite, veraltete Angabe
 * im selben File fällt durch.
 *
 * Deshalb zwei zusätzliche Zusicherungen: kein Literal mehr in index.html,
 * und die Fußzeile bezieht ihre Version aus APP_VERSION.
 */
test('the start-menu footer reads its version from APP_VERSION', () => {
  const html = read('index.html');
  assert.match(
    html,
    /id="smFooterVersion"/,
    'die Fußzeile braucht eine eigene Node für die Version',
  );
  assert.doesNotMatch(
    html,
    /v\d+\.\d+\.\d+/,
    'in index.html darf keine Version als Literal stehen — sie kam bei vier ' +
      'Releases nicht mit. Quelle der Wahrheit ist APP_VERSION.',
  );
  // Auch kein Initialwert im Span: sonst ist er beim nächsten Bump eine
  // veraltete Angabe, die der Literal-Scan oben meldet. Genau das ist beim
  // 2.11.54-Bump passiert, nachdem der Fix schon gruen war.
  assert.match(
    html,
    /<span id="smFooterVersion"><\/span>/,
    'der Span muss leer sein — app.js fuellt ihn beim Boot aus APP_VERSION',
  );
  assert.match(
    read('assets/app.js'),
    /smFooterVersion[\s\S]{0,140}APP_VERSION/,
    'app.js muss #smFooterVersion aus APP_VERSION befüllen',
  );
});

test('no stale version literal survives in any shipped file', () => {
  // `(?<![\d.])` / `(?![\d.])` halten IPs und Uhrzeiten aus dem Raster.
  const re = /(?<![\d.])2\.\d{1,3}\.\d{1,4}(?![\d.])/g;
  for (const file of ['index.html', 'assets/app.js', 'assets/site.css']) {
    const stale = [
      ...new Set([...read(file).matchAll(re)].map((m) => m[0])),
    ].filter((v) => v !== version);
    assert.deepEqual(
      stale,
      [],
      `${file} enthält veraltete Versionsliterale: ${stale.join(', ')}`,
    );
  }
});

test('manifest version matches the release', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(
    manifest.version,
    version,
    `manifest.json said ${manifest.version}, package.json says ${version}`,
  );
});

test('service worker cache contains the release version', () => {
  assert.match(read('sw.js'), new RegExp(`macrohard-v${version.replaceAll('.', '-')}`));
});
