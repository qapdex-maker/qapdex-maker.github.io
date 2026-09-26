# Offene `no-unused-vars` — klassifiziert, nicht blind gelöscht

Stand 2026-09-26, Release 2.11.47. 14 Warnungen bleiben (0 Fehler).
Jeder Fall wurde gelesen und geprüft, nicht aus der Meldung geraten.

## Gruppe A: unbenutzte Funktionsparameter (7)

ESLint meldet sie, weil die Regel nur Parameter mit `_`-Präfix als
unbenutzt zulässt. Sie sind harmlos — die Signatur dokumentiert den
Aufrufvertrag, auch wenn der Wert nicht gebraucht wird.

| Zeile | Name | Kontext |
|---|---|---|
| 531 | `by` | `sortDeskIcons(by)` — Sortierparameter, unten nicht verwendet |
| 1406 | `e` | Taskbar-Klick-Handler |
| 2095 | `idx` | Terminal-`forEach`-Callback |
| 2947 | `e` | Explorer-Handler |
| 4773 | `idx` | Bildeditor-`forEach` |
| 5876 | `r` | Chat-Handler |
| 8750 | `err` | `.catch(function (err) {})` |

**Bewusst nicht geändert.** Ein `_by` zu erzwingen wäre Kosmetik ohne
Nutzen. Die Konfiguration in `eslint.config.js` setzt
`argsIgnorePattern: '^_'`; wer die Warnung loswerden will, ohne Signaturen
zu verändern, sollte stattdessen `args: 'after-used'` setzen — das meldet
nur Parameter, die auch nach den genutzten stehen.

## Gruppe B: ungenutzte Deklarationen, die auf nicht verdrahtete Features hindeuten (4)

### `restoreFromTaskbar(wId)` — Zeile 517

Vollständig implementiert, **null Aufrufer**. Die Aufgabe „Fenster aus der
Taskbar wiederherstellen" erledigt der Taskbar-Klick-Handler an Zeile 1406
inline, mit eigener Logik. Die Funktion ist ein Duplakt dieses Ablaufs.

→ Kandidat zum Löschen. Oder: aufrufen statt Inline-Logik. Ich habe es
gelassen, weil es eine Frage der Absicht ist.

### `sortDeskIcons(by)` — Zeile 531

Sortiert die Desktop-Icons nach Name. **Null Aufrufer.** Ich habe geprüft,
ob das Desktop-Kontextmenü (Zeile 384ff) einen Sortier-Eintrag anbietet:
das Kontextmenü wird in `assets/app.js:391` als ein einziges `innerHTML`
gebaut und enthält `wallpaper`, `wallpaper-upload`, `theme`, `show-desktop`,
`close-all` — **kein `sort`**. Ein `data-action="sort"` existiert in der
ganzen Datei nicht (0 Treffer).

Die Funktion ist also kein Duplakt, sondern ein Feature, dessen UI nie
gebaut wurde. Zwei Wege: den Menüeintrag ergänzen, oder die Funktion
löschen. Ich habe sie stehen lassen — das ist eine Feature-Entscheidung,
und der Explorer hat mit `feSort` (Zeile 2841) bereits eine funktionierende
Sortierung, an die man sich orientieren könnte.

### `notesReady` — Zeile 8018

Sieben Schreibzugriffe, **null Lesezugriffe**. Der Autor hat den
Ladezustand des Vaults nachgeführt und ihn dann nie benutzt.

Der naheliegende Zweck: `buildNotes()` hat **keinen Guard**. Es lädt und
rendert die Notizen, auch wenn das Vault-Passwort noch nicht eingegeben
wurde — `notesReady` wäre genau das Flag dafür. Das ist eine
Feature-Entscheidung (soll die App den Ladezustand prüfen?), keine
Bereinigung. Deshalb nicht angefasst.

### `currentFile` — Zeile 9648

Zwei Fundstellen: Deklaration und `currentFile = file` beim Drop. Nie
gelesen. Der Editor merkt sich, welche Datei offen ist, und prüft es dann
nirgends — z. B. für „unbenutzte Änderungen"-Hinweis oder Drag-and-drop-Ziel.

Ebenfalls eine Feature-Frage.

## Gruppe C: echter toter Code (1)

### `b64decode` — entfernt

Das Gegenstück zu `b64encode`, das im Legacy-Save-Pfad (Zeile ~7956) noch
benutzt wird. `b64decode` hatte keinen Aufrufer: der Legacy-Import läuft
über `window.NotesCrypto.decodeLegacy()`, nicht über die lokale Funktion.
Entfernt, mit Begründung am verbleibenden `b64encode`.

## Bereits in dieser Sitzung entfernt

- `AUDIO_MIME` (Zeile 4991) — `handleUpload()` prüft mit `file.type.match(/^audio\//)`
  **und** `AUDIO_EXT`; die zusätzliche Konstante wurde nie benutzt.
- `notifQueue` (Zeile 645) — `notifCenter` daneben wird mit 11 Stellen
  benutzt, die Warteschlange nie.
- `ieSelectMode` / `ieSelectStart` / `ieSelectEnd` (Zeile 7213) — das
  Auswahl-Rechteck im Bildeditor ist nicht implementiert, die drei Variablen
  standen auf ihren Initialwerten.
- `tick2()` (Zeile 7779) — die Langpause alle 4 Sessions wurde stattdessen
  in `tick()` eingebaut, wo sie tatsächlich läuft.

## Fazit

Die Warnungen sind kein Fehl, sondern ein Inventar. Vier davon zeigen
Features, die begonnen und nicht zu Ende gebracht wurden — die Langpause war
so, und sie war ein echter Fehler. Die anderen drei brauchen eine
Entscheidung, keine mechanische Korrektur.
