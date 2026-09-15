# Macrohard Doors OS — Build Detail

Session 2026-09-14 · v2.11 (2026-09-15). Standalone subpage in `qapdex-maker.github.io`.

## Structure
- `macrohard/index.html` — standalone, neo-brutalist, self-contained
- `macrohard/assets/site.css` — portal tokens mapped to OS components + dark mode
- `macrohard/assets/app.js` — boot→lock→desktop, 22 apps, i18n, PWA, drag/resize, taskbar icons
- `macrohard/manifest.json` — PWA manifest (siteVersion + buildDate)
- `macrohard/sw.js` — service worker v2 (stale-while-revalidate, network-first AMI BIOS, quota check, offline fallback)
- `macrohard/assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style, Tailwind)
- Portal `pages`-Array entry: `{name:'Macrohard Doors OS', cat:'Microsoft', catLabel:{de:'Microsoft',en:'Microsoft'}, status:'live', desc:{de:'…',en:'…'}, href:'macrohard/'}`

## Apps (v2.11 — 22 Apps)
### Phase 1 — Foundation (11 apps)
1. Notepad — textarea + Zeichen/Wortzähler, Ctrl+F Suche, localStorage auto-save (300ms debounce), Font-Größe, Export .txt
2. Calculator — eval-based, Tastatur, klickbare History (max 12), SCI-Modus (sin/cos/tan/sqrt/pow/log/abs/π/e)
3. Terminal — mock shell: pwd/ls/cat/touch/rm/mkdir/cp/mv/find/grep/echo/date/clear/whoami/help + colored output
4. Explorer — virtual FS (C:\Users\macrohard\...), Tree links, Grid files, New Folder/File Toolbar
5. Paint — canvas draw, 24 Farben, Shape-Tools, Export PNG
6. Browser — URL-Bar, Shortcuts, öffnet URLs im externen Browser (kein iframe/CSP)
7. Music — 4 SoundHelix MP3s, Volume, Progress, Shuffle/Repeat
8. Chat — @Kontakte, localStorage, Timestamps
9. Docs — contenteditable Markdown, Export .md, Preview Toggle
10. Settings — 4 Tabs (Allgemein, Aussehen, Tastenkürzel, Datenschutz), Wallpaper-Galerie
11. Links — CRUD, Kategorien, JSON Import/Export

### Phase 2 — Platform
- Ctrl+N/T/E/P/B/M/C Keyboard Shortcuts
- Desktop Rechtsklick-Menü
- Toast Notifications (2.2s auto-hide)
- Session Restore, Wallpaper, Window Snapping
- prefers-reduced-motion Accessibility

### Phase 3 — Extension Pack (10 apps, 2026-09-15)
12. Taskmanager — offene Fenster anzeigen, Beenden per Klick
13. Systeminfo — OS, Browser, Plattform, Sprache, Bildschirm, Farbtiefe, Cookies, Online, localStorage, SW
14. Kalender — Monatsansicht mit heutigem Tag (blauer Marker)
15. Uhr — Digital-Uhr, Timer (Countdown), Stoppuhr (ms-genau)
16. Farbwähler — Color Picker + Hex-Anzeige
17. Passwort-Generator — Länge 6-32 Zeichen, Kopieren
18. QR-Generator — Text → Canvas QR-Code (pixelgenau)
19. Bildbetrachter — Drag & Drop Bilder, Canvas-Render
20. Tic-Tac-Toe — Komplettes Spiel, Neustart
21. AMIBIOS Setup — iframe integriert, CRT-Style
22. Omarchy Links — Quattro-Integration

## Window features
- Drag via titlebar, Resize via bottom-right handle + touch
- Minimize/Maximize/Close Buttons
- Taskbar-Icons mit running/focused States
- Close-Button erstellt/entfernt Taskbar-Icons dynamisch

## Taskbar (Neo-Brutalist 3D)
- 52px Höhe, echte Borders + 3D-Shadow (accent-2 Unterleiste)
- Start-Button: Accent-Farbe, gelber Hover
- App-Icons: dynamisch erstellt, Focus-State (gelb)
- Clock: dunkel, Mono-Schrift

## PWA
- manifest.json + sw.js (offline cache of core assets)
- SW v2: stale-while-revalidate, network-first AMI BIOS

## Version History
- v2.11 (2026-09-15): Extension-Pack — 10 neue Apps, v2.10.3 (Browser-Fix, iframe → window.open)
- v2.10.2 (2026-09-15): Lock-Animation sanft, v2.10.1 (Taskbar, Close-Button, Cache-Bust)
- v2.10 (2026-09-15): Start-Button-Fix, Calculator+Explorer-Reparatur, Settings-Tabs, Scrollbars, ASTRA-Discipline
- v2.9 (2026-09-15): AMIBIOS interactive
- v2.8 (2026-09-15): Service Worker v2
- v2.7 (2026-09-15): AMIBIOS Setup app initial

## Known Issues / Pitfalls
- Start-Button: Muss in DOMContentLoaded initialisiert werden
- Calculator: calcPress muss global erreichbar sein (window.calcPress)
- Close-Button: Taskbar-Icons müssen beim Fenster-Öffnen erstellt werden
- Browser: iframe durch window.open ersetzen (CSP/AdBlock)
- Scrollbars: .wbody { overflow: auto } für alle App-Inhalte
- Lock: Sanfte Animation (700ms, scale+translateY+blur)
