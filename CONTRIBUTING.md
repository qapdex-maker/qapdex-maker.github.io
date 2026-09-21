# Contributing zu qapdex-maker.github.io

Danke für dein Interesse! Hier sind die Richtlinien für Beiträge.

## Erste Schritte

1. Fork das Repository
2. Erstelle einen Feature-Branch: `git checkout -b feature/mein-feature`
3. Committe deine Änderungen: `git commit -m "feat: beschreibung"`
4. Pushe den Branch: `git push origin feature/mein-feature`
5. Erstelle einen Pull Request

## Entwicklungs-Setup

```bash
# Repository klonen
git clone https://github.com/qapdex-maker/qapdex-maker.github.io.git
cd qapdex-maker.github.io/macrohard

# Lokalen Server starten
python3 -m http.server 8000
# Öffne http://localhost:8000/

# Tests ausführen
node tests/app.test.js
node --check assets/app.js
```

## Code-Styling

- ESLint + Prettier konfiguriert
- 2 Leerzeichen Einrückung
- Single Quotes für Strings
- Semikolons verwenden

## MakerOS App bauen

Um eine neue App hinzuzufügen:

1. `assets/app.js` — Case in `openApp()` hinzufügen
2. `assets/site.css` — Styles für die App
3. `index.html` — App-Karte im Desktop-Grid (optional)
4. Tests in `tests/app.test.js` erweitern

## Pull Request Prozess

1. Beschreibe die Änderungen klar
2. Verlinke zugehörige Issues
3. Stelle sicher, dass Tests grün sind
4. Warte auf Review

## Code of Conduct

Bitte lies unseren [Code of Conduct](CODE_OF_CONDUCT.md).

## Fragen?

Erstelle ein Issue mit dem Label "question".
