# PROJECT_NOTES — qapdex-maker.github.io (Portal + msgraph/react)

Stand: 2026-09-26 (MakerOS-Session abgeschlossen, Push-Tip `fee79f2`).
Letztes Push-Tip: `fee79f2`; lokaler und remote `main` waren nach dem Push identisch.
Vollständiges Protokoll: `macrohard/SESSION-2026-09-26.md`
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
    Commit: c5e6f40. Verifiziert lokal: alle Chips OK,
    github.com-Hrefs via gh api 200, lokale Subpages (idun/, msgraph/react/, pepemem/, pepememe/) HTTP 200.

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
|- `manifest.json`: siteVersion 2026.08.29-2, buildDate 2026-09-09
  (JSON-Parse geprüft). `schemaVersion`/`syncDate` unverändert — die Daten selbst
  wurden in diesem Lauf nicht neu gesynct.

## PEPE Pages — `pepemem/` + `pepememe/`
- `pepemem/` = MEMEPEPE Linktree-Backup
- `pepememe/` = PEPEMEME Linktree-Backup
- Portal-Karte `PEPEMEME` verlinkt direkt auf `https://linktr.ee/PEPEMEM`
- `pepemem/` Änderungen Stand 2026-09-09:
  - Header geleert: MEMEPEPE-Branding, DexScreener-Button, Personen-Icon, Nav-Tabs entfernt
  - Section „Liquidity & Tithes“ ist weiterhin vorhanden; entfernt wurde nur der
    darin liegende Block „Sacred Interactive Contract Altar“
    (verifiziert 2026-09-26 gegen `pepemem/index.html`: Section-Header und
    „Allow Cookies.“-Card stehen, der Altar-Text kommt dort nicht mehr vor)
  - Hero-Fresco-Slideshow mit 3 lokalen Bildern unter `pepemem/images/`
  - Bento-Cards nutzen lokale Bilder statt Icons
  - Abschnitt mit „Pontiff“-Bezug (ohne das Wort „Original“ im Markup) steht über
    dem Footer und nutzt `images/PepeTheFrog_PEPE_Dollars_1.jpg`; Datei vorhanden
    (verifiziert 2026-09-26)
  - Book-of-Degens-Avatar zurück auf Original-Bild von `lh3.googleusercontent.com`
  - Button-Reihe im Base-Card-Bereich:
    - `GODPEPE Chart` → `https://app.uniswap.org/swap?outputCurrency=0x40A5808B104cE2A4E1b95E2E497d8E8a847CEE26&chain=base`
    - `or`
    - `PEPEGOD` → `https://app.uniswap.org/swap?outputCurrency=0x08985d3198E84633B8E2B40C5EF54A095db2f9D2&chain=base`
    - `GAGA Chart` → `https://dexscreener.com/base/0x27d8744e5208c1580ca296af239e5720f6bba363`
  - Footer „Divine Council & Citadel“: `https://pepecoin.com/` ergänzt

## catpop — CatPop Announcement Seite (Stand 2026-09-12)
- Pfad: `catpop/index.html`, Bild: `catpop/popnomics.jpg`
- README: `catpop/README.md` (aktuell)
- Ticker: `$CATPOP` (gewollter Platzhalter für Meme-Coin-Symbol, wie $DOGE/$PEPE)
- Titel: `<title>$CATPOP — CatPop Meme Token</title>` (Ticker + Name, korrekt)
- Badge: `WALL STREET TRADING PIT ANNOUNCEMENT`
- Theme-Palette: `default`, `green`, `ink`, `sunset`, `mono`, `paper`, `berry`, `frost` (8 Themes)
- Theme-Toggle per Klick, gespeichert in `localStorage('catpop_theme')`
- Telegram entfernt. CTA-Link: `https://linktr.ee/hereismytelegram`
- Buy-CTA + User-Button entfernt; Header = Nav + Theme-Button
- Comic-Panel-Blöcke auf Uhrzeit-Header reduziert
- RAYDIUM-Nennungen ersetzt durch `four.meme`
- CA-Toggle: echter CA (`0x10e750a746dbb6f67ca4a38dc04a31676f9e4444`) + Solana Gag
- DEX-Badge-Toggle: BNB DEX / SOL DEX
- Bitget-Affiliate-Link in Wallet-Schritt 1
- Interne Nav-Links (About/Tokenomics/How-to-Buy/Live-Chart/Meme-Generator) sind Platzhalter (`#`) — Same-Page-Sektionen noch nicht angelegt
- Linktr-Subseite: `/catpop/linktr/` → `$CATPOP — Kapow Linktree`
- Letzter Commit: `194c641 docs(catpop): add catpop README` (READMEDatei hinzugefügt)

