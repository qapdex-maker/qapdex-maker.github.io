# MakerOS Bug-Hunting Report

Stand: 2026-09-26, Release 2.11.47. 25 Desktop-Apps, 250 Unit-Tests,
0 ESLint-Fehler bei 26 Warnungen.

Dieser Bericht ersetzt den Stand vom 18. September. Er dokumentiert die
Bugs der letzten beiden Bug-Hunting-Läufe, wie sie **tatsächlich gefunden und
verifiziert** wurden — nicht als Absichtserklärung.

---

## 1. Wie gefunden wurde

| Ebene | Werkzeug | Was es findet | Was es nicht findet |
|---|---|---|---|
| AST | `espree` via `node --test` | Scope-Fehler, toter Code, IFFE-Grenzen | alles zur Laufzeit |
| Unit | `node --test` (250 Tests) | Zustandslogik, DOM-Stubs, Regressionen | Fehler ohne Testabdeckung |
| Lint | ESLint | `no-undef`, `no-var`, unbenutzte Namen | Semantik |
| Browser | agent-browser + Chromium | **echte** Laufzeitfehler, Autoplay, CORS | Kopfhörer-Akustik |
| Netz | HTTPS-Probe | CORS-Header, erreichbare Streams | was der Browser daraus macht |

**Die wichtigste Lehre steht in Abschnitt 5.** Grüne Tests haben einen
kaputten Browser geliefert.

---

## 2. Gefundene und behobene Bugs

### 2.1 Kritisch

1. **Close-Handler las Function-Lokals — ReferenceErrors wurden verschluckt**
   `visRafId`, `SEQ`, `stopSequencer`, `chatReplyTimer` waren in
   `buildMusic()` bzw. `buildChat()` deklariert. Der gemeinsame Close-Handler
   (Zeile ~1315) las sie direkt, obwohl sie dort nicht im Scope sind — jede
   Stelle warf `ReferenceError: X is not defined`, und der umgebende
   `catch (err) {}` schluckte ihn.
   *Wirkung:* Beim Schließen des Music-Fensters lief die
   `requestAnimationFrame`-Schleife des Visualizers weiter und zeichnete auf
   ein entferntes Canvas. Sequencer und Chat-Timer wurden nie bereinigt.
   *Fix:* Der Handler ruft den bereits registrierten
   `window.osTimeouts['music_cleanup']`; `visRafId` und `chatReplyTimer` liegen
   jetzt auf IIFE-Ebene.
   *Test:* `tests/close-handler-scope-regression.test.mjs`, AST-basiert.

2. **Radio-Suche zerstörte die Senderliste dauerhaft**
   `fetchRadios()` schrieb `radioStations = found` bei **jeder** Antwort,
   auch bei einer Suche. Der Guard am Funktionsanfang unterdrückte danach jeden
   Refetch, also waren die kuratierten Stationen bis zum Fensterschließen weg —
   `saveRadios()` persistierte die gekürzte Liste zusätzlich.
   *Fix:* Suchergebnisse in ein eigenes `radioSearchHits`-Array;
   `radioStations` wird nur ohne Suchbegriff ersetzt und nur dann gespeichert.
   *Nebenbefund im selben Test:* `renderRadio()` baut die Suchleiste neu auf,
   wodurch der eingegebene Begriff bei jedem Ergebnis-Update verschwand.
   *Test:* `tests/radio-search-regression.test.mjs`.

3. **Frame-Block-Erkennung zerstörte normales Surfen**
   Zeitweilig war eingebaut: `onload` prüft, ob `iframe.contentDocument`
   lesbar ist, und zeigte dann den Blockier-Screen. In Chromium gemessen sind
   ein blockierter und ein normaler Cross-Origin-Frame in **jedem** Signal
   identisch (Details in 5.1). Ergebnis: `example.com`, Wikipedia, MDN und jede
   normale Seite zeigten den Fehler-Screen.
   *Fix:* Erkennung entfernt. Es bleibt der permanente `↗`-Button, der den
   aktuellen Tab ohne jede Erkennung im echten Browser öffnet, plus `⚠` für den
   Fall, dass der Frame wirklich ein Browser-Fehlerdokument zeigt.
   *Test:* `tests/browser-external-open.test.mjs`, verhaltensbasiert.

4. **`var` → `let` sprengte die Notes-App**
   Bei der Konvertierung aller 52 `var` (43fbacd) wurde `notesVault` zu `let`.
   Die Deklaration stand bei Z8023, aber `paintVaultBtn()` liest sie und wird
   bei Z7875 während des Setups aufgerufen. `var`-Hoisting hatte den frühen
   Zugriff zu `undefined` gemacht, niemand hatte es bemerkt; `let` warf
   `Cannot access 'notesVault' before initialization` und die App ließ sich
   nicht öffnen. **Die Unit-Tests waren durchgehend grün** — sie bauen die
   Notes-App nicht.
   *Fix:* Deklaration an den Anfang von `buildNotes()`.
   *Test:* weiterhin keiner; der Browser-Smoke-Test ist hier der einzige, der
   es gefangen hat (siehe 5.2).

