# no-var-Analyse (Stand 2026-09-26)

Ergebnis von `node tests/analyze-var.mjs` gegen `assets/app.js`:
**52 `var`-Deklarationen, 2 mit echtem Umordnungsrisiko, 50 konvertierbar.**

## Zwei Analysen waren vorher falsch — beide aus dem gleichen Grund

**v1: zeilenbasierter Vergleich.** Meldete `c`, `cur`, `fn`, `n`, `idx`,
`parts` als TDZ-Risiko. Grund: Namenskollisionen in Nachbar-Funktionen.
`var c` bei Z2161 (Terminal) und ein anderes `var c` bei Z2298 (Explorer) —
zwei verschiedene Scope, kein Risiko.

**v2: Funktions-Scope-Vergleich.** Besser, aber immer noch zu grob. Meldete
`TERM_INITIALIZED` als Risiko, weil der Lesezugriff bei Z2112 (in
`buildTerminal()`) vor der Deklaration bei Z2544 (IIFE-Body) liegt. Das ist
**falsch**: `buildTerminal()` kann erst laufen, wenn der IIFE-Body fertig ist,
die Deklaration also längst ausgewertet. `var`-Hoisting ist hier nicht
besserungsbedürftig, sondern schlicht irrelevant.

**Die eigentliche Frage** ist nicht „steht der Lesezugriff weiter oben im
File", sondern „kann dieser Zugriff ausgeführt werden, *bevor* die Deklaration
ausgewertet wird". Zwei Fälle sind wirklich gefährlich:

- (A) Lesen und Deklaration stehen im selben Block, Lesen zuerst.
- (B) Der Lesezugriff sitzt in einer Funktion, die aufgerufen wird, bevor der
  IIFE-Body die Deklaration erreicht.

`analyze-var.mjs` prüft genau das über Block-Identität und Position in der
Statement-Liste — nicht über Zeilennummern.

## Die zwei echten Risikofälle

### 1. `ieResizeBtn` in `buildImgeditor` (Z7336 und Z7482) — ein Latenz-Bug

```
7336  var ieResizeBtn = document.createElement('button');   // eigener Button
7337  ieResizeBtn.className = 'cBtn';
7338  ieResizeBtn.textContent = 'Größe ändern';
7339  ieResizeBtn.addEventListener('click', ...);            // Handler A
...
7482  var ieResizeBtn = toolbar.querySelector('#ieResize');  // ANDERES Element
7483  if (ieResizeBtn)
7484    ieResizeBtn.addEventListener('click', ...);          // Handler B
```

Zwei verschiedene Elemente, zwei verschiedene Handler, ein gemeinsamer Name.
`var` überschreibt still. Effekt: der erzeugte Button (Z7336) behält Handler A
und funktioniert, ist über die Variable aber nicht mehr erreichbar — und
`#ieResize` aus der Toolbar bekommt zusätzlich Handler B. Mit `let` wäre das
ein **SyntaxError**, die App wäre komplett kaputt.

Fix: die erste Deklaration bekommt einen eigenen Namen (`ieSizeBtn`), die
zweite bleibt `ieResizeBtn`. Erst dann ist `let` möglich.

### 2. `var i` in `aiMove` (Z9750 und Z9759) — gleiche Klasse

Zwei `for (var i = ...)` in derselben Funktion. Mit `let` wäre die zweite
Schleife ein SyntaxError. Fix: `let` in beiden, jede Schleife hat ihre eigene
Bindung.

## Umfang

| Kategorie | Anzahl | Konvertierung |
|---|---|---|
| echtes Risiko | 2 | erst umbenennen, dann `let` |
| wird neu zugewiesen | 27 | `let` |
| nie neu zugewiesen | 23 | `const` |

## Reihenfolge

1. `ieResizeBtn` umbenennen, `i` in `aiMove` entduplizieren
2. Tests: 247 müssen ohne Anpassung grün bleiben
3. Mechanische Konvertierung der restlichen 50
4. `npm test`, `node --check`, ESLint muss auf 0 `no-var` gehen
5. Browser-Smoke-Test: mehrere Apps öffnen, Terminal und Bildeditor bedienen

Punkt 5 ist nicht optional. Die Konvertierung betrifft 50 Stellen in
Sperren-Zuständen ohne Testabdeckung — genau die Klasse von Änderung, die
lokal grün aussieht und im Browser etwas zerschießt.
