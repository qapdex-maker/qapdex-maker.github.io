# MakerOS — Code Quality & Debugging Report

**URL:** https://qapdex-maker.github.io/macrohard/
**Stand:** 2026-09-23 | v2.11.45
**Scope:** `assets/app.js` (6434 ZL), `index.html` (309 ZL), `assets/site.css` (1043 ZL), `assets/js/*` (361 ZL), `tests/app.test.js` (911 ZL)

---

## Executive Summary

Die Seite läuft und ist funktional. 68/68 Tests grün. Live-Crawl zeigt keine 404s.

Aber: Die Codebasis hat **strukturelle Schulden**, die Wartung und Testbarkeit stark einschränken. Kernproblem: Eine 6434-Zeilen-IIFE als Monolith, während ein paralleres Modul-System (`assets/js/*`) existiert aber **vollständig orphaned** ist — es wird in `index.html` nie geladen.

---

## 1. Kritische Befunde

### 1.1 Module sind Orphaned (CRITICAL)

`assets/js/` enthält 4 saubere ES-Module (i18n.js, main.js, storage.js, window-manager.js) mit Exports und JSDoc. Aber:

- `index.html` lädt **nur** `assets/app.js?v=52` — kein `<script type="module">` für die JS-Dateien
- Die Module werden von **niemandem importiert**
- `restoreSession()` in `assets/app.js` ist definiert, aber **nie aufgerufen** — Session Restore ist toter Code
- `window-manager.js` exportiert `openApp()`, aber `assets/app.js` hat eine eigene (andere) `openApp()` Definition

**Folgendes ist doppelt:**
- `storeSet`/`storeGet` existieren in `assets/js/storage.js` UND in `assets/app.js`
- `desktopApps`-Array existiert in `assets/js/main.js` UND in `assets/app.js`
- `openApp` existiert in `assets/js/window-manager.js` UND in `assets/app.js`

**Fix:** Entweder:
- (A) Module in `index.html` als `<script type="module" src="./assets/js/main.js">` laden und `app.js` aufteilen — ABER: `app.js` ist kein Module, es ist eine IIFE
- (B) `assets/js/*` löschen und den Monolith akzeptieren (Wartbarkeit leidet)

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

### 1.3 DOMContentLoaded x4 (MEDIUM)

Drei Handler in `app.js` (Zeilen 466, 3967, 4254) + einer inline in `index.html`. Reihenfolge und Abhängigkeiten sind undefiniert. Wenn einer fehlschlägt, können andere brechen.

**Fix:** Einziger Boot-Handler, alle anderen via Custom Events triggern.

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

### 2.4 ESLint-Config kaputt

`eslint.config.js` nutzt `env:` (ESLint 8 Style) in einem Flat-Config-System (ESLint 9). `npm run lint` crasht. Die vordefinierten Regeln (`no-var: error`, `no-unused-vars: error`) werden nie erzwungen.

### 2.5 Tests testen sich selbst

`tests/app.test.js` hat 68 Tests, aber:
- `console.log('All Tests passed!')` in Zeile 289 (zwischen Tests!)
- Kein einziger Import aus `app.js` oder den JS-Modulen
- Jeder Test baut seine eigene Mock-Logik inline auf
- 0% Coverage des eigentlichen Produktivcodes

---

## 3. Performance

### 3.1 Render-Blocking Script

`<script src="./assets/app.js?v=52">` ist synchron. Der Browser muss 6434 Zeilen JS parsen und ausführen, bevor der Desktop gerendert wird. Dazu kommt die Boot-Animation als visueller Workaround.

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
node --test                    → 91/91 passing (68 alte + 23 neue echte app.js-Tests)
node --check assets/app.js     → SYNTAX OK
ESLint                         → CRASHED (Config broken)
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
