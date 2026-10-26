// Erzeugt public/puzzles/puzzles.json aus der Lichess-Puzzle-Datenbank (Lizenz: CC0).
//
// Die ganze Datenbank hat über 5 Millionen Puzzles und ist viel zu groß für den Browser.
// Wir nehmen daher nur gute, oft gespielte Puzzles – gleichmäßig über alle Schwierigkeiten verteilt.
//
// Benutzung (braucht das Programm "zstd", z. B. per "brew install zstd"):
//   curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | head -n 400001 > puzzles.csv
//   node scripts/build-puzzles.js puzzles.csv
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const PER_BUCKET = 250; // Puzzles pro 100er-Schwierigkeitsstufe
const MIN_RATING = 400;
const MAX_RATING = 2900;

const input = process.argv[2];
if (!input) {
  console.error('Bitte den Pfad zur CSV-Datei angeben: node scripts/build-puzzles.js puzzles.csv');
  process.exit(1);
}

const buckets = new Map();
const lines = createInterface({ input: createReadStream(input) });

for await (const line of lines) {
  const [id, fen, moves, rating, deviation, popularity, plays, themes] = line.split(',');
  if (id === 'PuzzleId') continue;

  const r = Number(rating);
  const good = Number(deviation) < 90 && Number(popularity) >= 85 && Number(plays) >= 300;
  if (!good || r < MIN_RATING || r >= MAX_RATING) continue;

  const bucket = Math.floor(r / 100);
  const list = buckets.get(bucket) ?? [];
  if (list.length >= PER_BUCKET) continue;
  list.push([id, fen, moves, r, themes]);
  buckets.set(bucket, list);
}

const puzzles = [...buckets.values()].flat().sort((a, b) => a[3] - b[3]);

mkdirSync('public/puzzles', { recursive: true });
writeFileSync('public/puzzles/puzzles.json', JSON.stringify(puzzles));
console.log(`${puzzles.length} Puzzles gespeichert in public/puzzles/puzzles.json`);