## Session 2026-09-27 — macrohard Dark/Light + msgraph Radar, Skizzen, Gate

Vier zusammenhängende Blöcke, alle im selben Monorepo. 6 Commits macrohard,
11 Commits msgraph. **Alles verifiziert, nichts gepusht ohne Auftrag.**

### macrohard — Dark Mode und Farbschema waren vermischt (Release 2.11.50)
Dark Mode und die vier Paletten sind zwei Schichten, die sich kombinieren. Sie
hießen beide "Theme", daher der Eindruck. Dazu ein Spezifitäts-Unfall:
`html.ocean` und `html[data-theme="dark"]` haben identische Spezifität, und der
Dark-Block stand später — also gewann Dark. Gemessen vorher: ocean+dark ergab
`--accent #4a8aff` statt `#0066cc`. Ein Palettenwechsel im Dark Mode tat sichtbar
nichts. Dark setzt jetzt nur Flächen/Ink/Line/Schatten, der Akzent gehört der
Palette, mit `:not()`-Fallback.

Zwei Nebenbefunde, die echter waren als geplant:
- Der Dark-Restore lag am ENDE von `buildSettings()` — ein gespeichertes
  Dark-Mode wurde erst angewendet, wenn man die Einstellungen öffnete. Ein
  dunkler Desktop kam hell hoch. Jetzt im DOMContentLoaded, vor initShell.
- `documentElement.className = ''` in beiden Reset-Buttons riss `lang-de` mit
  weg, das `setLang()` gesetzt hatte. Jetzt `resetAppearance()`.

Und einer, der von der eigenen Fix-Idee stammte: das State-Mirroring der
Checkboxen funktionierte nicht. `innerHTML` auf einem **detached** Element landet
nicht im Dokument, `getElementById` lieferte null, und der `if`-Guard — als
Robustheit gedacht — verwandelte einen harten Fehler in falsche UI. Ein Test,
der die Reihenfolge prüft (angehängt vor nachgeschlagen), statt die Existenz des
Guards.

### msgraph — Breaking Radar: "Bald" war ein toter Button
Der Filter verglich `it.status === 'soon'`, aber die Daten sind **asymmetrisch**:
`v1.0` hat `{removed: 47, planned: 38}`, `beta` hat `{removed: 1617, soon: 137,
planned: 38}`. Auf v1.0 traf "bald" also nichts. Gemessen: ALLE 85 → BALD 85
(nichts passierte) → ENTFERNT 47. "Bald" ist jetzt eine *Bezeichnung*, kein
Status: "noch nicht entfernt" = soon + planned → 38 auf v1.0, 175 auf beta.
Dazu: der Zähler zeigte `data.count` (Gesamtzahl) statt der gefilterten Liste
(47 Karten neben Badge "85"), und ein leerer Filter war nicht von einem Hänger
zu unterscheiden.

