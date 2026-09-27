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
- `macrohard/` = MakerOS — Neo-Brutalist Windows-Style Desktop OS (25 Apps, v2.11.50, Mobile-optimiert)
- `idun/` = idun console
- `msgraph/react/` = Graph Metadata Hub (5 Tabs + Skizzen-Panel)
- `catpop/` = CatPop Meme/Announcement
- `pepemem/` = MEMEPEPE Linktree-Backup
- `pepememe/` = PEPEMEME Linktree-Backup

## msgraph/react — Tabs
Hub · Reference (17.531 Endpoints, im Worker geparst) · Console (NL→Graph,
optional eigener OpenRouter-Key) · Permissions · Breaking Radar ·
**Skizzen** (17 Cloud-CSDL-Dokumente aus metadata-msgraph; pro Klick genau
eine Datei im Worker zählen, zusammen ~90 MB).

Gehört zur [API-Proxy-Notiz](msgraph/react/NOTES-API-PROXY.md): ein Graph-Token
darf **nie** in einer Datei landen, die GitHub Pages ausliefert — jede
Pages-Datei ist öffentlich abrufbar (HTTP 200, keine Authentifizierung).

## Tests
Vor jedem Push: `node deploy-hygiene.js` (Phase-5-Gate).

```
node deploy-hygiene.js                            # Gate
node --test tests/deploy-hygiene-gate.test.mjs     # 6
cd macrohard && npm test                           # 298
cd msgraph/react && node --test tests/*.test.mjs   # 15
```

`msgraph/react/assets/app.js` ist ein **vorkompiliertes** Kompilat von
`assets/app.jsx`. Nach jeder JSX-Änderung `sh build_appjs.sh` ausführen —
sonst bleibt der Browser auf dem alten Stand, während alle Quelltext-Tests
grün sind. Die Testdateien prüfen das mit.
