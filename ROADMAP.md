# ROADMAP — qapdex-maker.github.io (Portal + msgraph/react)

Stand: 2026-08-27. Arbeitsstand, NICHT push-pflichtig.
Lokaler HEAD: c5e6f40. Letztes Push: af610d0 (9 ungepushte Commits).
Push/Deploy zu GitHub Pages NUR auf Auftrag ("Bescheid"/"uebertragen").

## 0. Status-Querschnitt (verifiziert, 2026-08-27)
Alle 9 dokumentierten Bugs (PROJECT_NOTES) per echte Checks re-verifiziert → grün.
Keine Regression. Details in PROJECT_NOTES "Bug-Hunting".

## 1. Strukturierte Bereichsübersicht (tiefere Ebenen)

### A. Portal (Root index.html)
- neo-brutalist, Kobalt #2547ff + Gelb #ffd400, IGNITE-Toggle, Cursor-Trail, Scanlines, DE/EN.
- Karten aus `pages`-Array; Kategorie-Chip-Filter muss exakt mit `catLabel` matchen.
- Tiefe Checks möglich: Karten-i18n-Parität (data-de/data-en + JS-desc), Chip-Filter-
  Werte konsistent, keine "Neo-brutalist" in sichtbaren Beschreibungen (User-Gebot),
  IGNITE-Default-AUS (localStorage), Pfade relativ bei Subpages.

### B. msgraph/react (AKTIV verlinkt, "Graph Metadata Hub")
- React 18 UMD + @babel/standalone im Browser, KEIN Build. Tabs: Hub/Reference/Console/
  Permissions/Breaking Radar.
- Kritische Subsysteme:
  - i18n: I18N.de / I18N.en Maps; Sprache = app-shell state, Kinder lesen nur aus `t`.
    Risiko: harte Literale / Stale-Closure bei async-State. (Check: verify-i18n.js)
  - Worker: data/index.*.json off-main-thread. Risiko: relativer fetch (404→JSON-Fehler),
    variantRef-Stale-Guard. (Check: Node-Sim, siehe web-ui-verification-no-browser)
  - VirtList: rowHeight=58, nur sichtbare Zeilen. Risiko: Text-Overflow, Scroll-Math.
  - selfhost.os: Beschreibung ohne "Neo-brutalist"-Wortmarke.
- Daten: index.v1.0 (1387 Pfade), index.beta (2870), deprecations.*.json.
  Sync-Quelle: ~/github/repo/metadata-msgraph (Schema 1.6.711.0).

### C. msgraph/ (VANILLA, veraltet, NICHT verlinkt)
- Nur noch als Datei vorhanden. Entweder löschen oder als Archiv markieren.
- Tiefe Checks hier nicht nötig, solange ungelinkt.

### D. Skills (Hermes, idun-Profil)
- qapdex-github-io-theme, web-ui-verification-no-browser, browserless-static-qa,
  link-check-and-pages.
- verify-i18n.js am 2026-08-27 JSX-sicher gemacht (realer Crash behoben).

## 2. Fahrplan

### Phase 1 — Stabilisierung (lokal fertig, noch nicht gepusht)
- [x] Bug-Hunting Re-Check (alle 9 Bugs grün, echte Runs)
- [x] Skill-Checker JSX-sicher
- [x] Portal `pages`-Array i18n + Kategorie-Consistency: BUG GEFUNDEN+GEFIXT (Bug #10:
      `cat`-Feld fehlte → Kategorie-Filter zeigte 0 Karten; Fix verifiziert 3/3/2).
- [x] Link-Check Portal-Karten hrefs: github.com-Links via gh api 200; lokale Subpages
      idun/, msgraph/react/, msgraph/ HTTP 200. (awesome-selfhosted ist externes Repo.)

