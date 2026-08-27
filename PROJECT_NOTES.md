# PROJECT_NOTES — qapdex-maker.github.io (Portal + msgraph/react)

Stand: 2026-08-27 (Session mit Hermes/idun). Wissensstand, nicht push-pflichtig.
Letztes Push-Tip: af610d0. Lokaler HEAD: c5e6f40 (9 ungepushte Commits seit af610d0).
Detaillierter Fahrplan + tiefe Bereiche: siehe ROADMAP.md (im Repo-Root).

## Architektur
- User-Page: Repo `qapdex-maker/qapdex-maker.github.io`, Branch `main`, Root-Veröffentlichung.
- Portal-Root `index.html` = neo-brutalist (Kobalt #2547ff + Gelb #ffd400, Space Grotesk/IBM Plex,
  harte 3px-Borders + 4px-Schlagschatten, IGNITE-Toggle, Cursor-Trail, Scanlines, DE/EN-Toggle).
- `msgraph/` = VANILLA-Prototyp (veraltet, NICHT mehr verlinkt — nur noch als Datei vorhanden).
- `msgraph/react/` = AKTIVE, portal-designige Version (React 18 UMD + @babel/standalone im Browser,
  KEIN schwerer Build). Das ist die Karte "Graph Metadata Hub" im Portal.

## msgraph/react — Komponenten
- `index.html`: lädt Portal-Fonts + `assets/site.css`, React/ReactDOM/Babel von unpkg, JSX als
  externes `assets/app.jsx` (type="text/babel"). Babel transpiliert das sauber (verifiziert).
- `assets/app.jsx`: React-App. Tabs: Hub / Reference / Console / Permissions / Breaking Radar.
  - i18n DE/EN über `I18N`-Objekt. Default DE. Sprache persistiert in `localStorage('msgraph_lang')`
    (Lazy-Init im useState + useEffect schreibt zurück) und setzt `<html lang>`.
  - IGNITE-Toggle (Klasse `html.ignite`).
  - Cursor-Trail + Scanlines als Micro-Interactions.
  - Reference nutzt Web Worker (`assets/worker.js`) + virtualisierte Liste (nur sichtbare Zeilen).
- `assets/worker.js`: parst `data/index.*.json` off-main-thread.
- `assets/site.css`: Portal-Design, auf React-Klassen gemappt. Wichtig: `.refrow{flex-wrap}`,
  `.pth{min-width:0;overflow-wrap:anywhere}`, `.card{overflow:hidden}` — verhindert Text-Overflow
  aus Kacheln. Mobile (@max-width:760px): `.nav` als horizontale Scroll-Leiste (darf NICHT
  `display:none` sein — sonst Tabs auf Mobile unerreichbar!).
- Daten: `data/manifest.json`, `data/index.v1.0.json` (1387 Pfade), `data/index.beta.json` (2870),
  `data/deprecations.v1.0.json`, `data/deprecations.beta.json`.
  Sync-Quelle: `~/github/repo/metadata-msgraph` (Fork von microsoftgraph/msgraph-metadata,
  Schema 1.4.711.0, Stand 2026-08-26).

## Kritische Bugs (behoben, nicht vergessen)
1. **Worker relative fetch → 404-JSON-Parse-Fehler.** Fix: absolute URLs an Worker.
   Commits: 0aa9367 (Fix), 68e7d1f (Design), 21e68df (Overflow).
