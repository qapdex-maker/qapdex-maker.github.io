# Macrohard Doors OS — Build Detail

Session 2026-09-14 · v2.9 (2026-09-15). Standalone subpage in `qapdex-maker.github.io`.

## Structure
- `macrohard/index.html` — standalone, neo-brutalist, self-contained
- `macrohard/assets/site.css` — portal tokens mapped to OS components + dark mode
- `macrohard/assets/app.js` — boot→lock→desktop, 13 apps + extensions, i18n, PWA, drag/resize, taskbar icons, snapWindow, Fisher-Yates shuffle
- `macrohard/manifest.json` — PWA manifest (siteVersion + buildDate)
- `macrohard/sw.js` — service worker v2 (stale-while-revalidate, network-first AMI BIOS, quota check, offline fallback)
- `macrohard/assets/ami-bios-setup.html` — AMIBIOS Setup utility (Award BIOS simulation, CRT-style, Tailwind)
- Portal `pages`-Array entry: `{name:'Macrohard Doors OS', cat:'Microsoft', catLabel:{de:'Microsoft',en:'Microsoft'}, status:'live', desc:{de:'…',en:'…'}, href:'macrohard/'}`
- `Microsoft` chip in portal filter

## Apps (v2.9 — 13 Apps)
### Phase 1 — Foundation (11 apps)
1. Notepad — textarea + Zeichen/Wortzähler, Ctrl+F Suche, localStorage auto-save (300ms debounce), Font-Größe (11/13/16), Export .txt
2. Calculator — eval-based, Tastatur (0-9,+-*/(). ,Enter,Esc,Backspace), klickbare History (max 12), SCI-Modus (sin/cos/tan/sqrt/pow/log/abs/π/e)
3. Terminal — mock shell: pwd/ls(cat)/touch/rm/mkdir/cp/mv/find/grep/echo/date/clear/whoami/help + colored output + Tab-Completion
4. Explorer — virtual FS, Tree links, Grid files, New Folder/New File Toolbar, Search bar
5. Paint — canvas draw, 24 Farben, ✏╱▭◯ Shape-Tools (Line/Rect/Ellipse), Export PNG
6. Browser — iframe + URL + 3 Shortcuts, Tab-Bar (+), Ctrl+L/R/W, history-Tracking
7. Music — 4 echte MP3s (SoundHelix), Volume Slider, Progress Bar, Shuffle/Repeat
8. Chat — @Kontakte (Alice/Bob/Carol/Dave), localStorage, Emoji-Bar (29 Emoji), Timestamps
9. Docs — contenteditable Markdown, Export .md, Preview Toggle
10. Settings — Dark Mode, Scanlines, Sprache, SW-Register, Accent Color Picker, Font-Größe, Reset, About, Wallpaper URL
11. Links — 7 Links + Kategorien (dev/fun/info), Filter-Chips, ✕ Delete, JSON Import/Export, Add Link

### Phase 2 — Platform
- Ctrl+N/T/E/P/B/M/C Keyboard Shortcuts (global)
- Desktop Rechtsklick-Menü (6 Apps + Settings)
- Toast Notifications (2.2s auto-hide)
- Session Restore (geöffnete Fenster nach Reload)
- Wallpaper (Bild-URL als Desktop-Hintergrund)
- Window Snapping (links/rechts/half-screen via snapWindow)
- prefers-reduced-motion Accessibility Support

## Window features
- Drag via titlebar (cursor: move)
- Resize via bottom-right handle (cursor: nwse-resize, min 280×180) + touch resize
- Minimize via _ button or taskbar icon toggle
- Close via × button
- Maximize via □ button (full-screen toggle)
- Taskbar icons for all apps with running/focused indicator

## PWA
- `manifest.json` + `sw.js` (offline cache of core assets)
- SW registers on load + manual register via Settings button
- SW v2: stale-while-revalidate, network-first for AMI BIOS, quota check, offline fallback

## AMIBIOS Setup
- iframe integration with `sandbox="allow-scripts allow-same-origin"`
- CSS isolation via iframe (no style leakage into OS shell)
- Interactive keyboard navigation: Arrow keys, Enter, ESC, F5, F7, F10, F2
- 6 tabs with dynamic header switching
- Toast notifications for user feedback
- RTC clock with live tick

## Version History
- v2.9 (2026-09-15): AMIBIOS interactive — tab navigation, keyboard shortcuts, toast notifications, state management
- v2.8 (2026-09-15): Service Worker v2 + AMI BIOS Setup app — SW v2 strategies, manifest siteVersion/buildDate, deploy-hygiene extended
- v2.7 (2026-09-15): AMIBIOS Setup app initial