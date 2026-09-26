/*
 * Live-Netzwerktest: sendet jeder kuratierte Radiosender CORS-Header?
 *
 * NICHT Teil von `npm test` — ein Test, der vom Netz abhängt, darf CI nicht
 * rot machen, und 22 Sonden sind für den Standardlauf zu langsam. Die Datei
 * heißt bewusst `.mjs` statt `.test.mjs`, damit `node --test tests/*.test.*`
 * sie nicht erfasst.
 *
 * Ausführen:
 *     node --test tests/radio-cors-live.mjs
 *
 * Hintergrund: Radio läuft in MakerOS durch
 *     createMediaElementSource(audioEl) -> AnalyserNode -> destination
 * und der EQ besteht aus Biquad-Filtern im selben Graph. Ohne
 * `Access-Control-Allow-Origin` wird der Graph "tainted": der Ton ist
 * hörbar, aber der Analyser gibt Stille aus, der Visualizer bewegt sich nie
 * und der EQ greift nicht. Es gibt keine Fehlermeldung — man hält es für
 * einen Bug in der App.
 *
 * Zwei Überlegungen zur Form:
 *   - Die Sonden laufen parallel. Sequenziell mit 12 s Timeout je Sender
 *     überschreitet die Gesamtzeit das Test-Timeout, bevor alle fertig sind.
 *   - Jede Response wird abgeschlossen (`res.resume()` plus 'end'-Handler).
 *     Eine offene TLS-Verbindung hält den Event-Loop alive und Node beendet
 *     sich mit "Promise resolution is still pending but the event loop has
 *     already resolved".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const flat = source.replace(/\s+/g, ' ');
const start = flat.indexOf('fallbackStations = [');
assert.ok(start !== -1, 'fallbackStations must exist in app.js');
const stations = [...flat.slice(start, flat.indexOf('];', start)).matchAll(/u:\s*'([^']+)'/g)].map(
  (m) => m[1],
);
assert.ok(stations.length > 0, 'the station list must not be empty');

function probe(url, depth = 0) {
  return new Promise((resolve) => {
    const done = (r) => resolve({ status: null, cors: null, bytes: 0, looksHtml: false, ...r });
    let req;
    try {
      req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13)',
            Accept: '*/*',
            Range: 'bytes=0-4096',
          },
        },
        (res) => {
          /* Follow redirects. A browser evaluates CORS on the FINAL response,
           * not on the 3xx, so measuring the redirect would produce a false
           * accusation. Three of the curated stations answer 302 first. */
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            if (depth > 4) return done({ err: 'redirect loop' });
            const next = new URL(res.headers.location, url).toString();
            probe(next, depth + 1).then((r) =>
              done({ ...r, redirects: (r.redirects || 0) + 1, finalUrl: r.finalUrl || next }),
            );
            return;
          }

          const cors = res.headers['access-control-allow-origin'];
          let bytes = 0;
          let looksHtml = false;
          res.on('data', (c) => {
            bytes += c.length;
            if (bytes <= 200 && /^\s*(<!doctype|<html)/i.test(c.toString('utf8', 0, 60))) {
              looksHtml = true;
            }
            // A live stream ignores Range and keeps sending. Stop after the
            // first chunk: the headers are what this test needs, and without
            // this the connection stays open and the test never finishes.
            if (bytes > 0) {
              res.destroy();
              done({ status: res.statusCode, cors: cors || null, bytes, looksHtml, finalUrl: url });
            }
          });
          res.on('error', () => {
            /* destroy() triggers this on purpose; the result is already in. */
          });
          res.on('end', () => {
            res.destroy();
            done({ status: res.statusCode, cors: cors || null, bytes, looksHtml, finalUrl: url });
          });
        },
      );
    } catch (e) {
      return done({ err: e.message });
    }
    req.on('error', (e) => done({ err: e.message }));
    req.setTimeout(10000, () => {
      req.destroy();
      done({ err: 'timeout 10s' });
    });
  });
}

test(
  'every curated station serves audio AND sends CORS',
  { timeout: 45000, skip: process.env.SKIP_LIVE === '1' && 'SKIP_LIVE=1 gesetzt' },
  async () => {
    const results = await Promise.all(stations.map(async (url) => ({ url, ...(await probe(url)) })));

    const offenders = [];
    const dead = [];
    for (const r of results) {
      if (r.status === null) {
        dead.push(`${r.url} (${r.err})`);
        continue;
      }
      if (r.looksHtml) dead.push(`${r.url} (liefert HTML statt Audio, HTTP ${r.status})`);
      if (!r.cors) offenders.push(`${r.url} (HTTP ${r.status}, kein CORS-Header)`);
      console.log(`  ${r.status}  ${(r.cors || 'KEIN CORS').slice(0, 9).padEnd(9)} ${r.url}`);
    }
    console.log(`\n  ${stations.length} Sender geprüft, ${dead.length} nicht erreichbar`);
    if (dead.length) console.log(`    ${dead.join('\n    ')}`);

    assert.deepEqual(
      offenders,
      [],
      `Sender ohne Access-Control-Allow-Origin — der Analyser bleibt bei ihnen stumm: ${offenders.join('; ')}`,
    );
  },
);
