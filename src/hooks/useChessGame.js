import { useRef, useState } from 'react';
import { Chess } from 'chess.js';

// Gemeinsame Spiellogik für alle Seiten mit einem Brett.
// `game` ist das chess.js-Objekt, alles andere ist React-Zustand,
// damit die Seite nach jedem Zug neu gezeichnet wird.
export function useChessGame() {
  const [game] = useState(() => new Chess());
  const [state, setState] = useState(() => snapshot(game));
  const redoStack = useRef([]);

  function sync() {
    setState(snapshot(game));
  }

  // Gibt den Zug zurück oder null, wenn er illegal ist
  function move(moveInput) {
    try {
      const result = game.move(moveInput);
      redoStack.current = [];
      sync();
      return result;
    } catch {
      sync();
      return null;
    }
  }

  function undo() {
    const undone = game.undo();
    if (undone) redoStack.current.push(undone.san);
    sync();
    return undone;
  }

  function redo() {
    const san = redoStack.current.pop();
    if (san) game.move(san);
    sync();
  }

  // Zur Ausgangsstellung bzw. zum letzten Zug springen
  function undoAll() {
    let undone;
    while ((undone = game.undo())) redoStack.current.push(undone.san);
    sync();
  }

  function redoAll() {
    while (redoStack.current.length) game.move(redoStack.current.pop());
    sync();
  }

  function reset() {
    game.reset();
    redoStack.current = [];
    sync();
  }

  // Lädt eine Stellung als FEN-Code. Gibt false zurück, wenn der Code ungültig ist.
  function load(fen) {
    try {
      game.load(fen.trim());
    } catch {
      return false;
    }
    redoStack.current = [];
    sync();
    return true;
  }

  return {
    game,
    ...state,
    canRedo: redoStack.current.length > 0,
    move,
    undo,
    redo,
    undoAll,
    redoAll,
    reset,
    load,
  };
}

function snapshot(game) {
  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  return {
    fen: game.fen(),
    history: history.map((m) => m.san),
    lastMove: last ? [last.from, last.to] : undefined,
  };
}