### msgraph — Skizzen-Panel, und ein Button, der nicht das tat, was er sagte
Der Header-Button "React" war ein **Themeswitch-Rest** aus der Vor-React-Zeit:
im Commit 68e7d1f stand dort noch `data-set-theme="idun-retro"`, das Label war
der Themenname, die Aktion längst auf "springe zum Reference-Tab" reduziert.
`idun-retro` kommt null Mal im React-Code vor. Jetzt öffnet er ein Panel über
die 17 Cloud-CSDL-Dokumente aus metadata-msgraph (5-8 MB, zusammen ~90 MB) und
zählt pro Klick eine Datei im Worker.

**Drei Fehler, die erst das Ausführen zeigte:**
1. `DOMParser` existiert im Web-Worker nicht (gemessen: `typeof DOMParser ===
   'undefined'`). Ein Quelltext-Test kann das nicht fangen — es passiert erst
   beim Klick in einem echten Worker.
2. Der Backslash in `'[\s>]'` verlor eine Ebene, das Muster suchte einen
   literalen Backslash-s und fand **0**, obwohl beta-Review 36 EntityTypes hat.
   Vollkommen lautlos: kein Fehler, keine Konsolenmeldung.
3. Der Worker echoed die volle raw-URL, das Rendering las `counts[s.name]`
   (nackter Dateiname) — zwei String-Keys, die sich nie treffen.

Gegenprobe: Regex-Zähler und echter XML-Parser stimmen exakt überein
(beta-Review 36/85/45, beta-Mooncake 1231/1386/975, beta-Prod 2512/3364/1877).

**Und der Test, der das finden sollte, war selbst schuld:** er hatte das
Muster *nachgebaut* statt aus worker.js extrahiert und übernahm denselben
Doppel-Escape-Fehler. Ein Test, der den geprüften Code kopiert, findet keinen
Bug im Escaping — er kopiert ihn mit.

### deploy-hygiene.js — zwei self-inflicted FAILs
Das Gate meldete 2 FAILUREs und blockierte den Push. Beide waren Bugs im Gate:
- Der Cache-Check verlangte genau *eine* Ziffer nach `macrohard-v`; `sw.js`
  trägt `macrohard-v2-11-50` seit mehreren Releases. Er fand also nie etwas.
  Jetzt wird die Version gekappt und mit package.json verglichen.
- `require('@babel/standalone')` wirft MODULE_NOT_FOUND (Browser-Bundle, nicht
  in package.json). Jetzt: require, sonst unpkg-Fetch mit Redirect-Auflösung,
  sonst WARN statt FAIL. Ein echter JSX-Fehler blockiert weiter.

Ein Gate, das auto-fixiert statt zu failen, hatte einen Widerspruch über ein
Release versteckt: `siteVersion`/`buildDate` waren im Release-Commit entfernt
worden ("nichts liest sie"), das Gate hat sie beim nächsten Lauf kommentarlos
wieder eingefügt.

### Sicherheitsbefund — API-Proxy wartet auf den GitHub-Plan
Geplant war ein Live-Punkt gegen die echte Graph-Instanz. **Jede GitHub-Pages-
Datei ist öffentlich** (geprüft: `manifest.json` → HTTP 200, keine Auth). Ein
Graph-Token in einer deployten Config-Datei ist kein Secret; mit der
Mail-Adresse aus `/me` ist das eine vollwertige Kontooption.

Graph erlaubt aber CORS (`Allow-Origin: *`, `authorization` erlaubt) — ein
Proxy ist nicht nötig, das OpenRouter-Feld macht es seit F3 genauso.
GitHub Functions: 404 auf diesem Account, ob Plan oder keine Functions ist von
der Shell nicht unterscheidbar. Notizen: `msgraph/react/NOTES-API-PROXY.md`.

### Testzahlen
macrohard 312 · msgraph/react 15 (sketch 9, radar 6) · Gate 6. Alle grün,
`node deploy-hygiene.js` inklusive echtem Babel-Transpile.

> Stand 2026-09-30: macrohard 332 (siehe Session unten). Die 312 oben sind der
> Messwert dieses Tages und bleiben als Protokoll stehen.

