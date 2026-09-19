# MakerOS — qapdex-maker.github.io/macrohard/

Session 2026-09-19 · v2.11.40 (2026-09-19). Standalone subpage in `qapdex-maker.github.io`.

## Live
- **URL**: https://qapdex-maker.github.io/macrohard/
- **Branch**: `main`
- **Tests**: 27/27 passing (`node tests/app.test.js`)
- **Cache-Bust**: `?v=40`

## Domain
- **qapdex.com**: Gekauft am 2026-09-19 (0,87 Cent für 1 Jahr, checkdomain.de)
- **Status**: Custom Domain Versuch reverted (Redirect-Schleife GitHub ↔ qapdex.com)
- **DNS**: Einträge auf checkdomain.de entfernt, Domain leitet standardmäßig auf qapdex-maker.github.io
- **Nächster Schritt**: GitHub Pages Custom Domain korrekt einrichten (CNAME + Settings → Pages → Custom Domain)

## Contact
- info@qapdex.com

## Structure
- `index.html` — OS shell + desktop + boot/lock + i18n inline + CSS-Criticals + app cards grid
- `assets/site.css` — design tokens, 4 themes, dark mode, components, animations, task view, help overlay, notifications, transitions
- `assets/app.js` — boot→lock→desktop, 25 apps, multi-instance, drag & drop, task view, help overlay, notification center (~4900 lines)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (stale-while-revalidate, network-first, quota check, offline fallback)
- `assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style)
- `assets/samples/` — 31 drum samples (MP3 + WAV) für Pattern Sequencer
- `tests/app.test.js` — 27 unit tests (Node.js test runner)

## Apps (v2.11.40 — 25 Apps)

### Foundation (11 Apps)
1. **Notepad** — textarea + Zeichen/Wortzähler, Ctrl+F Suche, localStorage auto-save (300ms debounce), Font-Größe, Export .txt
2. **Calculator** — eval-based, Tastatur, klickbare History (max 12), SCI-Modus (sin/cos/tan/sqrt/pow/log/abs/π/e)
3. **Terminal** — 25 Befehle (help/ls/cd/pwd/touch/rm/mkdir/cp/mv/find/grep/echo/date/clear/whoami/cat/colors/tree/head/tail/wc/calc/history/exit/about), Tab-Completion für Befehle und Pfade, colored output. Geteilter fsData mit Explorer
4. **Explorer** — virtual FS (C:\Users\macrohard\...), Tree links, Grid files, New Folder/File Toolbar, Drag & Drop, Umbenennen, Löschen, Multiselect, Kontextmenü. Geteilter fsData mit Terminal
5. **Paint** — canvas draw, 24 Farben, Shape-Tools, Export PNG, Undo/Redo, Radiergummi, Linienbreite, Fill, Clear
6. **Browser** — URL-Bar, Shortcuts, DuckDuckGo-Suche, Tab-System, Bookmarks (localStorage), History, Home-Seite mit Quick-Links, iframe-Fallback bei blockierten Seiten
7. **Music** — Pattern Sequencer (8 Tracks, 16 Steps, Lookahead-Scheduling, 31 Samples, Synthesizer-Fallback), Radio (radio-browser.info, 48 Fallback-Stationen, Multi-Server, Suche), Upload, Favoriten, Sadee-Inspired UI, Equalizer 6-Band mit Presets, Visualizer, Beatpad
8. **Chat** — Kontakte mit Status (online/idle/offline), Bot-Antworten (Keyword-Matching), Typing-Indicator, Notification-Badge, Emoji-Bar, localStorage, Timestamps, Suggestion-Chips
9. **Docs** — contenteditable Markdown, Export .md, Preview Toggle
10. **Settings** — 4 Tabs (Allgemein, Aussehen, Tastenkürzel, Datenschutz), Wallpaper-Galerie 12 Themes + Custom URL + Upload, Theme-Engine Ignite/Ocean/Forest/Mono, Icon-Größe, Desktop-Raster, Accent-Color, Font-Size, PWA SW registrieren, Privacy-Clear, Reset Defaults
11. **Links** — CRUD, Kategorien, JSON Import/Export, Omarchy Quattro Integration

### Extension Pack (14 Apps)
12. **Taskmanager** — Prozesse (offene Fenster, Beenden, Auto-Refresh), Leistung (CPU/RAM mit Sparklines, Random-Walk-Smoothing), App-Verlauf (getrackte App-Öffnungen), Start-Apps (4 Toggle-Switches), Benutzer. Alle 5 Tabs funktional
13. **Systeminfo** — 9 Sektionen: OS, Hardware, Browser, Netzwerk, Speicher, Sitzung, Battery (Ladezustand/Ladezeit/Restzeit), Geolocation (Breitengrad/Längengrad/Höhe/Genauigkeit), Media (Kamera/Mikrofon). Refresh-Button
14. **Kalender** — Monatsansicht mit Navigation (Vor/Zurück), heutiger Tag (blauer Marker), Ereignisse hinzufügen/löschen (Titel + Zeit), Event-Dots auf Tagen mit Events, localStorage-Persistenz
15. **Uhr** — Digital-Uhr, Timer (Countdown), Stoppuhr (ms-genau), Wecker
16. **Farbwähler** — Color Picker + Hex-Anzeige
17. **Passwort-Generator** — Länge 6-32 Zeichen, Kopieren
18. **QR-Generator** — Text → Canvas QR-Code (pixelgenau)
19. **Bildbetrachter** — Drag & Drop Bilder, Canvas-Render
20. **Tic-Tac-Toe** — Komplettes Spiel, Neustart
21. **AMIBIOS Setup** — Boot-Sequenz, 7 Tabs, interaktive Felder, PC Speaker (iframe integriert, CRT-Style)
22. **Editor** — Code-Editor mit Zeilennummern, Syntax-Highlighting (JS/HTML/CSS/MD), File Open/Save, localStorage
23. **Image Editor** — Bild laden, Crop, Rotate, Resize, Filter (Grayscale/Sepia/Blur/Invert), PNG/JPG Export
24. **Pomodoro** — 25-min Arbeit / 5-min Pause Timer mit SVG-Ring, Sessions-Counter, konfigurierbar
25. **Notes** — Notizen-App mit Tags, Suche, Markdown-Preview, Sidebar-Navigation, localStorage

## New in v2.11.40
- **Systeminfo**: 9 Sektionen (neu: Battery, Geolocation, Media), Refresh-Button
- **Kalender**: Ereignisse CRUD (localStorage), Monatsnav, Event-Dots
- **Chat**: Bot-Antworten (Keyword-Matching: hallo/hilfe/joke/quote/zeit/danke/echo), Typing-Indicator, Kontakt-Status
- **Browser**: Bookmarks (localStorage), History, Home-Seite mit Quick-Links, iframe-Fallback
- **Radio**: 48 Fallback-Stationen, Multi-Server (de1/de2/nl1/at1/fr1/us1), Suchfunktion, Refresh-Button
- **Terminal**: 25 Befehle (+tree/head/tail/wc/calc/history/exit/about), Tab-Completion für Befehle und Pfade
- **Taskmanager**: Sparklines (30-Werte-Verlauf), App-Verlauf, Start-Apps Toggles
- **Explorer/Terminal**: Shared fsData (cd, mkdir, rm -r, renderExplorer-Refresh)
- **Sequencer**: Synthesizer-Fallback, Lookahead-Scheduling mit `when`-Parameter
- **Animationen**: Tab-Fade, Start-Menü Slide, Toast Slide-In/Out, Taskbar-Hover, App-Card-Hover, Wallpaper-Crossfade, Theme-Transition
- **Tests**: 27 Tests mit App-Prüfung (25 Apps)

## Animationen & Übergänge
- **Tab-Inhalte**: Fade + Slide (200ms)
- **Start-Menü**: Slide-Down + Scale (150ms)
- **Toast**: Slide-In von rechts, sanftes Ausblenden (300ms)
- **Taskbar-Icons**: Hover-Lift (-2px)
- **App-Cards**: Smooth Hover + Active Transition
- **Wallpaper**: Crossfade (300ms)
- **Theme**: Sanfter Übergang Dark/Light (200ms)
- **Fenster**: Bereits vorhanden (Open/Close Scale)

## Platform Features
- Desktop-Kategorien (Alle / Produktivität / System / Media / Spiele) mit Filter-Bar
- Start-Menü mit Echtzeit-App-Suche
- Ctrl+N/T/E/P/B/M/C/D/L/S/A Keyboard Shortcuts + Ctrl+Tab + Ctrl+?
- Desktop Rechtsklick-Menü (Ansicht, Sortieren, Wallpaper, Theme, Desktop anzeigen, Alle schließen, Über)
- Notification Center mit Toast-History
- Session Restore, Wallpaper (12 Galerie + Custom URL + Upload), Window Snapping
- prefers-reduced-motion Accessibility
- Touch-Optimierung (größere Hit-Targets)
- Esc-Close für Fenster + Start-Menü + Overlays
- ES6-kompatibel (keine Module)
- ESLint + Prettier konfiguriert
- CI/CD Pipeline (GitHub Actions)

## Taskbar (Neo-Brutalist 3D)
- 52px Höhe, echte Borders + 3D-Shadow (accent-2 Unterleiste)
- Start-Button: Accent-Farbe, gelber Hover
- App-Icons: dynamisch erstellt, Focus-State (gelb), Minimized-State (ausgegraut)
- Notification Badge: roter Kreis mit Zähler
- Theme-Toggle Button (Ctrl+Shift+L)
- Clock: dunkel, Mono-Schrift

## Design-System
- CSS-Variablen: Farben, Schatten, Spacing, Animationen, Layout, Fonts
- Komponenten-Klassen: .btn, .input, .card, .pill
- Theme-Engine: Ignite, Ocean, Forest, Mono
- Dark-Mode: System-Theme automatisch erkennen (prefers-color-scheme)
- CSS-Criticals inline für Above-the-Fold

## PWA
- manifest.json + sw.js (offline cache of core assets)
- SW: stale-while-revalidate, network-first, quota check, offline fallback

## Version History
- v2.11.40 (2026-09-19): Systeminfo (Battery/Geolocation/Media), Kalender (Events), Chat (Bot), Browser (Bookmarks), Radio (48 Stationen), Animationen, 27 Tests
- v2.11.39 (2026-09-19): Kalender Refaktor (Ereignisse CRUD, Monatsnav)
- v2.11.38 (2026-09-19): Browser Refaktor (Bookmarks, History, Home-Seite)
- v2.11.37 (2026-09-19): Chat Refaktor (Bot-Antworten, Typing-Indicator)
- v2.11.36 (2026-09-19): Taskmanager Refaktor (Sparklines, App-Verlauf, Start-Apps Toggle, CPU Smoothing)
- v2.11.35 (2026-09-19): Explorer/Terminal Shared Filesystem (fsData global, cd, mkdir, rm -r, Refresh)
- v2.11.34 (2026-09-19): Pattern Sequencer Lookahead mit `when`-Parameter, EQ setupSeqEQ Refactor, 25 Apps
- v2.11.33 (2026-09-19): Sequencer Start Fix (UI immer bauen, Synthesizer-Fallback, Null-Checks)
- v2.11.32 (2026-09-19): App-Audit Fixes (Notepad, Music, Chat, Links, Browser, Clock)
- v2.11.31 (2026-09-19): Pattern Sequencer, AMIBIOS Refactor, CI Fix, Taskmanager Fix
- v2.11.30 (2026-09-19): Music Player Refactor (Sadee-UI), Mobile Vollbild
- v2.11.29 (2026-09-19): Mobile Apps sichtbar
- v2.11.28 (2026-09-19): Music Player Audio Fixes
- v2.11.27 (2026-09-19): Music Player Beatpad eigener AudioContext
- v2.11.26 (2026-09-19): Explorer Navigation Fix (Backslash)
- v2.11.25 (2026-09-19): Music Player Rewrite
- v2.11.24 (2026-09-19): Docs "Made by Alexander Kleine"
- v2.11.23 (2026-09-18): Multi-Instanz, Task-View, Help-Overlay, Notification Center
- v2.11.22 (2026-09-18): Bug-Hunting
- v2.11.21 (2026-09-18): EQ auf Sequencer
- v2.11.20 (2026-09-18): Playlist Scroll Fix
- v2.11.19 (2026-09-18): 26 Bugs gefixt
- v2.11.18 (2026-09-18): 4 neue Apps
- v2.11.1 (2026-09-15): Notepad-Close repariert
- v2.11 (2026-09-15): Extension-Pack — 10 neue Apps
- v2.10.3 (2026-09-15): Browser-Fix
- v2.10 (2026-09-15): Start-Button-Fix
- v2.9 (2026-09-15): AMIBIOS interactive
- v2.8 (2026-09-15): Service Worker v2
- v2.7 (2026-09-15): AMIBIOS Setup initial

## Code-Qualität
- ESLint + Prettier konfiguriert
- Unit-Tests: `node tests/app.test.js` (27 Tests)
- CI/CD Pipeline (GitHub Actions)
- JSDoc-Kommentare für public Funktionen

## Known Issues / Pitfalls
- Start-Button: Muss in DOMContentLoaded initialisiert werden
- Calculator: calcPress muss global erreichbar sein (window.calcPress)
- Close-Button: this.closest('.wnd').remove()
- Browser: iframe durch window.open ersetzen (CSP/AdBlock)
- Scrollbars: .wbody { overflow: auto } für alle App-Inhalte
- Lock: Sanfte Animation (700ms, scale+translateY+blur)
- Taskmgr-Intervall: window.osIntervals['taskmgr'] wird beim Close gestoppt
- Theme-Engine: os_theme in localStorage persistieren
- Snap-Hints: Drag an Kante zeigt visuelles Feedback
- Taskleiste: overflow-x:auto auf #tbCenter bei vielen Icons
- Sound: AudioContext bei erster User-Interaktion initialisiert (Autoplay-Policy)
- Multi-Instanz: localStorage wird pro App-Typ geteilt
- Sequencer: Samples laden asynchron, Synthesizer-Fallback wenn fetch() scheitert
- Terminal: openApp-Wrapper wird bei jedem Taskmgr-Öffnen aktualisiert (kein Double-Patch)
- Terminal: find/grep sind case-insensitive

## License
MIT License
