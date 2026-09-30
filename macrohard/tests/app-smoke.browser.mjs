// Smoke-Test: startet JEDE App im echten Browser und prueft, dass sie rendert.
//
// WAS DIESER TEST FINDET — und was nicht:
//
// FINDET: eine App, die beim Oeffnen wirft (Console-Error), ein Fenster,
// das sich nicht schliessen laesst, eine Instanz, die nach dem Schliessen
// stehen bleibt, ein leeres Wbody.
//
// FINDET NICHT: Buttons, die klickbar aussehen und nichts tun. Am
// 2026-09-30 gegengeprueft: mdBold entverdrahtet -> Smoke bleibt GRUEN. Das
// war der Original-Bug (10 tote Docs-Knöpfe), und dieser Test haette ihn nicht
// gesehen. Dafuer braucht es Verhaltenstests je Bedienelement; siehe
// `verify`-Skripte bzw. den Duplicate-ID-Audit im Skill.
//
// Warum das trotzdem noetig ist: `grep -rE "chromium|puppeteer|playwright"`
// ueber tests/ und .github/ liefert NULL Treffer. Kein Test startet eine App im
// Browser — alle 330 sind Quelltext- oder Logik-Assertions. Genau deshalb
// blieb der Duplicate-ID-Bug vom 2026-09-30 gruen: vier Apps waren im Browser
// kaputt, kein Test wurde rot.
//
// Aufruf (lokal, nicht in der CI — der Runner hat kein Chromium):
//   cd macrohard
//   python3 -m http.server 8123 &
//   node tests/app-smoke.browser.mjs
//   node tests/app-smoke.browser.mjs http://localhost:8123
//
// Erwartet: "SMOKE: ALLE 25 APPS OK" und Exit 0.
//
// Gegenbeweis (Pflicht, sonst ist der Test blind): den close-Klick in
// CLOSE_ALL zur No-Op machen und laufen lassen — dann 26 Fehlschlaege.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TARGET = process.argv[2] || 'http://localhost:8123/index.html';
const CHROME = process.env.PREFIX + '/lib/chromium/chrome';

const APPS = [
  'notepad', 'calculator', 'terminal', 'explorer', 'paint', 'browser', 'music',
  'chat', 'docs', 'settings', 'links', 'amibios', 'taskmgr', 'sysinfo',
  'calendar', 'clock', 'colorpicker', 'pwgen', 'qrgen', 'viewer', 'game',
  'editor', 'imgeditor', 'pomodoro', 'notes',
];

/** Apps ohne eigenen Text im Host-DOM (iframe — innerText ist dort korrekt 0). */
const IFRAME_APPS = new Set(['amibios']);

/** Apps, deren Fenster-Id ein Instanz-Suffix bekommt (`w-notepad-inst-1`). */
const MULTI_INSTANCE = new Set(['notepad', 'terminal', 'editor']);

/**
 * Alle Fenster einer App schliessen — muss ueber den Praefix gehen, nicht
 * ueber `w-<app>`.
 *
 * Gefunden am 2026-09-30: der erste Smoke-Lauf meldete am Ende 5 Rest-Fenster.
 * Isoliert nachgemessen: das Terminal schliesst korrekt, jede Instanz einzeln
 * und alle zusammen. Der Fehler lag im Test — `document.getElementById('w-terminal')`
 * trifft bei zwei Instanzen keine Node, also wurde gar nichts geklickt.
 *
 * Die Konstante MULTI_INSTANCE stand hier bereits und wurde nie benutzt.
 */
const CLOSE_ALL = (app) =>
  `(function(){
     const ws = Array.from(document.querySelectorAll('[id^="w-${app}"]'));
     ws.forEach(w => { const c = w.querySelector('.wclose'); if (c) c.click(); });
     return ws.length;
   })()`;

