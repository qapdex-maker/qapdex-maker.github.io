# VISION — qapdex-maker.github.io

Stand: 2026-09-21 · qapdex-maker/qapdex-maker.github.io (Branch `main`)

---

## 1. Gesamtübersicht — Live-Deployments

| # | Pfad | Projekt | Stack | Zeilen | Live |
|---|------|---------|-------|--------|------|
| 1 | `/` (root) | Portal | HTML+CSS+JS, Neo-Brutalist | ~437 | https://qapdex-maker.github.io/ |
| 2 | `macrohard/` | **MakerOS v2.11.45** | Vanilla JS, 25 Apps, PWA | ~7.8K | https://qapdex-maker.github.io/macrohard/ |
| 3 | `msgraph/react/` | Graph Metadata Hub | React 18 UMD, Web Worker, vorkompiliert | ~976 | https://qapdex-maker.github.io/msgraph/react/ |
| 4 | `catpop/` | CatPop Announcement | HTML+CSS+JS, 8 Themes | ~642 | https://qapdex-maker.github.io/catpop/ |
| 5 | `catpop/linktr/` | CatPop Linktree | HTML+CSS | ~200 | https://qapdex-maker.github.io/catpop/linktr/ |
| 6 | `idun/` | idun Console | HTML+CSS | ~270 | https://qapdex-maker.github.io/idun/ |
| 7 | `pepemem/` | MEMEPEPE Linktree | HTML+CSS+JS | ~550 | https://qapdex-maker.github.io/pepemem/ |
| 8 | `pepememe/` | PEPEMEME Linktree | HTML+CSS | ~117 | https://qapdex-maker.github.io/pepememe/ |

**Gesamtgröße**: ~10.8K Zeilen Code, 8 Live-Subdomains.

---

## 2. Aktueller Status — Was läuft stabil

### MakerOS (macrohard/) — Kernprojekt
- 25 Apps, 68 Unit-Tests grün
- PWA (Service Worker, offline-fähig)
- Neo-Brutalist Design, 4 Themes, Dark Mode
- Mobile UX: Touch-Resize, Pinch, Drawer-Sidebar, Window-Drag
- i18n (DE/EN/FR), A11y (ARIA, Skip-Link, Reduced Motion)
- Audio-Pipeline: Sequencer 8×32, Radio 30 Stationen, EQ 6-Band, Visualizer

### msgraph/react/
- Vorkompiliertes React 18 (UMD von unpkg)
- Web Worker + virtualisierte Liste (2870 beta-Pfade)
- Hub / Reference / Console / Permissions / Breaking Radar
- Self-hosted auf GitHub Pages

### CatPop
- 8 Theme-Paletten, localStorage-Persistenz
- Solana/Base DEX-Integration
- Same-Page-Backup-Linktree

---

## 3. Fahrplan — MakerOS (macrohard/) Weiterentwicklung

**Neueste Version**: v2.11.45 (2026-09-21) — Mobile UX, Explorer Drawer Fix

### Phase A: Mobile UX Vertiefung (nächste Schritte)
| # | Feature | Aufwand | Impact |
|---|---------|---------|--------|
| A1 | **Responsive Breakpoints** — alle 25 Apps mobil testen | Mittel | Hoch |
| A2 | **Tab-Management** — Fenster-Tabbing auf Mobile | Mittel | Mittel |
| A3 | **OS-Level Gesten** — swipe-up = Startmenü, swipe-down = Notifs | Hoch | Hoch |
| A4 | **App-Drawer** — Kategorien (Produktivität/System/Media/Spiele) | Mittel | Mittel |
| A5 | **Wallpaper-Galerie** — dynamisch, mehr als 12 Presets | Klein | Niedrig |
| A6 | **Quick Settings** — Taskbar-Erweiterung (WiFi/Bright/Sound) | Hoch | Hoch |

