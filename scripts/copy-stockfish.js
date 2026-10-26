// Kopiert die Stockfish-Engine aus node_modules nach public/,
// damit der Browser sie als Web Worker laden kann.
// Läuft automatisch nach jedem `npm install`.
import { cpSync, mkdirSync } from 'node:fs';

const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

mkdirSync('public/stockfish', { recursive: true });
for (const file of files) {
  cpSync(`node_modules/stockfish/bin/${file}`, `public/stockfish/${file}`);
}
console.log('Stockfish nach public/stockfish kopiert.');