## Session 2026-09-28 — show-grid war ein toter Schalter, RAM-Deckel, Signal 9

**show-grid: Ein Schalter, der nichts tat.** `stGrid` in den Einstellungen
schaltete eine Klasse `show-grid` auf `#deskIcons`. Die Klasse hatte **keine
Regel** — weder in `site.css` noch in `index.html`. Der Zustand wurde in
localStorage gespeichert, das Kästchen zeigte ihn an, am Bildschirm passierte
nichts. Der Test dafür hatte die Lage als "bekannter toter Schalter"
festgehalten mit dem Hinweis, die Erwartung umzudrehen, wenn eine echte Regel
kommt. Genau das ist jetzt passiert.

Die Regel zeichnet die Icon-Zellen als Raster. Zwei Details, die ohne Messung
falsch gewesen wären:
- `width:max-content` ist **Pflicht**. `#deskIcons` ist `position:fixed` mit
  `height:calc(100% - 60px)`, ohne das streckt das Raster quer über den halben
  Bildschirm. Sichtbar geworden als Linien, die rechts neben der fünften Spalte
  ins Leere liefen. Gemessen bei 1280x633: Container 420px, Icon-Reihe endet
  bei 423px.
- Die Zelle ist 78x88 plus 3px Rahmen und 3px Außenabstand = 84x94. Der Mobile-
  Breakpoint hat eigene Maße (88x98 plus 12px Padding/Gap → 100x110), sonst
  läuft das Raster neben den Icons vorbei.

Live geprüft nach dem Deploy: beide Regeln sind auf qapdex-maker.github.io
abrufbar, HTML auf `site.css?v=51`.

**Signal 9 / OOM — meine erste Vermutung war falsch.** Bei 5,6 GB RAM, ~1,8 GB
verfügbar und bereits 2 GB belegtem Swap ist `node --test` mit 8 CPU-Threads
der naheliegende Verdächtige. Nachgemessen, mit Speicher-Tiefstand während des
Laufs:

| Lauf | Prozesse | RAM-Tiefstand | Ergebnis |
|------|----------|---------------|----------|
| Default (8 Threads) | 1 Runner + 8 Kinder | ~1,62 GB | 312/312 in 6,7 s |
| `--test-concurrency=1` | 1 Runner + 1 Kind | ~1,66 GB | 312/312 in 24,9 s |
| `--test-concurrency=4` | 1 Runner + 57 MB RSS + 4 Kinder | stabil | 312/312 in 8,5 s |

Der Kill war **nicht** aus diesem Repo zu reproduzieren. Der Default-Lauf trug
8 Kinder ohne Problem. Wahrscheinlichster Verursacher ist ein gleichzeitiger
uv/pip-Build neben Node — uv ist in Termux der übliche SIGKILL-Kandidat, und
`uv` ist hier gar nicht installiert, es lief also über ein anderes Tool. Die
gebliche Ausgangslage bleibt: geteilte 5,6 GB, 2 GB Swap vor Teststart belegt.
`--test-concurrency=4` ist billige Absicherung auf der Node-Seite, **kein
Fix** für die uv-Seite.

**Deployment-Signal:** beide CI-Läufe der Pushes grün, Pages deployed. Eine
grüne CI entdeckt das hier nicht, weil die OOM-Grenze des Geräts nicht die
Grenze des Runners ist.

