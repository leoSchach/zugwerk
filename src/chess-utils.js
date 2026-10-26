import { SQUARES } from 'chess.js';

// Alle legalen Züge im Format, das chessground erwartet:
// Map { "e2" => ["e3", "e4"], ... }
export function legalDests(game) {
  const dests = new Map();
  for (const square of SQUARES) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length) dests.set(square, moves.map((m) => m.to));
  }
  return dests;
}

export function colorName(turn) {
  return turn === 'w' ? 'white' : 'black';
}

// Spielende als Text, oder null wenn die Partie noch läuft
export function gameOverText(game) {
  if (game.isCheckmate()) {
    return `Schachmatt – ${game.turn() === 'w' ? 'Schwarz' : 'Weiß'} gewinnt`;
  }
  if (game.isStalemate()) return 'Patt – Remis';
  if (game.isThreefoldRepetition()) return 'Dreifache Stellungswiederholung – Remis';
  if (game.isInsufficientMaterial()) return 'Zu wenig Material – Remis';
  if (game.isDraw()) return '50-Züge-Regel – Remis';
  return null;
}

// chess.js schreibt englisch (Nf3). Auf Deutsch: Springer, Läufer, Turm, Dame
const GERMAN_PIECES = { N: 'S', B: 'L', R: 'T', Q: 'D' };

export function formatSan(san, notation) {
  if (notation !== 'de') return san;
  return san.replace(/[NBRQ]/g, (letter) => GERMAN_PIECES[letter]);
}
