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
index.html                  Einstiegsseite
src/
  main.jsx                  startet React
  App.jsx                   Spiellogik: Züge, Computergegner, Steuerung
  components/Board.jsx      das Schachbrett (chessground)
  engine/stockfish.js       Verbindung zur Stockfish-Engine
  styles.css                Aussehen
scripts/copy-stockfish.js   kopiert die Engine nach public/stockfish/
```

## Verwendete Bibliotheken

- [chess.js](https://github.com/jhlywa/chess.js): Schachregeln, legale Züge, Matt/Patt
- [chessground](https://github.com/lichess-org/chessground): das Brett von Lichess (GPL-3.0)
- [stockfish.js](https://github.com/nmrugg/stockfish.js): Stockfish 19 als WebAssembly (GPL-3.0)

Weil chessground und Stockfish unter der GPL stehen, muss der Quellcode von Zugwerk ebenfalls
offen bleiben, wenn die Seite veröffentlicht wird.

## Roadmap

- [x] Gegen den Computer spielen (Stärke einstellbar)
- [ ] Auswahl bei der Bauernumwandlung (aktuell immer Dame)
- [ ] Partieanalyse mit Bewertungsbalken
- [ ] Taktik-Puzzles (Lichess-Puzzle-Datenbank)
- [ ] Eröffnungstrainer
- [ ] Lektionen
- [ ] Fortschritt speichern / Benutzerkonten
- [ ] Online stellen (Vercel/Netlify)