### Phase B: Neue Apps für MakerOS
| # | App | Beschreibung | Aufwand |
|---|-----|--------------|---------|
| B1 | **Files** — Full File Manager (Grid/List/Preview) | Hoch |
| B2 | **Mail** — Mock-POP3/IMAP-Client | Hoch |
| B3 | **Calendar v2** — Events + Erinnerungen + Wiederholungen | Mittel |
| B4 | **Photo Gallery** — EXIF, Alben, Slideshow | Mittel |
| B5 | **Video Player** — Custom Controls, Playlists | Hoch |
| B6 | **Weather** — OpenWeatherMap API, 5-Tage-Vorschau | Mittel |
| B7 | **Maps** — OpenStreetMap, POIs, Routen | Hoch |
| B8 | **Translate** — DeepL/Memory API, Sprachumschlag | Mittel |
| B9 | **AI Chat** — LLM-Integration (via idun-multi) | Hoch |
| B10 | **Recorder** — Audio/Video Recording + Export | Mittel |

### Phase C: Neue Features für bestehende Apps
| App | Feature | Aufwand |
|-----|---------|---------|
| Notepad | Syntax-Highlighting, Markdown-Live-Preview | Mittel |
| Calculator | Date-Berechnung, Konverter, Finanz-Modus | Mittel |
| Terminal | `curl`, `ping`, `npm`, `git` (simuliert) | Hoch |
| Explorer | Multi-Select, Drag&Drop Upload | Mittel |
| Music | Visualizer-FFT, mehr Samples, MIDI-Export | Hoch |
| Browser | Passwort-Manager, Session-Sync | Hoch |
| Settings | Wallpaper-Slideshow, System-Fonts, Accent-Presets | Klein |
| Paint | Layers, Brush-Engine, Animation | Hoch |
| Game | Online-Multiplayer, Leaderboard | Hoch |
| QRGen | Download-Button, Batch-Export | Klein |
| Pomodoro | Long-Break, CSV-Export, Break-Exercises | Klein |

### Phase D: Architektur & Performance
| # | Thema | Aufwand | Nutzen |
|---|-------|---------|--------|
| D1 | **Code-Splitting** — pro App eigener Chunk | Hoch | Performance |
| D2 | **IndexedDB** — statt localStorage für große Daten | Mittel | Kapazität |
| D3 | **Web Workers** — Audio, File-Processing auslagern | Hoch | UI-Flüssigkeit |
| D4 | **Canvas Offscreen** — Renderer in Worker | Hoch | FPS-Boost |
| D5 | **Monorepo** — eigenes `idun-sdk` für OS-Komponenten | Sehr Hoch | Wiederverwendbarkeit |
| D6 | **Tests** — E2E mit agent-browser (Desktop + Mobile) | Hoch | Qualität |

### Phase E: Portal-Root Verbesserungen
| # | Feature | Aufwand |
|---|---------|---------|
| E1 | Karten-Animation, 3D-Tilt | Mittel |
| E2 | Search (Ctrl+K) — globale Suche | Hoch |
| E3 | Theme-Sync zwischen Subpages | Mittel |
| E4 | Live-Stats (Besucher, Apps, etc.) | Hoch |
| E5 | Blog/News-Bereich | Mittel |

---

## 4. Fahrplan — Neue Projekte / Subpages

### Neue Subpages (Ideen)

| # | Projekt | Beschreibung | Stack | Aufwand |
|---|---------|--------------|-------|---------|
| 1 | **idun-sdk** | SDK-Browser für Hermes-Agent | React/TS | Sehr Hoch |
| 2 | **idun-playground** | LLM-Playground mit mehreren Modellen | React/TS | Hoch |
| 3 | **idun-status** | System-Übersicht, Cron-Jobs, Sessions | Vue/Svelte | Mittel |
| 4 | **idun-wiki** | Knowledge Base für idun-Projekte | MDX | Mittel |
| 5 | **qapdex.com** | Custom Domain Landing Page | HTML/CSS | Klein |
| 6 | **science-stack** | Termux-fokusierte ML/DS-Plattform | Python/JS | Hoch |
| 7 | **makeros-store** | App-Store für 3rd-Party MakerOS-Apps | React | Sehr Hoch |
| 8 | **dev-tools** | JSON Formatter, Regex Tester, Diff Tool | Vanilla JS | Mittel |
| 9 | **design-system** | Komponenten-Bibliothek (Storybook) | React/TS | Hoch |
| 10 | **linktree-hub** | Multi-Plattform Linktree-Manager | React | Mittel |

