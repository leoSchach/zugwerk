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
  analysis/                   Partie-Analyse: Zugbewertung und Ablauf
  lessons/                    Lektionsinhalte und Aufgabentypen
  openings/                   Eröffnungstrainer, Lexikon und Eröffnungsdatenbank
  puzzles/                    Puzzle-Wertung, Auswahl und deutsche Themennamen
  pages/                      Seiten: Start, Spielen, Freies Brett, Lektionen, Puzzles, Analyse, Eröffnungen, Lernen, Einstellungen
public/puzzles/puzzles.json   Puzzle-Daten (Auswahl aus der Lichess-Datenbank)
public/openings/openings.json Eröffnungsnamen (Lichess chess-openings)
scripts/copy-stockfish.js     kopiert die Engine nach public/stockfish/
scripts/build-puzzles.js      erzeugt puzzles.json neu (Anleitung oben in der Datei)
scripts/build-openings.js     erzeugt openings.json neu (Anleitung oben in der Datei)
```

## Verwendete Bibliotheken

- [chess.js](https://github.com/jhlywa/chess.js): Schachregeln, legale Züge, Matt/Patt
- [chessground](https://github.com/lichess-org/chessground): das Brett von Lichess (GPL-3.0)
- [Lichess-Puzzle-Datenbank](https://database.lichess.org/#puzzles): Puzzles (CC0, frei nutzbar)
- [Lichess chess-openings](https://github.com/lichess-org/chess-openings): Eröffnungsnamen (CC0)
- [stockfish.js](https://github.com/nmrugg/stockfish.js): Stockfish 19 als WebAssembly (GPL-3.0)

Weil chessground und Stockfish unter der GPL stehen, muss der Quellcode von Zugwerk ebenfalls
offen bleiben, wenn die Seite veröffentlicht wird.

## Roadmap

- [x] Gegen Bots spielen (8 Bots von ca. 250 bis 3000 Elo)
- [x] Freies Brett (beide Seiten ziehen, vor/zurück, FEN laden)
- [x] Seitenleiste, Startseite, Lernbereich-Übersicht
- [x] Analyse: Zugbewertung (Brillant, Großartig, Bester Zug … Verpasst, Fehler, Patzer),
      Genauigkeit, Bewertungsbalken und -diagramm
- [x] Eröffnungen: Trainer mit 12 Eröffnungen (Lernen + Üben), Lexikon mit 3.865 Varianten,
      Eröffnungsname beim Spielen, Buchzüge in der Analyse
- [x] Lektionen: 20 interaktive Lektionen in 6 Kapiteln (Sterne sammeln, Aufgaben,
      Endspiele gegen Stockfish)
- [x] Puzzles: ca. 6.000 Aufgaben, eigene Wertung, Serie, Hinweise, Themen-Filter
- [x] Einstellungen: Brettfarben (auch eigene), Koordinaten, Animationen, Notation
- [x] Auswahl bei der Bauernumwandlung (Dame, Springer, Turm, Läufer)
- [ ] Fortschritt speichern / Benutzerkonten
- [ ] Online stellen (Vercel/Netlify)
