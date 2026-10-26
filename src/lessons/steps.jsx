import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Lightbulb, RotateCcw } from 'lucide-react';
import Board from '../components/Board.jsx';
import { useChessGame } from '../hooks/useChessGame.js';
import { colorName, legalDests } from '../chess-utils.js';
import { createEngine } from '../engine/stockfish.js';
import { STAR_SVG, starDests, starsFen } from './stars.js';

// Gemeinsamer Rahmen: Brett links, Erklärung rechts, Navigation unten
function StepLayout({ board, children, footer }) {
  return (
    <div className="game-layout">
      <div className="board-column">{board}</div>
      <aside className="card game-panel lesson-panel">
        {children}
        <div className="lesson-footer">{footer}</div>
      </aside>
    </div>
  );
}

function Feedback({ kind, children }) {
  if (!children) return null;
  return <div className={`lesson-feedback ${kind}`}>{children}</div>;
}

// ---------------- Erklärung ----------------
export function TextStep({ step, onDone, footer }) {
  useEffect(() => onDone(), [step]);

  const config = useMemo(
    () => ({
      fen: step.fen ?? '8/8/8/8/8/8/8/8',
      orientation: step.orientation ?? 'white',
      viewOnly: true,
      highlight: { custom: new Map((step.highlight ?? []).map((sq) => [sq, 'lesson-highlight'])) },
      drawable: {
        autoShapes: (step.arrows ?? []).map(([orig, dest]) => ({ orig, dest, brush: 'green' })),
      },
    }),
    [step],
  );

  return (
    <StepLayout board={<Board config={config} />} footer={footer}>
      <p className="lesson-text">{step.text}</p>
    </StepLayout>
  );
}

// ---------------- Sterne sammeln ----------------
export function StarsStep({ step, onDone, footer }) {
  const [state, setState] = useState(() => initialStars(step));
  const done = state.stars.length === 0;

  useEffect(() => setState(initialStars(step)), [step]);
  useEffect(() => {
    if (done) onDone();
  }, [done]);

  function handleMove(from, to) {
    setState((old) => {
      const enemies = { ...old.enemies };
      delete enemies[to];
      // Bauer auf der letzten Reihe wird zur Dame
      const piece = old.piece === 'P' && to[1] === '8' ? 'Q' : old.piece;
      return {
        piece,
        square: to,
        enemies,
        stars: old.stars.filter((s) => s !== to),
        moves: old.moves + 1,
      };
    });
  }

  const config = useMemo(
    () => ({
      fen: starsFen(state.piece, state.square, state.enemies),
      orientation: 'white',
      turnColor: 'white',
      lastMove: undefined,
      movable: {
        color: done ? undefined : 'white',
        dests: done ? new Map() : new Map([[state.square, starDests(state.piece, state.square, state.enemies)]]),
      },
      drawable: {
        autoShapes: state.stars.map((sq) => ({ orig: sq, customSvg: { html: STAR_SVG } })),
      },
    }),
    [state, done],
  );

  return (
    <StepLayout board={<Board config={config} onMove={handleMove} />} footer={footer}>
      <p className="lesson-text">{step.text}</p>
      <p className="muted small">
        Sterne übrig: {state.stars.length} · Züge: {state.moves}
      </p>
      {done && <Feedback kind="good">Geschafft in {state.moves} Zügen!</Feedback>}
      {!done && state.moves > 0 && (
        <button className="btn" onClick={() => setState(initialStars(step))}>
          <RotateCcw size={18} /> Von vorn
        </button>
      )}
    </StepLayout>
  );
}

function initialStars(step) {
  return { piece: step.piece, square: step.start, enemies: { ...step.enemies }, stars: [...step.stars], moves: 0 };
}

