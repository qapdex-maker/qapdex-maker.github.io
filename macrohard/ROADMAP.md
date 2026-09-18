# ROADMAP — macrohard/ (MakerOS)

Stand: 2026-09-18. Arbeitsstand, NICHT push-pflichtig.
Lokaler HEAD: siehe `git log`.
Push/Deploy zu GitHub Pages NUR auf Auftrag ("Bescheid"/"uebertragen").

## 0. Status-Querschnitt (verifiziert, 2026-09-18)

### macrohard/ (v2.11.32, aktiv entwickelt)
- 22 Apps (11 Foundation + 11 Extension Pack), ES6-Module, PWA
- Unit-Tests: 7 Tests, alle grün
- CI/CD: GitHub Actions (lint + deploy)
- v2.11.23: Browser iframe fix (brLoaded-Flag)
- v2.11.24: Docs "Made by Alexander Kleine"
- v2.11.25: Music Player Rewrite (Upload, Radio, Favoriten, Tabs)
- v2.11.26: Explorer Navigation Fix (Backslash zwischen Pfad und Ordnername)
- v2.11.27: Music Player Audio Fixes (Beatpad eigener AudioContext, Fallback-Radio)
- v2.11.28: Music Player setupAudio() lazy init, audioEl statt audio
- v2.11.29: Mobile Apps sichtbar (flex-wrap:wrap, overflow-y:auto)
- v2.11.30: Music Player Refactor — Sadee-Inspired UI (Album Art, Sidebar, Controls)
- v2.11.30: Mobile Fenster immer Vollbild (openApp/snapWindow/restoreSession)
- v2.11.31: Pattern Sequencer mit Lookahead-Scheduling + 31 Samples
- v2.11.31: AMIBIOS Refactor (Boot-Sequenz, 7 Tabs, interaktive Felder, PC Speaker)
- v2.11.31: CI Fix (deploy-pages permission)
- v2.11.31: Taskmanager Fix (Interval-Cleanup, Null-Checks, Leistung-Tab)
- v2.11.32: App-Audit Fixes (Notepad, Music, Chat, Links, Browser, Clock)

## 1. Apps Übersicht (22 Apps)

### Foundation (11 Apps)
| App | ID | Status | Letzter Test |
|-----|-----|--------|--------------|
| Notepad | notepad | ✅ Stabil | localStorage, Suche, Wortzähler, Export |
| Calculator | calculator | ✅ Stabil | Tastatur, History, SCI |
| Terminal | terminal | ✅ Stabil | touch/rm/mkdir/cp/mv/find/grep, colored, Tab |
| Explorer | explorer | ✅ Stabil | New Folder/File, Search, Umbenennen, Löschen, Multiselect |
| Paint | paint | ✅ Stabil | 24 Farben, Shapes, Export PNG, Undo/Redo |
| Browser | browser | ✅ Stabil | Tab-System, Quick-Links, DuckDuckGo |
| Music | music | ✅ Refactored | Pattern Sequencer, Radio, Upload, Favoriten |
| Chat | chat | ✅ Stabil | Kontakte, localStorage, Emoji |
| Docs | docs | ✅ Stabil | editable, Export .md, Preview |
| Settings | settings | ✅ Stabil | 4 Tabs, Wallpaper-Galerie, Theme-Engine |
| Links | links | ✅ Stabil | CRUD, Kategorien, JSON Import/Export |