### Standalone-Produkte (aus MakerOS heraus extrahierbar)

| # | Produkt | Quelle | Monetarisierung |
|---|---------|--------|-----------------|
| 1 | **MakerOS Engine** | macrohard/app.js | Open Source + Pro-Themes |
| 2 | **MakerOS App Store** | Neue Dev | Kommission |
| 3 | **Music Sequencer** | macrohard/music | SaaS (Cloud-Sync) |
| 4 | **Paint Studio** | macrohard/paint | Freemium (Pro-Tools) |
| 5 | **Browser Kit** | macrohard/browser | Enterprise |

---

## 5. Marktpositionierung & Go-to-Market

### Zielgruppen

| Segment | Nutzen | Kanal |
|---------|--------|-------|
| **Entwickler** | Self-hosted Desktop im Browser, Open Source | GitHub, HN, Reddit |
| **Kreative** | Paint, Music, Browser — Spielkreativität | Twitter/X, Discord |
| **Meme-Coin Community** | CatPop, PEPE-Seiten | Telegram, Twitter |
| **Microsoft Graph Entwickler** | Metadata-Explorer | MS-Tech-Community |
| **Termux/Android User** | Lightweight OS im Browser | Reddit r/termux |
| **Privacy-bewusst** | Self-hosted, keine Telemetrie | GitHub, Forums |

### Monetarisierungsmodelle

| Modell | Beschreibung | Aufwand |
|--------|--------------|---------|
| **GitHub Sponsors** | Community-Funding für Open Source | Niedrig |
| **Pro-Themes** | Premium-Design-Packs für MakerOS | Mittel |
| **Custom Domain Hosting** | Managed MakerOS auf Custom Domain | Hoch |
| **Enterprise** | Self-hosted MakerOS für Teams | Sehr Hoch |
| **Marketplace** | App-Store für 3rd-Party Apps | Hoch |
| **Affiliate** | Crypto DEX, Domain-Registrierung | Niedrig |

---

## 6. Technische Schulden (bekannt)

- MakerOS: AudioContext Single-Instance nötig
- MakerOS: Lazy Loading für App-Bodies
- msgraph/react: SiteVersion sync nötig
- Portal: Service Worker pro Subpage (Konflikte)
- Tests: E2E-Tests mit Browser-Automation
- Performance: IntersectionObserver für App-Grid
- Code: JSDoc, Kommentare, saubere Typen

---

## 7. Quick-Reference — Was wohin gehört

| Domain/Pfad | Repo-Inhalt | Deploy-Target |
|-------------|-------------|---------------|
| `qapdex-maker.github.io/` | Portal | GitHub Pages (root) |
| `qapdex-maker.github.io/macrohard/` | MakerOS | GitHub Pages (subdir) |
| `qapdex-maker.github.io/msgraph/react/` | Graph Hub | GitHub Pages (subdir) |
| `qapdex-maker.github.io/catpop/` | CatPop | GitHub Pages (subdir) |
| `qapdex.com` | Custom Domain (gekauft) | DNS → GitHub Pages (reverted) |

---

## 8. Next Steps (konkret)

1. **Mobile QA**: Alle 25 Apps auf echten Touch-Geräten testen
2. **Performance**: Lighthouse Audit, Core Web Vitals
3. **SEO**: Open Graph, Twitter Cards, Sitemap
4. **Community**: GitHub Issues template, Contribution Guide
5. **Analytics**: Privacy-first (Plausible/GoatCounter)
6. **Custom Domain**: qapdex.com → GitHub Pages (DNS-Fix)

---

_Letzte Aktualisierung: 2026-09-21 · Autor: Hermes Agent (qapdex-maker)_
