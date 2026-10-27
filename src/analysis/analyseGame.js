import { Chess } from 'chess.js';
import { createEngine } from '../engine/stockfish.js';
import { classifyMove, winPercent, CLASS_ORDER } from './classify.js';
import { findOpening, loadBook, positionKey } from '../openings/book.js';

// Die Partie, die analysiert werden soll, liegt im sessionStorage.
// So können "Spielen" und "Freies Brett" eine Partie an die Analyse übergeben.
const STORAGE_KEY = 'zugwerk-analyse-pgn';

export function getAnalysisPgn() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setAnalysisPgn(pgn) {
  try {
    sessionStorage.setItem(STORAGE_KEY, pgn);
  } catch {
    // nicht schlimm – dann muss man die PGN einfügen
  }
}

// PGN einer Partie mit Spielernamen und (optional) Ergebnis wie "1-0"
export function buildPgn(game, white, black, result) {
  const copy = new Chess();
  copy.loadPgn(game.pgn());
  if (white) copy.setHeader('White', white);
  if (black) copy.setHeader('Black', black);
  if (result) copy.setHeader('Result', result);
  return copy.pgn();
}

// Partie an die Analyse-Seite schicken und dorthin wechseln
export function openInAnalysis(game, white, black) {
  openPgnInAnalysis(buildPgn(game, white, black));
}

export function openPgnInAnalysis(pgn) {
  setAnalysisPgn(pgn);
  window.location.hash = '#/analyse';
}

// Liest eine PGN ein. Gibt null zurück, wenn sie ungültig ist oder keine Züge hat.
export function parsePgn(pgn) {
  const game = new Chess();
  try {
    game.loadPgn(pgn.trim());
  } catch {
    return null;
  }
  const history = game.history({ verbose: true });
  return history.length ? { headers: game.getHeaders(), history } : null;
}

// Bewertung aus Sicht von Weiß: Gewinnchance (0–100) und Text wie "+1.2" oder "M3"
function whiteEval(fen, lines) {
  const game = new Chess(fen);
  const whiteToMove = game.turn() === 'w';
  if (game.isCheckmate()) {
    return { win: whiteToMove ? 0 : 100, text: whiteToMove ? '0-1' : '1-0' };
  }
  if (game.isGameOver()) return { win: 50, text: '½-½' };

  const best = lines[0];
  const sign = whiteToMove ? 1 : -1;
  const win = whiteToMove ? winPercent(best) : 100 - winPercent(best);
  if (!best) return { win: 50, text: '0.0' };
  if (best.mate !== null) {
    const mate = best.mate * sign;
    return { win, text: mate > 0 ? `M${mate}` : `-M${-mate}` };
  }
  const pawns = (best.cp * sign) / 100;
  return { win, text: `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}` };
}

function uciToSan(fen, uci) {
  if (!uci) return null;
  try {
    const game = new Chess(fen);
    return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return null;
  }
}

// Analysiert alle Stellungen einer Partie mit Stockfish und bewertet jeden Zug.
// onProgress(fertig, gesamt) wird nach jeder Stellung aufgerufen.
// Gibt { promise, cancel } zurück, damit man die Analyse abbrechen kann.
export function analyseGame(history, depth, onProgress) {
  const engine = createEngine();
  engine.setMultiPv(2); // die zwei besten Züge, um "Großartig" (einziger guter Zug) zu erkennen
  let cancelled = false;

  async function run() {
    const book = await loadBook().catch(() => null);
    const fens = [history[0].before, ...history.map((m) => m.after)];
    const positions = [];

    for (let i = 0; i < fens.length; i++) {
      const fen = fens[i];
      const lines = new Chess(fen).isGameOver() ? [] : await engine.analyse(fen, `depth ${depth}`);
      if (cancelled) return null;
      positions.push({ fen, lines, eval: whiteEval(fen, lines) });
      onProgress(i + 1, fens.length);
    }
    engine.terminate();

    // Buchzüge: solange jede Stellung in der Eröffnungsdatenbank steht
    let inBook = Boolean(book);
    const moves = history.map((move, i) => {
      const before = positions[i].lines;
      inBook = inBook && book.byPosition.has(positionKey(move.after));
      const result = classifyMove({
        fenBefore: move.before,
        move,
        before,
        after: positions[i + 1].lines,
        gameAfter: new Chess(move.after),
      });
      const bestUci = before[0]?.pv[0];
      return {
        san: move.san,
        from: move.from,
        to: move.to,
        color: move.color,
        bestUci,
        bestSan: uciToSan(move.before, bestUci),
        ...result,
        cls: inBook ? 'book' : result.cls,
      };
    });

    const opening = findOpening(book, history);
    return { positions, moves, summary: summarize(moves), opening };
  }

  return {
    promise: run(),
    cancel() {
      cancelled = true;
      engine.terminate();
    },
  };
}

// Laufende und fertige Analysen, damit dieselbe Partie nicht zweimal berechnet wird.
// So kann z. B. die Bot-Partie die Analyse schon starten und die Analyse-Seite übernimmt sie.
const jobs = new Map(); // "tiefe|pgn" -> { promise, done, total, listeners, cancel }

const jobKey = (pgn, depth) => `${depth}|${pgn}`;

// Startet (oder übernimmt) die Analyse einer PGN.
// onProgress(fertig, gesamt) wird sofort und nach jeder Stellung aufgerufen.
// Gibt { promise, stopListening } zurück – stopListening bricht die Analyse NICHT ab.
export function analysePgn(pgn, depth, onProgress) {
  const key = jobKey(pgn, depth);
  let job = jobs.get(key);
  if (!job) {
    const parsed = parsePgn(pgn);
    job = { done: 0, total: parsed.history.length + 1, listeners: new Set() };
    const run = analyseGame(parsed.history, depth, (done, total) => {
      job.done = done;
      job.total = total;
      job.listeners.forEach((listener) => listener(done, total));
    });
    job.promise = run.promise;
    job.cancel = run.cancel;
    jobs.set(key, job);
  }
  if (onProgress) {
    job.listeners.add(onProgress);
    onProgress(job.done, job.total);
  }
  return { promise: job.promise, stopListening: () => job.listeners.delete(onProgress) };
}

export function cancelAnalysis(pgn, depth) {
  const key = jobKey(pgn, depth);
  jobs.get(key)?.cancel();
  jobs.delete(key);
}

// Genauigkeit und Anzahl der Zugkategorien je Farbe
function summarize(moves) {
  const summary = {};
  for (const color of ['w', 'b']) {
    const own = moves.filter((m) => m.color === color && m.cls !== 'forced');
    const counts = Object.fromEntries(CLASS_ORDER.map((c) => [c, 0]));
    for (const m of moves) if (m.color === color) counts[m.cls]++;
    const accuracy = own.length ? own.reduce((sum, m) => sum + m.accuracy, 0) / own.length : 100;
    summary[color] = { accuracy, counts };
  }
  return summary;
}
