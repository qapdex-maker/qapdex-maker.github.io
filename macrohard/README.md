# Macrohard Doors OS — Build Detail

Session 2026-09-14 · v2 (2026-09-xx). Standalone subpage in `qapdex-maker.github.io`.

## Structure
- `macrohard/index.html` — standalone, neo-brutalist, self-contained
- `macrohard/assets/site.css` — portal tokens mapped to OS components
- `macrohard/assets/app.js` — boot→lock→desktop, 11 apps, i18n, PWA
- `macrohard/manifest.json` — PWA manifest
- `macrohard/sw.js` — service worker (offline cache)
- Portal `pages`-Array entry: `{name:'Macrohard Doors OS', cat:'Microsoft', catLabel:{de:'Microsoft',en:'Microsoft'}, status:'live', desc:{de:'…',en:'…'}, href:'macrohard/'}`
- `Microsoft` chip in portal filter

## Apps (functional)
1. Notepad — textarea + char counter + localStorage
2. Calculator — eval-based, operators × ÷ − +, ± % (,), Klammern, Historie
3. Terminal — mock shell: help/ls/cd/pwd/mkdir/echo/cat/date/clear/whoami + arrow history
4. Explorer — virtual FS with navigation + file icons + path bar
5. Paint — canvas draw + 12-color palette + touch events (Android)
6. Browser — iframe + URL bar + 3 shortcut buttons (Macrohard, GitHub, Perchance)
7. Music — 3 mock songs, ▶/⏸ toggle
8. Chat — mock chat with suggested prompts
9. Docs — static doc view
10. Settings — Dark Mode, Scanlines, Sprache, PWA SW register
11. Links — GitHub, Perchance, Docs

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

## Deploy
- Commit on `main`, push confirmed
- Live: https://qapdex-maker.github.io/macrohard/ → HTTP 200
- IGNITE default OFF, DE/EN toggle, no iframe, no external calls