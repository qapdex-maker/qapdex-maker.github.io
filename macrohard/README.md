# MakerOS — qapdex-maker.github.io/macrohard/

Session 2026-09-18 · v2.11.23 (2026-09-18). Standalone subpage in `qapdex-maker.github.io`.

## Live
- **URL**: https://qapdex-maker.github.io/macrohard/
- **Branch**: `main`
- **Tests**: 11/11 passing (`node tests/app.test.js`)
- **Cache-Bust**: `?v=37`

## Structure
- `index.html` — OS shell + desktop + boot/lock + i18n inline + CSS-Criticals + app cards grid
- `assets/site.css` — design tokens, 4 themes, dark mode, components, animations, task view, help overlay, notifications
- `assets/app.js` — boot→lock→desktop, 26 apps, multi-instance, drag & drop, task view, help overlay, notification center (4252 lines)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (stale-while-revalidate, network-first AMI BIOS, quota check, offline fallback)
- `assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style)
- `tests/app.test.js` — 11 unit tests (Node.js test runner)

## Apps (v2.11.23 — 26 Apps)

### Foundation (11 Apps)
1. **Notepad** — textarea + Zeichen/Wortzähler, Ctrl+F Suche, localStorage auto-save (300ms debounce), Font-Größe, Export .txt
2. **Calculator** — eval-based, Tastatur, klickbare History (max 12), SCI-Modus (sin/cos/tan/sqrt/pow/log/abs/π/e)
3. **Terminal** — mock shell: pwd/ls/cat/touch/rm/mkdir/cp/mv/find/grep/echo/date/clear/whoami/help + colored output
4. **Explorer** — virtual FS (C:\Users\macrohard\...), Tree links, Grid files, New Folder/File Toolbar, Drag & Drop Dateien zwischen Ordnern
5. **Paint** — canvas draw, 24 Farben, Shape-Tools, Export PNG, Undo/Redo, Radiergummi, Linienbreite, Fill, Clear
6. **Browser** — URL-Bar, Shortcuts, öffnet URLs im externen Browser
7. **Music** — 4 SoundHelix MP3s, Volume, Progress, Shuffle/Repeat, Radio (radio-browser.info + Fallback), Beatpad 9-Pad, Equalizer 6-Band mit Presets, Visualizer
8. **Chat** — @Kontakte, localStorage, Timestamps, Emoji
9. **Docs** — contenteditable Markdown, Export .md, Preview Toggle
10. **Settings** — 4 Tabs (Allgemein, Aussehen, Tastenkürzel, Datenschutz), Wallpaper-Galerie 12 Themes + Custom URL, Theme-Engine Ignite/Ocean/Forest/Mono, Icon-Größe (klein/mittel/groß), Desktop-Raster, Accent-Color, Font-Size, PWA SW registrieren, Privacy-Clear, Reset Defaults
11. **Links** — CRUD, Kategorien, JSON Import/Export, Omarchy Quattro Integration

### Extension Pack (15 Apps)
12. **Taskmanager** — offene Fenster anzeigen, Beenden per Klick, Auto-Refresh
13. **Systeminfo** — OS, Browser, Plattform, Sprache, Bildschirm, Farbtiefe, Cookies, Online, localStorage, SW
14. **Kalender** — Monatsansicht mit heutigem Tag (blauer Marker)
15. **Uhr** — Digital-Uhr, Timer (Countdown), Stoppuhr (ms-genau), Wecker
16. **Farbwähler** — Color Picker + Hex-Anzeige
17. **Passwort-Generator** — Länge 6-32 Zeichen, Kopieren
18. **QR-Generator** — Text → Canvas QR-Code (pixelgenau)
19. **Bildbetrachter** — Drag & Drop Bilder, Canvas-Render
20. **Tic-Tac-Toe** — Komplettes Spiel, Neustart
21. **AMIBIOS Setup** — iframe integriert, CRT-Style
22. **Editor** — Code-Editor mit Zeilennummern, Syntax-Highlighting (JS/HTML/CSS/MD), File Open/Save, localStorage
23. **Image Editor** — Bild laden, Crop, Rotate, Resize, Filter (Grayscale/Sepia/Blur/Invert), PNG/JPG Export
24. **Pomodoro** — 25-min Arbeit / 5-min Pause Timer mit SVG-Ring, Sessions-Counter, konfigurierbar
25. **Notes** — Notizen-App mit Tags, Suche, Markdown-Preview, Sidebar-Navigation, localStorage
26. **Omarchy** — Quattro-Links (extern)

### New in v2.11.23
- **Multi-Instanz**: Notepad, Terminal, Editor, Explorer können mehrfach geöffnet werden (#1, #2, #3...)
- **Task-View** (Ctrl+Tab): Alle offenen Fenster als Klick-Grid mit Miniaturansichten
- **Help-Overlay** (Ctrl+?): Tastenkürzel-Referenz
- **Notification Center**: Toast-History im Slide-in Panel mit Badge-Zähler
- **Desktop-Anpassung**: Icon-Größe + Raster ein/aus
- **About-Dialog**: Versions-Info, Credits, Lizenz
- **i18n erweitert**: 26 App-Namen + Kategorien übersetzt (de/en)

### Platform
- Desktop-Kategorien (Alle / Produktivität / System / Media / Spiele) mit Filter-Bar
- Start-Menü mit Echtzeit-App-Suche
- Ctrl+N/T/E/P/B/M/C/D/L/S/A Keyboard Shortcuts + Ctrl+Tab + Ctrl+?
- Desktop Rechtsklick-Menü (Ansicht, Sortieren, Wallpaper, Theme, Desktop anzeigen, Alle schließen, Über)
- Notification Center mit Toast-History
- Toast Notifications (4s auto-hide)
- Session Restore, Wallpaper (12 Galerie + Custom URL + Upload), Window Snapping
- prefers-reduced-motion Accessibility
- Touch-Optimierung (größere Hit-Targets)
- Fenster-Animationen (Open/Close)
- Esc-Close für Fenster + Start-Menü + Overlays
- ES6-kompatibel (keine Module, IE11-ready)
- ESLint + Prettier konfiguriert
- CI/CD Pipeline (GitHub Actions)

## Window features
- Drag via titlebar, Resize via bottom-right handle + touch
- Minimize/Maximize/Close Buttons
- Taskbar-Icons mit running/focused/minimized States
- Close-Button erstellt/entfernt Taskbar-Icons dynamisch
- Snap-Hints beim Drag an Bildschirmkanten
- Multi-Instanz: Fenster bekommen unique IDs (z.B. w-notepad-inst-2)
- Minimized Fenster sind in Taskbar klickbar zum Wiederherstellen

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
- SW v2: stale-while-revalidate, network-first AMI BIOS, quota check, offline fallback

## Version History
- v2.11.23 (2026-09-18): 15-feature expansion — 13 neue App-Karten, Multi-Instanz, Task-View, Help-Overlay, Notification Center, About-Dialog, i18n erweitert, Desktop-Anpassung, Wallpaper-Galerie visuell, Explorer Drag & Drop
- v2.11.22 (2026-09-18): Bug-Hunting (Taskbar Overflow, Visualizer, Null-Checks)
- v2.11.21 (2026-09-15): EQ auf Sequencer angewendet
- v2.11.20 (2026-09-15): Playlist Scroll Fix
- v2.11.19 (2026-09-15): 26 Bugs gefixt
- v2.11.18 (2026-09-15): 4 neue Apps
- v2.11.2 (2026-09-15): Memory-Leak Fixes, Interval-Management
- v2.11.1 (2026-09-15): Notepad-Close repariert
- v2.11 (2026-09-15): Extension-Pack — 10 neue Apps
- v2.10.3 (2026-09-15): Browser-Fix (iframe → window.open)
- v2.10 (2026-09-15): Start-Button-Fix, Calculator+Explorer-Reparatur
- v2.9 (2026-09-15): AMIBIOS interactive
- v2.8 (2026-09-15): Service Worker v2
- v2.7 (2026-09-15): AMIBIOS Setup app initial

## Code-Qualität
- ESLint + Prettier konfiguriert
- Unit-Tests: `node tests/app.test.js`
- CI/CD Pipeline (GitHub Actions)
- JSDoc-Kommentare für public Funktionen

## Known Issues / Pitfalls
- Start-Button: Muss in DOMContentLoaded initialisiert werden
- Calculator: calcPress muss global erreichbar sein (window.calcPress)
- Close-Button: this.closest('.wnd').remove() — mk.remove() kappt bei neueren Fenstern
- Browser: iframe durch window.open ersetzen (CSP/AdBlock)
- Scrollbars: .wbody { overflow: auto } für alle App-Inhalte
- Lock: Sanfte Animation (700ms, scale+translateY+blur)
- Taskmgr-Intervall: window.osIntervals['taskmgr'] wird beim Close gestoppt
- Theme-Engine: os_theme in localStorage persistieren
- Snap-Hints: Drag an Kante zeigt visuelles Feedback, Loslassen snapped
- Taskleiste: overflow:hidden auf .tbIcon, tbCenter scrollbar bei vielen Icons
- Sound: AudioContext bei erster User-Interaktion initialisiert (Autoplay-Policy)
- Multi-Instanz: localStorage wird pro App-Typ geteilt (np_save für alle Notepads)
