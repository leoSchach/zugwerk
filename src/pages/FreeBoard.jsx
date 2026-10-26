import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChartLine,
  Copy,
  Plus,
} from 'lucide-react';
import Board from '../components/Board.jsx';
import MoveList from '../components/MoveList.jsx';
import { needsPromotion, usePromotion } from '../components/Promotion.jsx';
import { useChessGame } from '../hooks/useChessGame.js';
import { openInAnalysis } from '../analysis/analyseGame.js';
import { findOpening, useOpeningBook } from '../openings/book.js';
import { colorName, gameOverText, legalDests } from '../chess-utils.js';

// Ein Brett ohne Gegner: Du ziehst Weiß und Schwarz selbst.
export default function FreeBoard() {
  const { game, fen, history, lastMove, canRedo, move, undo, redo, undoAll, redoAll, reset, load } =
    useChessGame();
  const [orientation, setOrientation] = useState('white');
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState(false);
  const [copied, setCopied] = useState(false);
  const promotion = usePromotion(orientation);

  // Pfeiltasten zum Vor- und Zurückspringen
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') undo();
      if (e.key === 'ArrowRight') redo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const book = useOpeningBook();
  const opening = useMemo(() => findOpening(book, game.history({ verbose: true })), [book, fen]);
  const over = gameOverText(game);

  const boardConfig = useMemo(
    () => ({
      fen,
      orientation,
      turnColor: colorName(game.turn()),
      lastMove,
      check: game.inCheck(),
      movable: { color: over ? undefined : 'both', dests: legalDests(game) },
    }),
    [fen, orientation, over],
  );

  async function handleMove(from, to) {
    const color = colorName(game.turn());
    const piece = needsPromotion(game, from, to) ? await promotion.ask(to, color) : undefined;
    move({ from, to, promotion: piece });
  }

  function loadFen(e) {
    e.preventDefault();
    const ok = load(fenInput);
    setFenError(!ok);
    if (ok) setFenInput('');
  }

  async function copyFen() {
    await navigator.clipboard.writeText(fen);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const canUndo = history.length > 0;

  return (
    <div className="page game-page">
      <header className="page-header">
        <h1>Freies Brett</h1>
        <p>Probiere Züge aus – du bewegst Weiß und Schwarz.</p>
      </header>

      <div className="game-layout">
        <div className="board-column">
          <Board config={boardConfig} onMove={handleMove} overlay={promotion.dialog} />
          <div className="board-controls">
            <button className="icon-btn" onClick={undoAll} disabled={!canUndo} title="Zum Anfang">
              <ChevronsLeft />
            </button>
            <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Zurück (←)">
              <ChevronLeft />
            </button>
            <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Vor (→)">
              <ChevronRight />
            </button>
            <button className="icon-btn" onClick={redoAll} disabled={!canRedo} title="Zum Ende">
              <ChevronsRight />
            </button>
            <button
              className="icon-btn"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
              title="Brett drehen"
            >
              <ArrowUpDown />
            </button>
          </div>
        </div>

        <aside className="card game-panel">
          {over ? (
            <div className="result result-draw">{over}</div>
          ) : (
            <p className="status">
              <span className={`turn-dot ${game.turn() === 'w' ? 'white' : 'black'}`} />
              {game.inCheck() && 'Schach! '}
              {game.turn() === 'w' ? 'Weiß' : 'Schwarz'} am Zug
            </p>
          )}

          {opening && (
            <p className="opening-name">
              {opening.eco} · {opening.name}
            </p>
          )}
          <MoveList history={history} />

          <div className="panel-actions">
            <button className="btn" onClick={reset}>
              <Plus size={18} /> Neue Stellung
            </button>
            <button className="btn" onClick={() => openInAnalysis(game)} disabled={!canUndo}>
              <ChartLine size={18} /> Analysieren
            </button>
          </div>

          <div className="fen-box">
            <p className="label">Aktuelle Stellung (FEN)</p>
            <div className="fen-row">
              <code className="fen">{fen}</code>
              <button className="icon-btn small" onClick={copyFen} title="Kopieren">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <form className="fen-row" onSubmit={loadFen}>
              <input
                className={`input ${fenError ? 'error' : ''}`}
                value={fenInput}
                onChange={(e) => {
                  setFenInput(e.target.value);
                  setFenError(false);
                }}
                placeholder="FEN einfügen, um eine Stellung zu laden"
              />
              <button className="btn" type="submit" disabled={!fenInput.trim()}>
                Laden
              </button>
            </form>
            {fenError && <p className="error-text">Das ist kein gültiger FEN-Code.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