### Extension Pack (11 Apps)
| App | ID | Status | Letzter Test |
|-----|-----|--------|--------------|
| Taskmanager | taskmgr | ✅ Fixed | Prozesse, Leistung, App-Verlauf, Start, Benutzer |
| Systeminfo | sysinfo | ✅ Stabil | OS/Hardware/Browser/Netzwerk/Speicher/Sitzung |
| Kalender | calendar | ✅ Stabil | Monatsansicht |
| Uhr | clock | ✅ Stabil | Timer + Stoppuhr + Wecker |
| Farbwähler | colorpicker | ✅ Stabil | Color Picker |
| Passwort-Generator | pwgen | ✅ Stabil | 6-32 Zeichen |
| QR-Generator | qrgen | ✅ Stabil | Canvas |
| Bildbetrachter | viewer | ✅ Stabil | Drag & Drop |
| Tic-Tac-Toe | game | ✅ Stabil | |
| AMIBIOS | amibios | ✅ Refactored | Boot-Sequenz, 7 Tabs, interaktive Felder |
| Omarchy | omarchy | ✅ Stabil | Quattro |

## 2. Fahrplan

### Phase 1 — Stabilisierung (FERTIG)
- [x] Bug-Hunting Re-Check (alle Bugs grün, echte Runs)
- [x] Browser iframe Fix (v2.11.23)
- [x] Music Player Rewrite + Fixes (v2.11.25-v2.11.28)
- [x] Explorer Navigation Fix (v2.11.26)
- [x] Mobile Apps sichtbar (v2.11.29)

### Phase 2 — Refactoring (AKTIV)
- [x] Music Player Refactor (v2.11.30)
- [x] Pattern Sequencer (v2.11.31)
- [x] AMIBIOS Refactor (v2.11.31)
- [ ] Systematische App-Prüfung (alle 26 Apps)

### Phase 3 — Features (GEPLANT)
- [ ] App-spezifische Verbesserungen (siehe Offene Punkte)
- [ ] Performance-Optimierung (Sequencer Lookahead)
- [ ] Erweiterte Tests pro App

## 3. Offene Punkte / Tech Debt

### 🔴 Kritisch
| Thema | App | Status | Notiz |
|-------|-----|--------|-------|
| Sequencer startet nicht | music | 🔴 Offen | Controls nur einmalig init, toggleStep aus UI gelöst |
| AudioGraph Reset | music | 🟡 Teilweise | setupAudio() lazy, aber Buffer-Locked bei Track-Wechsel |

### 🟡 Verbesserungswürdig
| Thema | App | Status | Notiz |
|-------|-----|--------|-------|
| Radio Progress | music | 🟡 Offen | duration=Infinity bei Streams |
| Visualizer Loop | music | 🟡 Offen | requestAnimationFrame dedupliziert |
| Beatpad Fallback | music | 🟡 Offen | Oscillator-Fallback wenn Samples fehlen |

### ✅ Erledigt (v2.11.31)
| Thema | App | Status | Notiz |
|-------|-----|--------|-------|
| Taskmanager Interval-Leak | taskmgr | ✅ Erledigt | clearInterval vor neuer Erstellung |
| AMIBIOS statisch | amibios | ✅ Erledigt | Vollständig interaktiv |
| CI Deploy-Failure | ci | ✅ Erledigt | id-token: write permission |

## 4. App-Prüfungschecks (systematisch)

Jede App wird geprüft auf:
1. **Öffnen/Schließen** — Fenster verhalten sich korrekt?
2. **Fokus/Z-Order** — Klick auf Fenster holt es nach vorne?
3. **Drag** — Fenster verschiebbar?
4. **Resize** — Fenster skalierbar?
5. **Snap** — Fenster schnappt an Ränder?
6. **Taskbar-Icon** — Icon erstellt/entfernt korrekt?
7. **Session Restore** — Wiederherstellung nach Reload?
8. **Mobile** — Vollbild auf kleinen Screens?
9. **Funktionalität** — App-spezifische Features arbeiten?
10. **Memory-Leaks** — Intervals/Timer gestoppt?

## 5. Wiederverwendbare Checks (lokal ausführbar)

```bash
# Syntax-Check
cd macrohard && node --check assets/app.js

# Unit-Tests
node tests/app.test.js

# ESLint (falls konfiguriert)
npx eslint assets/app.js

# Lokaler Server
python3 -m http.server 8099

# Live-Verifikation
curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/macrohard/index.html
```