## Stash-Fund (2026-09-28) — `44ee21e`, gedroppt
Ein WIP-Stash vom 2026-09-27 17:16 lag noch herum. Geprüft statt geraten:
beide Testdateien waren **byte-identisch** mit HEAD, die Entfernung von
`restoreFromTaskbar` (viertes Duplikat, null Aufrufer) und `sortDeskIcons`
(null Aufrufer, `by`-Parameter nie gelesen) steckte ebenfalls in HEAD. Übrig
waren 4 veraltete Kommentarzeilen (Em-Dash statt ASCII, also älter als der
Prettier-Lauf) und `APP_VERSION='2.11.50'` statt 2.11.52. Reiner Fund, kein
offener Stand. Backup trotzdem angelegt, bevor er weg war:
`/data/data/com.termux/files/usr/tmp/stash-44ee21e-backup.patch`
(sha256 ca32f921…). Lehre: bei "aufräumen" erst `git diff HEAD stash@{0}`
lesen, dann entscheiden — ein Stash aus einer fremden Session sieht
fremder aus, als er ist.

## Session 2026-09-30 — doppelte Element-IDs, ein toter Toolbar

**Eine Fehlerklasse, fünf Fundstellen.** Ein Audit-Scan über alle 25 Apps
(Chromium, CDP) fand vier IDs, die zweimal im selben Fenster existierten:

| ID | Knoten 1 | Knoten 2 | Folge |
|----|----------|----------|-------|
| `stGrid` | DIV (Pane) | INPUT (Checkbox) | Einstellung nicht persistent |
| `ieRotate` | BUTTON | INPUT (range) | Regler wirkungslos |
| `musEq` | DIV (Tab) | DIV (Bänder) | Visualizer-Canvas gelöscht |
| `beatpadBpm` | SELECT | INPUT (number) | zwei BPM-Felder laufen auseinander |
| `mdPreview` | BUTTON | DIV | Preview-Toggle ohne Wirkung |

Warum das stumm war: `getElementById` und `querySelector('#id')` liefern bei
Kollision **die erste passende Node im Dokument**, kein Fehler, keine Warnung.
Bei `stGrid` kam dazu, dass `classList.toggle(klass, undefined)` flippt statt zu
setzen — die Klasse wechselte also sichtbar korrekt, während
`undefined ? '1' : '0'` immer `'0'` schrieb. Gemessen:

```
A) frisch geöffnet      deskClass=""          os_grid=null
B) Nutzer schaltet ein  deskClass="show-grid"  os_grid="0"   <-- falsch
D) neu geöffnet        deskClass=""          checkbox=false  <-- Einstellung weg
```

**Docs hatte eine tote Attrappe.** Zehn sichtbare Toolbar-Knöpfe, keiner
verdrahtet — jede ID kam genau einmal im File vor, nämlich im
openApp-Markup. Mit markiertem Text gemessen: `boldWirkt: false`, `innerHTML`
vor und nach dem Klick byte-identisch. Nur die separat in `buildDocs()`
erzeugte Leiste funktionierte, weshalb die App plausibel aussah.

**Zwei Lücken, die der erste Fix nicht schloss.** Nach dem ID-Fix schrieb der
Schalter korrekt `'1'`, ein Reload verlor es trotzdem: es gab nur einen
Restore-Pfad für den *Aus*-Zustand (`gd === '0'`), niemand las `'1'`. Und
`makeHeading()` las `range.startContainer.parentElement` *nach* `insertNode()` —
das ist der neue Textknoten, nicht der Block, also blieb die Überschrift ein
`<p>`. Beide erst nach der Verifikation aufgefallen, nicht davor.

**Die Verifikation lief zunächst gegen die alte Datei.** Sieben
Fehlschläge, keiner davon ein Produktfehler: das Chromium-Profil hatte noch
den Service Worker aktiv (`swController: true`), also lief die gecachte
`app.js`. Lehrpunkt aus dem Skill, erneut bestätigt — `curl` sah die Fixes
(2 Treffer für `stGridPane`), der Browser nicht. Abhilfe: **frisches Profil**
statt `unregister()`, denn ein zweites `navigate` direkt danach blieb bei
`readyState: "loading"` hängen.

