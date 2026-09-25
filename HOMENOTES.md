# qapdex-maker.github.io
https://docs.github.com/de/pages/quickstart

## Vision & Fahrpläne
Siehe [VISION.md](VISION.md) — Gesamtübersicht, neue Apps, Roadmap, Go-to-Market.

## Seiten
- Portal-Root `index.html` = Portal
- `macrohard/` = MakerOS Doors OS v2.11.45 (Neo-Brutalist Desktop OS, 25 Apps, Mobile-optimiert)
- `idun/` = idun console
- `msgraph/react/` = Graph Metadata Hub
- `catpop/` = CatPop Meme/Announcement
- `pepemem/` = MEMEPEPE Linktree-Backup
- `pepememe/` = PEPEMEME Linktree-Backup

## 2. Verifizierter MakerOS-Stand (2026-09-25)

- Remote-Commit: `9076d6a` auf `origin/main`; Pages live.
- Release: MakerOS v2.11.45, App-Cache `assets/app.js?v=62`.
- Testsuite: 165/165 grün mit `npm test`.
- Browser-Audit: alle 25 Desktop-Apps geöffnet; `.wclose` entfernt jedes Fenster nach dem 200-ms-Close-Overlay.
- Music: Beatpad lädt 8/8 echte Sample-Buffers; Radio mit 18 CORS-geprüften Fallback-Sendern, maximal 12 API-Streams.
- Kalender: beschädigte LocalStorage-Eventdaten werden als leere Liste behandelt.
- Storage: `assets/js/storage.js` als Classic-Facade vor `app.js` geladen; übrige parallele ES-Module bleiben außen vor.
- Settings-Import/Export: nur allow-listed Präferenz-Keys.
- `app.js` mit Prettier formatiert (`5aed13a`) und `var` → `let/const` (`c19625e`); Lint 2.883 → 125 Warnungen.
- Editor: Logik in `assets/js/editor.js` (testbar), DOM in `assets/editor-adapter.js`; Suche/Ersetzen als Overlay.
- Notes: AES-GCM-Vault über `assets/js/notes-crypto.js` (PBKDF2, 150k Iterationen).
- Offen: 125 ESLint-Warnungen im Monolith.

## MakerOS v2.5 — Änderungen
- Phase 1: Notepad (localStorage, Suche, Wortzähler, Export), Calculator (Tastatur, History, SCI), Terminal (7 neue Befehle, colored output, Tab-Completion), Explorer (New Folder/File), Platform (toast, Shortcuts, Kontextmenu)
- Phase 2: Paint (24 Farben, Shape-Tools), Music (Volume, Progress, Audio, Shuffle/Repeat), Chat (Kontakte, localStorage, Emoji), Browser (Tabs, Back/Forward), Docs (editable, Export, Preview), Settings (Accent, Font, Reset, About), Links (CRUD, Kategorien, JSON Import/Export)
- Phase 3: Notepad (Size, Export), Calculator (SCI), Terminal (colors command), Paint (PNG Export), Chat (Timestamps), Platform (Session Restore, Wallpaper, Snapping, a11y)
- Phase 4: README + HOMENOTES aktualisiert, manifest.json v2.5 Changelog