2. **Worker onmessage Stale-Guard.** `variantRef` immer aktuell.
3. **Text overflow aus Kacheln.** flex-wrap + min-width:0 + ellipsis + overflow:hidden + rowHeight 58.
4. **[2026-08-27] Sprachmix bei wiederholtem DE/EN-Wechsel.** Mehrere Härte-DE-Literale im Code
   schalteten nie mit `lang`: Reference-Status/Zähler/"Treffer:"/Tab-Labels, Radar-Filter-Buttons +
   "Entfernung:", Console-NL-Gründe. Fix: ALLE sichtbaren Texte in I18N-Maps (de/en), Routing über `t`.
   Commits: cc4a6b6 (Kacheln/Console-Dropdown), ee5814a (i18n-Konsolidierung + Stale-Closure #5).
5. **[2026-08-27] Reference-Status-Stale-Closure.** `setStatus(statusText)` war in alter `lang`-
   Closure eingefroren → nach Sprachwechsel blieb Worker-Text in alter Sprache. Fix: Status nur als
   `{kind,n}` in State, Ableitung aus `t` bei jedem Render. (ee5814a)
6. **[2026-08-27] Console-Ergebnistext eingefroren.** `ep.meta` als String gespeichert (Initial
   "Aktueller Benutzer"). Fix: `epMeta(ep)` leitet sprachabhängig zur Laufzeit ab (kind: cur|nl|data).
   Commit: 81996bb.
7. **[2026-08-27] Sprach-Toggle zeigte immer "EN".** Fix: Button zeigt Zielsprache (`lang==='en'?t.de:t.en`).
   Toter `const Active`-Code entfernt. Commit: 46e4ad7.
8. **[2026-08-27] Mobile-Nav `display:none`.** Tabs auf <760px unerreichbar. Fix: `.nav` als
   Scroll-Leiste. Commit: a820e06.
9. **[2026-08-27] selfhost.os-Beschreibung enthielt "Neo-brutalist archive".** Aus beiden Stellen
   (sichtbarer `<p>` + `data-de`/`data-en` + JS `desc`) entfernt → nur "Stack-Builder für
   Self-hosted Anwendungen". Commit: af610d0.
10. **[2026-08-27, Phase 1] Portal-Kategorie-Filter kaputt.** `pages`-Objekte hatten nur
    `catLabel` (Anzeige), aber KEIN `cat`-Feld. Filter `p.cat===filter` verglich gegen
    `undefined` → Klick auf "Self-hosted App"/"Dev Tools" zeigte 0 Karten (nur All/Soon
    funktionierten). Bewiesen per Node-Sim (vor Fix: 0/0 Karten, nach Fix: 3/3).
    Fix: `cat:'Self-hosted App'` bzw. `cat:'Dev Tools'` bzw. `cat:'soon'` zu jeder Karte.
    Noch NICHT gepusht (lokaler HEAD c5e6f40 + Fix). Verifiziert lokal: alle Chips OK,
    github.com-Hrefs via gh api 200, lokale Subpages (idun/, msgraph/react/) HTTP 200.

## Verifikation (echte Calls, nicht behauptet)
- Tip local==remote nach jedem Push via `gh api ... --jq '.sha'`.
- Live HTTP 200 + curl-grep auf Fix-Marker (selectEndpoint, epMeta, cur_user, order:3, etc.).
- Pure-Funktionen (nlMap/epMeta/Status-Enum) in Node logikgetestet (kein "undefined", beide Locales).
- Kein Headless-Browser auf Termux → DOM-Rendering nicht sehend geprüft; JSX-Transpile
  (@babel/standalone, gleich wie Browser) als Korrektheits-Proxy.

## Bug-Hunting (2026-08-27, echte Checks, nicht behauptet)
Re-Check aller 9 dokumentierten Bugs + Regressions-Screen. Alle GRÜN.
- Babel: app.jsx transpiliert sauber (Syntax-Proxy). ✅
- i18n de/en parity: status (removed/soon/planned) deckt alle Daten-Status; nl_reasons
  (teams/mails/calendar/onedrive/photo/default) deckt alle nlMap-Keys. Kein setStatus(),
  keine harten DE-Literale. ✅
- Mobile: keine `.nav{display:none}` in site.css (Scroll-Leiste <760px). ✅
- Worker-fetch: Page → absolute URLs (base + data/*.json), Worker fetcht nur `file` aus
  postMessage. ✅
- Overflow: flex-wrap + min-width:0 + overflow-wrap:anywhere + .card overflow:hidden;
  VirtList rowHeight=58px. ✅
- Lokal HTTP-Ready: index.html/app.jsx/site.css/worker.js/manifest.json/index*.json/
  deprecations.beta.json → alle 200. ✅
- Skill-Checker `verify-i18n.js` war veraltet (crashte an JSX-Werten in I18N-Map +
  falsche nl_reasons-Struktur). Im Skill auf JSX-sicheres Brace-Scanning + echte
  I18N.de/I18N.en-Trennung umgeschrieben. Läuft jetzt sauber (i18n clean ✅).

## Phase 2 — Daten-Frische (2026-08-27, verifiziert, kein Fix nötig)
- metadata-msgraph: lokal HEAD db0e9c6 == remote (gh api). KEINE neuen Commits upstream.
- Portal-Index-Counts stimmen exakt mit OpenAPI-Quelle überein:
  v1.0 = 1387 Pfade (openapi/v1.0/openapi.yaml), beta = 2870 (openapi/beta/openapi.yaml).
  → Portal-Daten aktuell bezüglich Quelle, kein Re-Sync nötig.
- manifest.json: schemaVersion 1.4.711.0, syncDate 2026-08-26 (passt zu Quell-Stand
  2026-08-25/26). CSDL-Schema Version="4.0".
- deprecations-Status-Enum: Daten nutzen nur {removed, planned, soon}; Code-Enum
  (I18N.de/en.status) deckt alle ab. card-Klasse mappt removed/soon/planned korrekt.
- Fazit: Phase 2 ohne Änderung abgeschlossen — Daten sind frisch + konsistent.

## Offen / Nicht gebaut
- Phase 7 "justbash Sandbox" in der Console: pnpm-Browser-Bundle nur auf Desktop baubar
  (Termux/Bionic blockt native Module wie node-liblzma/@mongodb-js/zstd). Deferred.
- Kein echter Graph-Live-Mode (braucht Azure-Tenant-Token + App-Registration). Nur Metadaten/Recherche.
- NL→Graph ist lokale Heuristik; echte LLM-Bridge via idun-multi ist Phase 4 (Backend/Key nötig).

## Deploy-Regel (HART, vom User)
- Pushen/Deploy zu GitHub Pages NUR auf Auftrag ("Bescheid"/"uebertragen"). Lokal bauen+prüfen OK.
- Relative Pfade unter /msgraph/react/ (./assets, ./data); Spec-URL darf absolut (raw.githubusercontent).
- /tmp auf Termux READ-ONLY → http.server NICHT nach /tmp loggen.

## Quick-Reference (WICHTIG für nächste Sessions)
- **i18n-Regel:** JEDER sichtbare Text MUSS über `I18N[lang]` (de/en) laufen. Niemals Härte-DE
  im JSX-Render oder in Initial-State-Strings. Nach jedem Sprachwechsel darf KEIN Literal in
  alter Sprache hängen bleiben (Stale-Closure-Risiko → ableitend aus `t` rendern, nicht speichern).
- **Mobile:** `.nav` darf niemals `display:none` sein.
- **selfhost.os:** keine "Neo-brutalist"-Wortmarke in Beschreibungen.
- Babel-Transpile-Check: `node -e 'require("@babel/standalone").transform(fs.readFileSync("assets/app.jsx","utf8"),{presets:["react"]})'`
