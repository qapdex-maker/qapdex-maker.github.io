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
