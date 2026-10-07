# qapdex-maker.github.io
https://docs.github.com/de/pages/quickstart

## Navigation
- **Vision & Fahrpläne**: [VISION.md](VISION.md)
- **Projektnotizen**: [PROJECT_NOTES.md](PROJECT_NOTES.md)
- **Mitmachen**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Lizenz**: [LICENSE](LICENSE) (MIT)

## Seiten
- Portal-Root `index.html` = Portal
- `macrohard/` = MakerOS — Neo-Brutalist Windows-Style Desktop OS (25 Apps, v2.11.55, Mobile-optimiert)
- `idun/` = idun console
- `msgraph/react/` = Graph Metadata Hub (5 Tabs + Skizzen-Panel)
- `catpop/` = CatPop Meme/Announcement
- `pepemem/` = MEMEPEPE Linktree-Backup
- `pepememe/` = PEPEMEME Linktree-Backup
- `jsmol/` = 3D-Molekül-Viewer (Jmol 16.3.53 j2s-Kern, 50 MB,
  19 kuratierte Strukturdateien). Vier Seiten:
  `index.html` Workbench (19 Strukturen) · `grid.html` MolGrid (12
  Instanzen) · `sandbox.html` Befehlskonsole · `reaction.html`
  Reaktions-Sandbox (SMILES-Eingabe).
  Vendor-Code mit eigener Lizenz: siehe `jsmol/LICENSE-JSmol.txt` — die
  `LICENSE` im Root gilt dafür **nicht**.

## msgraph/react — Tabs
Hub · Reference (17.531 Endpoints, im Worker geparst) · Console (NL→Graph,
optional eigener API-Key des **gewählten Anbieters** — OpenRouter oder Nous
Portal, je ein eigener Key-Slot) · Permissions · Breaking Radar ·
**Skizzen** (17 Cloud-CSDL-Dokumente aus dem Fork `metadata-msgraph`; pro Klick
genau eine Datei im Worker zählen, zusammen ~90 MB).

Datenquellen sind zwei Repos: die OpenAPI-Specs + Type-Mappings liegen im
schlanken `qapdex-maker/metadata` (`RAW`), die 17 CSDL-Sketches nur im
1,5-GB-Fork `qapdex-maker/metadata-msgraph` (`SKETCH_RAW`). Beide werden über
`raw.githubusercontent.com` geladen (CORS `*`), im Worker als Text — nie als
Browser-Dokument, sonst friert die 42-MB-Spec den Tab ein.

**Live-Test gegen echtes Graph** (2026-10-05): in der Console ein Token-
Feld („Live aufrufen"), der Aufruf geht **direkt aus dem Browser** an
`graph.microsoft.com`. Kein Proxy, kein Server, kein deploytes Geheimnis —
Graph erlaubt `Access-Control-Allow-Origin: *`, also ist CORS kein Problem
und ein Token im `sessionStorage` bleibt beim Nutzer. Nur `/me`-verankerte
Read-Pfade sind freigegeben; 401/403/400 werden getrennt beantwortet, mit
Graph-`error.code` und `client-request-id`.

Ein Graph-Token darf **nie** in einer Datei landen, die GitHub Pages
ausliefert — jede Pages-Datei ist öffentlich abrufbar (HTTP 200, keine
Authentifizierung). Aus demselben Grund gilt das genauso für LLM-Keys: beide
sind nur Eingabefelder. Die ausführliche Begründung und die verworfene
Proxy-Alternative stehen in der
[API-Proxy-Notiz](msgraph/react/NOTES-API-PROXY.md); der gebaute, aber
**nicht deployte** Worker liegt als Reserve in `~/github/repo/msgraph-proxy`.

`data/index.*.json` trägt `schemaVersion` = Version des Forks, aber
`syncDate`/`extractedFrom` = Tag der **Extraktion** (26.08.2026). Die Dateien
sind seither nicht neu erzeugt worden. Der aktuelle Sync-Stand steht in
`data/manifest.json` und ist der, den der Live-Dot anzeigt.

## Tests
Die CI (`.github/workflows/site-ci.yml`, Job `lint-and-test`) läuft bei jedem Push auf
`main` und deckt alle Seiten ab. Lokal dasselbe:

```
node deploy-hygiene.js                              # Gate
node --test tests/deploy-hygiene-gate.test.mjs     # 6
node --test tests/jsmol-pages.test.mjs             # 29
cd macrohard && npm test                           # 347
cd msgraph/react && node --test tests/*.test.mjs   # 96
```

Vor einem Push: `node deploy-hygiene.js`. Das Gate blockiert bei Exit 1.
Zusätzlich `sh scripts/check-docs.sh` — es gleicht jede Zahl in dieser Datei
mit den echten Dateien ab und hat schon zweimal eine veraltete Testzahl
gefangen.

**Die Testsuite allein reicht nicht.** Sie beweist nur, dass das Getestete
läuft. Deshalb liegt in `msgraph/react/countercheck-live.mjs` eine Gegenprobe:
sie baut 8 absichtliche Fehler ein (Token in `localStorage`, Token als
sichtbarer Text, unmaskiertes Feld, `/me`-Guard entfernt, `error.code`
verschluckt, `client-request-id` weg, EN-i18n-Key gelöscht, `fetch` auf eine
fremde Domain) und prüft, dass **jeweils der richtige** Test rot wird.

```
cd msgraph/react && node countercheck-live.mjs
```

Wichtig, und 2026-10-05 real passiert: die erste Fassung meldete 8/8 und lag
falsch. Drei Mutationen wurden nur von `spec-link-freeze.test.mjs` rot — das
prüft `app.js` gegen `app.jsx` und ist bei *jeder* Mutation rot. Nach dem
Filtern blieben drei echte Lücken übrig. Eine Gegenprobe, die nur zählt
„ist irgendwas rot", ist wertlos; sie muss den richtigen Testnamen nennen.
Außerdem braucht sie vollständige Fixtures (`data/`, ganzes `assets/`) —
sonst fällt ein Test mit `ENOENT` aus fremdem Grund und zählt als Treffer.

`msgraph/react/assets/app.js` ist ein **vorkompiliertes** Kompilat von
`assets/app.jsx`. Nach jeder JSX-Änderung `sh build_appjs.sh` ausführen —
sonst bleibt der Browser auf dem alten Stand, während alle Quelltext-Tests
grün sind. Die CI baut es nach und schlägt bei Abweichung fehl.
