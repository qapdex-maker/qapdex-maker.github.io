#!/usr/bin/env node
// deploy-hygiene.js — Pre-Push-Check für qapdex-maker.github.io.
// Prüft Portal (Root) + macrohard (OS) + msgraph/react.
// Exit 1 = blockieren.
//
// Regeln:
//  - Babel transpile ok (macrohard/app.js, msgraph/react/app.jsx)
//  - relative Pfade (kein absolutes /assets oder /data)
//  - manifest.json hat siteVersion + buildDate + version
//  - sw.js hat Cache-Version und Fallback
//  - git local HEAD == remote main
//
// Usage: node deploy-hygiene.js   (aus Repo-Root)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MACROHARD = path.join(ROOT, 'macrohard');
const REACT = path.join(ROOT, 'msgraph', 'react');
const JSMOL = path.join(ROOT, 'jsmol');
// jsmol/ ist ein Vendor-Deploy mit hunderten Dateien. Ohne Budget wandert der
// naechste data-Dump (39 MB im Original) unbemerkt mit. 60 MB ist grosszuegig
// ueber dem aktuellen Stand (49 MB), eng genug um einen Unfall zu stoppen.
const JSMOL_BUDGET_MB = 60;
let fail = 0;
const failm = (m) => { console.log('  FAIL: ' + m); fail++; };
const ok = (m) => console.log('  ok:   ' + m);
// A tool problem must be visible without blocking. A gate that cries wolf
// trains you to skip it — and then it is skipped the one time it is right.
let warnCount = 0;
const warnm = (m) => { console.log('  WARN: ' + m); warnCount++; };

console.log('=== Phase 5 Deploy-Hygiene (Portal + macrohard + msgraph/react) ===');

// 1. Babel — macrohard/app.js (kein JSX, nur Syntax-Check)
try {
  const appJs = fs.readFileSync(path.join(MACROHARD, 'assets', 'app.js'), 'utf8');
  // Syntax-Check via Node
  new Function(appJs);
  ok('macrohard/app.js Syntax-Check OK');
} catch (e) { failm('macrohard/app.js Syntax: ' + e.message); }

// Babel — msgraph/react/app.jsx
// This check used to be: require('@babel/standalone').transform(...)
// @babel/standalone is a BROWSER bundle and is not in package.json, so the
// require throws MODULE_NOT_FOUND on any clean checkout and the gate blocked
// the push for a missing tool rather than for broken code. The working Termux
// recipe (documented in the msgraph-react-evolution skill) is to fetch
// babel.min.js from unpkg, evaluate it, and read .exports.
//
// A tool problem must never block a deploy, so this is an async function that
// resolves to a status and only records a FAIL for real code problems.
function checkBabel() {
  const jsxPath = path.join(REACT, 'assets', 'app.jsx');
  if (!fs.existsSync(jsxPath)) return { status: 'skip', msg: 'app.jsx nicht vorhanden' };
  const c = fs.readFileSync(jsxPath, 'utf8');
  return new Promise((resolve) => {
    let Babel = null;
    try {
      Babel = require('@babel/standalone');
    } catch (e) {
      // Not installed — the expected case on this machine. Fetch the browser
      // build and evaluate it, which is what the skill documents.
      const https = require('https');
      const url = 'https://unpkg.com/@babel/standalone@7/babel.min.js';
      let currentUrl = url;
      const followHttp = (u) => {
        currentUrl = u;
        return https.get(u, (res) => {
        // unpkg answers 302 and points at the versioned CDN path. One level of
        // redirect is followed; measured, a 302 is what a healthy request
        // returns here, so treating it as a failure would skip a working check.
        let hops = 0;
        const follow = (r) => {
          if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
            hops++;
            if (hops > 3) {
              r.resume();
              resolve({ status: 'warn', msg: 'Redirect-Schleife bei ' + url });
              return;
            }
            r.resume();
            // The Location header is a PATH ("/@babel/standalone@7.29.9/..."),
            // not an absolute URL. https.get rejects it with ERR_INVALID_URL.
            // Resolve against the URL that produced it.
            let nextUrl;
            try {
              nextUrl = new URL(r.headers.location, currentUrl).href;
            } catch (e) {
              resolve({ status: 'warn', msg: 'Location unbrauchbar: ' + r.headers.location });
              return;
            }
            followHttp(nextUrl);
            return;
          }
          if (r.statusCode !== 200) {
            r.resume();
            resolve({ status: 'warn', msg: 'unpkg HTTP ' + r.statusCode });
            return;
          }
          let b = '';
          r.setEncoding('utf8');
          r.on('data', (d) => (b += d));
          r.on('end', () => {
            try {
              const m = { exports: {} };
              new Function('module', 'exports', b)(m, m.exports);
              resolve({ status: 'got', Babel: m.exports });
            } catch (e) {
              resolve({ status: 'warn', msg: 'babel.min.js nicht auswertbar: ' + e.message });
            }
          });
        };
          follow(res);
        })
        .on('error', (e) => resolve({ status: 'warn', msg: 'kein Netz: ' + e.message }))
        .setTimeout(15000, () => resolve({ status: 'warn', msg: 'Download-Timeout' }));
      };
      followHttp(url);
      return;
    }
    resolve({ status: 'got', Babel: Babel });
  }).then((r) => {
    if (r.status === 'skip') return ok('msgraph/react ' + r.msg + ' (skip)');
    if (r.status === 'warn') return warnm('msgraph/react Babel: SKIP — ' + r.msg);
    if (!r.Babel || typeof r.Babel.transform !== 'function') {
      return warnm('msgraph/react Babel: SKIP — kein transform verfügbar');
    }
    try {
      r.Babel.transform(c, { presets: ['react'] });
      ok('msgraph/react/app.jsx Babel transpile OK');
    } catch (e) {
      // A real problem in the JSX — this one DOES block.
      failm('msgraph/react/app.jsx Babel transpile: ' + e.message);
    }
  });
}

