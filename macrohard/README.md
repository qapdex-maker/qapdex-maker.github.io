# MakerOS — qapdex-maker.github.io/macrohard/

Stand 2026-09-21 · v2.11.44 · Cache `?v=52`.

## Live
- **URL**: https://qapdex-maker.github.io/macrohard/
- **Branch**: `main`
- **Tests**: 68/68 passing (`node tests/app.test.js`)
- **Cache-Bust**: `?v=52`

## Domain
- **qapdex.com**: Gekauft am 2026-09-19 (0,87 Cent für 1 Jahr, checkdomain.de)
- **Status**: Custom Domain Versuch reverted (Redirect-Schleife GitHub ↔ qapdex.com)
- **DNS**: Einträge auf checkdomain.de entfernt, Domain leitet standardmäßig auf qapdex-maker.github.io

## Contact
- info@qapdex.com

## Structure
- `index.html` — OS shell + desktop + boot/lock + i18n inline + CSS-Criticals + app cards grid
- `assets/site.css` — design tokens, 4 themes, dark mode, components, animations, task view, help overlay, notifications, transitions, a11y
- `assets/app.js` — boot→lock→desktop, 25 apps, multi-instance, drag & drop, task view, help overlay, notification center, i18n, lazy loading (~6370 lines)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (stale-while-revalidate, network-first, quota check, offline fallback)
- `assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style)
- `assets/samples/` — 31 drum samples (MP3 + WAV) für Pattern Sequencer
- `tests/app.test.js` — 68 unit tests (Node.js test runner)

## Apps (25 Apps)

### Foundation (11 Apps)
1. **Notepad** — Undo/Redo (50 Schritte), Zeilennummern, Suchen & Ersetzen Overlay, Font-Size Selector, Ctrl+S/F, Export .txt
2. **Calculator** — Speicher (M+/M-/MR/MC), Konstanten (π, e, φ), SCI-Modus, Tastatur, History (12)
3. **Terminal** — 25 Befehle, Tab-Completion, colored output, Shared FS mit Explorer
4. **Explorer** — Breadcrumb-Navigation, Sortierung (Name/Typ/Größe), Listen/Raster-Ansicht, Kopieren/Verschieben, Papierkorb leeren, Shared FS mit Terminal, Kontextmenü, Single-Instanz
5. **Paint** — 24 Farben, Shape-Tools, Export PNG, Undo/Redo, Radiergummi, Linienbreite, Fill, Clear, Touch
6. **Browser** — Bookmarks (localStorage), History, Home-Seite mit Quick-Links, Tab-System, iframe-Fallback
7. **Music** — Pattern Sequencer (8 Tracks, 8/16/32 Steps, Lookahead, 31+ Samples, Custom Sample Upload, Synthesizer-Fallback, Solo/Mute per Track, Pattern Bank 4 Slots, Swing, Undo/Redo/Copy/Paste, BPM Input 40-300), Radio (30 Stationen via radio-browser.info API + 30 Fallback), Upload, Favoriten, EQ 6-Band, Visualizer
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

## New in v2.11.43 (2026-09-21)
- **Audio Pipeline Cleanup**: `soundCtx` (Sound-Effekte) vs `audioCtx` (Player) getrennt — keine Kollision mehr
- **AudioContext Guard**: `setupAudio()` nur EINMAL ausführen (MediaElementSource ist one-time-use)
- **Audio Resume**: Sync `resume()` + `play()` — kein User-Activation-Loss (NotAllowedError behoben)
- **Beatpad BPM Input**: Number-Input (40-300) statt Dropdown
- **Beatpad Dropdown-Change**: Nur Buffer aktualisieren, NICHT UI neu bauen (stoppt nicht den Sequencer)
- **Beatpad Scheduler**: Safety-Counter gegen Endlosschleife
- **Beatpad Synth**: Sample-aware Fallback basierend auf SAMPLE_LIBRARY
- **Beatpad AudioContext**: Dedizierter `AudioContext` für Sequencer (nicht geteilt mit Player)
- **Radio**: Lädt 30 Sender via radio-browser.info API beim Öffnen (nicht erst bei Tab-Klick)
- **Console**: 0 Fehler (nur erwartete Sequencer-Warnung im Headless-Modus)
- **Tests**: 68/68 grün

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
- v2.11.44 (2026-09-21): Mobile UX — Touch-Resize (20px Hitbox + Pinch), Window-Drag, 85vw Fenster, Explorer Drawer + Listenansicht, Terminal große Eingabe
- v2.11.43 (2026-09-21): Audio Pipeline Cleanup, Beatpad BPM Input, Radio API-Load, Console-Fehler behoben, 68 Tests
- v2.11.42.1 (2026-09-20): Sequencer Volume/Upload/Solo/Bank/Swing, Radio+EQ+Visualizer Pipeline, Explorer Single-Instanz, 68 Tests
- v2.11.42 (2026-09-19): Alle 25 Apps refaktoriert, 66 Tests, i18n, A11y, Performance, Explorer v3.0
- v2.11.41 (2026-09-19): Notepad + Calculator v2.0 (Undo/Redo, Zeilennummern, Speicher)
- v2.11.40 (2026-09-19): Systeminfo, Kalender, Chat, Browser, Radio
- v2.11.39-v2.11.30: Refaktoren, Sequencer, Music Player Sadee-UI
- v2.11.29-v2.11.18: Mobile, Audio Fixes, Multi-Instanz, Bug-Hunting
- v2.11.1-v2.10: Extension-Pack, Browser-Fix, Start-Button-Fix
- v2.9-v2.7: AMIBIOS, Service Worker

## License
MIT License

## Author
Alexander Kleine (info@qapdex.com)
Made with Hermes Agent by Nous Research
