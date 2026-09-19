# ROADMAP — macrohard/ (MakerOS)

Stand: 2026-09-19 · v2.11.40 · 25 Apps · 27 Tests grün

## 1. Aktueller Status (v2.11.40)

### Refaktoriert (2026-09-19)
| App | Version | Änderungen |
|-----|---------|------------|
| Systeminfo | v2.11.40 | Battery, Geolocation, Media, Refresh-Button, 9 Sektionen |
| Kalender | v2.11.39 | Ereignisse CRUD, Monatsnav, Event-Dots, localStorage |
| Chat | v2.11.37 | Bot-Antworten (Keywords), Typing-Indicator, Kontakt-Status |
| Browser | v2.11.38 | Bookmarks, History, Home-Seite, iframe-Fallback |
| Radio | v2.11.40 | 48 Fallback-Stationen, Multi-Server, Suche, Refresh |
| Terminal | v2.11.40 | 25 Befehle, Tab-Completion, tree/calc/history |
| Taskmanager | v2.11.36 | Sparklines, App-Verlauf, Start-Toggles, CPU-Smoothing |
| Explorer | v2.11.35 | Shared FS mit Terminal, cd, mkdir, rm -r |
| Sequencer | v2.11.34 | Synthesizer-Fallback, Lookahead-Scheduling, 31 Samples |
| Editor | v2.11.40 | Undo/Redo, Suchen/Ersetzen, Font-Size, Shortcuts |
| Notepad | v2.11.41 | Undo/Redo, Zeilennummern, Suchen/Ersetzen, Font-Size, Shortcuts |
| Calculator | v2.11.41 | Speicher (M+/M-/MR/MC), Konstanten (π, e, φ), Toolbar |
| Clock | v2.11.41 | Weltzeit (8 Städte), Timer Min:Sek, Stoppuhr Reset, Ton |
| PW-Gen | v2.11.41 | Stärke-Anzeige, 10x Generator |
| QR-Gen | v2.11.41 | Farbe wählbar, Größe wählbar |
| Viewer | v2.11.41 | Zoom +/-/Fit, Scale-Transform |
| Game | v2.11.41 | vs CPU Modus (KI zufällig) |
| Settings | v2.11.41 | Export/Import JSON |
| Docs | v2.11.41 | Vollständige Toolbar (10 Buttons) |

### Stabil (nicht refaktoriert, funktionsfähig)
| App | ID | Features |
|-----|-----|----------|
| Links | links | CRUD, Kategorien, JSON Import/Export |
| Colorpicker | colorpicker | Color Picker + Hex |
| AMIBIOS | amibios | Boot-Sequenz, 7 Tabs, CRT-Style |

### Neu (2026-09-18, ungetestet)
| App | ID | Features |
|-----|-----|----------|
| ImgEditor | imgeditor | Crop, Rotate, Resize, Filter, Export |
| Pomodoro | pomodoro | 25/5 Timer, SVG-Ring, Sessions |
| Notes | notes | Tags, Suche, Markdown-Preview, Sidebar |

---

## 2. Refactor-Plan (alle 25 Apps)

### Priorität A — Quick Wins (geringer Aufwand, hoher Nutzen)

#### A1. Notepad
- [ ] Zeilennummern (wie Editor)
- [ ] Undo/Redo (Ctrl+Z/Y)
- [ ] Suchen & Ersetzen (Ctrl+F)
- [ ] Font-Size Selector
- [ ] Bestätigung bei ungespeichertem Inhalt

#### A2. Calculator
- [ ] Speicher-Funktion (M+/M-/MR/MC)
- [ ] Konstanten (π, e, φ)
- [ ] Einheiten-Umreiner (optional)
- [ ] Theme-Anpassung

#### A3. Paint
- [ ] Ebenen (Layers)
- [ ] Text-Tool
- [ ] Pipette (Farbe aufnehmen)
- [ ] Zoom-Funktion
- [ ] Als PNG mit Transparenz exportieren

#### A4. Docs
- [ ] Zeilennummern
- [ ] Markdown-Symbolleiste (fett, kursiv, Überschrift, Link)
- [ ] Live-Preview geteilt (oben/b unten)
- [ ] Export als HTML

#### A5. Settings
- [ ] Export/Import Einstellungen (JSON)
- [ ] Shortcut-Editor (Tastenkürzel ändern)
- [ ] Wallpaper-Slideshow (wechseln alle X Sekunden)
- [ ] Accent-Color Picker statt Palette

#### A6. Links
- [ ] Favoriten-Stern
- [ ] Zuletzt besucht
- [ ] QR-Code für Links
- [ ] Import von Bookmarks (HTML)

