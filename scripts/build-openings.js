// Erzeugt public/openings/openings.json aus der Lichess-Eröffnungsliste (Lizenz: CC0).
// Quelle: https://github.com/lichess-org/chess-openings (Dateien a.tsv bis e.tsv)
//
// Benutzung:
//   for f in a b c d e; do curl -sLO https://raw.githubusercontent.com/lichess-org/chess-openings/master/$f.tsv; done
//   node scripts/build-openings.js a.tsv b.tsv c.tsv d.tsv e.tsv
//
// Jeder Eintrag: [ECO-Code, Name, Züge (SAN, mit Leerzeichen), Stellung (FEN ohne Zugzähler)]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Bitte die TSV-Dateien angeben: node scripts/build-openings.js a.tsv b.tsv ...');
  process.exit(1);
}

const openings = [];
for (const file of files) {
  for (const line of readFileSync(file, 'utf8').split('\n').slice(1)) {
    const [eco, name, pgn] = line.split('\t');
    if (!pgn) continue;
    const game = new Chess();
    game.loadPgn(pgn);
    const position = game.fen().split(' ').slice(0, 4).join(' ');
    openings.push([eco, name, game.history().join(' '), position]);
  }
}

mkdirSync('public/openings', { recursive: true });
writeFileSync('public/openings/openings.json', JSON.stringify(openings));
console.log(`${openings.length} Eröffnungen gespeichert in public/openings/openings.json`);
