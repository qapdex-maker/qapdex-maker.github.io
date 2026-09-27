import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Die PWA hatte kein Icon — manifest.json fuehrte "icons": [], und index.html
 * referenzierte keins. Der Browser fragte trotzdem /favicon.ico an und bekam
 * 404; sichtbar nur im Serverlog, also ein Fehler, den niemand bemerkt hat,
 * bis jemand den Log gelesen hat.
 *
 * Zwei Dinge sind hier festgenagelt, weil beide schon still zurueckfallen
 * koennen:
 *
 *   1. manifest.json braucht Icons, und die Dateien muessen wirklich
 *      existieren. Ein Eintrag, der auf eine nicht vorhandene Datei zeigt,
 *      ist schlechter als keiner: die Installation schlaegt dann sichtbar fehl.
 *   2. index.html braucht ein <link rel="icon">. Ohne das fragt der Browser
 *      /favicon.ico an, und der Pfad muss dann auch real sein.
 *
 * Beide Richtungen: fehlende Datei und leere Liste schlagen an.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('das Manifest fuehrt Icons, und die Dateien liegen wirklich da', () => {
  assert.ok(
    Array.isArray(manifest.icons) && manifest.icons.length >= 2,
    `"icons" ist leer — das ist der Zustand, den es vor diesem Fix gab`,
  );
  for (const ic of manifest.icons) {
    assert.ok(ic.src, 'ein Icon-Eintrag ohne src');
    // './assets/icon-192.png' relativ zum Repo-Root aufloesen.
    const rel = ic.src.replace(/^\.\//, '');
    const p = path.join(root, rel);
    assert.ok(fs.existsSync(p), `Icon-Datei fehlt: ${rel}`);
    assert.ok(
      fs.statSync(p).size > 0,
      `Icon-Datei ist leer: ${rel}`,
    );
    // 192 und 512 sind die Groessen, die die PWA-Installationskriterien
    // verlangen. Ein 32er-Icon allein gilt als "nicht installierbar".
    const m = /(\d+)x(\d+)/.exec(ic.sizes || '');
    assert.ok(m, `keine Groessenangabe bei ${rel}`);
    assert.ok(
      Number(m[1]) >= 192,
      `${rel} ist ${ic.sizes} — unter 192px ist die PWA nicht installierbar`,
    );
  }
});

test('die Icon-Dateien sind keine 1x1-Platzhalter', () => {
  // Ein 0-Byte- oder 1x1-PNG gilt als "vorhanden" und ist nutzlos. Geprueft
  // wird die PNG-Signatur und die tatsaechliche Pixelgroesse.
  //
  // Die Mindestgroessen unterscheiden sich, und das ist Absicht: apple-touch
  // ist nach Apple-Konvention 180x180, die beiden Manifest-Icons sind 192 und
  // 512. Der erste Entwurf verlangte pauschisch >= 192 und schlug deshalb
  // an der korrekten Datei an — nicht umgekehrt.
  const expected = {
    'assets/icon-192.png': 192,
    'assets/icon-512.png': 512,
    'assets/apple-touch-icon.png': 180,
  };
  for (const [rel, size] of Object.entries(expected)) {
    const buf = fs.readFileSync(path.join(root, rel));
    assert.deepEqual(
      [...buf.subarray(0, 8)],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      `${rel} ist keine PNG (Signatur falsch)`,
    );
    // IHDR Breite bei Byte 16..19, Hoehe 20..23.
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    assert.equal(w, size, `${rel} ist ${w}x${h}, erwartet ${size}x${size}`);
    assert.equal(h, size, `${rel} ist ${w}x${h}, erwartet quadratisch ${size}x${size}`);
  }
});

test('index.html verlinkt das Favicon, und der Pfad existiert', () => {
  const m = /<link[^>]*rel="icon"[^>]*>/i.exec(html);
  assert.ok(m, 'index.html hat kein <link rel="icon"> — /favicon.ico wird 404');
  const href = /href="([^"]+)"/.exec(m[0]);
  assert.ok(href, 'rel="icon" ohne href');
  const rel = href[1].replace(/^\.\//, '');
  assert.ok(
    fs.existsSync(path.join(root, rel)),
    `index.html verweist auf ${rel}, die Datei fehlt`,
  );
});

test('der Service Worker precacht die Icons', () => {
  // Ohne das ist die installierte PWA offline ohne Symbol: der generische
  // Zweig in sw.js antwortet dann mit 503 auf das Icon.
  const list = /const STATIC_ASSETS=\[([^\]]*)\]/.exec(sw);
  assert.ok(list, 'STATIC_ASSETS nicht gefunden');
  assert.match(list[1], /icon-192\.png/, 'icon-192 fehlt in der Precache-Liste');
  assert.match(list[1], /icon-512\.png/, 'icon-512 fehlt in der Precache-Liste');
});

test('die Icon-Quelle ist versioniert, nicht nur die Derivate', () => {
  // Eine .ico ist ein Binärcontainer ohne lesbaren Diff. Damit die Änderung
  // nachvollziehbar bleibt, liegt die Quelle als SVG daneben.
  const p = path.join(root, 'assets', 'icon-source.svg');
  assert.ok(fs.existsSync(p), 'assets/icon-source.svg fehlt — ohne Quelle ist das Icon nicht reproduzierbar');
  const svg = fs.readFileSync(p, 'utf8');
  assert.match(svg, /<svg/, 'icon-source.svg ist kein SVG');
});
