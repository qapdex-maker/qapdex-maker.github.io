# PROJECT_NOTES — qapdex-maker.github.io (Portal + msgraph/react)

Stand: 2026-08-27 (Session mit Hermes/idun). Wissensstand, nicht push-pflichtig.

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
  - i18n DE/EN (Default DE) inline im `I18N`-Objekt.
  - IGNITE-Toggle (Klasse `html.ignite`, kein localStorage nötig hier).
  - Cursor-Trail + Scanlines als Micro-Interactions.
  - Reference nutzt Web Worker (`assets/worker.js`) + virtualisierte Liste (nur sichtbare Zeilen).
- `assets/worker.js`: parst `data/index.*.json` off-main-thread.
- `assets/site.css`: Portal-Design, auf React-Klassen gemappt. Wichtig: `.refrow{flex-wrap}`,
  `.pth{min-width:0;overflow-wrap:anywhere}`, `.card{overflow:hidden}` — verhindert Text-Overflow
  aus Kacheln (war ein Fix-Wunsch des Users).
- Daten: `data/manifest.json`, `data/index.v1.0.json` (1387 Pfade), `data/index.beta.json` (2870),
  `data/deprecations.v1.0.json`, `data/deprecations.beta.json`.
  Sync-Quelle: `~/github/repo/metadata-msgraph` (Fork von microsoftgraph/msgraph-metadata,
  Schema 1.4.711.0, Stand 2026-08-26).

## Kritische Bugs (behoben, nicht vergessen)
1. **Worker relative fetch → 404-JSON-Parse-Fehler.**
   `worker.js` macht relatives `fetch('data/...')` → löst gegen Worker-URL `/msgraph/react/assets/`
   auf, nicht Seite `/msgraph/react/` → traf `/msgraph/react/assets/data/*` (404 HTML) →
   `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
   Fix: `app.jsx` baut ABSOLUTE URLs aus `window.location` und übergibt sie an den Worker
   (`fileMap` mit `base + 'data/...'`). Commits: 0aa9367 (Fix), 68e7d1f (Design), 21e68df (Overflow).
   Beweis: Node-Worker-Simulation mit echtem live worker.js → ALT ok:false (gleicher Fehler wie Video),
   NEU ok:true, count:17531.
2. **Worker onmessage Stale-Guard.** Alte Closure verglich `e.data.variant === variant` (Mount-Wert)
   → beta-Antworten still ignoriert. Fix: `variantRef` immer aktuell.
3. **Text overflow aus Kacheln.** Reference-Zeilen feste Höhe 54px + nicht-umbreshbarer Pfad in
   Flex-Zeile → Schrift lief aus. Fix: flex-wrap + min-width:0 + ellipsis-Summary + Karten overflow:hidden
   + rowHeight 58px.

## Verifikation (echte Calls, nicht behauptet)
- Tip local==remote nach jedem Push via `gh api ... --jq '.sha'`.
- Live HTTP 200 auf index.html / assets/* / data/* geprüft.
- Live app.jsx/site.css via curl grep auf Fix-Marker geprüft.
- Kein Headless-Browser auf Termux → DOM-Rendering nicht sehend geprüft; JSX-Transpile
  (@babel/standalone, gleich wie Browser) als Korrektheits-Proxy.

## Offen / Nicht gebaut
- Phase 7 "justbash Sandbox" in der Console: pnpm-Browser-Bundle nur auf Desktop baubar
  (Termux/Bionic blockt native Module wie node-liblzma/@mongodb-js/zstd). Deferred.
- Kein echter Graph-Live-Mode (braucht Azure-Tenant-Token + App-Registration). Nur Metadaten/Recherche.
- NL→Graph ist lokale Heuristik; echte LLM-Bridge via idun-multi ist Phase 4 (Backend/Key nötig).

## Deploy-Regel (HART, vom User)
- Pushen/Deploy zu GitHub Pages NUR auf Auftrag ("Bescheid"/"uebertragen"). Lokal bauen+prüfen OK.
- Relative Pfade unter /msgraph/react/ (./assets, ./data); Spec-URL darf absolut (raw.githubusercontent).
- /tmp auf Termux READ-ONLY → http.server NICHT nach /tmp loggen.