**Messartefakte, die ich zuerst für Bugs hielt:** AMIBIOS meldet
`innerText === 0`, weil die App ein iframe ist und im Host-Dokument keinen
Text hat. Dazu ein Testfehler, bei dem `veraendert: true` neben identischen
ersten 90 Zeichen stand — mein Vergleichslängen, nicht das Verhalten.

Stand des Duplicate-ID-Audits: 330 Tests zu diesem Zeitpunkt, heute 332 nach
den Versions-Tests (siehe übernächster Abschnitt). Gepusht als `16846af`.

## Session 2026-09-30 (b) — Foto vom Gerät: die Fußzeile lügt

**Der Fund kam nicht aus dem Code, sondern aus einem Screenshot.** Die
Startmenü-Fußzeile zeigte `v2.11.49`, die Seite war 2.11.53. Belegt, nicht
vermutet:

```
=== A) Startmenue-Fusszeile (live, Chromium) ===
  { smFooter: 'qapdex-maker.github.io · v2.11.49',
    meta:     '2.11.53',
    appVersion: '2.11.53' }
```

`#smFooter` kommt **einmal** im Repo vor, in `index.html`, hartkodiert. Kein
JavaScript fasst ihn an — geprüft mit `grep "smFooter.*textContent"`, null
Treffer.

**Warum kein Test es fand.** `tests/version-consistency.test.mjs` prüft
`assert.match(index.html, /2\.11\.53/)` — also nur, dass die Version
*irgendwo* im File steht. Das `<meta name="makeros-version">` erfüllt das. Eine
zweite, veraltete Angabe im selben File fällt durch. Ich hatte die Zahl
„sechs Stellen" im Skill notiert und beim Bump sechs gepatcht — es waren sieben.

**Fix:** eigene Node `#smFooterVersion`, die `app.js` beim Boot aus
`window.APP_VERSION` befüllt. `window.`, weil die Zeile nach dem `})()` der
Haupt-Closure steht — `tests/iife-version-export.test.mjs` hat mich beim ersten
Versuch genau darauf rot gemacht, mit Zeilennummer und Dateiname.

**Zwei neue Tests, beide gegengeprüft:**

| Test | Altes Markup | Neu |
|---|---|---|
| `the start-menu footer reads its version from APP_VERSION` | rot: „die Fußzeile braucht eine eigene Node" | grün |
| `no stale version literal survives in any shipped file` | rot: „index.html enthält veraltete Versionsliterale: 2.11.49" | grün |

Der Literal-Scan fand beim ersten Lauf noch eine **zweite** Stelle: mein eigener
erklärender Kommentar in `app.js` nannte die alte Version. Ein Kommentar, der
den Wert dokumentiert, wird vom eigenen Test als Fehler gemeldet — berechtigt.

**Von den vier Markierungen im Screenshot war genau eine ein Fehler.** Die
anderen drei habe ich erst gemessen, dann als korrektes Design erkannt:

- **„Glow weg" neben der Docs-Kachel**: Scan über `.dskApp`, `#startMenu`,
  `.wnd`, `#taskbar`, `#tbStart` nach *farbigen weichen* Schatten
  (`box-shadow` mit Farbe **und** Blur > 0). Ergebnis: **keine**. Die harten
  Versatzschatten sind der dokumentierte Brutalismus.
- **Blaue Linie / blauer Scrollbalken**: `--accent` ist `#2547ff`, die Default-
  Akzentfarbe aus `site.css:5`. Der Scrollbalken zeigt `rgb(37,71,255)` auf
  `rgb(241,237,227)` — das **ist** `var(--accent) var(--paper)`. Korrekt.
- **Gelbe Linie unten**: `#taskbar` hat
  `box-shadow: 0 -4px 0 var(--ink), 0 -7px 0 var(--accent-2)`, gemessen
  `rgb(255,212,0) 0px -7px 0px`. Dokumentiertes 3D, kein Fremdkörper.
