# API-Proxy für msgraph — Notizen und Stand

Status: **Weg 2 (Cloudflare Worker) ist gebaut und getestet**, aber noch nicht
deployt. Erstellt 2026-09-27, Stand 2026-10-05.

## Stand 2026-10-05 — Option 2 ist vorbereitet

`~/github/repo/msgraph-proxy` — eigener Repo, kein Teil von Pages, kein
gemeinsamer Code. 33 Offline-Tests grün, `countercheck.mjs` erkennt 8
absichtliche Regressionen.

**Nicht deployed, weil kein Cloudflare-Account hier existiert.** Der Deploy
(`wrangler login` + 3 Secrets + deploy) ist ungeprüft.

### Der wichtigste Punkt, der beim Bauen aufkam

CORS ist hier **keine** Verteidigung. Frisch bestätigt (2026-10-05):
`Access-Control-Allow-Origin: *`. Ein Worker, der ein Token hält und öffentlich
erreichbar ist, ist deshalb kein Proxy, sondern eine **öffentliche Vollfreigabe
von Mail, Kalender und Dateien** — `/me/messages` liest Post, `/me/drive` die
Dateien. `*` heisst zusätzlich: jede Website, die der Owner besucht, könnte den
Worker über seinen Browser steuern.

**Gelöst über genau dasselbe Muster, das das Projekt für OpenRouter schon
fährt:** kein Token deployen, sondern eingeben. Der Worker verlangt einen
Proxy-Key (`X-Proxy-Key`), der in sessionStorage bleibt. Das Pages-Artefakt
bleibt geheimnisfrei, und der Worker ist trotzdem nutzbar.

Fünf unabhängige Gates, jedes einzeln schwach, zusammen gegen Mailzugriff:
Proxy-Key (constant-time), Origin-Allowlist, GET-only, Pfad-Allowlist
(5 Read-Pfade), Query-Filter. Dazu immer `cache-control: no-store` und der
Token in keinem Response-Body und keinem Response-Header.

**Wenn das zu viel ist:** es braucht diesen Worker nicht. Man kann den
Graph-Token direkt in die Seite pasten, weil Graph CORS erlaubt — dann
entfällt die zweite Zugangsberechtigung komplett. Das ist eine Entscheidung
für den Owner, keine technische Notwendigkeit.

## Worum es geht

Die msgraph-Seite kennt 17.531 Endpoints aus den Metadaten, kann aber keinen
einzigen davon tatsächlich aufrufen. Geplant war ein Live-Test-Punkt: Request
gegen die echte Graph-Instanz, echte Antwort anzeigen, Antwort im Worker parsen.

## Der Sicherheitskern

**Ein Graph-Token darf niemals in einer Datei landen, die GitHub Pages
ausliefert.** Jede Pages-Datei ist öffentlich abrufbar — geprüft am
2026-09-27:

```
$ curl -sI https://qapdex-maker.github.io/msgraph/react/data/manifest.json
HTTP/2 200
content-type: application/json; charset=utf-8
```

Keine Authentifizierung, keine Einschränkung. Ein Token in `config.json` auf
Pages ist kein Secret mehr.

Warum das mehr als ein theoretisches Risiko ist: Ein Graph-Token mit
Mail/Calendar/Files-Scopes liest mit `/me` die E-Mail-Adresse und liefert damit
eine vollwertige Kontooption. Microsoft widerruft einen geleakten Token nicht
automatisch.

## Warum Option C (Deploy-Secret als Datei) ausscheidet

Der ursprüngliche Plan war: Deploy-Action nimmt `GRAPH_TOKEN` aus den Secrets
und schreibt ihn beim Deploy als Konfigurationsdatei ins Repo. Das ist genau
der Weg, der Tokens in die Öffentlichkeit bringt — der Grund, warum .gitignore
existiert. Verworfen.

## Warum Option A funktioniert (belegt)

Graph erlaubt CORS von jedem Origin. Geprüft:

