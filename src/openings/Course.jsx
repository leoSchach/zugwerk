import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Dumbbell, Check } from 'lucide-react';
import Board from '../components/Board.jsx';
import { useChessGame } from '../hooks/useChessGame.js';
import { colorName, formatSan, legalDests } from '../chess-utils.js';
import { useSettings } from '../settings.jsx';
import { positionKey, useOpeningBook } from './book.js';

// Alle Stellungen einer Zugfolge vorberechnen: [{ fen, lastMove, check, san }]
export function linePositions(sans) {
  const game = new Chess();
  const list = [{ fen: game.fen() }];
  for (const san of sans) {
    const m = game.move(san);
    list.push({ fen: game.fen(), lastMove: [m.from, m.to], check: game.inCheck(), san: m.san });
  }
  return list;
}

// "3. Lc4" bzw. "3... Lc5"
export function moveLabel(index, san, notation) {
  const number = Math.floor(index / 2) + 1;
  return `${number}.${index % 2 ? '..' : ''} ${formatSan(san, notation)}`;
}

// ---------------- Lernen: Zug für Zug mit Erklärungen ----------------
export function LearnMode({ opening, onFinished, onPractice }) {
  const { settings } = useSettings();
  const positions = useMemo(() => linePositions(opening.moves.map(([san]) => san)), [opening]);
  const total = opening.moves.length;
  const [ply, setPly] = useState(0);
  const atEnd = ply === total;

  useEffect(() => {
    if (atEnd) onFinished();
  }, [atEnd]);

  const go = (target) => setPly(Math.max(0, Math.min(total, target)));

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') go(ply - 1);
      if (e.key === 'ArrowRight') go(ply + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const position = positions[ply];
  // Blauer Pfeil zeigt den nächsten Zug
  const nextMove = positions[ply + 1]?.lastMove;
  const boardConfig = useMemo(
    () => ({
      fen: position.fen,
      orientation: opening.color,
      turnColor: colorName(position.fen.split(' ')[1]),
      lastMove: position.lastMove,
      check: position.check,
      viewOnly: true,
      drawable: {
        autoShapes: nextMove ? [{ orig: nextMove[0], dest: nextMove[1], brush: 'blue' }] : [],
      },
    }),
    [ply, opening],
  );

  return (
    <div className="game-layout">
      <div className="board-column">
        <Board config={boardConfig} />
        <div className="board-controls">
          <button className="icon-btn" onClick={() => go(ply - 1)} disabled={ply === 0} title="Zurück (←)">
            <ChevronLeft />
          </button>
          <button className="btn btn-primary" onClick={() => go(ply + 1)} disabled={atEnd}>
            Weiter <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <aside className="card game-panel">
        <div className="explanation">
          {ply === 0 ? (
            <>
              <p className="explanation-title">Los geht's!</p>
              <p>{opening.description}</p>
              <p className="muted small">
                Der blaue Pfeil zeigt den nächsten Zug. Klicke auf „Weiter“ oder benutze die Pfeiltasten.
              </p>
            </>
          ) : (
            <>
              <p className="explanation-title">{moveLabel(ply - 1, position.san, settings.notation)}</p>
              <p>{opening.moves[ply - 1][1]}</p>
            </>
          )}
        </div>

        <div className="line-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(ply / total) * 100}%` }} />
          </div>
          <span className="muted small">
            Zug {ply} von {total}
          </span>
        </div>

        <div className="line-moves">
          {positions.slice(1).map((p, i) => (
            <button
              key={i}
              className={`line-move ${ply === i + 1 ? 'current' : ''}`}
              onClick={() => go(i + 1)}
            >
              {i % 2 === 0 && <span className="muted">{i / 2 + 1}.</span>}
              {formatSan(p.san, settings.notation)}
            </button>
          ))}
        </div>

        {atEnd && (
          <div className="done-box">
            <p>
              <Check size={18} /> Du kennst jetzt die Hauptvariante. Kannst du sie auswendig?
            </p>
            <button className="btn btn-primary" onClick={onPractice}>
              <Dumbbell size={18} /> Jetzt üben
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ---------------- Üben: Züge selbst finden ----------------
export function PracticeMode({ opening, onRunFinished }) {
  const { settings } = useSettings();
  const book = useOpeningBook();
  const { game, fen, lastMove, move, undo, reset } = useChessGame();
  const total = opening.moves.length;

  const [ply, setPly] = useState(0);
  const [phase, setPhase] = useState('waiting'); // 'player' | 'waiting' | 'wrong' | 'done'
  const [log, setLog] = useState([]); // letzte Erklärungen: { label, text, kind }
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState(false);
  const [run, setRun] = useState(0);
  const timers = useRef([]);
  const mistakesRef = useRef(0);
  const hintUsedRef = useRef(false);

  const isLearnerMove = (index) => (index % 2 === 0 ? 'white' : 'black') === opening.color;

  function later(fn, ms) {
    timers.current.push(setTimeout(fn, ms));
  }

  function explain(index, kind) {
    const [san, text] = opening.moves[index];
    const entry = { label: moveLabel(index, san, settings.notation), text, kind };
    setLog((old) => [...old.slice(-1), entry]);
  }

  function finish() {
    setPhase('done');
    onRunFinished(mistakesRef.current === 0 && !hintUsedRef.current);
  }

  function playOpponent(index) {
    move(opening.moves[index][0]);
    explain(index, 'opponent');
    setPly(index + 1);
    if (index + 1 >= total) finish();
    else setPhase('player');
  }

  // Start bzw. Neustart
  useEffect(() => {
    reset();
    setPly(0);
    setLog([]);
    setMistakes(0);
    setHint(false);
    mistakesRef.current = 0;
    hintUsedRef.current = false;
    if (isLearnerMove(0)) {
      setPhase('player');
    } else {
      setPhase('waiting');
      later(() => playOpponent(0), 600);
    }
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [run, opening]);

  function handleMove(from, to) {
    const expected = opening.moves[ply][0];
    const played = move({ from, to, promotion: 'q' });
    if (!played) return;

    if (played.san === expected) {
      setHint(false);
      explain(ply, 'correct');
      const next = ply + 1;
      setPly(next);
      if (next >= total) {
        finish();
        return;
      }
      setPhase('waiting');
      later(() => playOpponent(next), 600);
      return;
    }

    mistakesRef.current++;
    setMistakes(mistakesRef.current);
    const known = book?.byPosition.get(positionKey(game.fen()));
    const san = formatSan(played.san, settings.notation);
    setLog((old) => [
      ...old.slice(-1),
      {
        label: `${san} ✗`,
        text: known
          ? `Das führt zu „${known.name}“ – auch spielbar, aber hier üben wir einen anderen Zug.`
          : 'Dieser Zug gehört nicht zur Eröffnung. Versuch es noch einmal!',
        kind: 'wrong',
      },
    ]);
    setPhase('wrong');
    later(() => {
      undo();
      setPhase('player');
    }, 600);
  }

  function showHint() {
    setHint(true);
    hintUsedRef.current = true;
  }

  // Hinweis: Pfeil für den erwarteten Zug
  let hintShape = [];
  if (hint && phase === 'player') {
    const m = new Chess(fen).move(opening.moves[ply][0]);
    hintShape = [{ orig: m.from, dest: m.to, brush: 'green' }];
  }

  const canMove = phase === 'player';
  const boardConfig = useMemo(
    () => ({
      fen,
      orientation: opening.color,
      turnColor: colorName(game.turn()),
      lastMove,
      check: game.inCheck(),
      movable: {
        color: canMove ? opening.color : undefined,
        dests: canMove ? legalDests(game) : new Map(),
      },
      drawable: { autoShapes: hintShape },
    }),
    [fen, canMove, hint, opening],
  );

  const colorText = opening.color === 'white' ? 'Weiß' : 'Schwarz';

  return (
    <div className="game-layout">
      <div className="board-column">
        <Board config={boardConfig} onMove={handleMove} />
      </div>

      <aside className="card game-panel">
        {phase === 'done' ? (
          <div className={`puzzle-status ${mistakes === 0 && !hintUsedRef.current ? 'puzzle-solved' : 'puzzle-hint'}`}>
            <strong>Geschafft!</strong>
            <span>
              {mistakes === 0 && !hintUsedRef.current
                ? 'Fehlerfrei – stark!'
                : `${mistakes} Fehler${hintUsedRef.current ? ', mit Hinweis' : ''}. Übung macht den Meister!`}
            </span>
          </div>
        ) : (
          <div className="puzzle-status">
            <strong>
              <span className={`turn-dot ${opening.color}`} /> Du spielst {colorText}
            </strong>
            <span>{phase === 'player' ? 'Welcher Zug kommt jetzt?' : 'Der Gegner zieht …'}</span>
          </div>
        )}

        <div className="line-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(ply / total) * 100}%` }} />
          </div>
          <span className="muted small">
            Zug {ply} von {total} · {mistakes} Fehler
          </span>
        </div>

        <div className="practice-log">
          {log.map((entry, i) => (
            <div key={i} className={`log-entry ${entry.kind}`}>
              <strong>
                {entry.kind === 'opponent' ? 'Gegner: ' : ''}
                {entry.label}
              </strong>
              <p>{entry.text}</p>
            </div>
          ))}
        </div>

        <div className="panel-actions">
          {phase === 'done' ? (
            <button className="btn btn-primary" onClick={() => setRun((r) => r + 1)}>
              <RotateCcw size={18} /> Nochmal üben
            </button>
          ) : (
            <>
              <button className="btn" onClick={showHint} disabled={phase !== 'player' || hint}>
                <Lightbulb size={18} /> Hinweis
              </button>
              <button className="btn" onClick={() => setRun((r) => r + 1)}>
                <RotateCcw size={18} /> Neustart
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