### Phase 2 — Daten-Frische (verifiziert, kein Fix nötig)
- [x] metadata-msgraph Sync: lokal HEAD db0e9c6 == remote (gh api). Keine neuen Commits.
- [x] Index-Counts gegen OpenAPI-Quelle: v1.0=1387, beta=2870 stimmen exakt überein.
- [x] manifest.json schemaVersion 1.4.711.0 / syncDate 2026-08-26 geprüft (CSDL v4.0).
- [x] deprecations-Status-Enum vs Daten: {removed,planned,soon} voll abgedeckt, card-Klassen OK.
- Fazit: Portal-Daten frisch + konsistent, kein Re-Sync nötig. Phase 2 ohne Änderung fertig.

### Phase 3 — msgraph/react Vertiefung (gefikt + verifiziert, gepusht 1c263d7)
- [x] A11y Tabs: role=tablist/tab + aria, Pfeil/Home/Ende-Navigation, focus-visible Outline.
- [x] Breaking Radar: slice(0,60) → scrollbarer .radar-scroll (volle Liste, 1792 items).
- [x] NL→Graph nlMap: "Team-Termine"→events, "Foto"→photo; +kalender/e-mail/dateien/foto/profil.
      Bewiesen per 9-Input-Coverage-Test. Babel OK, i18n clean, Live-Marker bestätigt.

### Phase 5 — Deploy-Hygiene (etabliert + verifiziert, gepusht e9740ad)
- [x] `deploy-hygiene.js` (Repo-Root): Pre-Push-Check — Babel, i18n, relative Pfade,
      absolute Spec-URL erlaubt, manifest siteVersion/buildDate, git local==remote.
- [x] manifest.json: siteVersion + buildDate; Footer zeigt " · v<siteVersion>".
- [x] Relative Pfade verifiziert (assets/data relativ, Spec-URL absolut OK).
- [x] Live bestätigt (siteVersion im manifest + app.jsx). Deploy-Hygiene green.

### Phase 6 — Aufräumen (optional)
- [ ] msgraph/ (Vanilla, veraltet, NICHT verlinkt): als Archiv markieren oder löschen.
- [ ] commitmsg_*-Dateien im Repo-Root/msgraph aufräumen (historische Notizen, nicht nötig im Deploy).

### Phase 4 — Live-Mode / Backend (AUFGESCHOBEN bis IGNITE)
- [ ] Echter Graph-Live-Mode (Azure-Tenant-Token + App-Registration) — WARTET auf IGNITE.
      User-Plan: bei IGNITE ggf. echte Microsoft-Daten (Logins etc.) — dann integrativ bauen,
      damit jederzeit anschlussfähig. Permissions-Tab bleibt bis dahin kuratiert.
- [ ] NL→Graph echte LLM-Bridge via idun-multi (Backend/Key nötig) — ebenfalls nach IGNITE.
- [ ] Phase-7 justbash-Sandbox: pnpm-Bundle nur Desktop (Termux blockt native Module).

### Phase 5 — Deploy-Hygiene (vor jedem Push)
- [ ] Version-Bump in manifest/PROJekt_notes
- [ ] relative Pfade unter Subpages, Spec-URL darf absolut
- [ ] http.server NICHT nach /tmp loggen; curl-Grep Fix-Marker im LIVE-Deploy
- [ ] tip local==remote via gh api --jq '.sha'

## 3. Wiederverwendbare Checks (lokal ausführbar)
- i18n: node ~/.hermes/profiles/idun/skills/web-ui-verification-no-browser/scripts/verify-i18n.js msgraph/react
- Babel: node -e 'require("@babel/standalone").transform(fs.readFileSync("msgraph/react/assets/app.jsx","utf8"),{presets:["react"]})'
- Worker: Node-VM-Sim gegen live BASE (Technique B, web-ui-verification-no-browser)
- HTTP: cd msgraph/react && python3 -m http.server 8099 (log nach ~/ nicht /tmp)

## 4. Hard Rules (nie verletzen)
- Push/Deploy NUR auf "Bescheid". Lokal bauen+prüfen immer OK.
- ".nav" nie display:none. Kein "Neo-brutalist" in Beschreibungen.
- Jeder sichtbare Text über I18N[lang]; async-State nur NEUTRAL, Anzeige aus `t` abgeleitet.
- /tmp read-only → keine Server-Logs dorthin.
