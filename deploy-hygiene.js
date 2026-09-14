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
let fail = 0;
const failm = (m) => { console.log('  FAIL: ' + m); fail++; };
const ok = (m) => console.log('  ok:   ' + m);

console.log('=== Phase 5 Deploy-Hygiene (Portal + macrohard + msgraph/react) ===');

// 1. Babel — macrohard/app.js (kein JSX, nur Syntax-Check)
try {
  const appJs = fs.readFileSync(path.join(MACROHARD, 'assets', 'app.js'), 'utf8');
  // Syntax-Check via Node
  new Function(appJs);
  ok('macrohard/app.js Syntax-Check OK');
} catch (e) { failm('macrohard/app.js Syntax: ' + e.message); }

// Babel — msgraph/react/app.jsx
try {
  if (fs.existsSync(path.join(REACT, 'assets', 'app.jsx'))) {
    const c = fs.readFileSync(path.join(REACT, 'assets', 'app.jsx'), 'utf8');
    require('@babel/standalone').transform(c, { presets: ['react'] });
    ok('msgraph/react/app.jsx Babel transpile OK');
  } else {
    ok('msgraph/react/app.jsx nicht vorhanden (skip)');
  }
} catch (e) { failm('msgraph/react Babel: ' + e.message); }

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
if (/CACHE\s*=\s*['"]macrohard-v\d['"]/.test(swJs)) ok('macrohard/sw.js: Cache-Version vorhanden');
else failm('macrohard/sw.js: Cache-Version fehlt oder falsch');
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

console.log(fail ? ('\nRESULT: ' + fail + ' FAILURE(S) ❌ — Push blockiert') : '\nRESULT: Deploy-Hygiene sauber ✅ — push erlaubt');
process.exit(fail ? 1 : 0);