```
$ curl -sI -X OPTIONS https://graph.microsoft.com/v1.0/me \
    -H "Origin: https://qapdex-maker.github.io" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization"

HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization
Access-Control-Allow-Methods: DELETE, GET, OPTIONS, POST, PUT, PATCH
```

Der Token muss also gar nicht über einen Server. Das Projekt macht das für
OpenRouter bereits so (sessionStorage, Feld `or_key`).

## Stand der Option B (GitHub Functions) — blockiert

Geprüft am 2026-09-27 gegen den echten Account:

```
$ gh api repos/qapdex-maker/qapdex-maker.github.io/functions
{"message": "Not Found", "status": "404"}

$ gh api repos/.../pages --jq '.build_type'
legacy
```

Repo ist public, Pages läuft als `legacy`, Actions aktiv, `all` erlaubt. Der
Functions-Endpunkt existiert nicht. Ob das am Plan oder an fehlenden Functions
liegt, lässt sich von hier aus nicht unterscheiden — GitHub Functions ist kein
Produkt, das man in ein bestehendes Pages-Repo hineinlegt, es braucht den
zugehörigen Plan.

**Nicht verifizierbar von dieser Shell. Keine Behauptung, dass es klappt.**

## Die drei Wege, wenn der Plan da ist

1. **GitHub Functions** — echter Proxy, Token bleibt im Secret. Der saubere
   Weg, den ursprünglich gemeinten Plan.
2. **Cloudflare Workers** — derselbe Gedanke, fremdes Konto, funktioniert
   ohne GitHub-Plan. Sauberste Umsetzung, falls der GitHub-Plan lange braucht.
3. **idun als lokaler Proxy** — das eigene SDK spricht Graph. Aber dann ist
   wieder der Aufrufer beteiligt, nicht die statische Seite.

## ERLEDIGT 2026-10-05 — Live-Test, ohne Proxy und ohne zweites Geheimnis

Der Nutzer hat entschieden: **kein Worker.** Weg 1 (Token direkt in die
Seite), nicht Weg 2 (Cloudflare-Proxy). Damit ist die Ein-Zugangsberechtigung-
Frage vom Tisch — es gibt genau ein Geheimnis, und es wird nie deployed.

Umsetzung in `assets/app.jsx`, Console-Panel, unterhalb der Endpoint-Auswahl:
Passwort-Feld (`sessionStorage: graph_token`), „Live aufrufen", „Token
löschen", Ergebnisanzeige. Der Aufruf nutzt den **oben gewählten** Endpoint,
nicht einen festen — sonst wäre der Button eine Attrappe.

**Was sich dadurch erledigt:** die beiden Sorgen aus der Einleitung dieses
Dokuments. Kein Server, kein zweites Geheimnis, kein Deploy-Blocker
(wrangler scheitert auf Termux an `workerd: Unsupported platform: android
arm64`).

### Warum das ohne Proxy sicher ist

Nur, weil zwei Bedingungen gleichzeitig gelten, und beide sind gemessen:

1. **Graph erlaubt CORS von jedem Origin** (`Access-Control-Allow-Origin: *`,
   OPTIONS gegen `/v1.0/me`, 2026-10-05).
2. **Der Token verlässt den Browser nur in diesem einen Request.** `node --test
   tests/graph-live-call.test.mjs` prüft statisch, dass `graph_token`
   ausschliesslich neben `sessionStorage` steht, nie in `localStorage`, nie in
   einem Cookie, nie als sichtbarer Text, und dass genau ein `fetch` einen
   Bearer trägt — der gegen `graph.microsoft.com`.

Träfe eine dieser beiden Bedingungen zu, wäre die Konstruktion falsch. Deshalb
sind es Tests und nicht ein Kommentar.

### Der /me-Guard

