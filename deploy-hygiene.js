#!/usr/bin/env node
// deploy-hygiene.js — Pre-Push-Check für qapdex-maker.github.io (msgraph/react).
// Führt die Phase-5-Hygieneregeln automatisch aus. Exit 1 = blockieren.
//
// Regeln:
//  - Babel transpile ok
//  - i18n clean (verify-i18n.js im Skill)
//  - relative Pfade in index.html/app.jsx (./assets, ./data) — absolutes /assets /data verboten
//  - Spec-URL darf absolut sein (raw.githubusercontent)
//  - manifest.json hat siteVersion + buildDate
//  - git local HEAD == remote main (sonst verkorkster Push)
//
// Usage: node deploy-hygiene.js   (aus Repo-Root)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REACT = path.join(ROOT, 'msgraph', 'react');
let fail = 0;
const failm = (m) => { console.log('  FAIL: ' + m); fail++; };
const ok = (m) => console.log('  ok:   ' + m);

console.log('=== Phase 5 Deploy-Hygiene ===');

// 1. Babel
try {
  const c = fs.readFileSync(path.join(REACT, 'assets', 'app.jsx'), 'utf8');
  require('@babel/standalone').transform(c, { presets: ['react'] });
  ok('Babel transpile ok');
} catch (e) { failm('Babel: ' + e.message); }

// 2. i18n (Skill-Checker)
const skill = path.join(process.env.HOME, '.hermes/profiles/idun/skills/web-ui-verification-no-browser/scripts/verify-i18n.js');
if (fs.existsSync(skill)) {
  try { execSync('node "' + skill + '" "' + REACT + '"', { stdio: 'inherit' }); }
  catch { failm('i18n-Checker meldet Fehler (siehe oben)'); }
} else failm('verify-i18n.js Skill nicht gefunden: ' + skill);

// 3. relative Pfade (kein absolutes /assets oder /data im JSX/HTML)
const idx = fs.readFileSync(path.join(REACT, 'index.html'), 'utf8');
const jsx = fs.readFileSync(path.join(REACT, 'assets', 'app.jsx'), 'utf8');
if (/(href|src)="\/assets/.test(idx) || /fetch\(['"]\/data/.test(jsx)) failm('absoluter /assets- oder /data-Pfad gefunden (muss relativ sein)');
else ok('keine absoluten /assets-//data-Pfade (relativ)');

// 4. Spec-URL absolut erlaubt?
if (/raw\.githubusercontent\.com/.test(jsx)) ok('Spec-URL absolut (raw.githubusercontent) erlaubt');
else failm('keine absolute Spec-URL — Reference "rohe Spec" bricht');

// 5. manifest siteVersion + buildDate
const m = JSON.parse(fs.readFileSync(path.join(REACT, 'data', 'manifest.json'), 'utf8'));
if (!m.siteVersion) failm('manifest.siteVersion fehlt — Version-Bump nötig');
else ok('manifest.siteVersion = ' + m.siteVersion);
if (!m.buildDate) failm('manifest.buildDate fehlt'); else ok('manifest.buildDate = ' + m.buildDate);

// 6. git sync
try {
  const head = execSync('git rev-parse HEAD').toString().trim();
  const remote = execSync('gh api repos/qapdex-maker/qapdex-maker.github.io/commits/main --jq .sha').toString().trim();
  if (head === remote) ok('git local == remote (sauberer Stand)');
  else { console.log('  WARN: lokaler HEAD != remote (unpushte Commits) — Push zuerst.'); }
} catch (e) { console.log('  WARN: git-Remote-Check fehlgeschlagen: ' + e.message); }

console.log(fail ? ('\nRESULT: ' + fail + ' FAILURE(S) ❌ — Push blockiert') : '\nRESULT: Deploy-Hygiene sauber ✅ — push erlaubt');
process.exit(fail ? 1 : 0);
