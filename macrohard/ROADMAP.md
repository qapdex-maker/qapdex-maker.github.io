# ROADMAP — macrohard/ (MakerOS)

Stand: 2026-09-25 · v2.11.45 · 25 Apps · 119 Tests grün

## 1. Aktueller Status (v2.11.45)

### Stabil (2026-09-21)

| App | ID | Version | Features |
|-----|----|---------|----------|
| Notepad | notepad | v2.11.41 | Undo/Redo, Zeilennummern, Suchen/Ersetzen, Font-Size, Shortcuts, Export |
| Calculator | calculator | v2.11.41 | Speicher (M+/M-/MR/MC), Konstanten (π, e, φ), SCI-Modus, History |
| Terminal | terminal | v2.11.44 | 25 Befehle, Tab-Completion, Shared FS, **Mobile große Eingabe (44px)** |
| Explorer | explorer | v2.11.44 | Breadcrumb, Sortierung, Kopieren/Verschieben, Papierkorb, **Mobile Drawer + Listenansicht** |
| Paint | paint | v2.11.12 | 24 Farben, Shape-Tools, Export PNG, Undo/Redo, Fill, Eraser |
| Browser | browser | v2.11.38 | Bookmarks, History, Home-Seite, iframe-Fallback |
| Music | music | v2.11.45 | Sequencer-Playback-Fix (AudioContext + Synth-Start/Stop), Radio-Fallback auf 20 geprüfte Sender, API auf 12 plausible HTTPS-Streams begrenzt, EQ/Visualizer |
| Chat | chat | v2.11.37 | Bot-Antworten, Typing-Indicator, Kontakt-Status |
| Docs | docs | v2.11.41 | Markdown-Toolbar, Export .md, Preview |
| Settings | settings | v2.11.41 | 4 Tabs, Wallpaper-Galerie, Theme-Engine, Export/Import JSON, SW Registrierung |
| Links | links | v2.11.31 | CRUD, Kategorien, JSON Import/Export |
| AMIBIOS | amibios | v2.11.31 | Boot-Sequenz, 7 Tabs, CRT-Style, PC Speaker |
| Taskmgr | taskmgr | v2.11.36 | Prozesse, Leistung (Sparklines, CPU-Smoothing), App-Verlauf |
| Sysinfo | sysinfo | v2.11.40 | 9 Sektionen (OS/Hardware/Browser/Netzwerk/Speicher/Sitzung/Battery/Geo/Media) |
| Calendar | calendar | v2.11.39 | Ereignisse CRUD, Monatsnav, Event-Dots |
| Clock | clock | v2.11.41 | Digital, Weltzeit (8 Städte), Analog-Uhr, Timer, Stoppuhr |
| Colorpicker | colorpicker | v2.11.31 | HSL, Komplementärfarbe, Palette |
| PWGen | pwgen | v2.11.41 | Stärke-Anzeige, 10x Generator, Custom Zeichen-Set |
| QRGen | qrgen | v2.11.41 | Farbe + Größe wählbar, SVG Export |
| Viewer | viewer | v2.11.41 | Zoom +/-/Fit, Bildinfo, Vollbild |
| Game | game | v2.11.41 | vs CPU (KI), 4×4 Modus, PvP/PvE |
| Editor | editor | v2.11.40 | Undo/Redo, Suchen/Ersetzen, Font-Size, Shortcuts |
| ImgEditor | imgeditor | v2.11.30 | Crop, Rotate, Resize, Filter, Export |
| Pomodoro | pomodoro | v2.11.30 | 25/5 Timer, SVG-Ring, Sessions |
| Notes | notes | v2.11.30 | Tags, Suche, Markdown-Preview, Verschlüsselung, Papierkorb |

---

## 2. Refactor-Plan

### Priorität A — Quick Wins
- [x] Notepad: Undo/Redo, Suchen/Ersetzen, Zeilennummern
- [x] Calculator: Speicher, Konstanten, SCI-Modus
- [x] Terminal: 25 Befehle, Tab-Completion
- [x] Explorer: Breadcrumb, Sortierung, Kopieren, Papierkorb
- [x] Paint: Undo/Redo, Shape-Tools, Fill, Eraser
- [x] Browser: Bookmarks, History, Tab-System
- [x] Music: Sequencer, Radio, EQ, Visualizer, BPM Input
- [x] Chat: Bot-Antworten, Typing-Indicator
- [x] Docs: Markdown-Toolbar, Export, Preview
- [x] Settings: Theme-Engine, Export/Import, SW Registrierung
- [x] Links: CRUD, Kategorien, Import/Export
- [x] AMIBIOS: 7 Tabs, CRT-Style
- [x] Taskmgr: Sparklines, App-Verlauf
- [x] Sysinfo: 9 Sektionen
- [x] Kalender: Events CRUD, Monatsnav
- [x] Clock: Weltzeit, Timer, Stoppuhr
- [x] Colorpicker: HSL, Komplementärfarbe
- [x] PWGen: Stärke-Anzeige, 10x Generator
- [x] QRGen: Farbe, Größe, SVG
- [x] Viewer: Zoom, Bildinfo
- [x] Game: CPU-KI, 4×4 Modus
- [x] Editor: Undo/Redo, Suchen/Ersetzen
- [x] ImgEditor: Crop, Rotate, Resize, Filter
- [x] Pomodoro: 25/5 Timer, SVG-Ring
- [x] Notes: Tags, Suche, Markdown, Verschlüsselung

