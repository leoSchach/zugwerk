import { useEffect, useRef } from 'react';
import { formatSan } from '../chess-utils.js';
import { useSettings } from '../settings.jsx';

// Zugliste als Paare: 1. e4 e5  2. Sf3 Sc6 ...
export default function MoveList({ history }) {
  const { settings } = useSettings();
  const listRef = useRef(null);

  // Immer zum neuesten Zug scrollen
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [history.length]);

  const pairs = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1]]);
  }
  const lastIndex = history.length - 1;

  return (
    <div className="move-list" ref={listRef}>
      {pairs.length === 0 && <p className="muted small">Noch keine Züge.</p>}
      {pairs.map(([white, black], i) => (
        <div className="move-row" key={i}>
          <span className="move-number">{i + 1}.</span>
          <span className={`move ${lastIndex === i * 2 ? 'current' : ''}`}>
            {formatSan(white, settings.notation)}
          </span>
          <span className={`move ${lastIndex === i * 2 + 1 ? 'current' : ''}`}>
            {black && formatSan(black, settings.notation)}
          </span>
        </div>
      ))}
    </div>
  );
}