/**
 * Fenster zaehlen, die zu einer App gehoeren.
 *
 * Multi-Instanz-Apps (notepad, terminal, editor) bekommen `w-<app>-inst-N`.
 * Fuer sie ist `document.getElementById('w-' + app)` ein toter Lookup — es
 * gibt keine solche Node. Deshalb zaehlt der Smoke ueber den Praefix, und
 * `MULTI_INSTANCE` haelt fest, welche Apps das betrifft (nur Doku — die
 * Praefix-Abfrage gilt fuer alle und ist damit fuer jede App korrekt).
 */
const COUNT_WINDOWS = (app) =>
  `document.querySelectorAll('[id^="w-${app}"]').length`;

const profile = path.join(os.tmpdir(), 'makeros-smoke-' + process.pid);
fs.rmSync(profile, { recursive: true, force: true });
const port = 9400 + Math.floor(Math.random() * 400);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=412,915',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
chrome.stderr.on('data', () => {});

async function waitForChromium() {
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch {}
  }
  throw new Error('chromium kam nicht hoch');
}

async function main() {
  await waitForChromium();

  const r = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(TARGET)}`,
    { method: 'PUT' },
  );
  const target = await r.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    } else if (m.method === 'Log.entryAdded' || m.method === 'Runtime.exceptionThrown') {
      logs.push(m);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => {
        if (pending.delete(i)) rej(new Error('timeout ' + method));
      }, 30000);
    });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: `(function(){ try { return JSON.stringify((${expr})); } catch(e) { return JSON.stringify({__err:String(e)}); } })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
    try {
      return JSON.parse(r.result.value);
    } catch {
      return r.result.value;
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  // VOR dem ersten navigate: sonst hilft es nichts.
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: TARGET });

  // Aktiv warten. Eine feste Schlafzeit ist bei knappem RAM unzuverlässig.
  let booted = false;
  for (let i = 0; i < 16; i++) {
    await sleep(900);
    if ((await ev('typeof openApp')) === 'function') {
      booted = true;
      break;
    }
  }
  if (!booted) {
    console.error('FAIL: MakerOS wurde nicht bereit (openApp nicht definiert)');
    chrome.kill('SIGKILL');
    process.exit(1);
  }
  await ev('localStorage.clear()');

  // Der Session-Restore laeuft 4,2 s nach dem Boot und kann Fenster aus einer
  // vorherigen Sitzung oeffnen — auch noch, nachdem localStorage leer ist,
  // weil saveSession() bei jedem Close schreibt. Vorher gemessen mit 2 s und
  // einem Leck von 1: restoreSession() kam danach. Also bis 7 s warten, das
  // sind Boot 4,2 s plus Restore, und erst dann die Baseline nehmen.
  await sleep(7000);
  const baseline = await ev(`({
    wnd: document.querySelectorAll('.wnd').length,
    icons: document.querySelectorAll('.tbIcon').length,
    ids: Array.from(document.querySelectorAll('.wnd')).map(w=>w.id)
  })`);
  console.log(
    `Baseline nach Boot: ${baseline.wnd} Fenster, ${baseline.icons} Icons` +
      (baseline.ids.length ? ` -> ${JSON.stringify(baseline.ids)}` : ''),
  );
  // Alles schliessen, was der Restore angelegt hat. Sonst zaehlt es als Leck.
  if (baseline.wnd > 0) {
    await ev(`Array.from(document.querySelectorAll('.wnd')).forEach(w => {
      const c = w.querySelector('.wclose'); if (c) c.click();
    })`);
    await sleep(800);
    const after = await ev(`document.querySelectorAll('.wnd').length`);
    console.log(`Restore-Fenster geschlossen: ${after} verbleibend`);
    if (after !== 0) {
      console.log('WARNUNG: Restore-Fenster liess sich nicht schliessen');
      baseline.wnd = after;
    }
  }

  let bad = 0;
  for (const app of APPS) {
    logs.length = 0;

    const openErr = await ev(
      `(function(){try{openApp('${app}');return null;}catch(e){return String(e);}})()`,
    );
    await sleep(450);
    // Zweiter Aufruf: deckt den Reopen-Zweig ab.
    const reopenErr = await ev(
      `(function(){try{openApp('${app}');return null;}catch(e){return String(e);}})()`,
    );
    await sleep(350);

    const first = await ev(`(function(){
      const w = document.getElementById('w-${app}') ||
                document.querySelector('[id^="w-${app}"]');
      const b = w && w.querySelector('.wbody');
      return { win: !!w, len: b ? b.innerText.trim().length : -1, id: w ? w.id : null };
    })()`);

    await ev(CLOSE_ALL(app));
    // 200 ms nach .closing braucht der Remove. Wer sofort zaehlt, misst das
    // geschlossene Fenster noch (steht im Skill unter Close-Button). Bei den
    // Multi-Instanz-Apps kam es dadurch zu w-notepad-inst-4 am Ende des Laufs:
    // der Knoten existierte noch, war aber zum Wegklicken nicht mehr da.
    await sleep(700);
    const gone = (await ev(COUNT_WINDOWS(app))) === 0;

    await ev(`(function(){try{openApp('${app}');}catch(e){}})()`);
    await sleep(450);
    const second = await ev(`(function(){
      const w = document.getElementById('w-${app}') ||
                document.querySelector('[id^="w-${app}"]');
      const b = w && w.querySelector('.wbody');
      return { len: b ? b.innerText.trim().length : -1 };
    })()`);

    await ev(CLOSE_ALL(app));
    await sleep(700);

    const errs = logs.filter(
      (l) =>
        l.method === 'Runtime.exceptionThrown' ||
        (l.method === 'Log.entryAdded' &&
          l.params.entry.level === 'error' &&
          !/ERR_FAILED|Failed to load resource/.test(l.params.entry.text)),
    ).length;

    const hasContent = second.len > 0 || IFRAME_APPS.has(app);
    // Für Multi-Instanz-Apps ist zusaetzlich wichtig, dass nach dem
    // Zuschliessen KEINE Instanz uebrig bleibt — der Bug am 2026-09-30
    // war genau das, und er ist nur ueber den Praefix sichtbar.
    const leftovers = await ev(COUNT_WINDOWS(app));
    const ok = !openErr && !reopenErr && first.win && gone && errs === 0 && hasContent && leftovers === 0;
    if (!ok) bad++;
    console.log(
      `${ok ? 'OK  ' : 'FEHL'} ${app.padEnd(12)} body ${String(first.len).padEnd(6)} -> ` +
        `${String(second.len).padEnd(6)} close:${gone} rest:${leftovers} errors:${errs}` +
        (openErr ? ` open:${openErr}` : '') +
        (reopenErr ? ` reopen:${reopenErr}` : ''),
    );
  }

  const finalWindows = await ev(`document.querySelectorAll('.wnd').length`);
  const finalIcons = await ev(`document.querySelectorAll('.tbIcon').length`);
  console.log(
    `\nEnde: ${finalWindows} Fenster, ${finalIcons} Icons ` +
      `(Baseline war ${baseline.wnd}/${baseline.icons})`,
  );
  // Vergleich mit der Baseline, nicht mit 0: der Session-Restore darf Fenster
  // oeffnen, das ist kein Leck des Smokes.
  if (finalWindows > baseline.wnd || finalIcons > baseline.icons) {
    const leakIds = await ev(
      `Array.from(document.querySelectorAll('.wnd')).map(w=>w.id)`,
    );
    console.log('LECK: ' + JSON.stringify(leakIds));
    bad++;
  }

  console.log(bad === 0 ? '\nSMOKE: ALLE 25 APPS OK' : `\nSMOKE: ${bad} PROBLEM(E)`);
  return bad === 0;
}

let ok = false;
try {
  ok = await main();
} catch (e) {
  console.error('FEHLER:', e.message);
} finally {
  chrome.kill('SIGKILL');
  // Das Profil liegt sonst als scoped_dir in usr/tmp — 8 MB pro Lauf.
  fs.rmSync(profile, { recursive: true, force: true });
}
process.exit(ok ? 0 : 1);
