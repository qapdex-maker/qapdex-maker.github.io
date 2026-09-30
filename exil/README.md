# EXiL 126 — Party

Teaser-Seite für eine Party, deren Datum noch nicht steht. Wird später zur
Party-Seite ausgebaut; die Struktur ist darauf ausgelegt.

**Stand 2026-09-30:** veröffentlicht als Teaser. Seite bleibt vorerst genau so,
wie sie ist — Datum, Ort und Line-Up kommen erst, wenn sie feststehen.

Live: <https://qapdex-maker.github.io/exil/>

## Inhalt

| Ort | Datei |
|---|---|
| Seite | `index.html` |
| Stylesheet | `assets/exil.css` |
| Wortmarke | `assets/IMG_0409.PNG` (507×739, RGBA, 79 % transparent) |
| Bildmarke | `assets/IMG_0412.jpg` (330×297, schwarz auf weiß) |

Kein JavaScript. Die Seite funktioniert offline und ohne Skripte.

## Die Logos

Beide Bilder sind unverändert aus `~/storage/downloads/exil/` übernommen.
`IMG_0409.PNG` hat einen Alphakanal und braucht deshalb keinen Kasten
darum herum; `IMG_0412.jpg` ist ein JPEG auf weißem Grund und wird über
`mix-blend-mode` an Light und Dark Mode angepasst (`multiply` bzw. `screen`),
damit es im dunklen Modus kein weißer Fleck wird.

Einsatz bewusst zurückhaltend: 96 px Wortmarke im Kopf, 140 px Bildmarke am
Ende. Kein Banner.

## Platzhalter, die später verschwinden

Drei Fakten-Kacheln — **Datum folgt**, **Ort folgt**, **Liste folgt** — stehen
in `--accent`, dem einzigen Farbton der Seite. Sobald ein Wert feststeht, wird
die Klasse `.tbd` durch den echten Inhalt ersetzt und die Farbe fällt weg.

Das ist der ganze Ausbauplan: Text ersetzen, `.tbd` wegnehmen. Nichts an der
Struktur muss sich ändern.

## Geprüft

Im Chromium gegen den echten Server gemessen, nicht nur gelesen:

- beide Logos laden, `alt`-Text und `width`/`height` gesetzt
- kein horizontaler Overflow bei 390 px und 1280 px
- Dark Mode schaltet über `prefers-color-scheme`
- Kontraste WCAG AA: 4,9:1 hell, 6,64:1 dunkel
- Portal-Karte und Event-Filter zeigen auf diese Seite
- keine Console-Fehler

Nach dem Deploy zusätzlich live geprüft, Desktop und 390 px, 12/12 bestanden.

## Portal

Eintrag in der Root-`index.html`, Kategorie **Event**, Status *soon*.