// 2. relative Pfade — macrohard
const macroIndex = fs.readFileSync(path.join(MACROHARD, 'index.html'), 'utf8');
const macroAppJs = fs.readFileSync(path.join(MACROHARD, 'assets', 'app.js'), 'utf8');
if (/(href|src)="\/assets/.test(macroIndex) || /fetch\(['"]\/data/.test(macroAppJs)) failm('macrohard: absoluter /assets- oder /data-Pfad gefunden (relativ nötig)');
else ok('macrohard: keine absoluten /assets-/data-Pfade');

// relative Pfade — msgraph/react (nur wenn vorhanden)
if (fs.existsSync(path.join(REACT, 'index.html'))) {
  const reactIdx = fs.readFileSync(path.join(REACT, 'index.html'), 'utf8');
  const reactJsx = fs.readFileSync(path.join(REACT, 'assets', 'app.jsx'), 'utf8');
  if (/(href|src)="\/assets/.test(reactIdx) || /fetch\(['"]\/data/.test(reactJsx)) failm('msgraph/react: absoluter /assets- oder /data-Pfad gefunden');
  else ok('msgraph/react: keine absoluten /assets-/data-Pfade');
}

// 3. sw.js Prüfung — macrohard
const swJs = fs.readFileSync(path.join(MACROHARD, 'sw.js'), 'utf8');
// The cache name is the full dotted version (macrohard-v2-11-50). An earlier
// version of this check was /macrohard-v\d['"]/ — exactly one digit — so it
// never matched and the gate reported a missing cache version for several
// releases. The cache was versioned the whole time; the check was wrong.
const cacheName = /CACHE\s*=\s*['"]macrohard-v([\d]+(?:[.-][\d]+)*)['"]/.exec(swJs);
if (cacheName) {
  const inName = cacheName[1];
  ok('macrohard/sw.js: Cache-Version vorhanden (' + inName + ')');
  // The cache name and package.json must agree, otherwise returning visitors
  // keep a stale app.js. This is the check that actually protects the deploy.
  const pkgVersion = JSON.parse(
    fs.readFileSync(path.join(MACROHARD, 'package.json'), 'utf8'),
  ).version;
  if (inName.split(/[.-]/).join('.') === pkgVersion) {
    ok('macrohard/sw.js: Cache-Version == package.json (' + pkgVersion + ')');
  } else {
    failm(
      'macrohard/sw.js: Cache-Version ' + inName + ' != package.json ' + pkgVersion,
    );
  }
} else failm('macrohard/sw.js: Cache-Version fehlt oder falsch');
if (/(stale-while-revalidate|network-first|cache-first)/.test(swJs)) ok('macrohard/sw.js: Strategien definiert');
else failm('macrohard/sw.js: keine Fetch-Strategie gefunden');
if (/FALLBACK/.test(swJs) || /Offline/.test(swJs)) ok('macrohard/sw.js: Offline-Fallback vorhanden');
else failm('macrohard/sw.js: Offline-Fallback fehlt');

// 4. manifest.json — macrohard
try {
  const m = JSON.parse(fs.readFileSync(path.join(MACROHARD, 'manifest.json'), 'utf8'));
  if (!m.siteVersion) { m.siteVersion = m.version || '0.0.0'; m.buildDate = m.buildDate || new Date().toISOString().slice(0,10); fs.writeFileSync(path.join(MACROHARD, 'manifest.json'), JSON.stringify(m, null, 2) + '\n'); ok('macrohard/manifest.json: siteVersion=' + m.siteVersion + ' buildDate=' + m.buildDate + ' (auto-fix)'); }
  else { ok('macrohard/manifest.json siteVersion=' + m.siteVersion); }
  if (!m.buildDate) { m.buildDate = new Date().toISOString().slice(0,10); fs.writeFileSync(path.join(MACROHARD, 'manifest.json'), JSON.stringify(m, null, 2) + '\n'); ok('macrohard/manifest.json buildDate=' + m.buildDate + ' (auto-fix)'); }
  else ok('macrohard/manifest.json buildDate=' + m.buildDate);
  if (!m.version) failm('macrohard/manifest.json version fehlt');
  else ok('macrohard/manifest.json version=' + m.version);
} catch (e) { failm('macrohard/manifest.json Parse: ' + e.message); }

// 5. ami-bios-setup.html prüft
const amiPath = path.join(MACROHARD, 'assets', 'ami-bios-setup.html');
if (fs.existsSync(amiPath)) {
  const ami = fs.readFileSync(amiPath, 'utf8');
  if (/<iframe/i.test(ami) || /sandbox/i.test(ami)) ok('macrohard/assets/ami-bios-setup.html: iframe/sandbox vorhanden');
  else ok('macrohard/assets/ami-bios-setup.html: existiert (iframe optional)');
} else failm('macrohard/assets/ami-bios-setup.html nicht gefunden');

// 6. git sync
try {
  const head = execSync('git rev-parse HEAD').toString().trim();
  const remote = execSync('gh api repos/qapdex-maker/qapdex-maker.github.io/commits/main --jq .sha').toString().trim();
  if (head === remote) ok('git local == remote (sauberer Stand)');
  else { console.log('  WARN: lokaler HEAD != remote (unpushte Commits) — Push zuerst.'); }
} catch (e) { console.log('  WARN: git-Remote-Check fehlgeschlagen: ' + e.message); }

// 5b. jsmol/ — Vendor-Deploy. Die Pflichtdateien sind der Unterschied
// zwischen "Viewer laeuft" und "weisse Flaeche mit Lade-Ewigkeit".
if (fs.existsSync(JSMOL)) {
  const REQUIRED = [
    'index.html', 'JSmol.min.js',
    'j2s/Jmol.properties', 'j2s/core/corejmol.z.js', 'j2s/core/corescript.z.js',
  ];
  for (const rel of REQUIRED) {
    if (fs.existsSync(path.join(JSMOL, rel))) ok('jsmol/' + rel + ' vorhanden');
    else failm('jsmol/' + rel + ' FEHLT — der Viewer kann sich nicht aufbauen');
  }
  // Das Kernverzeichnis muss neben JSmol.min.js liegen: Jmol laedt es ueber
  // j2sPath relativ zur Seite, ein Verschieben in einen Unterordner stillt
  // den Viewer lautlos (gemessen am 2026-10-02: Canvas bleibt leer, keine
  // Fehlermeldung).
  if (fs.existsSync(path.join(JSMOL, 'j2s', 'core'))) ok('jsmol/j2s/core liegt neben JSmol.min.js');
  else failm('jsmol/j2s/core fehlt oder liegt verschoben — j2sPath ist relativ zur Seite');

  // Relative Pfade: eine Subpage mit absolutem /j2s laeuft unter
  // qapdex-maker.github.io/jsmol/ nicht.
  const jIdx = fs.readFileSync(path.join(JSMOL, 'index.html'), 'utf8');
  if (/src="\/jsmol|href="\/jsmol/.test(jIdx)) failm('jsmol/index.html: absoluter /jsmol-Pfad (relativ nötig)');
  else ok('jsmol/index.html: relative Pfade');

  // Jeder Eintrag in der STRUCTURES-Liste muss real im Repo liegen.
  const files = [...jIdx.matchAll(/'(data\/[^']+)'/g)].map((m) => m[1]);
  let missing = 0;
  for (const f of new Set(files)) {
    if (!fs.existsSync(path.join(JSMOL, f))) { failm('jsmol/' + f + ' in index.html gelistet, aber nicht vorhanden'); missing++; }
  }
  if (!missing) ok('jsmol: alle ' + new Set(files).size + ' gelisteten Strukturdateien vorhanden');

  // Budget
  const { execSync: ex } = require('child_process');
  let mb = 0;
  try {
    mb = parseFloat(ex(`du -sm "${JSMOL}" | cut -f1`).toString().trim());
    if (mb > JSMOL_BUDGET_MB) failm('jsmol/ ist ' + mb + ' MB — Budget ' + JSMOL_BUDGET_MB + ' MB überschritten');
    else ok('jsmol/ Budget: ' + mb + ' MB / ' + JSMOL_BUDGET_MB + ' MB');
  } catch (e) { warnm('jsmol/ Budget nicht messbar: ' + e.message); }
} else {
  ok('jsmol/ nicht vorhanden (skip)');
}

function finish() {
  if (warnCount) {
    console.log('  (' + warnCount + ' WARN — Werkzeugproblem, kein Codefehler)');
  }
  console.log(
    fail
      ? '\nRESULT: ' + fail + ' FAILURE(S) ❌ — Push blockiert'
      : '\nRESULT: Deploy-Hygiene sauber ✅ — push erlaubt',
  );
  process.exit(fail ? 1 : 0);
}

// The Babel check is async (it may fetch the compiler). Nothing may report a
// result before it settles, and the exit code must include its verdict.
checkBabel().then(finish, (e) => {
  failm('msgraph/react Babel: unerwarteter Fehler — ' + e.message);
  finish();
});
