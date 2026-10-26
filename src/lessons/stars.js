// Zugregeln für die "Sterne sammeln"-Aufgaben.
// Hier steht nur eine weiße Figur auf dem Brett (plus schwarze Hindernisse),
// deshalb rechnen wir die Züge selbst aus – chess.js bräuchte zwei Könige.

const FILES = 'abcdefgh';

const toCoords = (square) => [FILES.indexOf(square[0]), Number(square[1]) - 1];
const toSquare = (f, r) => (f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null);

const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

function slide(f, r, directions, enemies) {
  const result = [];
  for (const [df, dr] of directions) {
    for (let i = 1; i < 8; i++) {
      const sq = toSquare(f + df * i, r + dr * i);
      if (!sq) break;
      result.push(sq);
      if (enemies[sq]) break; // schlagen ja, darüber hinweg nein
    }
  }
  return result;
}

function step(f, r, offsets) {
  return offsets.map(([df, dr]) => toSquare(f + df, r + dr)).filter(Boolean);
}

// Alle Zielfelder der Figur. enemies: { feld: figur } der schwarzen Hindernisse
export function starDests(piece, square, enemies) {
  const [f, r] = toCoords(square);
  switch (piece) {
    case 'R':
      return slide(f, r, STRAIGHT, enemies);
    case 'B':
      return slide(f, r, DIAGONAL, enemies);
    case 'Q':
      return slide(f, r, [...STRAIGHT, ...DIAGONAL], enemies);
    case 'K':
      return step(f, r, [...STRAIGHT, ...DIAGONAL]);
    case 'N':
      return step(f, r, KNIGHT);
    case 'P': {
      const result = [];
      const one = toSquare(f, r + 1);
      if (one && !enemies[one]) {
        result.push(one);
        const two = toSquare(f, r + 2);
        if (r === 1 && two && !enemies[two]) result.push(two);
      }
      for (const df of [-1, 1]) {
        const diagonal = toSquare(f + df, r + 1);
        if (diagonal && enemies[diagonal]) result.push(diagonal);
      }
      return result;
    }
    default:
      return [];
  }
}

// Stellung als FEN (nur Figurenteil) für chessground
export function starsFen(piece, square, enemies) {
  const board = {};
  board[square] = piece;
  Object.assign(board, enemies);
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = board[toSquare(f, r)];
      if (p) {
        if (empty) row += empty;
        row += p;
        empty = 0;
      } else {
        empty++;
      }
    }
    rows.push(row + (empty || ''));
  }
  return rows.join('/');
}

// Stern als SVG für chessground (Feld = 100×100)
export const STAR_SVG = `<polygon fill="#f0c03c" stroke="#9c7a1c" stroke-width="3" stroke-linejoin="round"
  points="50,18 59,40 82,40 63,54 70,77 50,63 30,77 37,54 18,40 41,40"/>`;
