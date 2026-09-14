# Macrohard Doors OS — Build Detail

Session 2026-09-14 · v2.5 (2026-09-15). Standalone subpage in `qapdex-maker.github.io`.

## Structure
- `macrohard/index.html` — standalone, neo-brutalist, self-contained
- `macrohard/assets/site.css` — portal tokens mapped to OS components + dark mode
- `macrohard/assets/app.js` — boot→lock→desktop, 11 apps + extensions, i18n, PWA, drag/resize, taskbar icons
- `macrohard/manifest.json` — PWA manifest
- `macrohard/sw.js` — service worker (offline cache)
- Portal `pages`-Array entry: `{name:'Macrohard Doors OS', cat:'Microsoft', catLabel:{de:'Microsoft',en:'Microsoft'}, status:'live', desc:{de:'…',en:'…'}, href:'macrohard/'}`
- `Microsoft` chip in portal filter

## Apps (v2.5 — 11 Kern-Apps + Extension-Pack)
### Phase 1 — Foundation
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

## Pitfalls discovered & fixed
- Paint touch: mouse events alone don't fire on Android/Termux → add touchstart/touchmove/touchend with getBoundingClientRect offset, passive:false
- Desktop design: user corrected from dark Windows style to neo-brustalist (paper bg, 3px borders, accent shadows)
- Lock screen: dark gradient → paper bg + ink text to match portal tokens
- Boot screen: black bg → paper bg + Space Grotesk logo + accent dots
- Taskbar: translucent dark → portal tokens (`--tb`, 3px `--line` border)
- Start menu: glass dark → surface bg + 3px border
- Window accent dot: rgba white → `--accent`
- Calculator: added parentheses, comma, history panel
- Terminal: added pwd, ls (real dir listing), cat, cd (with ..), mkdir, echo, date, clear, whoami, help
- Taskbar hidden: `--tb` missing fallback → `var(--tb, #1a1a1e)` in :root + `[data-theme="dark"]`
- Taskbar icons missing: t(id) called after DOM creation → moved before taskbar icon creation
- Minimize not visible: no taskbar icon → taskbar icons for all apps + toggle behavior
- Phase 2+3: all new features tested with node --check + live curl verify

## Version History
- v2.5 (2026-09-15): All Phase 1+2+3+4 features, README + HOMENOTES update, manifest.json changelog
- v2.4 (2026-09-14): Full-window resize, taskbar duplicate listener fix, drag, dark mode, 11 apps
- v2.3: Initial stable build