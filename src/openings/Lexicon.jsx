import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Board from '../components/Board.jsx';
import { colorName, formatSan } from '../chess-utils.js';
import { useSettings } from '../settings.jsx';
import { useOpeningBook } from './book.js';
import { linePositions } from './Course.jsx';

const MAX_RESULTS = 80;

// Alle ~3.500 Eröffnungen aus der Lichess-Datenbank zum Durchsuchen
export default function Lexicon() {
  const book = useOpeningBook();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const results = useMemo(() => {
    if (!book) return [];
    const q = query.trim().toLowerCase();
    // Ohne Suchbegriff: nur die Hauptlinien (Namen ohne Variante)
    const list = q
      ? book.list.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.original.toLowerCase().includes(q) ||
            o.eco.toLowerCase() === q ||
            o.moves.toLowerCase().startsWith(q),
        )
      : book.list.filter((o) => !o.name.includes(':'));
    return list.slice(0, MAX_RESULTS);
  }, [book, query]);

  if (!book) return <p className="muted">Eröffnungen werden geladen …</p>;

  return (
    <div className="lexicon">
      <div className="card lexicon-list">
        <label className="search">
          <Search size={18} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, ECO-Code oder Züge, z. B. „Sizilianisch“, „B90“ oder „e4 c5“"
          />
        </label>
        <p className="muted small">
          {query ? `${results.length === MAX_RESULTS ? `Erste ${MAX_RESULTS}` : results.length} Treffer` : 'Hauptlinien'} ·{' '}
          {book.list.length} Eröffnungen insgesamt
        </p>
        <div className="lexicon-results">
          {results.map((o) => (
            <button
              key={o.eco + o.name + o.moves}
              className={`lexicon-item ${selected === o ? 'selected' : ''}`}
              onClick={() => setSelected(o)}
            >
              <span className="eco">{o.eco}</span>
              <span className="lexicon-name">{o.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <OpeningViewer key={selected.eco + selected.name + selected.moves} opening={selected} />
      ) : (
        <div className="card lexicon-empty muted">Wähle links eine Eröffnung aus.</div>
      )}
    </div>
  );
}

function OpeningViewer({ opening }) {
  const { settings } = useSettings();
  const sans = opening.moves.split(' ');
  const positions = useMemo(() => linePositions(sans), [opening]);
  const [ply, setPly] = useState(sans.length);
  const go = (target) => setPly(Math.max(0, Math.min(sans.length, target)));
  const position = positions[ply];

  const boardConfig = useMemo(
    () => ({
      fen: position.fen,
      turnColor: colorName(position.fen.split(' ')[1]),
      lastMove: position.lastMove,
      check: position.check,
      viewOnly: true,
    }),
    [ply],
  );

  return (
    <div className="card lexicon-viewer">
      <p className="eco">{opening.eco}</p>
      <h2>{opening.name}</h2>
      <div className="lexicon-board">
        <Board config={boardConfig} />
      </div>
      <div className="board-controls">
        <button className="icon-btn" onClick={() => go(ply - 1)} disabled={ply === 0}>
          <ChevronLeft />
        </button>
        <button className="icon-btn" onClick={() => go(ply + 1)} disabled={ply === sans.length}>
          <ChevronRight />
        </button>
      </div>
      <div className="line-moves">
        {sans.map((san, i) => (
          <button key={i} className={`line-move ${ply === i + 1 ? 'current' : ''}`} onClick={() => go(i + 1)}>
            {i % 2 === 0 && <span className="muted">{i / 2 + 1}.</span>}
            {formatSan(san, settings.notation)}
          </button>
        ))}
      </div>
    </div>
  );
}
