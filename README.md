# ♞ Zugwerk

Eine eigene Schach-Lernseite: Spielen gegen Stockfish im Browser, später Puzzles, Analyse und Lektionen.

## Starten

```bash
npm install     # einmalig: lädt alle Pakete und kopiert Stockfish nach public/
npm run dev     # startet die Seite auf http://localhost:5173
```

Weitere Befehle:

- `npm run build`: baut die fertige Seite in den Ordner `dist/`
- `npm run preview`: zeigt den Build lokal an

## Projektaufbau

```
index.html                    Einstiegsseite
src/
  main.jsx                    startet React
  App.jsx                     Seitenleiste + welche Seite angezeigt wird (#/spielen usw.)
  styles.css                  komplettes Design
  settings.jsx                Einstellungen (Brettfarben usw.), im Browser gespeichert
  bots.js                     alle Bots mit Name, Stärke und Sprüchen
  chess-utils.js              Hilfsfunktionen (legale Züge, deutsche Notation, Spielende)
  hooks/useChessGame.js       gemeinsame Spiellogik (ziehen, zurück, vor, FEN laden)
  engine/stockfish.js         Verbindung zur Stockfish-Engine
  components/                 Bausteine: Brett, Seitenleiste, Zugliste, Avatar
  pages/                      Seiten: Start, Spielen, Freies Brett, Lernen, Einstellungen
scripts/copy-stockfish.js     kopiert die Engine nach public/stockfish/
```

## Verwendete Bibliotheken

- [chess.js](https://github.com/jhlywa/chess.js): Schachregeln, legale Züge, Matt/Patt
- [chessground](https://github.com/lichess-org/chessground): das Brett von Lichess (GPL-3.0)
- [stockfish.js](https://github.com/nmrugg/stockfish.js): Stockfish 19 als WebAssembly (GPL-3.0)

Weil chessground und Stockfish unter der GPL stehen, muss der Quellcode von Zugwerk ebenfalls
offen bleiben, wenn die Seite veröffentlicht wird.

## Roadmap

- [x] Gegen Bots spielen (8 Bots von ca. 250 bis 3000 Elo)
- [x] Freies Brett (beide Seiten ziehen, vor/zurück, FEN laden)
- [x] Seitenleiste, Startseite, Lernbereich-Übersicht
- [x] Einstellungen: Brettfarben (auch eigene), Koordinaten, Animationen, Notation
- [ ] Auswahl bei der Bauernumwandlung (aktuell immer Dame)
- [ ] Partieanalyse mit Bewertungsbalken
- [ ] Taktik-Puzzles (Lichess-Puzzle-Datenbank)
- [ ] Eröffnungstrainer
- [ ] Lektionen
- [ ] Fortschritt speichern / Benutzerkonten
- [ ] Online stellen (Vercel/Netlify)