### Priorität B — Erweiterungen (TODO)
- [ ] Notepad: Datei-Export (.txt)
- [ ] Calculator: History-LocalStorage
- [ ] Terminal: Mehr Befehle (curl, ping)
- [ ] Explorer: Multi-Select, Drag & Drop Sortierung
- [ ] Paint: Mehr Formen (Dreieck, Stern)
- [ ] Browser: Bookmarks-LocalStorage
- [ ] Music: Visualizer-FFT, mehr Samples
- [ ] Chat: Emoji-Picker
- [ ] Docs: Live-Preview
- [ ] Settings: Wallpaper-Slideshow
- [ ] AMIBIOS: PC Speaker Töne
- [ ] Taskmanager: Mehr Metriken (RAM, Netzwerk)
- [ ] Sysinfo: Battery-API
- [ ] Kalender: Event-Benachrichtigungen
- [ ] Clock: Alarm
- [ ] PWGen: Clipboard-Copy
- [ ] QRGen: Download-Button
- [ ] Game: Bessere KI (Minimax)
- [ ] Editor: Syntax-Highlighting
- [ ] ImgEditor: Undo/Redo
- [ ] Pomodoro: Long Break, CSV Export
- [ ] Notes: Tags-Filter, Autosave

### Priorität C — Neue Features (TODO)
- [ ] File Manager: Papierkorb leeren
- [ ] Global Search: Ctrl+K (Apps, Dateien, Einstellungen)
- [ ] Notifications: Desktop-Benachrichtigungen
- [ ] PWA: Offline-Modus
- [ ] Performance: IntersectionObserver Lazy Loading
- [ ] i18n: Komplette Übersetzungen (DE/EN/FR)
- [ ] A11y: ARIA-Labels, Skip-Link, Focus-Visible

---

## 3. Technische Schulden

- [ ] AudioContext: Single Instance für alle Apps
- [ ] Sequencer: Lookahead-Scheduling optimieren
- [ ] Radio: API-Fallback wenn radio-browser.info down
- [ ] Tests: Integrationstests für Apps
- [ ] Code: Kommentare, JSDoc
- [ ] Performance: Lazy Loading für App-Bodies
- [ ] Architektur: `assets/js/*` als unabhängige Parallelmodule bereinigen oder in `app.js` migrieren; aktuell nur `storage.js` als Classic-Facade geladen, `main.js`/`i18n.js`/`window-manager.js` bleiben wegen unvollständiger Parallelimplementierung außen vor
- [ ] Lint: `assets/app.js` schrittweise von Warnungen auf Fehler-Gate umstellen; nach dem Prettier-Lauf 2.029 Warnungen, davon 1.260 `no-var` und 0 `indent`

---

## 4. Changelog

### v2.11.45 (2026-09-25)
- Fix: Music-Beatpad AudioContext-Kontext und Synth-Start/Stop-Reihenfolge
- Fix: Music-X-Button schließt Fenster; Kalender-X-Button mit ungültigem Event-Cache abgesichert
- Radio: 20 geprüfte Fallback-Sender, API auf 12 plausible HTTPS-Streams begrenzt
- 25/25 App-Fenster-X-Buttons dynamisch im Browser verifiziert
- 119 Tests grün
- Live verifiziert nach Push auf Commits `5aed13a` (Prettier) und `ab8c447` (Samples/CORS)

### v2.11.45 (2026-09-21)
- Fix: Explorer Mobile Sidebar-Drawer overflow:hidden überschrieben

### v2.11.44 (2026-09-21)
- Mobile UX: Touch-Resize (20px Hitbox + Pinch-to-Zoom)
- Mobile UX: Window-Drag auf Mobile aktiviert
- Mobile UX: Fenster starten auf 85vw × 75vh
- Explorer Mobile: Sidebar als Drawer (☰ Toggle), Listenansicht
- Explorer Mobile: Toolbar-Buttons mit 36px Touch-Targets
- Terminal Mobile: Eingabefeld 44px Höhe, 16px Schrift
- Desktop-Icon-Grid mobil: 88×98px statt 68×78px
- 68 Tests grün

### v2.11.43 (2026-09-21)
- Audio Pipeline Cleanup: soundCtx vs audioCtx getrennt
- Beatpad BPM Input: Number-Input (40-300) statt Dropdown
- Beatpad Dropdown-Change: Nur Buffer aktualisieren
- Radio: Lädt 30 Sender via API beim Öffnen
- 68 Tests grün

### v2.11.42.1 (2026-09-20)
- Sequencer Volume Fix, Custom Sample Upload, Solo/Mute, Pattern Bank, Swing, Steps
- Radio + EQ + Visualizer Pipeline
- Explorer Single-Instanz
- 68 Tests

### v2.11.42 (2026-09-19)
- Alle 25 Apps refaktoriert
- 66 Tests, i18n, A11y, Performance
- Explorer v3.0

### v2.11.41 (2026-09-19)
- Notepad + Calculator v2.0

### v2.11.40 (2026-09-19)
- Systeminfo, Kalender, Chat, Browser, Radio
