import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

// Das Schachbrett. Wir benutzen "chessground", das Brett von Lichess.
// `config` wird bei jeder Änderung an chessground weitergegeben,
// `onMove(from, to)` wird aufgerufen, wenn der Spieler einen Zug macht.
export default function Board({ config, onMove }) {
  const elementRef = useRef(null);
  const apiRef = useRef(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    apiRef.current = Chessground(elementRef.current, {
      premovable: { enabled: false },
      movable: {
        free: false,
        events: { after: (from, to) => onMoveRef.current(from, to) },
      },
    });
    return () => apiRef.current.destroy();
  }, []);

  useEffect(() => {
    apiRef.current?.set(config);
  }, [config]);

  return <div ref={elementRef} className="board" />;
}
