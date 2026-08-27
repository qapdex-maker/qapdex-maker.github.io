# msgraph/ — VANILLA Prototyp (ARCHIVIERT)

Dieser Ordner enthält die **ursprüngliche Vanilla-JS-Variante** des Graph Metadata Hub.
Sie ist **veraltet und wird nicht mehr verlinkt**.

## Status
- AKTIVE Variante: `msgraph/react/` (React 18 UMD + @babel/standalone, portal-designig).
  Verlinkt aus dem Portal-Root (`index.html` → `msgraph/react/`).
- Diese Vanilla-Variante (`msgraph/index.html`, `msgraph/assets/`, `msgraph/data/`):
  - nicht mehr im Portal verlinkt
  - nicht mehr gepflegt
  - dient nur noch als Referenz/Archiv

## Warum archiviert
Die React-Variante deckt alle Features (Hub/Reference/Console/Permissions/Breaking Radar)
mit besserer Wartbarkeit + dem Portal-Design. Die Vanilla-Variante war der erste Wurf.

## WICHTIG
Beim nächsten größeren Refactor kann dieser Ordner komplett gelöscht werden — er hat
keine Live-Verlinkung. Vorher aber prüfen, ob wiederverwendbare Logik (z.B. Worker-Parser
in `msgraph/assets/worker.js`) woanders genutzt wird.
