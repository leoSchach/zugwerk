import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Eye, Flame, Lightbulb, SkipForward, Trophy } from 'lucide-react';
import Board from '../components/Board.jsx';
import { useChessGame } from '../hooks/useChessGame.js';
import { colorName, legalDests } from '../chess-utils.js';
import { pickPuzzle, usePuzzleProgress } from '../puzzles/progress.js';
import { THEME_FILTERS, THEME_NAMES } from '../puzzles/themes.js';

const PUZZLE_URL = `${import.meta.env.BASE_URL}puzzles/puzzles.json`;

export default function Puzzles() {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(PUZZLE_URL)
      .then((response) => response.json())
      .then(setRows)
      .catch(() => setFailed(true));
  }, []);

  // Die Datei speichert Puzzles als kompakte Listen: [id, fen, züge, wertung, themen]
  const puzzles = useMemo(
    () =>
      rows?.map(([id, fen, moves, rating, themes]) => ({
        id,
        fen,
        moves: moves.split(' '),
        rating,
        themes: themes.split(' '),
      })),
    [rows],
  );

  return (
    <div className="page game-page">
      <header className="page-header">
        <h1>Puzzles</h1>
        <p>Finde den besten Zug. Je besser du bist, desto schwerer werden die Aufgaben.</p>
      </header>
      {failed && <p className="error-text">Die Puzzles konnten nicht geladen werden.</p>}
      {!failed && !puzzles && <p className="muted">Puzzles werden geladen …</p>}
      {puzzles && <PuzzleTrainer puzzles={puzzles} />}
    </div>
  );
}