Die Endpoint-Auswahl bietet 17.531 Pfade aus der Index-JSON. Ohne Guard
schickte der Button den Token des Owners auch an `/users`. `livePathAllowed`
lässt nur `/me`-verankerte Read-Pfade durch, lehnt `..` ab und blockiert
`sendMail`/`sendReply`/`sendForward`. Kein Token-Leak, aber die UI darf den
Umfang nicht stillschweigend erweitern.

### Drei Fehlerbilder, drei Ratschläge

401 (Token ungültig/abgelaufen), 403 (Scope fehlt), 400 (Token gut, Anfrage
passt nicht zum Endpoint) landen getrennt in der UI, mit Graph-`error.code`
und `client-request-id`. „Fehler" wäre in allen drei Fällen falsche Beratung —
dieselbe Lehre wie beim 404-vs-429-Split am LLM-Probe.

### Fünf Testfehler, die gegen korrekten Code rot waren

Alle fünf in der ersten Stunde, alle fünf in `graph-live-call.test.mjs`, alle
gefunden durch `countercheck-live.mjs` oder durch `check-docs.sh`:

1. `env`/Variablen-Referenzzählung zu strikt (aus dem Worker-Projekt übernommen).
2. Regex flaggte einen ausgehenden Header als Response-Body.
3. `indexOf('en: {')` traf das **verschachtelte** `status: { de:…, en:… }` —
   die EN-Tabelle wurde auf wenige Keys abgeschnitten, alle 10 i18n-Tests
   schienen zu fehlen. Verankerung an `const I18N` + Zwei-Leerzeichen-Einrückung.
4. `{gxKey}` als „sichtbarer Text" — aber es ist `value={gxKey}` in einem
   `type="password"`.
5. Ein Zeilen-Test, der alle `gxKey`-Vorkommen **entfernte** und dann prüfte,
   ob noch eines da ist. Das kann nie fehlschlagen — es entfernt genau das,
   wonach es dann sucht.

Und drei Lücken, die der Code selbst hatte bzw. die der Test nicht deckte:
`client-request-id` nur auf einem Zweig, `fetch`-Ziel-Domain überhaupt nicht
geprüft, gerenderter Token durch einen Regex akzeptiert.

**Die Zwei-Stufen-Rundum:** Die erste Gegenprobe meldete 8/8 erkannt — und
lag falsch. Drei davon wurden nur von `spec-link-freeze.test.mjs` rot, das
prüft, ob `app.js` zu `app.jsx` passt, also bei **jeder** Mutation rot ist.
Nach dem Filtern blieben 3 echte Lücken übrig, alle drei waren echte Testfehler
oder fehlende Prüfungen. Eine Gegenprobe, die nur „irgendwas wurde rot" zählt,
ist wertlos.

Zahlen: 96 Tests (vorher 85), 8 Regressionen alle erkannt.
`sh scripts/check-docs.sh` fand die veraltete Testzahl in drei Dateien
(README.md, ROADMAP.md, PROJECT_NOTES.md) — genau sein Zweck.

## Noch offen

- **Token fehlt.** `$GRAPH_TOKEN` ist in dieser Shell nicht gesetzt. Für einen
  Live-Test braucht es einen echten Token über Azure-App-Registrierung
  (delegierte Scopes: User.Read, Mail.Read, Calendars.Read) oder idun.
  **Kein Admin-Token, `.Read`-Scopes.**
- **Worker-Pfad existiert bereits.** `assets/worker.js` kann `type:'csdl'`
  und liefert `{type, file, ok, counts, error}`. Für eine API-Antwort braucht
  er einen weiteren Zweig `type:'graph'`, der die JSON-Antwort gegen die
  ausgewählte Endpunkt-Definition prüft.

## Grundsatz, der daraus folgt

Ein statisches Pages-Repo ist der falsche Ort für ein Geheimnis. Das ist keine
Einschränkung, die man umgehen sollte, sondern eine Eigenschaft der Architektur —
jede Datei ist öffentlich. Geheimnisse gehören in einen Server oder bleiben im
Browser.
