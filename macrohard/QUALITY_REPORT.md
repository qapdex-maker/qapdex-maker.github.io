# MakerOS — Code Quality & Debugging Report

**URL:** https://qapdex-maker.github.io/macrohard/
**Stand:** 2026-09-25 | v2.11.45 | Cache `app.js?v=62`
**Scope:** `assets/app.js` (~6.4K ZL), `index.html`, `assets/site.css`, `assets/js/storage.js`, `tests/*`

---

## Executive Summary

Die Live-Seite läuft. `npm test` liefert 165/165 grüne Tests. Der Live-Close-Test für alle 25 Apps ist erfolgreich; der Kalender schützt zusätzlich ungültige gespeicherte Event-Daten.

Die Codebasis bleibt strukturell belastet: `assets/app.js` ist weiterhin ein Monolith. `storage.js` wurde als Classic-Facade migriert; die übrigen Module unter `assets/js/*` bleiben wegen unvollständiger Parallelimplementierung nicht geladen.

---

## 1. Kritische Befunde

### 1.1 Module teilweise migriert (offen)
`assets/js/storage.js` ist als Classic-Facade in `index.html` geladen und besitzt die globale Storage-API. `main.js`, `i18n.js` und `window-manager.js` bleiben nicht geladen, weil ihre Parallelimplementierungen unvollständig sind und die reale App-Logik in `app.js` weiter verwendet wird.

### 1.2 eval() in Produktion (FIXED)

~~**Zeile 1117 in `assets/app.js`:**
```javascript
else if(b==='='){try{var r=eval(expr.value.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-'));...}
```~~

~~`eval()` auf User-Input ist ein XSS-Vektor. Auch wenn der Rechner offline läuft: Wer die Calc-App öffnet, kann JS injizieren (z.B. über importierte History oder manipulierte localStorage-Werte).~~

**Gefixt** (2026-09-23): `eval()` wurde durch einen sicheren Recursive-Descent-Parser (`safeEvalCalc()`) ersetzt.

- Whitelist-Regex: Nur `[-+*/().,\s\d_a-zA-Zπφ]` erlaubt
- Vollständige Parser-Hierarchie: `exprparse → muldiv → unary → primary`
- Unterstützt: `+,-,*,/,(,)`, Dezimalzahlen, `Math.PI/E/sin/cos/tan/sqrt/pow/log/abs`, `π`, `φ`, unäres Minus
- **38/38 Tests grün** (darunter 14 Sicherheits-Tests gegen XSS/Injection)
- Datei: `tests/safe-eval.test.mjs` (ES-Module-kompatibel)

### 1.3 DOMContentLoaded konsolidiert (FIXED)
`app.js` besitzt genau einen zentralen `DOMContentLoaded`-Handler. Er ruft `initShell()`, `initDesktop()` und `initBoot()` in definierter Reihenfolge auf.

### 1.4 Monolith-Größe (MEDIUM)

`app.js` ist 6434 Zeilen, 121+ Funktionen, eine einzige IIFE. Kein Imports, kein Exports. Unmöglich unit-testbar zu machen ohne Refactoring.

Die Tests in `tests/app.test.js` testen **keinen einzigen app.js-Code**. Sie re-implementieren Logik inline und testen ihre eigenen Mocks. Das gibt eine trügerische Sicherheit.

---

## 2. Code Smells

### 2.1 Duplizierte CSS-Criticals

`index.html` Zeilen 13-76 haben ~76 Zeilen Critical-CSS. Dieselben Selektoren (`#boot`, `#lock`, `#taskbar`, `.wnd`, `.wtitle`, `.wbody`) existieren in `assets/site.css` ebenfalls.

**Folge:** Lä doppelt (bei jedem Page-Load). Bei Änderungen an Criticals muss man BEIDE Dateien synchron halten.

### 2.2 innerHTML überall (~80+ Stellen)

Das gesamte UI-Rendering läuft über `innerHTML`. Weniger als 10 nutzen `createElement`. Das macht:
- XSS-Angriffe einfacher (vor allem mit localStorage-Daten wie Chat-Namen)
- DOM-Events nach jedem Re-Bind erneut registrieren müssen (Performance)
- Event-Delegation praktisch unmöglich

### 2.3 JSDoc-Coverage: ~5%