// ---------------- Finde den Zug ----------------
export function MoveStep({ step, onDone, footer }) {
  const { game, fen, lastMove, move, undo, load } = useChessGame();
  const [ply, setPly] = useState(0);
  const [phase, setPhase] = useState('player'); // 'player' | 'waiting' | 'done'
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(false);
  const timers = useRef([]);
  const playerColor = colorName(step.fen.split(' ')[1]);

  function later(fn, ms) {
    timers.current.push(setTimeout(fn, ms));
  }

  useEffect(() => {
    load(step.fen);
    setPly(0);
    setPhase('player');
    setFeedback(null);
    setHint(false);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [step]);

  function handleMove(from, to) {
    const options = [].concat(step.solution[ply]);
    const played = move({ from, to, promotion: 'q' });
    if (!played) return;

    const correct = options.includes(played.san) || (step.mate && game.isCheckmate());
    if (!correct) {
      setFeedback({
        kind: 'bad',
        text: game.isStalemate()
          ? 'Patt! Der König hat keinen Zug mehr – das wäre nur Remis.'
          : 'Das ist nicht der gesuchte Zug. Versuch es noch einmal!',
      });
      setPhase('waiting');
      later(() => {
        undo();
        setPhase('player');
      }, 700);
      return;
    }

    setHint(false);
    const next = ply + 1;
    if (next >= step.solution.length || game.isCheckmate()) {
      setPhase('done');
      setFeedback({ kind: 'good', text: step.success ?? 'Richtig!' });
      onDone();
      return;
    }
    setFeedback({ kind: 'good', text: 'Richtig! Weiter so …' });
    setPhase('waiting');
    later(() => {
      move(step.solution[next]);
      setPly(next + 1);
      setPhase('player');
    }, 600);
  }

  let shapes = [];
  if (hint && phase === 'player') {
    const m = new Chess(fen).move([].concat(step.solution[ply])[0]);
    shapes = [{ orig: m.from, dest: m.to, brush: 'green' }];
  }

  const canMove = phase === 'player';
  const config = useMemo(
    () => ({
      fen,
      orientation: playerColor,
      turnColor: colorName(game.turn()),
      lastMove,
      check: game.inCheck(),
      movable: { color: canMove ? playerColor : undefined, dests: canMove ? legalDests(game) : new Map() },
      drawable: { autoShapes: shapes },
    }),
    [fen, canMove, hint, step],
  );

  return (
    <StepLayout board={<Board config={config} onMove={handleMove} />} footer={footer}>
      <p className="lesson-text">{step.text}</p>
      <Feedback kind={feedback?.kind}>{feedback?.text}</Feedback>
      {phase !== 'done' && (
        <button className="btn" onClick={() => setHint(true)} disabled={hint || phase !== 'player'}>
          <Lightbulb size={18} /> Hinweis
        </button>
      )}
    </StepLayout>
  );
}

// ---------------- Gegen Stockfish ----------------
export function PlayStep({ step, onDone, footer }) {
  const { game, fen, lastMove, move, load } = useChessGame();
  const [phase, setPhase] = useState('player'); // 'player' | 'waiting' | 'won' | 'failed'
  const [failReason, setFailReason] = useState('');
  const [moves, setMoves] = useState(0);
  const [run, setRun] = useState(0);
  const engineRef = useRef(null);
  const runRef = useRef(0); // erkennt Antworten aus einem abgebrochenen Versuch
  const playerColor = colorName(step.fen.split(' ')[1]);

  useEffect(() => {
    const engine = createEngine();
    engineRef.current = engine;
    return () => engine.terminate();
  }, []);

  useEffect(() => {
    runRef.current++;
    engineRef.current?.stop();
    load(step.fen);
    setPhase('player');
    setMoves(0);
    setFailReason('');
  }, [step, run]);

  // Prüft nach jedem Zug, ob das Ziel erreicht oder die Aufgabe gescheitert ist
  function checkEnd(lastPlayed) {
    if (step.goal === 'mate' && game.isCheckmate() && game.turn() !== playerColor[0]) return 'won';
    if (step.goal === 'promote' && lastPlayed?.promotion && lastPlayed.color === playerColor[0]) return 'won';
    if (game.isStalemate()) return 'Patt! Der König hatte keinen Zug mehr – das ist nur Remis.';
    if (game.isInsufficientMaterial()) return 'Dir fehlt jetzt das Material zum Gewinnen.';
    if (game.isDraw()) return 'Die Partie ist remis.';
    return null;
  }

  function finish(result) {
    if (result === 'won') {
      setPhase('won');
      onDone();
    } else {
      setFailReason(result);
      setPhase('failed');
    }
  }

  function handleMove(from, to) {
    const played = move({ from, to, promotion: 'q' });
    if (!played) return;
    setMoves((m) => m + 1);
    const result = checkEnd(played);
    if (result) {
      finish(result);
      return;
    }
    setPhase('waiting');
    const token = runRef.current;
    engineRef.current.bestMove(game.fen(), 'movetime 400').then((uci) => {
      if (token !== runRef.current) return;
      const reply = move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      const after = checkEnd(reply);
      if (after) finish(after);
      else setPhase('player');
    });
  }

  const canMove = phase === 'player';
  const config = useMemo(
    () => ({
      fen,
      orientation: playerColor,
      turnColor: colorName(game.turn()),
      lastMove,
      check: game.inCheck(),
      movable: { color: canMove ? playerColor : undefined, dests: canMove ? legalDests(game) : new Map() },
    }),
    [fen, canMove],
  );

  return (
    <StepLayout board={<Board config={config} onMove={handleMove} />} footer={footer}>
      <p className="lesson-text">{step.text}</p>
      <p className="muted small">Deine Züge: {moves}</p>
      {phase === 'won' && (
        <Feedback kind="good">
          {step.goal === 'mate' ? 'Schachmatt' : 'Umgewandelt'} in {moves} Zügen – stark!
        </Feedback>
      )}
      {phase === 'failed' && <Feedback kind="bad">{failReason}</Feedback>}
      {(phase === 'failed' || moves > 0) && phase !== 'won' && (
        <button className="btn" onClick={() => setRun((r) => r + 1)}>
          <RotateCcw size={18} /> Von vorn
        </button>
      )}
    </StepLayout>
  );
}
