# MakerOS Bug-Hunting Report

Stand: 2026-10-06, Release 2.11.55. 25 Desktop-Apps, 347 Unit-Tests,
0 ESLint-Fehler, 0 Warnungen.

Dieser Bericht ersetzt den Stand vom 27. September. Er dokumentiert die
Bugs der letzten Bug-Hunting-Läufe, wie sie **tatsächlich gefunden und
verifiziert** wurden — nicht als Absichtserklärung.

---

## 1. Wie gefunden wurde

| Ebene | Werkzeug | Was es findet | Was es nicht findet |
|---|---|---|---|
| AST | `espree` via `node --test` | Scope-Fehler, toter Code, IFFE-Grenzen | alles zur Laufzeit |
| Unit | `node --test` (302 Tests) | Zustandslogik, DOM-Stubs, Regressionen | Fehler ohne Testabdeckung |
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
    *(Zahlen beziehen sich auf diesen Lauf, Release 2.11.47)*. 18 Warnungen.
    8 davon (`storeSet`, `startOS`, `openApp`, `toast` …) sind
    echte `window`-Properties und in `eslint.config.js` dokumentiert. Die
    anderen waren — wie sich herausstellte — **genau der Close-Handler-Bug
    aus 2.1 Nr. 1**. Die Konfiguration trug den Satz
    „Verified in the browser, so this stays a warning". Das war falsch.
    Ein viertes `no-undef` kam später hinzu und war wieder echt: 2.4 Nr. 12.

### 2.4 Laufzeit (Release 2.11.50)

12. **`no-undef` war kein Fehlalarm, sondern ein echter Bug.**
    `buildSysinfo()` liegt außerhalb der Haupt-IIFE (siehe Abschnitt 4) und las
    `APP_VERSION`, eine `const` innerhalb dieser Closure. Beim Öffnen der
    Systeminfo-App warf die erste `addRow`-Zeile einen `ReferenceError` und
    die Funktion brach ab: Überschrift „Betriebssystem", dann keine Zeile
    mehr. Kein Error-Event, keine Konsolenausgabe.

    *Fix:* `window.APP_VERSION = APP_VERSION;` neben die anderen
    Grenz-Exports (`window.toast`).
    *Tests:* `tests/iife-version-export.test.mjs`,
    `tests/theme-darkmode-separation.test.mjs`.

13. **Sechs tote Bindings in `app.js`** — alle mit Null Aufrufern und Null
    String-Referenzen: `restoreFromTaskbar(wId)` (eine vierte Kopie der
    Minimize/Restore-Logik, die es an vier anderen Stellen bereits gibt — und
    die mit der bloßen App-ID arbeiten würde, also für Mehrfachinstanz-Apps
    nie funktioniert hätte), `sortDeskIcons(by)` (der `by`-Parameter wurde nie
    gelesen, es wurde immer nach Label sortiert — ein halb fertiges Feature,
    keine Versehentlichkeit), `currentFile` in `buildViewer()` (bei Drop
    gesetzt, nie gelesen), `musArt` in `buildMusic()`,
    `data-app` in `buildTaskmgr()`.

    `notesReady` wurde an sieben Stellen **gesetzt und an keiner gelesen**,
    was nach einem unfertigen Guard aussieht. Geprüft, ob Klartext-Notes vor
    dem Unlock gespeichert werden können: nicht erreichbar (blockierendes
    `prompt()`, alle `saveNotes()`-Aufrufe sind User-Aktionen danach,
    `saveNotes()` prüft selbst `notesVault === 'aes-gcm' && notesPassword`).

    *Ergebnis:* ESLint 0 Fehler, 0 Warnungen.

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
Release        2.11.50   (app.js?v=71, sw.js macrohard-v2-11-50)
Unit-Tests     302 / 302 grün
ESLint         0 Fehler, 0 Warnungen
var            0
Browser-Smoke  25 Apps geöffnet, 0 Laufzeitfehler
```

**Update 2026-09-27 (Release 2.11.50, Commits 9414caa + b7bb808):** Die
Warnungen sind nicht mehr "klassifiziert, nicht behoben", sie sind weg. Die 14
verbliebenen waren sechs tote Bindings (siehe 2.4 Nr. 13) und acht unbenutzte
Funktionsparameter. Für die Parameter ist ein `_`-Präfix die richtige Antwort,
kein Entfernen — ein Handler, der kein Event braucht, ist kein Fehler.

**Der Grund, warum das hier steht und nicht im Kleingedruckten:** In diesem
Lauf war eine der 14 Warnungen der *einzige* `no-undef`, und sie war ein
Laufzeitbug. `buildSysinfo()` liegt außerhalb der Haupt-IIFE und las eine
`const`, die darin deklariert ist. Beim Öffnen der Systeminfo-App:

```
ReferenceError: APP_VERSION is not defined
  at buildSysinfo (assets/app.js?v=71:8806:30)