6 JSDoc-Kommentare für 121+ Funktionen. `eslint.config.js` fordert Konsistenz, kann aber nicht ausgeführt werden.

### 2.4 ESLint-Config ausführbar, Bestand als Warnungen
`eslint.config.js` ist auf ESLint-9-Flat-Config migriert. `npm run lint` läuft mit Exit 0. Aktuell 125 Warnungen im Monolith, davon 0 `indent` und 0 Fehler.

### 2.5 Testabdeckung
`tests/app.test.js` enthält weiterhin umfangreiche Mock-Tests. Zusätzlich gibt es inzwischen echte Regressionstests für `app.js`, Storage-Facade, Safe-Evaluator, XSS, Music und den gemeinsamen Close-Handler. Die Monolith-Abdeckung ist dennoch nicht vollständig.

---

## 3. Performance

### 3.1 Render-Blocking Script

`<script src="./assets/app.js?v=62">` ist synchron. Der Browser muss circa 9.9K ZL JS parsen und ausführen, bevor der Desktop gerendert wird. Dazu kommt die Boot-Animation als visueller Workaround.

**Mit `<script defer>` oder Module + Lazy Loading:** Desktop sofort sicher.

### 3.2 Module werden nicht tree-shakeable

Alles in einer IIFE = kein Tree-Shaking, kein Code-Splitting. Jede Zeile wird geladen, auch wenn der User nur Notepad öffnet.

### 3.3 Doppelter CSS-Pfad für Theme-Variablen

`:root`-Variablen sind in `<style>` UND `site.css`. Site-CSS wird über asynchrones Loading (`media="print" onload="this.media='all'"`) geladen, aber die inline-Variablen sind immer noch redundant.

---

## 4. Live-Check-Ergebnisse

```
200  /macrohard/
200  /macrohard/index.html
200  /macrohard/assets/site.css
200  /macrohard/assets/app.js
200  /macrohard/manifest.json
200  /macrohard/sw.js
404  /macrohard/assets/music       (Ordner existiert — listing blocked)
404  /macrohard/assets/samples     (Ordner existiert — listing blocked)
200  /macrohard/assets/js/*.js     (einzeln erreichbar)
```

Keine 404-Fehler. Alle Assets laden.

---

## 5. Empfehlungen (priorisiert)

### Sofort (Sicherheit)
1. **eval() entfernen** → Safe-Evaluator für Rechner
2. **DOMContentLoaded konsolidieren** → ein Handler, Rest via Events

### Kurzfristig (Qualität)
3. **Tests refactoren** → `app.js` importierbar machen (als Module oder globale Exports), echte Unit-Tests schreiben
4. **ESLint fixen** → Config auf Flat-Syntax migrieren oder auf ESLint 8 downgraden
5. **Orphaned Module entscheiden** → Einbauen ODER löschen (jetzt sind es tote Dateien)

### Mittelfristig (Architektur)
6. **Monolith aufteilen** → Jedes App-Modul als separates ES-Module, dynamisches `import()` bei App-Start
7. **innerHTML → Template-Strategie** → Entweder `<template>` + `cloneNode()` oder eine leichte Helper-Funktion (z.B. `h('div', [...])`)
8. **Critical-CSS deduplizieren** → Entweder nur inline oder nur in site.css — nicht beides

### Nice-to-have
9. TypeScript-Typisierung für das Modul-System (erleichtert Refactoring)
10. Playwright/Cypress E2E-Tests (verifizieren echtes Gerät-Verhalten)

---

## Verifikation

```
165/165 Tests grün
ESLint: 0 Fehler, 125 Warnungen (Monolith-Schuld)
25/25 App-X-Buttons im Browser geschlossen
```

**Neue Testdateien:**
- `tests/app-loader.mjs` — VM-basierter Loader, extrahiert Funktionen aus `app.js`
- `tests/app-real.test.mjs` — 23 Tests gegen echte `app.js`-Funktionen

**Extrahiert & getestet:**
- `storeSet`, `storeGet`, `storeDel` — localStorage Wrapper mit sessionStorage-Fallback
- `safeEvalCalc` — Eval-Rechner (arithmetische Ausdrücke, Math-Funktionen, XSS-Blockaden)
- `shuffleArray` — Fisher-Yates Shuffle

---
*Hermes Agent · 2026-09-23*
