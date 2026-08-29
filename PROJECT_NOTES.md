# PROJECT_NOTES — qapdex-maker.github.io (Portal + msgraph/react)

Stand: 2026-08-29 (Session mit Hermes/idun). Wissensstand, nicht push-pflichtig.
Letztes Push-Tip == lokaler HEAD == 6021cb3 (nichts Ungepushtes offen).
Detaillierter Fahrplan + tiefe Bereiche: siehe ROADMAP.md (im Repo-Root).

## Architektur
- User-Page: Repo `qapdex-maker/qapdex-maker.github.io`, Branch `main`, Root-Veröffentlichung.
- Portal-Root `index.html` = neo-brutalist (Kobalt #2547ff + Gelb #ffd400, Space Grotesk/IBM Plex,
  harte 3px-Borders + 4px-Schlagschatten, IGNITE-Toggle, Cursor-Trail, Scanlines, DE/EN-Toggle).
- `msgraph/index.html` = nur noch eine Redirect-/Hinweisseite auf `react/` (DE/EN,
  `noindex`, canonical auf react/). Der Vanilla-Prototyp selbst ist am 28.08. gelöscht
  worden; ohne diese Seite lieferte `https://qapdex-maker.github.io/msgraph/` live
  einen 404 (am 29.08.2026 per curl verifiziert, danach behoben).
- `msgraph/react/` = AKTIVE, portal-designige Version (React 18 UMD von unpkg + aus
  `app.jsx` VORKOMPILIERTES `assets/app.js`, KEIN Babel im Browser, KEIN schwerer Build).
  Das ist die Karte "Graph Metadata Hub" im Portal.

## msgraph/react — Komponenten
- `index.html`: lädt Portal-Fonts + `assets/site.css`, React/ReactDOM (UMD) von unpkg und
  `assets/app.js`. KEIN Babel-Tag mehr (F4): `app.jsx` ist die Quelle und wird per
  `sh build_appjs.sh` zu `assets/app.js` vorkompiliert. `app.js` NIE von Hand editieren.
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

## Phase 3 — msgraph/react Vertiefung (2026-08-27, gefixt + verifiziert)
- A11y Tabs: vorher keine Tastatur-Erreichbarkeit (kein role/aria/focus-Style).
  Fix: nav role=tablist, Tabs role=tab + aria-selected/controls, Pfeil/Home/Ende
  Navigation, <main> role=tabpanel, .nav a:focus-visible Outline in CSS.
- Breaking Radar: vorher slice(0,60) → bei 1792 beta-Items 96% unsichtbar.
  Fix: volle Liste in scrollbarem .radar-scroll (max-height 520px, overflow-y).
- NL→Graph nlMap: zwei Edge-Case-Lücken geschlossen (per 9-Input-Test bewiesen):
  (a) "Profilfoto"/"Foto" → vorher /me (default), jetzt /me/photo/$value (photo).
  (b) "Team-Termine" → vorher /me/joinedTeams (teams), jetzt /me/events (calendar).
  Reihenfolge calendar vor team; + "kalender"/"e-mail"/"dateien"/"foto"/"profil".
- Verifiziert: Babel OK, i18n clean, Live-Fix-Marker (role=tablist, radar-scroll,
  foto, focus-visible) im Deploy bestätigt. Commit 1c263d7 (gepusht).

## Phase 5 — Deploy-Hygiene (2026-08-27, etabliert + verifiziert)
- Repo-weites Pre-Push-Skript `deploy-hygiene.js` (Repo-Root): prüft automatisch
  Babel, i18n (Skill-Checker), relative Pfade (kein /assets /data), absolute Spec-URL
  erlaubt, manifest.siteVersion/buildDate vorhanden, git local==remote. Exit 1 blockiert.
  Vor jedem Push lokal ausführen: `node deploy-hygiene.js`.
- manifest.json: `siteVersion` ("2026.08.27-3") + `buildDate` ergänzt. Footer zeigt
  " · v<siteVersion>" (aus manifest, client-seitig gerendert). Version-Bump bei
  künftigen Änderungen nötig (nicht Graph-schemaVersion, sondern Seiten-Build).
- Relative Pfade verifiziert: index.html `assets/...`, app.jsx `base+data/...`.
  Spec-URL absolut (raw.githubusercontent) — erlaubt per Konvention.
- Verifiziert: deploy-hygiene green, Tip-Sync, Live-Marker (siteVersion in manifest
  + app.jsx) im Deploy bestätigt. Commit e9740ad (gepusht).

## Phase 6 — Aufräumen (2026-08-27, erledigt + verifiziert)
- .gitignore: `commitmsg*.txt` + `preview*.log` (root + subdirs) ignoriert. Die zuvor
  getrackten commitmsg-Dateien per `git rm --cached` aus dem Index genommen — Dateien
  bleiben LOKAL erhalten (nicht destruktiv). Status danach sauber.
