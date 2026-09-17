# MakerOS Debug Plan v2.11.29
=============================

## Testumgebung
- Server: python3 -m http.server 8099
- Prüfung: node --check, curl, Code-Analyse

## Apps (22 + System)

### Foundation (11)
1. Notepad
2. Calculator
3. Terminal
4. Explorer
5. Paint
6. Browser
7. Music
8. Chat
9. Docs
10. Settings
11. Links

### Extension Pack (11)
12. Taskmanager
13. Systeminfo
14. Calendar
15. Clock
16. Colorpicker
17. Passwort-Generator
18. QR-Generator
19. Viewer
20. Tic-Tac-Toe
21. AMIBIOS
22. Omarchy

### System
23. Fenster-Management (Drag, Resize, Snap, Min/Max/Close)
24. PWA / Service Worker
25. Session Restore

## Checkliste pro App
- [ ] Öffnet ohne Fehler
- [ ] UI korrekt gerendert
- [ ] Interaktion funktioniert
- [ ] Speicherung (falls vorhanden) funktioniert
- [ ] Schließen funktioniert
- [ ] Keine JS-Fehler in Console
