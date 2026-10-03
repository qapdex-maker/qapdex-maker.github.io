# ROADMAP — qapdex-maker.github.io (Portal + msgraph/react + jsmol)

Stand: 2026-10-03. Arbeitsstand, NICHT push-pflichtig.
Lokaler HEAD: siehe `git log`.
Push/Deploy zu GitHub Pages NUR auf Auftrag ("Bescheid"/"uebertragen").

## 0. Status-Querschnitt

### qapdex-maker.github.io (Portal) — 2026-10-03
- **13 Karten im Portal** (11 live, 1 soon, 1 Platzhalter)
- DE/EN-i18n, neo-brutalist Design
- Verlinkte Subpages: catpop, idun, macrohard, msgraph/react, pepemem,
  pepememe, **jsmol** (Workbench · MolGrid · Konsole · Reaktions-Sandbox)

### Weitere Bereiche — siehe eigene Abschnitte
- macrohard/ (MakerOS v2.11.54, 26 Apps, 332 Tests)
- msgraph/react (Graph Metadata Hub, 61 Tests)
- jsmol/ (vier Seiten, 50 MB, 23 Tests) → eigener Abschnitt am Ende

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
- 13 Karten verifiziert (11 live, 1 soon, 1 Platzhalter).

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

### F. jsmol/ (NEU 2026-10-02/03, vier Seiten, 50 MB)
- `index.html` Workbench — 19 Strukturen, scrollbare Sidebar, Filter-Chips
- `grid.html` MolGrid — 12 JSmol-Instanzen im Raster
- `sandbox.html` Konsole — JSmol-Befehle mit vorher/nachher-Messung
- `reaction.html` Reaktions-Sandbox — SMILES-Eingabe, 3 Instanzen, 4 Vorlagen
- Vendor-Code, eigene Lizenz (LGPL 2.1 / MIT) — `jsmol/LICENSE-JSmol.txt`
- Gate-Budget 60 MB, aktuell 50 MB
- 23 Tests in `tests/jsmol-pages.test.mjs`, laufen in der CI

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

## Nachtrag 2026-09-28 (verifiziert, nach Push freigegeben)

- **macrohard v2.11.52**, `main` = 81b523a, identisch mit origin/main. CI grün,
  Pages deployed.
- **show-grid repariert**: der Schalter "Desktop-Raster anzeigen" war seit
  Langem tot (Klasse ohne CSS-Regel). Jetzt Desktop-Raster 84x94 plus eigene
  Mobile-Regel 100x110, mit `width:max-content` gegen das Auslaufen über den
  halben Bildschirm. Live geprüft, `site.css?v=51`.
- **Testdeckel dauerhaft**: `npm test` läuft mit `--test-concurrency=4`.
  312/312 in 8,5 s. Grund: geteilte 5,6 GB RAM, 2 GB Swap vor Teststart belegt.
  Siehe PROJECT_NOTES für die Messreihe — der Deckel war **nicht** die
  Ursache des Signal 9, der Kill ließ sich aus diesem Repo nicht reproduzieren.
- **Stash 44ee21e aufgeräumt**: Inhalt war nachweislich in HEAD, Backup liegt
  unter `/data/data/com.termux/files/usr/tmp/stash-44ee21e-backup.patch`.
