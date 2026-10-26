import { Chess } from 'chess.js';

// Alle Zugkategorien, von gut nach schlecht.
// symbol erscheint auf dem Brett und in der Zugliste.
export const CLASSES = {
  brilliant: { name: 'Brillant', symbol: '!!', color: '#1baca6', text: 'ist brillant' },
  great: { name: 'Großartig', symbol: '!', color: '#5c8bb0', text: 'ist großartig' },
  best: { name: 'Bester Zug', symbol: '★', color: '#81b64c', text: 'ist der beste Zug' },
  excellent: { name: 'Exzellent', symbol: '✓', color: '#96bc4b', text: 'ist exzellent' },
  good: { name: 'Gut', symbol: '✓', color: '#8fa877', text: 'ist gut' },
  book: { name: 'Buchzug', symbol: '📖', color: '#a88865', text: 'ist ein bekannter Eröffnungszug' },
  forced: { name: 'Erzwungen', symbol: '→', color: '#97a4a6', text: 'war der einzige legale Zug' },
  inaccuracy: { name: 'Ungenauigkeit', symbol: '?!', color: '#f0c03c', text: 'ist eine Ungenauigkeit' },
  miss: { name: 'Verpasst', symbol: '✗', color: '#ee6b55', text: 'verpasst eine Chance' },
  mistake: { name: 'Fehler', symbol: '?', color: '#e58f2a', text: 'ist ein Fehler' },
  blunder: { name: 'Patzer', symbol: '??', color: '#ca3431', text: 'ist ein Patzer' },
};

export const CLASS_ORDER = Object.keys(CLASSES);

// Gewinnchance in Prozent (0–100) aus Sicht der Seite am Zug.
// Gleiche Formel wie bei Lichess: +3 Bauern ≈ 75 %.
export function winPercent(line) {
  if (!line) return 50;
  if (line.mate !== null && line.mate !== undefined) return line.mate > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * line.cp)) - 1);
}

// Genauigkeit eines einzelnen Zugs (0–100) aus dem Verlust an Gewinnchance.
// Ebenfalls die Lichess-Formel.
export function moveAccuracy(loss) {
  const accuracy = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Ist der Zug ein Opfer? Also: Kann der Gegner die gezogene Figur schlagen
// und gewinnt dabei mindestens 2 Bauerneinheiten Material?
function isSacrifice(fenBefore, move) {
  const value = PIECE_VALUES[move.piece];
  if (value < 3) return false; // Bauern- und Königszüge zählen nicht

  const game = new Chess(fenBefore);
  game.move(move.san);
  const captured = move.captured ? PIECE_VALUES[move.captured] : 0;

  const recaptures = game.moves({ verbose: true }).filter((m) => m.to === move.to && m.captured);
  if (recaptures.length === 0) return false;

  const defended = game.isAttacked(move.to, move.color);
  const cheapestAttacker = Math.min(...recaptures.map((m) => PIECE_VALUES[m.piece]));
  const netLoss = value - captured - (defended ? cheapestAttacker : 0);
  return netLoss >= 2;
}

// Bewertet einen Zug.
//   before: Engine-Varianten vor dem Zug (Sicht des Ziehenden)
//   after:  Engine-Varianten nach dem Zug (Sicht des Gegners), oder null bei Spielende
export function classifyMove({ fenBefore, move, before, after, gameAfter }) {
  const bestWin = winPercent(before[0]);

  let playedWin;
  if (gameAfter.isCheckmate()) playedWin = 100;
  else if (gameAfter.isDraw() || gameAfter.isStalemate()) playedWin = 50;
  else playedWin = 100 - winPercent(after[0]);

  const loss = Math.max(0, bestWin - playedWin);
  const uci = move.from + move.to + (move.promotion ?? '');
  const isBest = uci === before[0]?.pv[0] || loss < 0.5;
  const legalMoves = new Chess(fenBefore).moves().length;

  let cls;
  if (legalMoves === 1) {
    cls = 'forced';
  } else if (isBest && playedWin >= 45 && isSacrifice(fenBefore, move)) {
    // Figurenopfer, das trotzdem der beste Zug ist
    cls = 'brilliant';
  } else if (
    isBest &&
    !gameAfter.isCheckmate() && // Matt in 1 ist "nur" der beste Zug
    before[1] &&
    bestWin - winPercent(before[1]) >= 20 &&
    playedWin >= 45
  ) {
    // Einziger guter Zug: Die zweitbeste Möglichkeit wäre viel schlechter gewesen
    cls = 'great';
  } else if (isBest) {
    cls = 'best';
  } else if (loss <= 2) {
    cls = 'excellent';
  } else if (loss <= 5) {
    cls = 'good';
  } else if (bestWin >= 70 && loss >= 10 && playedWin >= 30) {
    // Man stand auf Gewinn, hat die Chance aber liegen lassen (ohne gleich zu verlieren)
    cls = 'miss';
  } else if (loss <= 10) {
    cls = 'inaccuracy';
  } else if (loss <= 20) {
    cls = 'mistake';
  } else {
    cls = 'blunder';
  }

  return { cls, loss, bestWin, playedWin, accuracy: moveAccuracy(loss) };
}
