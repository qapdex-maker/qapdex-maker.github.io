# API-Proxy für msgraph — Notizen und Stand

Status: **warten auf GitHub-Plan mit Functions**. Erstellt 2026-09-27.

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
