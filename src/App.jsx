import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, SQUARES } from 'chess.js';
import Board from './components/Board.jsx';
import { createEngine } from './engine/stockfish.js';

// Alle legalen Züge im Format, das chessground erwartet:
// Map { "e2" => ["e3", "e4"], ... }
function legalDests(game) {
  const dests = new Map();
  for (const square of SQUARES) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length) dests.set(square, moves.map((m) => m.to));
  }
  return dests;
}

function statusText(game, playerColor, thinking) {
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Schwarz' : 'Weiß';
    return `Schachmatt – ${winner} gewinnt!`;
  }
  if (game.isStalemate()) return 'Patt – Remis.';
  if (game.isThreefoldRepetition()) return 'Dreifache Stellungswiederholung – Remis.';
  if (game.isInsufficientMaterial()) return 'Zu wenig Material – Remis.';
  if (game.isDraw()) return 'Remis (50-Züge-Regel).';
  if (thinking) return 'Der Computer denkt nach …';
  const check = game.inCheck() ? 'Schach! ' : '';
  return game.turn() === playerColor[0] ? `${check}Du bist am Zug.` : `${check}Computer am Zug.`;
}

export default function App() {
  const [game] = useState(() => new Chess());
  const [position, setPosition] = useState({ fen: game.fen(), lastMove: undefined });
  const [playerColor, setPlayerColor] = useState('white');
  const [skill, setSkill] = useState(5);
  const [thinking, setThinking] = useState(false);
  const engineRef = useRef(null);

  // Nach jeder Änderung an `game` aufrufen, damit React neu zeichnet
  function sync(lastMove) {
    setPosition({ fen: game.fen(), lastMove: lastMove && [lastMove.from, lastMove.to] });
  }

  // Engine starten und beim Verlassen wieder beenden
  useEffect(() => {
    engineRef.current = createEngine();
    return () => engineRef.current.terminate();
  }, []);

  useEffect(() => {
    engineRef.current.setSkill(skill);
  }, [skill]);

  // Wenn der Computer am Zug ist: Stockfish nach dem besten Zug fragen
  useEffect(() => {
    if (game.isGameOver() || game.turn() === playerColor[0]) return;

    let cancelled = false;
    setThinking(true);
    const movetime = 200 + skill * 40;
    engineRef.current.bestMove(game.fen(), movetime).then((uci) => {
      if (cancelled) return;
      const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      setThinking(false);
      sync(move);
    });

    return () => {
      cancelled = true;
      engineRef.current.stop();
      setThinking(false);
    };
  }, [position.fen, playerColor]);

  function handlePlayerMove(from, to) {
    // Bauernumwandlung: vorerst immer zur Dame
    const move = game.move({ from, to, promotion: 'q' });
    sync(move);
  }

  function newGame(color) {
    game.reset();
    setPlayerColor(color);
    sync();
  }

  function takeBack() {
    // So weit zurück, bis wieder du am Zug bist
    game.undo();
    if (game.turn() !== playerColor[0]) game.undo();
    sync();
  }

  const myTurn = !thinking && !game.isGameOver() && game.turn() === playerColor[0];

  const boardConfig = useMemo(
    () => ({
      fen: position.fen,
      orientation: playerColor,
      turnColor: game.turn() === 'w' ? 'white' : 'black',
      lastMove: position.lastMove,
      check: game.inCheck(),
      movable: {
        color: myTurn ? playerColor : undefined,
        dests: myTurn ? legalDests(game) : new Map(),
      },
    }),
    [position, playerColor, myTurn],
  );

  // Zugliste als Paare: 1. e4 e5  2. Sf3 Sc6 ...
  const history = game.history();
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push([history[i], history[i + 1]]);
  }

  return (
    <div className="app">
      <header>
        <h1>♞ Zugwerk</h1>
        <p className="tagline">Schach lernen – kostenlos.</p>
      </header>

      <main>
        <Board config={boardConfig} onMove={handlePlayerMove} />

        <aside className="panel">
          <p className="status">{statusText(game, playerColor, thinking)}</p>

          <div className="buttons">
            <button onClick={() => newGame('white')}>Neues Spiel als Weiß</button>
            <button onClick={() => newGame('black')}>Neues Spiel als Schwarz</button>
            <button onClick={takeBack} disabled={history.length === 0}>
              Zug zurücknehmen
            </button>
          </div>

          <label className="skill">
            <span>
              Computerstärke: <strong>{skill}</strong> / 20
            </span>
            <input
              type="range"
              min="0"
              max="20"
              value={skill}
              onChange={(e) => setSkill(Number(e.target.value))}
            />
          </label>

          <h2>Züge</h2>
          <ol className="moves">
            {movePairs.map(([white, black], i) => (
              <li key={i}>
                <span>{white}</span>
                <span>{black}</span>
              </li>
            ))}
          </ol>
        </aside>
      </main>
    </div>
  );
}