- **„leer lassen" neben dem Startmenü**: Treffer waren `.dskApp`-Kacheln und
  ihre Kindelemente. Menü 240 px breit, Zone daneben 260 px — die Kacheln
  ragen hinein. Grid-Geometrie, kein Müll.

**Ein Testfehler unterwegs:** `querySelectorAll(...).slice is not a function` —
NodeList hat kein `slice`. Das Ergebnis dieser Zeile war ungültig, nicht nur
fehlend; ich habe es mit `Array.from()` nachgezogen und neu gemessen.

**Lehre für die Anzeige-Wahrheit:** Ein Gerätefoto zeigt Symptome, nicht
Ursachen, und manchmal **überhaupt keine** — drei der vier Markierungen waren
korrektes Design. Was es aber zeigte, war eine Zahl, die im Code niemand
überwacht hat.

## Session 2026-09-30 (c) — EXiL 126: eine Seite für die Party

Neuer Bereich `exil/`, ausgeliefert als
`qapdex-maker.github.io/exil/`. Teaser für eine Party ohne Datum, gebaut, um
später zur Party-Seite zu werden. **Kein JavaScript** — sie funktioniert
offline und ohne Skripte.

**Der Fund beim Prüfen der Logos statt beim Anschauen.** Die Bildanalyse meldete
für `IMG_0409.PNG` eine „komplett schwarze Fläche". Das war falsch. Die
Pixelmessung:

```
PNG 507x739, RGBA
transparent (<20 alpha):  296912   79.2 %
opaque schwarz:            74727   19.9 %
opaque anders:                 0    0.0 %
halbtransparent:            3034    0.8 %
top colors: [((0,0,0), 74727)]
```

Es ist eine Schwarz-Wortmarke mit Alphakanal. Die Analyse hatte das
Transparenz-Chanel als Fläche gelesen. Erst auf hellgrauem Grund flachgerechnet
war **EXiL 126** lesbar. **Bei transparenten Bildern die Alpha-Werte messen,
nicht die Vision-Analyse fragen** — die sieht nur eine Ebene.

**Drei von vier Markierungen auf einem Gerätefoto waren korrektes Design.**
Siehe die vorige Session. Dasselbe Muster: erst messen, dann urteilen.

**Gemessen, nicht behauptet** (Chromium, echter Server, Desktop + 390 px):

- beide Logos laden, `alt` und `width`/`height` gesetzt
- kein horizontaler Overflow
- Kontraste WCAG AA: 4,9:1 hell, 6,64:1 dunkel
- Portal-Karte und Event-Filter zeigen auf die Seite
- keine Console-Fehler, live 12/12 bestanden

**Ein Hinweis vom Screenshot-Review war eine Fehlwarnung:** die kleinen
Meta-Zeilen seien zu klein. Gemessen bestehen sie AA in beiden Modi. Das
Fakten-Label trotzdem von 10,9 auf 11,5 px angehoben — das kostet nichts.

**Zwei eigene Fehler, beide vor dem Push bemerkt:**

1. Der Portal-Test schlug dreimal fehl. Ursache: mein alter `http.server` hing
   noch auf Port 8144 und servierte aus `exil/` statt aus dem Repo-Root — ich
   habe 404er gemessen und beinahe die Seite dafür verdächtigt. **Ein hängender
   Server ist die billigste Erklärung für "alles 404".**
2. Der Test war syntaktisch kaputt (verschachtelte Template-Literale). Nach dem
   ersten `SyntaxError` habe ich nicht die Seite angefasst, sondern den Test.

**Die Logos hatten fremde Rechte** (`root everybody`, `rw-rw----`). Vor dem
Commit auf 644 normalisiert — im Repo ist alles andere so, und `deploy-hygiene`
prüft Rechte nicht.

Details zu Marke, Auftritt und Ausbauplan stehen in `~/EXiL-126-NOTES.md`
(bewusst außerhalb des Repos — die Seite wird als GitHub Pages ausgeliefert,
jede Datei darin ist öffentlich).
