#!/data/data/com.termux/files/usr/bin/bash
# Prueft die Behauptungen in README.md gegen die Realitaet.
#
# Zwei Fallen, beide beim ersten Lauf dieses Skripts passiert und jetzt behoben:
#
#  1. `grep -q "app.test.js" workflow.yml` findet den Begriff im ERKLÄRENDEN
#     Kommentar am Dateianfang — nicht in einem ausgeführten Schritt. Die
#     Aussage "die Einzeldatei läuft noch" war also falsch, der Code war sauber.
#     Deshalb wird jetzt nur Code geprueft (Zeilen ohne # und ohne Leerzeichen-
#     Fuehrung).
#  2. Das Muster `test/\*\.test\.mjs *# [0-9]+` findet nichts, weil im README
#     ein tabellarischer Abstand dazwischensteht. Das grep-Muster muss zur
#     tatsaechlichen Zeile passen, sonst meldet es eine fehlende Zahl, die
#     vorhanden ist.
cd "$HOME/github/repo/qapdex-maker.github.io" || exit 1
fail=0
chk() { if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1: Doku '$2', real '$3'"; fail=$((fail+1)); fi; }
has()  { if [ "$2" -gt 0 ]; then echo "  ok   $1"; else echo "  FAIL $1"; fail=$((fail+1)); fi; }
hasnt(){ if [ "$2" -eq 0 ]; then echo "  ok   $1"; else echo "  FAIL $1 ($2 Treffer im Code)"; fail=$((fail+1)); fi; }

WF=.github/workflows/site-ci.yml
# Nur Codezeilen: kein Kommentar, kein Leerzeichen-Praefix.
code() { grep -vE '^\s*#' "$WF" | grep -vE '^\s*$'; }

echo "=== Versions- und Testzahlen ==="
R_V=$(grep -oE 'v2\.11\.[0-9]+' README.md | head -1 | tr -d 'v')
chk "macrohard-Version" "$R_V" "$(grep -oE '"version": "2\.11\.[0-9]+"' macrohard/package.json | grep -oE '2\.11\.[0-9]+')"

R_M=$(grep -oE 'npm test +# [0-9]+' README.md | grep -oE '[0-9]+$')
REAL_M=$(cd macrohard && npm test 2>&1 | tr -d '\r' | grep -E '^. tests' | tail -1 | grep -oE '[0-9]+')
chk "macrohard-Tests" "${R_M:-leer}" "$REAL_M"

R_G=$(grep -oE 'deploy-hygiene-gate\.test\.mjs +# [0-9]+' README.md | grep -oE '[0-9]+$')
REAL_G=$(node --test tests/deploy-hygiene-gate.test.mjs 2>&1 | tr -d '\r' | grep -E '^. tests' | tail -1 | grep -oE '[0-9]+')
chk "Gate-Tests" "${R_G:-leer}" "$REAL_G"

# Das Verzeichnis heisst 'tests/', nicht 'test/' — der erste Versuch dieser
# Zeile suchte 'test/\\*' und fand nichts, meldete also 'leer' fuer eine Zahl,
# die direkt daneben stand.
R_S=$(grep -oE 'tests/\*\.test\.mjs +# [0-9]+' README.md | grep -oE '[0-9]+$')
REAL_S=$(cd msgraph/react && node --test tests/*.test.mjs 2>&1 | tr -d '\r' | grep -E '^. tests' | tail -1 | grep -oE '[0-9]+')
chk "msgraph-Tests" "${R_S:-leer}" "$REAL_S"

echo
echo "=== Behauptungen ueber die CI (nur Code, nicht Kommentare) ==="
has  "CI fuehrt die volle Suite (npm test)"          "$(code | grep -c 'npm test')"
hasnt "CI fuehrt nicht mehr die Einzeldatei"          "$(code | grep -c 'node tests/app.test.js')"
hasnt "CI hat keinen paths:-Filter"                   "$(code | grep -cE '^\s*paths:')"
has  "Gate laeuft in der CI"                          "$(code | grep -c 'deploy-hygiene')"
has  "Kompilat wird in der CI geprueft"               "$(code | grep -c 'build_appjs.sh')"
has  "msgraph-Tests laufen in der CI"                 "$(code | grep -c 'tests/\*.test.mjs')"
has  "Deploy haengt weiter an den Tests"              "$(code | grep -cE '^\s*needs: lint-and-test')"

echo
echo "=== Gate laeuft mit Exit 0? ==="
node deploy-hygiene.js >/dev/null 2>&1 && echo "  ok   deploy-hygiene Exit 0" || { echo "  FAIL deploy-hygiene blockiert"; fail=$((fail+1)); }

echo
[ "$fail" -eq 0 ] && echo "ALLE README-ANGABEN STIMMEN" || echo "$fail ABWEICHUNG(EN)"
exit $fail