function uciToMove(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

function PuzzleTrainer({ puzzles }) {
  const { progress, recordResult } = usePuzzleProgress();
  const [themeId, setThemeId] = useState('all');
  const [puzzle, setPuzzle] = useState(() => pickPuzzle(puzzles, progress, 'all'));
  const { game, fen, lastMove, move, undo, load } = useChessGame();

  // phase: 'waiting' (Gegner zieht), 'player' (du bist dran), 'wrong' (falscher Zug), 'done'
  const [phase, setPhase] = useState('waiting');
  const [ply, setPly] = useState(0); // Index des nächsten erwarteten Zugs in puzzle.moves
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [mistake, setMistake] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0 = kein Hinweis, 1 = Figur, 2 = ganzer Zug
  const [result, setResult] = useState(null); // { outcome, delta }
  const timers = useRef([]);

  // Im Puzzle zieht zuerst der Gegner, du spielst die andere Farbe
  const playerColor = puzzle.fen.split(' ')[1] === 'w' ? 'black' : 'white';

  function later(fn, ms) {
    timers.current.push(setTimeout(fn, ms));
  }

  // Neues Puzzle aufbauen und den ersten Zug des Gegners spielen
  useEffect(() => {
    load(puzzle.fen);
    setPhase('waiting');
    setPly(0);
    setFeedback(null);
    setMistake(false);
    setHintLevel(0);
    setResult(null);
    later(() => {
      move(uciToMove(puzzle.moves[0]));
      setPly(1);
      setPhase('player');
    }, 700);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [puzzle]);

  function finish(outcome) {
    const delta = recordResult(puzzle, outcome);
    setResult({ outcome, delta });
    setPhase('done');
  }

  function handleMove(from, to) {
    const expected = puzzle.moves[ply];
    const piece = game.get(from);
    const isPromotion = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    // Bei Umwandlung die Figur aus der Lösung nehmen, falls der Zug sonst stimmt
    const promotion = isPromotion
      ? expected.startsWith(from + to) && expected[4]
        ? expected[4]
        : 'q'
      : undefined;

    if (!move({ from, to, promotion })) return;

    // Jedes Matt zählt als richtig, auch wenn es nicht genau der Lösungszug ist
    const correct = from + to + (promotion ?? '') === expected || game.isCheckmate();
    if (!correct) {
      setFeedback('wrong');
      setMistake(true);
      setPhase('wrong');
      later(() => {
        undo();
        setPhase('player');
      }, 500);
      return;
    }

    setFeedback('correct');
    setHintLevel(0);
    const next = ply + 1;
    if (next >= puzzle.moves.length || game.isCheckmate()) {
      finish(mistake ? 'failed' : hintLevel > 0 ? 'hint' : 'solved');
      return;
    }

    // Antwort des Gegners
    setPhase('waiting');
    later(() => {
      move(uciToMove(puzzle.moves[next]));
      setPly(next + 1);
      setPhase('player');
    }, 450);
  }

  function showSolution() {
    setPhase('waiting');
    setHintLevel(0);
    setFeedback(null);
    const remaining = puzzle.moves.slice(ply);
    remaining.forEach((uci, i) => later(() => move(uciToMove(uci)), 600 * (i + 1)));
    later(() => finish('failed'), 600 * remaining.length + 100);
  }

  function nextPuzzle(newThemeId = themeId) {
    setPuzzle(pickPuzzle(puzzles, progress, newThemeId, puzzle.id));
  }

  function changeTheme(id) {
    setThemeId(id);
    nextPuzzle(id);
  }

  // Hinweis als Kreis um die Figur bzw. Pfeil für den ganzen Zug
  const expected = puzzle.moves[ply];
  const shapes = [];
  if (phase === 'player' && hintLevel >= 1 && expected) {
    shapes.push(
      hintLevel === 1
        ? { orig: expected.slice(0, 2), brush: 'green' }
        : { orig: expected.slice(0, 2), dest: expected.slice(2, 4), brush: 'green' },
    );
  }

  const canMove = phase === 'player';
  const boardConfig = useMemo(
    () => ({
      fen,
      orientation: playerColor,
      turnColor: colorName(game.turn()),
      lastMove,
      check: game.inCheck(),
      movable: {
        color: canMove ? playerColor : undefined,
        dests: canMove ? legalDests(game) : new Map(),
      },
      drawable: { autoShapes: shapes },
    }),
    [fen, playerColor, canMove, hintLevel, ply],
  );

  const colorText = playerColor === 'white' ? 'Weiß' : 'Schwarz';
  const themes = puzzle.themes.filter((t) => THEME_NAMES[t]);

  return (
    <div className="game-layout">
      <div className="board-column">
        <Board config={boardConfig} onMove={handleMove} />
      </div>

      <aside className="card game-panel">
        <PuzzleStatus
          phase={phase}
          feedback={feedback}
          result={result}
          colorText={colorText}
          playerColor={playerColor}
        />

        {phase === 'done' && (
          <div className="puzzle-info">
            <p>
              Puzzle-Schwierigkeit: <strong>{puzzle.rating}</strong>
            </p>
            {themes.length > 0 && (
              <div className="chips">
                {themes.map((t) => (
                  <span className="chip" key={t}>
                    {THEME_NAMES[t]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="panel-actions">
          {phase === 'done' ? (
            <button className="btn btn-primary btn-large" onClick={() => nextPuzzle()}>
              Nächstes Puzzle <SkipForward size={18} />
            </button>
          ) : (
            <>
              <button
                className="btn"
                onClick={() => setHintLevel((h) => Math.min(h + 1, 2))}
                disabled={phase !== 'player' || hintLevel === 2}
                title="Mit Hinweis gelöste Puzzles ändern deine Wertung nicht"
              >
                <Lightbulb size={18} /> Hinweis
              </button>
              <button className="btn" onClick={showSolution} disabled={phase !== 'player'}>
                <Eye size={18} /> Lösung
              </button>
              <button className="btn" onClick={() => nextPuzzle()} title="Überspringen">
                <SkipForward size={18} />
              </button>
            </>
          )}
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{progress.rating}</span>
            <span className="stat-label">Deine Wertung</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              <Flame size={18} /> {progress.streak}
            </span>
            <span className="stat-label">Serie</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              <Trophy size={18} /> {progress.solved}
            </span>
            <span className="stat-label">Gelöst</span>
          </div>
        </div>

        {progress.recent.length > 0 && (
          <div>
            <p className="label">Letzte Puzzles</p>
            <div className="recent">
              {progress.recent.map((r, i) => (
                <span key={i} className={`recent-dot ${r.result}`} title={r.id} />
              ))}
            </div>
          </div>
        )}

        <label className="theme-select">
          <span className="label">Thema</span>
          <select className="input" value={themeId} onChange={(e) => changeTheme(e.target.value)}>
            {THEME_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        {phase === 'done' && (
          <a
            className="muted small external"
            href={`https://lichess.org/training/${puzzle.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Puzzle auf Lichess ansehen <ExternalLink size={14} />
          </a>
        )}
      </aside>
    </div>
  );
}

function PuzzleStatus({ phase, feedback, result, colorText, playerColor }) {
  if (phase === 'done') {
    const { outcome, delta } = result;
    const sign = delta > 0 ? '+' : '';
    const texts = {
      solved: ['Gelöst!', 'puzzle-solved'],
      hint: ['Mit Hinweis gelöst', 'puzzle-hint'],
      failed: ['Nicht gelöst', 'puzzle-failed'],
    };
    const [text, cls] = texts[outcome];
    return (
      <div className={`puzzle-status ${cls}`}>
        <strong>{text}</strong>
        <span>{delta === 0 ? 'Wertung unverändert' : `${sign}${delta} Punkte`}</span>
      </div>
    );
  }

  if (feedback === 'wrong') {
    return (
      <div className="puzzle-status puzzle-failed">
        <strong>Das ist nicht der beste Zug.</strong>
        <span>Versuch es noch einmal!</span>
      </div>
    );
  }

  return (
    <div className={`puzzle-status ${feedback === 'correct' ? 'puzzle-solved' : ''}`}>
      <strong>
        <span className={`turn-dot ${playerColor}`} />
        {feedback === 'correct' ? 'Richtig! Weiter so.' : `Du spielst ${colorText}`}
      </strong>
      <span>Finde den besten Zug für {colorText}.</span>
    </div>
  );
}
