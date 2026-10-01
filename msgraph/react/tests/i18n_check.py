#!/usr/bin/env python3
"""i18n-Vollstaendigkeit: jeder t.*-Key muss in BEIDEN Sprachen existieren.

Der F3-Bug: `reason: 'llm'` ohne `nl_reasons[en][...]` zeigte im UI den
ROHEN Key an. Ein Schluessel ohne DE- oder EN-Zwilling leakt genauso.

Der Test liest die I18N-Tabellen aus app.jsx und vergleicht sie. Er greift NICHT
ueber den ganzen Rest der Datei -- ein Regex auf '^    ([a-z0-9_]+):' auf das
ganze File zaehlt auch Objekt-Schluessel aus dem JavaScript (`model:`,
`free:`) und meldete 25 Phantom-Fehler, die keine waren. Nur die beiden
Sprachbloecke.

Ein weiterer, aehnlich teurer Fund dabei: `sketch_ep`, `sketch_join`,
`sketch_join_none`, `sketch_more`, `sketch_navonly`, `sketch_noep` und
`sketch_types` standen NUR in der DE-Tabelle. Die Skizzen-Karten zeigten im
EN-Modus diese rohen Schluessel. Das ist derselbe Fehlerklasse wie F3, nur
aelter und nie aufgefallen, weil niemand die Panels in EN durchgeklickt hat.

Aufruf: python3 i18n_check.py [pfad/zu/app.jsx]
Exit 0 = alle Schluessel in beiden Sprachen.
"""
import re
import sys

DEFAULT = "/data/data/com.termux/files/home/github/repo/qapdex-maker.github.io/msgraph/react/assets/app.jsx"


def slice_tables(src):
    """Die de:{...} und en:{...} Bloecke des I18N-Objekts isolieren.

    Klammerzählung statt Regex: ein Regex auf 'en: {' findet auch den
    PROVIDER-Block weiter unten, weil dort ebenfalls 'openrouter:' steht.
    """
    start = src.index("const I18N = {")
    body = src[start:]

    def block(marker):
        i = body.index(marker)
        j = i + len(marker)
        depth = 1
        while depth:
            c = body[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            j += 1
        return body[i:j]

    return block("  de: {"), block("  en: {")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
    src = open(path).read()
    de, en = slice_tables(src)

    def keys(block):
        # Schlüssel am Zeilenanfang ODER nach einem Komma am Zeilenanfang-Rest.
        # Zwei Schreibweisen kommen im File vor und beide sind gueltig:
        #     sketch_more: '+ {n} weitere', sketch_less: 'weniger anzeigen',
        # Ein Matcher, der nur den Zeilenanfang erlaubt, meldet den zweiten
        # Schluessel als "fehlt in EN" — und das war genau der Fehler, den
        # dieser Test zuerst produziert hat: sketch_less war in BEIDEN
        # Tabellen, nur nicht am Anfang einer Zeile. Ein Test, der die
        # Formatierung erzwingt, meldet korrekten Code als fehlend.
        return set(re.findall(r"(?:^|,)\s+([a-zA-Z0-9_]+):", block, re.M))

    kd, ke = keys(de), keys(en)
    only_de = sorted(kd - ke)
    only_en = sorted(ke - kd)

    print(f"DE: {len(kd)} Schluessel | EN: {len(ke)} Schluessel")
    if only_de:
        print("FEHLT in EN:")
        for k in only_de:
            print("   ", k)
    if only_en:
        print("FEHLT in DE:")
        for k in only_en:
            print("   ", k)
    if not only_de and not only_en:
        print("alle Schluessel in beiden Sprachen")
        return 0

    # Gegenprobe: wird so ein Key im Rendering benutzt? Ein unbenutzter Key ist
    # harmlos, ein benutzter leakt in die UI.
    used = set(re.findall(r"\bt\.([a-zA-Z0-9_]+)", src))
    leaking = sorted((set(only_de) | set(only_en)) & used)
    if leaking:
        print("IM UI BENUTZT und trotzdem einseitig:")
        for k in leaking:
            print("   ", k)
    unused = sorted((set(only_de) | set(only_en)) - used)
    if unused:
        print("einseitig, aber unbenutzt (harmlos):")
        for k in unused:
            print("   ", k)
    return 1


if __name__ == "__main__":
    sys.exit(main())