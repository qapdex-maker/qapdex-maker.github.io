| App | Status | Funktionalität | Tests | Bemerkungen |
|-----|--------|----------------|-------|-------------|
| **Notepad** | ✅ | Öffnen, Tippen, Wortzählung, Speichern (localStorage), Export .txt | OK | v2.11.29 |
| **Calculator** | ✅ | Grundrechenarten, History (max 12), SCI-Modus, Tastatur-Support | OK | v2.11.29 |
| **Terminal** | ✅ | help, ls, cd, pwd, touch, rm, mkdir, cp, mv, find, grep, echo, date, clear, whoami, colors | OK | Tab-Completion & History Pfeiltasten funktionieren |
| **Explorer** | ✅ | Navigation, Ordner/Datei erstellen, Kontextmenü (Öffnen/Umbenennen/Löschen), Suche, Papierkorb | OK | v2.11.26 Navi-Fix, v2.11.26 |
| **Paint** | ✅ | 24 Farben, Shapes, Export PNG, Undo/Redo, Radiergummi, Linienbreite, Fill, Clear | OK | |
| **Browser** | ✅ | Tab-System, Quick-Links, DuckDuckGo, iframe, Fehlerseite | OK | v2.11.23 brLoaded-Fix |
| **Music** | ✅ | Upload, Radio, Favoriten, Beatpad, Equalizer, Play/Pause/Prev/Next | OK | v2.11.27 AudioGraph, v2.11.28 setupAudio, v2.11.29 Mobile |
| **Chat** | ✅ | Kontakte, localStorage, Emoji, Timestamps | OK | |
| **Docs** | ✅ | Editable, Export .md, Preview, "Made by Alexander Kleine" | OK | v2.11.24 |
| **Settings** | ✅ | 4 Tabs, Dark Mode, Scanlines, Sprache, PWA-Register | OK | |
| **Links** | ✅ | CRUD, Kategorien, Import/Export JSON | OK | |
| **Taskmanager** | ✅ | Tabs (Prozesse/Leistung/App-Verlauf), Prozessliste, CPU/RAM | OK | |
| **Systeminfo** | ✅ | 6 Sektionen (OS/Hardware/Browser/Netzwerk/Speicher/Sitzung) | OK | |
| **Calendar** | ✅ | Monatsansicht | OK | |
| **Clock** | ✅ | Timer + Stoppuhr + Wecker | OK | |
| **Colorpicker** | ✅ | Farbwähler, HEX-Ansicht | OK | |
| **Passwort-Generator** | ✅ | 6-32 Zeichen | OK | |
| **QR-Generator** | ✅ | Text/URL → Canvas | OK | |
| **Viewer** | ✅ | Drag & Drop, Canvas | OK | |
| **Tic-Tac-Toe** | ✅ | Spiellogik | OK | |
| **AMIBIOS** | ✅ | CRT-iframe | OK | |
| **Omarchy** | ✅ | Quattro | OK | |
| **Fenster-Management** | ✅ | Drag, Resize (Maus + Touch), Snap (Left/Right/Max), Min/Max/Close | OK | |
| **PWA / Service Worker** | ✅ | stale-while-revalidate, network-first, quota check, manueller Register-Button in Settings | OK | |
| **Session Restore** | ✅ | Fenster-Position/-Größe in localStorage | OK | |
| **Desktop Kontextmenü** | ✅ | Rechtsklick: Apps, Ansicht, Sortieren, Aktualisieren | OK | |
| **Globale Suche (Ctrl+K)** | ✅ | App-Suche | OK | |
| **Toast-Notifikationen** | ✅ | Slide-In, Auto-Hide 4s | OK | |

## Zusammenfassung

```
Apps (Foundation):     11/11 ✅
Apps (Extension Pack):  11/11 ✅
System:                   4/4 ✅
-----------------------------------------
TOTAL:                 26/26 ✅

Tests:                 7/7 ✅
node --check:          ✅
Deploy:                ✅ (Commit 12f6c5c)
Live:                  https://qapdex-maker.github.io/macrohard/
```

## Fixes in dieser Session

| v | Fix |
|---|-----|
| v2.11.23 | Browser iframe `contentDocument===null` → `brLoaded` Flag |
| v2.11.24 | Docs: "Made by Alexander Kleine" |
| v2.11.25 | Music Player Rewrite: Upload, Radio, Favoriten, Tabs, Fallback-Sender |
| v2.11.26 | Explorer Navigation: Backslash zwischen Pfad und Ordnername |
| v2.11.27 | Music: Beatpad eigener AudioContext, Radio Progress isFinite-Check, Visualizer dedup, Fallback-Radio |
| v2.11.28 | Music: `setupAudio()` lazy init, `audioEl` statt `audio`, SourceNode nur einmal, alle Event-Listener dedupliziert |
| v2.11.29 | Mobile: `flex-wrap:wrap`, `overflow-y:auto`, `max-height: calc(100% - 60px)` |