#### A7. Clock
- [ ] Weltzeit (mehrere Städte)
- [ ] Analog-Uhr Option
- [ ] Vollbild-Modus
- [ ] Benachrichtigungston bei Timer/Wecker

#### A8. Colorpicker
- [ ] Farbverlauf (Gradient)
- [ ] Komplementärfarbe anzeigen
- [ ] Palette speichern
- [ ] HSL/RGB/HEX Umschaltung

#### A9. Passwort-Generator
- [ ] Mehrere Passwörter auf einmal
- [ ] Passwort-Stärke-Anzeige
- [ ] Custom Zeichen-Set
- [ ] Geschichte (letzte 10)

#### A10. QR-Generator
- [ ] Farbe wählen
- [ ] Größe einstellen
- [ ] Logo/Bild in Mitte
- [ ] SVG Export

#### A11. Bildbetrachter
- [ ] Zoom (Scroll/Button)
- [ ] Bildinfo (Größe, DPI)
- [ ] Diashow (alle Bilder im Ordner)
- [ ] Vollbild-Modus

#### A12. Tic-Tac-Toe
- [ ] KI-Gegner (leicht/schwer)
- [ ] Spielstand speichern
- [ ] 4×4 Modus
- [ ] Online-Multiplayer (optional)

---

### Priorität B — Mittlerer Aufwand

#### B1. ImgEditor
- [ ] Ebenen (Layers)
- [ ] Auswahlwerkzeug (Lasso, Zaun)
- [ ] Text auf Bild
- [ ] Stempel/Clone
- [ ] Historie (Undo/Redo)
- [ ] Canvas-Größe ändern
- [ ] Drehen um beliebigen Winkel
- [ ] Farbkorrektur (Helligkeit/Kontrast/Sättigung)

#### B2. Pomodoro
- [ ] Statistiken (heute/gesamt)
- [ ] Töne/Benachrichtigungen
- [ ] Pausen-Übungen anzeigen
- [ ] Export als CSV
- [ ] Long Break (alle 4 Sessions 15 Min)

#### B3. Notes
- [ ] Verschlüsselung (optional)
- [ ] Notizen teilen (QR/URL)
- [ ] Autosave-Indikator
- [ ] Drag & Drop Sortierung
- [ ] Papierkorb (gelöschte Notizen)

---

### Priorität C — Umfangreich (optional)

#### C1. Modularisierung
- [ ] `assets/js/storage.js` — localStorage Wrapper
- [ ] `assets/js/i18n.js` — Übersetzungen
- [ ] `assets/js/window-manager.js` — Fensterlogik
- [ ] `assets/js/main.js` — Boot + Desktop
- [ ] ES6-Module statt IIFE

#### C2. Performance
- [ ] Lazy Loading für Apps
- [ ] Web Worker für Sequencer
- [ ] requestAnimationFrame dedupliziert
- [ ] DOM-Batching (DocumentFragment)

#### C3. Erweiterte Tests
- [ ] Unit-Tests pro App (mind. 2 pro App)
- [ ] Integrationstests (Öffnen → Interagieren → Schließen)
- [ ] Memory-Leak-Detection
- [ ] Performance-Benchmarks

#### C4. Barrierefreiheit
- [ ] ARIA-Labels für alle Apps
- [ ] Tastaturnavigation (Tab-Trap in Fenstern)
- [ ] Screen-Reader-Unterstützung
- [ ] prefers-reduced-motion respektieren

#### C5. Internationalisierung
- [ ] Deutsch/Englisch/Französisch
- [ ] Sprache in localStorage
- [ ] Sprachwechsel ohne Reload

---

## 3. Nächste Schritte (empfohlen)

1. **Priorität A abschließen** (12 Apps, ~2-3 Stunden)
2. **ImgEditor/Pomodoro/Notes testen** (neue Apps verifizieren)
3. **Tests erweitern** (mind. 2 pro App = 50 Tests)
4. **Priorität B nach Bedarf**

---

## 4. Wiederverwendbare Checks

```bash
# Syntax-Check
cd macrohard && node --check assets/app.js

# Unit-Tests
node tests/app.test.js

# ESLint
npx eslint assets/app.js

# Lokaler Server
python3 -m http.server 8099

# Live-Verifikation
curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/macrohard/index.html
```

---

## 5. Domain & Kontakt

- **Live**: https://qapdex-maker.github.io/macrohard/
- **Domain**: qapdex.com (gekauft, DNS reverted)
- **Kontakt**: info@qapdex.com
- **Lizenz**: MIT