- msgraph/ (Vanilla) als ARCHIV markiert (siehe Phase 6). Am 28.08.2026 der
  Vanilla-Ordner dann KOMPLETT geloescht (index.html, assets/, data/,
  ARCHIVE_README.md) — die React-Variante (msgraph/react/) nutzt eigene
  site.css + eigenen Worker, der Vanilla-Kram war ungelinkt + dupliziert.
  Verifiziert: Portal linkt nur msgraph/react/, keine toten Referenzen.
- Deploy-Hygiene weiterhin grün.
- Nicht destruktiv: physische Dateien erhalten, nur Tracking bereinigt.

## Session-Abschluss (2026-08-27)
Bug-Hunting-Rundschlag über qapdex-maker.github.io abgeschlossen. Alle Phasen 1–6
durch, lokal verifiziert (echte Runs, keine Behauptungen) + gepusht + live bestätigt.
- Phase 1: Bug #10 (Portal-Kategorie-Filter) gefunden+gefxt.
- Phase 2: Daten-Frische verifiziert, kein Fix nötig.
- Phase 3: A11y Tabs, Radar-Scroll, NL→Graph-Coverage behoben.
- Phase 4: AUFGESCHOBEN bis IGNITE (Live-Tenant + LLM-Bridge) — Permissions bleibt kuratiert.
- Phase 5: deploy-hygiene.js + Versionierung etabliert.
- Phase 6: Müll aus .gitignore, Vanilla als Archiv markiert.
Lokaler HEAD == Remote (6456171). Deploy-Hygiene grün. Repo sauber.

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
- Nach jeder `app.jsx`-Änderung: `sh build_appjs.sh` (schreibt `assets/app.js`, cached
  @babel/standalone unter `$HOME`). Prüfen, dass `assets/app.js` sich wirklich geändert hat.
- Verify-Suite ohne Browser (Rezept im Skill `msgraph-react-evolution`,
  `references/termux-verify.md`): JSX-Transform, Worker-Parse gegen echte JSON,
  App-Mount-Smoke mit React-Mock, HTTP-Checks per http.server.

## Pflege-Lauf 2026-08-29 (verifiziert UND deployed)
GEPUSHT als Commit 6021cb3 (main). Nach dem Push unabhängig geprüft:
Pages-Build via `gh api .../pages/builds/latest` von "building" auf "built"
verfolgt (kein error), danach live per curl:
`/msgraph/` **200 (vorher 404)**, `/msgraph/react/` 200,
`/msgraph/react/assets/app.js` 200 und enthält `LLM-Zuordnung` — der i18n-Fix
ist also wirklich ausgeliefert, nicht nur committet. Redirect-Seite enthält
`href="react/"` + `location.replace`.

Alles unten ist echter Tool-Output, keine Annahme:
- `build_appjs.sh` neu ausgeführt → `assets/app.js` byte-identisch, d.h. es lag KEIN
  veraltetes Kompilat im Repo (112 React.createElement-Calls, SYNTAX OK).
- Worker-Parse gegen die echten Daten: `index.v1.0.json` 17.531 Endpoints / 0 malformed,
  `index.beta.json` 29.554 Endpoints / 0 malformed.
- App-Mount-Smoke (node vm + React-Mock): `mounted: true`, keine Exception.
- Anti-Regression F1: kein Main-Thread-`fetch('data/index...` in `app.jsx`.
  Anti-Regression F4: kein `<script>`-Babel-Tag in `index.html` (nur ein Kommentar
  erwähnt Babel — `grep -c babel` liefert daher 1, das ist kein Script-Tag).
- Externe Links live geprüft: beide `openapi.yaml` (v1.0/beta) 200, React-UMD 200.
  `openrouter.ai/api/v1/chat/completions` antwortet auf HEAD mit 404 — erwartbar,
  es ist ein POST-Endpoint, kein toter Link.
- **Gefunden und behoben:** `https://qapdex-maker.github.io/msgraph/` war live 404
  (Vanilla-Ordner am 28.08. gelöscht, aber kein Ersatz-Index). Jetzt liegt dort eine
  DE/EN-Redirect-Seite auf `react/`. Lokal 200 verifiziert.
- **Gefunden und behoben (echter Bug, nicht kosmetisch):** `node deploy-hygiene.js` war
  ROT — 2 FAILURES: `nl_reasons[de][llm]` und `nl_reasons[en][llm]` fehlten, obwohl
  `nlMap`/der LLM-Pfad `reason: 'llm'` ausgibt (eingeschleppt mit F3, Commit 39d3c11).
  Folge in der UI: im LLM-Modus stand unter dem Endpoint das rohe Schlüsselwort
  `NL: llm` statt eines übersetzten Textes. Fix: `llm: 'LLM-Zuordnung'` (de) /
  `llm: 'LLM mapping'` (en), `app.js` neu gebaut. Danach: "i18n clean ✅",
  "Deploy-Hygiene sauber ✅". LEHRE: nach jedem neuen `reason:`-Wert MUSS ein
  `nl_reasons`-Eintrag in BEIDEN Sprachen dazu.
- `manifest.json`: siteVersion 2026.08.27-3 → 2026.08.29-1, buildDate 2026-08-29
  (JSON-Parse geprüft). `schemaVersion`/`syncDate` unverändert — die Daten selbst
  wurden in diesem Lauf nicht neu gesynct.
