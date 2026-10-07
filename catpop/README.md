# catpop — CatPop Announcement Seite

## Stand: 2026-10-07 (Inhalt unverändert seit 2026-09-12)

Arbeitskopie: `~/github/repo/qapdex-maker.github.io/catpop/`
Live: `https://qapdex-maker.github.io/catpop/`
Letzter Commit auf `catpop/`: `882b163 catpop: H2 PLAN → CATWALK` (2026-09-12)

## Dateien
- `index.html` = Seite (~59 KB, inline CSS+JS, Tailwind-CDN, kein Build)
- `popnomics.jpg` = Bild nach Popnomics-Sektion (113 KB)
- `linktr/index.html` = Linktree-Subseite (`/catpop/linktr/`)

## Features
- Badge: `WALL STREET TRADING PIT ANNOUNCEMENT`
- Theme-Palette (8): `fourmeme`, `default`, `green`, `ink`, `sunset`, `mono`,
  `paper`, `berry` — Reihenfolge im Code: `fourmeme,default,green,ink,sunset,mono,paper,berry`
- Theme-Toggle per Klick, gespeichert in `localStorage('catpop_theme')`
- Telegram entfernt; CTA-Link: `https://linktr.ee/hereismytelegram`
- Buy-CTA + User-Button entfernt; Header = Nav + Theme-Button
- Comic-Panel-Blöcke auf Uhrzeit-Header reduziert
- RAYDIUM-Nennungen ersetzt durch `four.meme`
- CA-Toggle: echter CA (`0x10e750a746dbb6f67ca4a38dc04a31676f9e4444`) + Solana Gag
- DEX-Badge-Toggle: BNB DEX / SOL DEX
- Bitget-Affiliate-Link in Wallet-Schritt 1
- Titel-Placeholder `$CATPOP` ist gewollt (Ticker-Symbol wie $DOGE/$PEPE)

## Interne Navigation (Platzhalter)
Die 5 internen Nav-Links (About/Meme, Tokenomics, How to Buy, Live Chart, Meme Generator) sind aktuell `#`-Platzhalter ohne Ziel-Sektionen. Same-Page-Scroll-Sektionen sind noch nicht angelegt.

## Nächstes
- `/pepemem/` Seite (nach dem Push)

> Korrektur 2026-10-07: Der frühere Eintrag nannte die Theme-Palette mit
> `frost` und den letzten Commit `194c641`. Beides war veraltet — `frost` kommt
> im aktuellen `index.html` nicht mehr vor, `fourmeme` ist neu, und der letzte
> `catpop/`-Commit ist `882b163`.