### 2.2 Mittel

5. **Paint-PNG-Export war unerreichbar**
   `exportPaintPNG()` existierte, hatte aber 0 Aufrufer. Die Toolbar bot nur
   Undo/Redo/Clear. Die dokumentierte Funktion gab es im UI nicht.
   *Fix:* Button in der Toolbar, verdrahtet mit dem vorhandenen Helper.
   *Test:* `tests/paint-export-regression.test.mjs`.

6. **Zwei Resize-Buttons in `buildImgeditor()` teilten sich einen Namen**
   `var ieResizeBtn` war zweimal deklariert: einmal für einen erzeugten Button
   (Z7336), einmal für die Toolbar (`#ieResize`, Z7482). `var` ließ die zweite
   Deklaration die erste überschreiben — der erzeugte Button behielt seinen
   Handler, war über die Variable aber nicht mehr erreichbar, und `#ieResize`
   sammelte ungewollt einen zweiten.
   *Fix:* Der erzeugte Button heißt jetzt `ieSizeBtn`.

7. **EQ-Gain-Logik doppelt implementiert**
   Der EQ-Slider hatte die Gain-Anweisung inline, während `applyEQValues()`
   ungenutzt daneben stand. Zwei Stellen, dieselbe Logik.
   *Fix:* Der Slider ruft `applyEQValues()`. Eine Stelle.

8. **Suche im Radio verlor den Suchbegriff**
   Siehe 2.1 Nr. 2, Nebenbefund.

### 2.3 Niedrig / Struktur

9. **`TASKMGR_INITIALIZED` ohne Schutzfunktion** — wurde auf `false`
   zurückgesetzt, aber nie auf `true` gesetzt; das `if (FLAG) return;`, wozu
   es gehörte, existiert nicht. `tests/app-reinit-regression.test.mjs` prüft
   jetzt für jeden Init-Flag, dass er wirklich einen Guard hat.

10. **Toter Code im IIFE-Scope** — `apps = {}` (nie befüllt, die Registry ist
    der `openApp`-Switch), `bootDone` (gesetzt, nie gelesen),
    `chatContacts`/`chatMsgKey`, `wW` in `snapActive()`, `wc()`/`filesize()` im
    Terminal, sowie fünf nie aufgerufene Funktionen (`ensureResumed`,
    `cleanupRadio`, `loadPresetPattern`, `savePattern`, `buildFallbackPad`).
    *Test:* `tests/dead-code-regression.test.mjs`.

11. **`no-undef` als Fehlalarm etikettiert, obwohl drei davon echte Bugs waren**
    18 Warnungen. 8 davon (`storeSet`, `startOS`, `openApp`, `toast` …) sind
    echte `window`-Properties und in `eslint.config.js` dokumentiert. Die
    anderen waren — wie sich herausstellte — **genau der Close-Handler-Bug
    aus 2.1 Nr. 1**. Die Konfiguration trug den Satz
    „Verified in the browser, so this stays a warning". Das war falsch.

---

## 3. Radio-Akustik: erstmals geprüft

Die offene Notiz lautete bisher: „Radio-Inhalte nicht akustisch geprüft".
Das ist jetzt zweigeteilt beantwortet.

### 3.1 Netzseitig geprüft, zwei echte Fehler gefunden

Alle 22 kuratierten Sender per HTTPS-Probe geprüft (Status, Audio-Payload,
`Access-Control-Allow-Origin`):

- 20 Sender: `Access-Control-Allow-Origin: *`, Audio wird geliefert.
- **2 Sender ohne CORS-Header:**
  - `npr-ice.streamguys1.com/live.mp3`
  - `fm939.wnyc.org/wnycfm`

*Warum das ein Fehler ist und kein Detail:* Radio läuft in MakerOS durch
`createMediaElementSource(audioEl) → AnalyserNode → destination`, und der EQ
sind Biquad-Filter im selben Graph. Ein Cross-Origin-Medienelement ohne CORS
macht den Graph **tainted**: der Ton ist hörbar, aber der Analyser gibt
Stille aus. Der Visualizer bewegt sich nie, der EQ greift nicht, und es gibt
keinerlei Fehlermeldung. Man hält das für einen App-Bug.

*Fix:* Beide ersetzt — NPR Music → BBC World Service, WNYC FM → Radio Swiss
Classic. Beide Kandidaten vorher gemessen, nicht angenommen.
*Test:* `tests/radio-cors-regression.test.mjs` (offline, festschreibt die
Tatsache) und `tests/radio-cors-live.mjs` (Netz, bewusst **nicht** Teil von
`npm test` — siehe 5.3).

### 3.2 Akustisch weiterhin offen — und warum

Der Audio-Kontext ließ sich in headless Chromium nicht starten:

```
AudioContext.state → "suspended"
play() → NotAllowedError: the user didn't interact with the document first
```

Chromium blockiert Autoplay auch nach einem synthetisch ausgelösten Klick.
Was damit **gemessen** wurde:

- lokale MP3 lädt bis `canplaythrough`, Dauer 372,7 s
- `canPlayType("audio/mpeg")` → `probably`
- der Browser-Frame lädt `example.com` normal

Was damit **nicht** gemessen wurde, und auf einem echten Gerät geprüft werden
muss: ob ein Stream hörbar ist, ob der Visualizer sich bewegt, ob die EQ-Regler
wirken, ob der Sequencer Samples abspielt. Diese Punkte kann kein
Node-Test und kein headless-Browser beantworten.

---

## 4. Zustand

```
Release        2.11.47   (app.js?v=66, sw.js macrohard-v2-11-47)
Unit-Tests     250 / 250 grün
ESLint         0 Fehler, 26 Warnungen (20 no-unused-vars, 6 prefer-const)
var            0
Browser-Smoke  24 Apps geöffnet, 0 Laufzeitfehler
```

Die 26 verbleibenden Warnungen sind klassifiziert, nicht behoben:
20 `no-unused-vars` (unbenutzte Funktionsparameter und -lokale) und
6 `prefer-const`. Keine davon ist ein Laufzeitproblem.

---

## 5. Was diese Session über Tests gelehrt hat

### 5.1 Ein Test kann die falsche Implementierung festnageln

Der erste `browser-external-open.test.mjs` prüfte **Mechanik**: „`onload`
muss `contentDocument` benutzen". Grün. Die App war kaputt.

Der Test war nicht falsch formuliert — er war *zu eng*. Er sagte exakt das
Falsche: „die Implementierung ist richtig, wenn sie `contentDocument` liest",
und diese Implementierung war falsch.

Die zweite Fassung prüft **beobachtbares Verhalten**: eine normale
Cross-Origin-Seite darf nie den Blockier-Screen auslösen, die App darf den
Frame nicht aufgrund eines `contentDocument`-Zugriffs verstecken, `↗` muss
ohne jedes Load- oder Block-Event funktionieren. Der Test wird gegen den
bekannt kaputten Code rot (6 von 16), nicht nur gegen die Vorgängerversion.

**Regel:** Ein Regressionstest muss eine *falsche* Implementierung abweisen,
nicht nur eine *andere*. Vorher fragen: „Würde dieser Test bei der falschen
Lösung grün?" Wenn ja, ist er zu schwach.

### 5.2 `node --check` fängt keinen TDZ-Fehler

`brLoaded = true` ohne vorheriges `let` besteht den Syntax-Check in sloppy
mode und wirft erst zur Laufzeit. Umgekehrt ist `node --check` bei der
`var`→`let`-Konvertierung grün gewesen, während die Notes-App nicht mehr
startete.

**Regel:** Bei Änderungen an Sperren-Zuständen in Code ohne Testabdeckung
ist ein Browser-Smoke-Test Pflicht, nicht Kür. Konkret: 24 Apps öffnen,
Fehler-Listener setzen, warten, Ergebnis melden.

### 5.3 Zwei Analysen waren falsch, bevor sie brauchbar waren

Die TDZ-Analyse für die 52 `var` lief zweimal falsch:

- **Zeilenbasiert:** meldete Namenskollisionen in Nachbar-Funktionen
  (`c`, `cur`, `fn`, `n`, `idx`) als TDZ-Risiko.
- **Funktionsbasiert:** meldete `TERM_INITIALIZED`, das sicher ist, weil
  `buildTerminal()` nicht laufen kann, bevor der IIFE-Body die Deklaration
  ausgewertet hat.

Beide hätten die Arbeit blockiert, wenn man sie für bare Münze genommen hätte.
Die brauchbare Fassung prüft Block-Identität und Position in der
Statement-Liste, plus die Frage „kann diese Funktion laufen, bevor die
Deklaration ausgewertet wird".

**Regel:** Ein Analyse-Ergebnis, das sehr viele Treffer produziert, ist fast
immer zu unscharf. Nach dem dritten Namen derselben Art ist nicht der Code
kaputt, sondern die Heuristik.

### 5.4 Der Netztest gehört nicht in `npm test`

`tests/radio-cors-live.test.mjs` hätte 420 s gebraucht und den
Standardlauf blockiert. Umbenannt auf `.mjs` statt `.test.mjs`, damit
`node --test tests/*.test.*` es nicht erfasst. Der Grund steht in der Datei.

**Regel:** Tests, die vom Netz oder von Geräte-Funktionen abhängen, kommen
nicht in den Standardlauf. Sie werden separat benannt und bewusst ausgeführt.

---

## 6. Offen

| Punkt | Grund |
|---|---|
| Radio akustisch prüfen | headless Chromium blockiert Autoplay; braucht echtes Gerät |
| 20 `no-unused-vars`, 6 `prefer-const` | klassifiziert, kein Laufzeitrisiko, bewusst offen |
| Browser-Blockier-Erkennung | technisch unmöglich; `⚠` als manueller Weg |
| `find-tdz-traps.mjs` | O(n³), diagnostisch, nicht Teil von `npm test` |
