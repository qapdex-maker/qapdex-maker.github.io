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
- `macrohard/` = MakerOS — Neo-Brutalist Windows-Style Desktop OS (25 Apps, v2.11.54, Mobile-optimiert)
- `idun/` = idun console
- `msgraph/react/` = Graph Metadata Hub (5 Tabs + Skizzen-Panel)
- `catpop/` = CatPop Meme/Announcement
- `pepemem/` = MEMEPEPE Linktree-Backup
- `pepememe/` = PEPEMEME Linktree-Backup
- `jsmol/` = JSmol Workbench — 3D-Molekül-Viewer (Jmol 16.3.53 j2s-Kern,
  49 MB, 19 kuratierte Strukturdateien). Vier Seiten:
  `index.html` (Workbench) · `grid.html` (12 Instanzen im Raster) ·
  `sandbox.html` (Befehlskonsole) · `reaction.html` (3 Instanzen, Vergleich).
  Vendor-Code mit eigener Lizenz: siehe `jsmol/LICENSE-JSmol.txt` — die
  `LICENSE` im Root gilt dafür **nicht**.

## msgraph/react — Tabs
Hub · Reference (17.531 Endpoints, im Worker geparst) · Console (NL→Graph,
optional eigener API-Key des **gewählten Anbieters** — OpenRouter oder Nous
Portal, je ein eigener Key-Slot) · Permissions · Breaking Radar ·
**Skizzen** (17 Cloud-CSDL-Dokumente aus metadata-msgraph; pro Klick genau
eine Datei im Worker zählen, zusammen ~90 MB).

Gehört zur [API-Proxy-Notiz](msgraph/react/NOTES-API-PROXY.md): ein Graph-Token
darf **nie** in einer Datei landen, die GitHub Pages ausliefert — jede
Pages-Datei ist öffentlich abrufbar (HTTP 200, keine Authentifizierung).

`data/index.*.json` trägt `schemaVersion` = Version des Forks, aber
`syncDate`/`extractedFrom` = Tag der **Extraktion** (26.08.2026). Die Dateien
sind seither nicht neu erzeugt worden. Der aktuelle Sync-Stand steht in
`data/manifest.json` und ist der, den der Live-Dot anzeigt.

## Tests
Die CI (`.github/workflows/site-ci.yml`, Job `lint-and-test`) läuft bei jedem Push auf
`main` und deckt alle Seiten ab. Lokal dasselbe:

```
node deploy-hygiene.js                            # Gate
node --test tests/deploy-hygiene-gate.test.mjs     # 6
cd macrohard && npm test                           # 332
cd msgraph/react && node --test tests/*.test.mjs   # 61
```

Vor einem Push: `node deploy-hygiene.js`. Das Gate blockiert bei Exit 1.

`msgraph/react/assets/app.js` ist ein **vorkompiliertes** Kompilat von
`assets/app.jsx`. Nach jeder JSX-Änderung `sh build_appjs.sh` ausführen —
sonst bleibt der Browser auf dem alten Stand, während alle Quelltext-Tests
grün sind. Die CI baut es nach und schlägt bei Abweichung fehl.
