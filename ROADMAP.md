# ROADMAP — qapdex-maker.github.io (Portal + msgraph/react)

Stand: 2026-09-17. Arbeitsstand, NICHT push-pflichtig.
Lokaler HEAD: siehe `git log`.
Push/Deploy zu GitHub Pages NUR auf Auftrag ("Bescheid"/"uebertragen").

## 0. Status-Querschnitt (verifiziert, 2026-09-17)

### qapdex-maker.github.io (Portal)
- 10 Karten im Portal (8 live, 1 soon, 1 Platzhalter)
- DE/EN-i18n, neo-brutalist Design
- Verlinkte Subpages: catpop, idun, macrohard, msgraph/react, pepemem, pepememe

### macrohard/ (v2.11.29, aktiv entwickelt)
- 22 Apps (11 Foundation + 11 Extension Pack), ES6-Module, PWA
- v2.11.23: Browser iframe fix (brLoaded-Flag)
- v2.11.24: Docs "Made by Alexander Kleine"
- v2.11.25: Music Player Rewrite (Upload, Radio, Favoriten, Tabs)
- v2.11.26: Explorer Navigation Fix (Backslash zwischen Pfad und Ordnername)
- v2.11.27: Music Player Audio Fixes (Beatpad eigener AudioContext, Fallback-Radio)
- v2.11.28: Music Player setupAudio() lazy init, audioEl statt audio
- v2.11.29: Mobile Apps sichtbar (flex-wrap:wrap, overflow-y:auto)
- v2.11.30: Music Player Refactor — Sadee-Inspired UI (Album Art, Sidebar, Controls)
- v2.11.30: Mobile Fenster immer Vollbild (openApp/snapWindow/restoreSession)

## 1. Strukturierte Bereichsübersicht

### A. Portal (Root index.html)
- neo-brutalist, Kobalt #2547ff + Gelb #ffd400, IGNITE-Toggle, Cursor-Trail, Scanlines, DE/EN.
- Karten aus `pages`-Array; Kategorie-Chip-Filter muss exakt mit `catLabel` matchen.
- Alle Karten verifiziert (8 live, 1 soon).

### B. macrohard/ (AKTIV, v2.11.30)
- Windows-Style Desktop OS im Browser
- 22 Apps, PWA, Taskbar, Fenster-Management
- ES6-Module, ESLint + Prettier, Unit-Tests, CI/CD
- Alle 26 Komponenten verifiziert (26/26 grün)

### C. msgraph/react (AKTIV verlinkt, "Graph Metadata Hub")
- React 18 UMD + vorkompiliertes app.js via build_appjs.sh
- Tabs: Hub/Reference/Console/Permissions/Breaking Radar
- Worker-basiertes Parsing, virtuelle Liste, i18n DE/EN

### D. idun/
- Azure AI Foundry Client + Multi-LLM-Console
- Statische Seite, lokal verifiziert

### E. catpop/, pepemem/, pepememe/
- Statische Pages, lokal verifiziert

## 2. Fahrplan

### Phase 1 — Stabilisierung (FERTIG)
- [x] Bug-Hunting Re-Check (alle Bugs grün, echte Runs)
- [x] Portal `pages`-Array i18n + Kategorie-Consistency
- [x] Link-Check Portal-Karten hrefs

### Phase 2 — Daten-Frische (FERTIG)
- [x] metadata-msgraph Sync verifiziert
- [x] Index-Counts gegen OpenAPI-Quelle: v1.0=1387, beta=2870

### Phase 3 — msgraph/react Vertiefung (FERTIG)
- [x] A11y Tabs: role=tablist/tab + aria
- [x] Breaking Radar: scrollbarer .radar-scroll
- [x] NL→Graph nlMap erweitert

### Phase 4 — Live-Mode / Backend (AUFGESCHOBEN bis IGNITE)
- [ ] Echter Graph-Live-Mode (Azure-Tenant-Token + App-Registration)
- [ ] NL→Graph echte LLM-Bridge via idun-multi
- [ ] Phase-7 justbash-Sandbox (pnpm-Bundle nur Desktop)

### Phase 5 — Deploy-Hygiene (FERTIG)
- [x] `deploy-hygiene.js` (Repo-Root)
- [x] manifest.json: siteVersion + buildDate
- [x] Relative Pfade verifiziert

### Phase 6 — Aufräumen (FERTIG)
- [x] .gitignore: commitmsg*.txt + preview*.log
- [x] msgraph/ Vanilla gelöscht, Redirect-Seite

### Phase 7 — macrohard/ Stabilisierung (FERTIG, 2026-09-17)
- [x] Browser iframe Fix (v2.11.23)
- [x] Music Player Rewrite + Fixes (v2.11.25-v2.11.28)
- [x] Explorer Navigation Fix (v2.11.26)
- [x] Mobile Apps sichtbar (v2.11.29)
- [x] Alle 26 Komponenten verifiziert (26/26 grün)

## 3. Offene Punkte / Tech Debt

| Thema | Status | Notiz |
|-------|--------|-------|
| macrohard: AudioGraph reset bei Track-Wechsel | 🔴 Offen | setupAudio() crasht wenn Song nicht geladen |
| macrohard: Beatpad ohne Song | 🔴 Offen | eigener AudioContext nötig |
| macrohard: Radio Progress springt | 🔴 Offen | duration=Infinity bei Streams |
| macrohard: Visualizer doppelter Loop | 🔴 Offen | requestAnimationFrame dedupliziert |
| Portal: catpop-Entwicklungs-Commits | 🟡 Lokal | Nicht gepusht, nicht push-pflichtig |
| Phase 4 (Live-Mode, LLM-Bridge, Sandbox) | 🔴 Aufgeschoben | Wartet auf IGNITE |

## 4. Wiederverwendbare Checks (lokál ausführbar)

```bash
# Syntax-Check
node --check macrohard/assets/app.js

# Unit-Tests
node macrohard/tests/app.test.js

# Deploy-Hygiene (vor Push)
node deploy-hygiene.js

# Live-Verifikation (nach Push)
LOCAL=$(git rev-parse HEAD)
REMOTE=$(gh api repos/qapdex-maker/qapdex-maker.github.io/commits/main --jq '.sha')
[ "$LOCAL" = "$REMOTE" ] && echo "OK" || echo "MISMATCH"

# HTTP-Checks
curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/index.html
curl -s -o /dev/null -w "%{http_code}" https://qapdex-maker.github.io/macrohard/
```

## 5. Hard Rules (nie verletzen)

- Push/Deploy NUR auf "Bescheid". Lokal bauen+prüfen immer OK.
- ".nav" nie display:none. Kein "Neo-brutalist" in Beschreibungen.
- Jeder sichtbare Text über I18N[lang]; async-State nur NEUTRAL.
- /tmp read-only → keine Server-Logs dorthin.
- Relative Pfade bei Subpages (./assets/...), absolute Spec-URL erlaubt.

## 6. Quick-Reference

- **Font:** Space Grotesk + IBM Plex Sans + IBM Plex Mono
- **Kolors:** Kobalt #2547ff, Gelb #ffd400, Paper #f1ede3
- **Cache-Bust:** app.js?v=35, site.css?v=36
- **PWA:** sw.js stale-while-revalidate
- **Tests:** 7/7 grün (storeSet, osIntervals, apps count, fsData, filter, shuffle)
- **Live:** https://qapdex-maker.github.io/macrohard/
