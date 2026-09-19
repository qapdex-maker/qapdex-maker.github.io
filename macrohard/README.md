# MakerOS — qapdex-maker.github.io/macrohard/

Session 2026-09-19 · v2.11.42 (2026-09-19). Standalone subpage in `qapdex-maker.github.io`.

## Live
- **URL**: https://qapdex-maker.github.io/macrohard/
- **Branch**: `main`
- **Tests**: 66/66 passing (`node tests/app.test.js`)
- **Cache-Bust**: `?v=42`

## Domain
- **qapdex.com**: Gekauft am 2026-09-19 (0,87 Cent für 1 Jahr, checkdomain.de)
- **Status**: Custom Domain Versuch reverted (Redirect-Schleife GitHub ↔ qapdex.com)
- **DNS**: Einträge auf checkdomain.de entfernt, Domain leitet standardmäßig auf qapdex-maker.github.io
- **Nächster Schritt**: GitHub Pages Custom Domain korrekt einrichten (CNAME + Settings → Pages → Custom Domain)

## Contact
- info@qapdex.com

## Structure
- `index.html` — OS shell + desktop + boot/lock + i18n inline + CSS-Criticals + app cards grid
- `assets/site.css` — design tokens, 4 themes, dark mode, components, animations, task view, help overlay, notifications, transitions, a11y
- `assets/app.js` — boot→lock→desktop, 25 apps, multi-instance, drag & drop, task view, help overlay, notification center, i18n, lazy loading (~5800 lines)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (stale-while-revalidate, network-first, quota check, offline fallback)
- `assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style)
- `assets/samples/` — 31 drum samples (MP3 + WAV) für Pattern Sequencer
- `tests/app.test.js` — 66 unit tests (Node.js test runner)

## Apps (v2.11.42 — 25 Apps)

### Foundation (11 Apps)
1. **Notepad** — Undo/Redo (50 Schritte), Zeilennummern, Suchen & Ersetzen Overlay, Font-Size Selector, Ctrl+S/F, Export .txt
2. **Calculator** — Speicher (M+/M-/MR/MC), Konstanten (π, e, φ), SCI-Modus, Tastatur, History (12)
3. **Terminal** — 25 Befehle (help/ls/cd/pwd/touch/rm/mkdir/cp/mv/find/grep/echo/date/clear/whoami/cat/colors/tree/head/tail/wc/calc/history/exit/about), Tab-Completion, colored output, Shared FS mit Explorer
4. **Explorer** — Breadcrumb-Navigation (Zurück/Weiter/Up), Sortierung (Name/Typ/Größe), Listen/Raster-Ansicht, Kopieren/Verschieben, Papierkorb leeren, Shared FS mit Terminal
5. **Paint** — 24 Farben, Shape-Tools, Export PNG, Undo/Redo, Radiergummi, Linienbreite, Fill, Clear, Touch
6. **Browser** — Bookmarks (localStorage), History, Home-Seite mit Quick-Links, Tab-System, iframe-Fallback
7. **Music** — Pattern Sequencer (8 Tracks, 16 Steps, Lookahead, 31 Samples), Radio (48 Fallback-Stationen, Multi-Server, Suche), Upload, Favoriten, Sadee-UI, EQ 6-Band, Visualizer
8. **Chat** — Bot-Antworten (Keywords), Typing-Indicator, Kontakt-Status, Emoji-Bar, Suggestion-Chips, localStorage
9. **Docs** — Markdown-Toolbar (Bold/Italic/Heading/Link/Code/Quote/List), Export .md, Preview, localStorage
10. **Settings** — 4 Tabs, Wallpaper-Slideshow (5-60s), Accent-Color Picker (live), Theme-Engine, Icon-Größe, Export/Import JSON, Privacy-Clear
11. **Links** — Sortierung (Name/Zuletzt/Fav), Favoriten-Stern, Zuletzt besucht, JSON Import/Export, Omarchy Integration

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

## New in v2.11.42
- **Alle 25 Apps** refaktoriert mit Undo/Redo, Suchen, Font-Size, Zoom, Sortierung
- **66 Tests** mit App-Prüfung, ImgEditor, Pomodoro, Notes, C4, C5
- **Explorer v3.0**: Breadcrumb, Sortierung, Ansicht, Kopieren, Papierkorb
- **i18n**: DE/EN/FR Übersetzungen, Sprachwechsel ohne Reload
- **A11y**: Skip-Link, ARIA-Labels, prefers-reduced-motion, Focus-Visible, High-Contrast
- **Performance**: IntersectionObserver Lazy Loading für schwere Apps
- **Tests**: 66/66 grün

## Animationen & Übergänge
- **Tab-Inhalte**: Fade + Slide (200ms)
- **Start-Menü**: Slide-Down + Scale (150ms)
- **Toast**: Slide-In von rechts, sanftes Ausblenden (300ms)
- **Taskbar-Icons**: Hover-Lift (-2px)
- **App-Cards**: Smooth Hover + Active Transition
- **Wallpaper**: Crossfade (300ms)
- **Theme**: Sanfter Übergang Dark/Light (200ms)
- **Fenster**: Open/Close Scale
- **Reduced Motion**: Alle Animationen respektieren prefers-reduced-motion

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
- v2.11.42 (2026-09-19): Alle 25 Apps refaktoriert, 66 Tests, i18n, A11y, Performance, Explorer v3.0
- v2.11.41 (2026-09-19): Notepad + Calculator v2.0 (Undo/Redo, Zeilennummern, Speicher)
- v2.11.40 (2026-09-19): Systeminfo (Battery/Geo/Media), Kalender (Events), Chat (Bot), Browser (Bookmarks), Radio (48 Stationen)
- v2.11.39 (2026-09-19): Kalender Refaktor (CRUD, Monatsnav)
- v2.11.38 (2026-09-19): Browser Refaktor (Bookmarks, History)
- v2.11.37 (2026-09-19): Chat Refaktor (Bot, Typing-Indicator)
- v2.11.36 (2026-09-19): Taskmanager (Sparklines, App-Verlauf)
- v2.11.35 (2026-09-19): Explorer/Terminal Shared FS
- v2.11.34 (2026-09-19): Sequencer Lookahead + `when`-Scheduling
- v2.11.33 (2026-09-19): Sequencer Start Fix (Synthesizer-Fallback)
- v2.11.32 (2026-09-19): App-Audit Fixes
- v2.11.31 (2026-09-19): Pattern Sequencer + AMIBIOS Refactor
- v2.11.30 (2026-09-19): Music Player Sadee-UI
- v2.11.29-v2.11.23: Mobile, Audio Fixes, Multi-Instanz, Task-View
- v2.11.22-v2.11.18: Bug-Hunting, neue Apps
- v2.11.1-v2.10: Extension-Pack, Browser-Fix, Start-Button-Fix
- v2.9-v2.7: AMIBIOS, Service Worker

## License
MIT License

## Author
Alexander Kleine (info@qapdex.com)
Made with Hermes Agent by Nous Research