```

Die OS-Zeile ist die erste Zeile der ersten Sektion, also brach die Funktion
sofort ab — Überschrift, dann nichts, keine Konsolenmeldung. Der Test, der
das hätte fangen können, prüfte die Stringform `'MakerOS v' + APP_VERSION`,
und die hat auch der kaputte Code. Sie war grün gegen den kaputten Build.

*Tests:* `tests/iife-version-export.test.mjs` (geht an der IIFE-Grenze entlang
und verlangt für jeden Zugriff außerhalb `window.APP_VERSION`),
`tests/theme-darkmode-separation.test.mjs` (die schwache Assertion ist ersetzt).

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
ist ein Browser-Smoke-Test Pflicht, nicht Kür. Konkret: alle 25 Apps öffnen,
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
| Musik + Taskmanager | im Headless-Chromium nicht reproduzierbar; AudioContext bleibt suspended, 0 Scheduler-Ticks. Ursache offen, braucht Messung auf dem echten Gerät. |
| Glow | Screenshot fehlt noch — Code ist sauber, Tests bestätigen entfernt. Zwei Stellen haben noch Glow-Optik (ami-bios-setup.html CRT-Vignette, site.css backdrop-filter). |
| `find-tdz-traps.mjs` | O(n³), diagnostisch, nicht Teil de `npm test` |
| `assets/app.js` unformatiert | Prettier meldet es schon im HEAD; ein Format-Lauf wäre ~2000 Zeilen Fremd-Diff und gehört in einen eigenen Commit |
| `#stGrid` („Desktop-Raster“) | steuert die Klasse `show-grid`, für die es keine CSS-Regel gibt. Toter Schalter, bewusst nicht angefasst; `tests/settings-checkbox-timing.test.mjs` hält den Zustand fest und schlägt in beide Richtungen an |
| Editor + Explorer: Fenster-Overflow | ragt aus dem Bild — nicht reproduziert, braucht Screenshot |
| Notepad: Fenstergröße/Resize | nicht reproduziert, braucht Screenshot |

**Abgehakt (2026-10-06):** Die 20 `no-unused-vars` und 6 `prefer-const` sind
weg (Commit b7bb808), der `no-undef` in `buildSysinfo()` ist behoben
(Commit 9414caa). Beide waren in dieser Tabelle als „klassifiziert, kein
Laufzeitrisiko“ geführt — die Einordnung war falsch, siehe 2.4 Nr. 12.

**Abgehakt (2026-10-05):** Paint-Eingabe-Offset behoben (Commit 44b5c78),
Explorer-Öffnen/Speichern behoben (Commit 44b5c78), Resize-Grip Touch-Trefferfläche
48px + Glyphe skaliert (Commit 9e6ac3a). 11 neue Tests, 347/347 grün.

**Abgehakt (2026-09-27):** Die 20 `no-unused-vars` und 6 `prefer-const` sind
weg (Commit b7bb808), der `no-undef` in `buildSysinfo()` ist behoben
(Commit 9414caa). Beide waren in dieser Tabelle als „klassifiziert, kein
Laufzeitrisiko“ geführt — die Einordnung war falsch, siehe 2.4 Nr. 12.
