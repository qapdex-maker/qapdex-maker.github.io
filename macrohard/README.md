# MakerOS — qapdex-maker.github.io/macrohard/

Stand 2026-09-25 · v2.11.45 · Cache `?v=55` / `?v=40`.

## Live
- **URL**: https://qapdex-maker.github.io/macrohard/
- **Branch**: `main`
- **Tests**: 119/119 passing (`npm test`)
- **Cache-Bust**: `?v=55`

## Domain
- **qapdex.com**: Gekauft am 2026-09-19 (0,87 Cent für 1 Jahr, checkdomain.de)
- **Status**: Custom Domain aktiv — CNAME-Datei erstellt, GitHub Pages konfiguriert
- **DNS**: Zeigt auf GitHub Pages IPs (185.199.108-111.153) + Hetzner (88.99.101.251, muss entfernt werden)

## Contact
- info@qapdex.com

## Structure
- `index.html` — OS shell + desktop + boot/lock + i18n inline + CSS-Criticals + app cards grid
- `assets/site.css` — design tokens, 4 themes, dark mode, components, animations, task view, help overlay, notifications, transitions, a11y
- `assets/app.js` — boot→lock→desktop, 25 apps, multi-instance, drag & drop, task view, help overlay, notification center, i18n (~6.4K ZL)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (stale-while-revalidate, network-first, quota check, offline fallback)
- `assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style)
- `assets/samples/` — 31 drum samples (MP3 + WAV) für Pattern Sequencer
- `tests/` — 119 Tests (`npm test`), darunter echte app.js-, Storage-, Safe-Evaluator-, XSS-, Music-, Close- und Hardening-Regressionen

## Apps (25 Apps)

### Foundation (11 Apps)
1. **Notepad** — Undo/Redo (50 Schritte), Zeilennummern, Suchen & Ersetzen Overlay, Font-Size Selector, Ctrl+S/F, Export .txt
2. **Calculator** — Speicher (M+/M-/MR/MC), Konstanten (π, e, φ), SCI-Modus, Tastatur, History (12)
3. **Terminal** — 25 Befehle, Tab-Completion, colored output, Shared FS mit Explorer
4. **Explorer** — Breadcrumb-Navigation, Sortierung (Name/Typ/Größe), Listen/Raster-Ansicht, Kopieren/Verschieben, Papierkorb leeren, Shared FS mit Terminal, Kontextmenü, Single-Instanz
5. **Paint** — 24 Farben, Shape-Tools, Export PNG, Undo/Redo, Radiergummi, Linienbreite, Fill, Clear, Touch
6. **Browser** — Bookmarks (localStorage), History, Home-Seite mit Quick-Links, Tab-System, iframe-Fallback
7. **Music** — Pattern Sequencer (8 Tracks, 8/16/32 Steps, Lookahead, Samples + Synth-Fallback, Custom Upload, Solo/Mute, Pattern Bank, Swing, Undo/Redo/Copy/Paste, BPM 40-300), Radio (max. 12 API-Streams + 20 geprüfte Fallback-Sender), Upload, Favoriten, EQ 6-Band, Visualizer
8. **Chat** — Bot-Antworten (Keywords), Typing-Indicator, Kontakt-Status, Emoji-Bar, Suggestion-Chips, localStorage
9. **Docs** — Markdown-Toolbar (Bold/Italic/Heading/Link/Code/Quote/List), Export .md, Preview, localStorage
10. **Settings** — 4 Tabs, Wallpaper-Galerie (12 Presets), Accent-Color Picker (live), Theme-Engine (Ignite/Ocean/Forest/Mono), Icon-Größe, Export/Import JSON, Privacy-Clear, Service Worker Registrierung
11. **Links** — Sortierung (Name/Zuletzt/Fav), Favoriten-Stern, Zuletzt besucht, JSON Import/Export

### Extension Pack (14 Apps)
12. **Taskmanager** — Prozesse, Leistung (Sparklines, CPU-Smoothing), App-Verlauf, Start-Apps (Toggle), Benutzer
13. **Systeminfo** — 9 Sektionen: OS, Hardware, Browser, Netzwerk, Speicher, Sitzung, Battery, Geolocation, Media. Refresh-Button
14. **Kalender** — Ereignisse CRUD (localStorage), Monatsnav, Event-Dots, 42-Zellen-Grid
15. **Clock** — Digital, Weltzeit (8 Städte), Analog-Uhr (Canvas), Timer (Min:Sek), Stoppuhr, Ton, Fullscreen
16. **Colorpicker** — HSL-Anzeige, Komplementärfarbe, Palette speichern (12 Farben), live Preview
17. **Passwort-Generator** — Stärke-Anzeige (5 Stufen), Custom Zeichen-Set, 10x Generator, Verlauf (10)
18. **QR-Generator** — Farbe + Größe wählbar, SVG Export, pixelgenau
19. **Bildbetrachter** — Zoom +/-/Fit, Bildinfo (Größe/KB), Vollbild-Modus, Drag & Drop
20. **Tic-Tac-Toe** — vs CPU (KI blockiert), 4×4 Modus, PvP/PvE Toggle
21. **AMIBIOS Setup** — Boot-Sequenz, 7 Tabs, CRT-Style, PC Speaker
22. **Editor** — Undo/Redo, Suchen/Ersetzen, Font-Size, Zeilennummern, Ctrl+S/F, Dark Theme
23. **Image Editor** — Ebenen (Layers), Clone/Stamp, Text, Größe ändern, Drehung, Filter, Undo/Redo
24. **Pomodoro** — Statistik (heute/gesamt), Long Break (alle 4 Sessions), CSV Export, Pausen-Übungen, Ton
25. **Notes** — Verschlüsselung (Base64), Papierkorb (Wiederherstellen), Teilen (URL), Autosave-Indikator, Drag & Drop Sortierung

## New in v2.11.45 (2026-09-21)
- Fix: Explorer Mobile Sidebar-Drawer (overflow:visible)

## New in v2.11.44 (2026-09-21)
- Mobile UX: Touch-Resize (20px Hitbox + Pinch-to-Zoom)
- Mobile UX: Window-Drag auf Mobile aktiviert
- Mobile UX: Fenster starten auf 85vw × 75vh
- Explorer Mobile: Sidebar als Drawer (☰ Toggle), Listenansicht
- Explorer Mobile: Toolbar-Buttons mit 36px Touch-Targets
- Terminal Mobile: Eingabefeld 44px Höhe, 16px Schrift
- Desktop-Icon-Grid mobil: 88×98px statt 68×78px
- Console: 0 Fehler
- Tests: 68/68 grün

## New in v2.11.43 (2026-09-21)
- Audio Pipeline Cleanup: soundCtx vs audioCtx getrennt
- AudioContext Guard: setupAudio() nur EINMAL
- Beatpad BPM Input: Number-Input (40-300) statt Dropdown
- Beatpad Dropdown-Change: Nur Buffer aktualisieren
- Beatpad Scheduler: Safety-Counter gegen Endlosschleife
- Beatpad Synth: Sample-aware Fallback
- Radio: Lädt 30 Sender via radio-browser.info API
- Tests: 68/68 grün

## New in v2.11.42.1 (2026-09-20)
- Sequencer Volume Fix, Custom Sample Upload, Solo/Mute, Pattern Bank, Swing, Steps
- Radio + EQ + Visualizer Pipeline
- Explorer Single-Instanz
- 68 Tests

## Animationen & Übergänge
- Tab-Inhalte: Fade + Slide (200ms)
- Start-Menü: Slide-Down + Scale (150ms)
- Toast: Slide-In von rechts, sanftes Ausblenden (300ms)
- Fenster: Open/Close Scale
- Reduced Motion: Alle Animationen respektieren prefers-reduced-motion

## Platform Features
- Desktop-Kategorien (Alle / Produktivität / System / Media / Spiele)
- Start-Menü mit Echtzeit-App-Suche
- Ctrl+N/T/E/P/B/M/C/D/L/S/A Keyboard Shortcuts
- Desktop Rechtsklick-Menü
- Notification Center mit Toast-History
- Session Restore, Window Snapping, Touch-Optimierung
- PWA (manifest + Service Worker)
- i18n (Deutsch/English/Français)
- A11y (ARIA, Skip-Link, Reduced Motion, High Contrast)

## Taskbar (Neo-Brutalist 3D)
- 52px Höhe, echte Borders + 3D-Shadow
- Start-Button: Accent-Farbe, gelber Hover
- App-Icons: dynamisch, Focus-State (gelb), Minimized-State
- Notification Badge, Theme-Toggle (Ctrl+Shift+L), Clock

## Design-System
- CSS-Variablen, 4 Themes (Ignite/Ocean/Forest/Mono)
- Dark-Mode (prefers-color-scheme)
- Neo-Brutalist Komponenten (.btn, .input, .card, .pill)

## Version History
- v2.11.45 (2026-09-21): Fix Explorer Mobile Sidebar-Drawer
- v2.11.44 (2026-09-21): Mobile UX — Touch-Resize, Pinch, Window-Drag, Explorer Drawer, Terminal große Eingabe
- v2.11.43 (2026-09-21): Audio Pipeline Cleanup, Beatpad BPM Input, Radio API-Load
- v2.11.42.1 (2026-09-20): Sequencer Volume/Upload/Solo/Bank/Swing, Radio+EQ+Visualizer Pipeline
- v2.11.42 (2026-09-19): Alle 25 Apps refaktoriert, i18n, A11y, Performance, Explorer v3.0
- v2.11.41 (2026-09-19): Notepad + Calculator v2.0
- v2.11.40 (2026-09-19): Systeminfo, Kalender, Chat, Browser, Radio

## License
MIT License

## Author
Alexander Kleine (info@qapdex.com)
Made with Hermes Agent by Nous Research