- Offen und unangetastet: der API-Proxy für msgraph wartet weiter auf den
  GitHub-Plan (Functions sind auf diesem Account per Shell nicht von "kein
  Plan" unterscheidbar). Details in `msgraph/react/NOTES-API-PROXY.md`.


---

## JSmol — Stand 2026-10-03

Vier Seiten sind live, 23 Tests in CI, Gate-Budget 50 von 60 MB.
Was hier steht, ist gemessen, nicht geplant. Die vollständige
Messhistorie steht in `jsmol-local/INTEGRATION-PLAN.md` Abschnitt 8.

### Erledigt und verifiziert

- [x] Auszug 155 MB → 50 MB, Ausschlussliste als Gate-Budget
- [x] `j2s/core` liegen neben `JSmol.min.js` (relativer `j2sPath`, sonst
      lädt der Viewer und zeigt nichts — ohne Fehlermeldung)
- [x] Workbench: 19 Strukturen in 4 Gruppen, Sidebar scrollbar,
      Desktop-Scrollleiste gemessen (758 px sichtbar, 1163 px Inhalt)
- [x] Reset-Button: drei Jmol-Eigenheiten (Reihenfolge bindend, ein
      langer String als *ein* Aufruf tut nichts, Standardstil ist
      strukturabhängig)
- [x] MolGrid: 12 Instanzen, 32 gemessen möglich auf dem 2D-Pfad
      (Planungsvoraussetzung "8 WebGL-Kontexte" war falsch)
- [x] Nachmess-Fenster misst bis zur Ruhe statt nach fester Zeit
- [x] SMILES-Eingabe über das Präfix `:smiles:` — 5 von 5 Atomzahlen
      exakt (meine Falschaussage vom 2026-10-02 ist korrigiert)
- [x] Viewport: Panels passen bei 1600/1440/1280/1200/1080/1024/900/412 px,
      `docW == Viewport` an allen Breiten
- [x] `JSmol.GLmol.min.js` liegt im Repo, Seiten bleiben auf HTML5

### Offen — mit Aufwand

| Punkt | Warum offen | Aufwand |
|---|---|---|
| **Datei-Upload** | Vier Wege gemessen, alle gescheitert. Der Worker war fehlerfrei, der J2S-Kern kann die Datei nicht lesen. Braucht einen Server. | hoch, mit Backend |
| **WebGL-Pfad** | Modul und Renderer bauen sich auf (`_Canvas3D (Jmol/GLmol)`), aber der Testbrowser rendert nichts: Shader linken, `getError()` ist 0, `readPixels` liefert 0 von 40.000 Pixeln. Auf einem Gerät mit echtem Treiber ungetestet. | ein Einzeiler, **nicht verifizierbar hier** |
| **SMILES-Editor** | Auswahl aus 13 Vorschlägen funktioniert. Freitext-Eingabe getestet nicht — der Kern bräuchte Fehlermeldungen für Tippfehler, die er nicht liefert. | mittel |
| **Crambin-Tunnel** | Zeichnet schrittweise über 40 s. Kein Fehler, aber die Anzeige folgt nie exakt. Messung läuft bis zur Ruhe, Deckel bei 20 Durchläufen. | erledigt, Rest Eigenheit |
| **Lizenz-Vollständigkeit** | `jsmol/LICENSE-JSmol.txt` nennt Jmol (LGPL 2.1) und JSmol (MIT), aber nicht jede der 1731 Einzeldateien. Bei einer eigenen Distribution muss die Upstream-LICENSE-Datei mit. | klein |

### Bewusst nicht gebaut

- **Reaktionsberechnung** (Energie, Geometrie-Optimierung). Der J2S-Kern
  hat keinen Reaktionsmotor: `load reaction "CCO>>CC=O"` ändert die
  Farbquote von 5,25 % auf 5,51 % — das ist eine Struktur, keine
  Reaktion. Die Sandbox heißt deshalb „Reaktions-Sandbox" und meint
  SMILES-Eingabe, nicht Chemie.
- **Struktur-Datenbank.** 19 kuratierte Dateien aus dem Jmol-Testbestand.
  Eine Sammlung mit eigenen Strukturen wäre ein eigenes Thema.

### Wenn es weitergeht, in dieser Reihenfolge

1. **Upload** — nur mit Server. Ohne Backend ist es nicht erreichbar,
   und acht weitere Versuche im Browser ändern daran nichts.
2. **SMILES-Freitext** — die 13 Vorschläge sind ein Kompromiss. Ein
   echtes Eingabefeld braucht eine Fehleranzeige, die der Kern nicht
   liefert; ein Vorbau (SMILES validieren, dann übergeben) wäre der Weg.
3. **WebGL auf einem echten Gerät** — ein Einzeiler plus Screenshot.
   Von hier aus nicht entscheidbar.

### Was sich als Fehlerklasse herausgestellt hat

Drei Fälle, in denen ein Messfehler wie ein Produktfehler aussah:

1. `Jmol.script()` mit der Applet-ID statt dem Objekt — meldete
   „Viewer rendert nicht", er lief die ganze Zeit.
2. Messskript auf `cvA` statt auf `rxAppletA_1_canvas2d` — meldete
   „nicht gezeichnet" bei sauber gerenderten 9,49 %.
3. Ein Block-Ersetzen hat `progress()` mitverschluckt — `node --check`
   grün, Seite still, zwölf leere Kästen.

Derselbe Fehler noch einmal: Ein Syntaxfehler im inline Script lässt
den Browser eine leere Seite ohne jede Meldung zeigen. Deshalb prüft
jeder Test zuerst `new Function(js)` auf den extrahierten Block, und
`tests/jsmol-pages.test.mjs` prüft zusätzlich, dass jede aufgerufene
Funktion auch definiert ist.
