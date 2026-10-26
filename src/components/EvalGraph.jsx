import { useState } from 'react';
import { CLASSES } from '../analysis/classify.js';
import { formatSan } from '../chess-utils.js';
import { useSettings } from '../settings.jsx';

// Kategorien, die im Diagramm als Punkt markiert werden
const MARKED = ['brilliant', 'great', 'miss', 'mistake', 'blunder'];

// Verlauf der Bewertung über die ganze Partie.
// Weiße Fläche = Vorteil Weiß, dunkle Fläche = Vorteil Schwarz.
export default function EvalGraph({ positions, moves, ply, onSelect }) {
  const { settings } = useSettings();
  const [hover, setHover] = useState(null);
  const count = positions.length;
  const x = (i) => (count > 1 ? (i / (count - 1)) * 100 : 0);
  const y = (win) => 100 - win;

  const line = positions.map((p, i) => `${x(i)},${y(p.eval.win)}`).join(' ');
  const area = `0,100 ${line} 100,100`;

  function plyFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
  }

  function label(i) {
    if (i === 0) return 'Ausgangsstellung';
    const move = moves[i - 1];
    const number = Math.ceil(i / 2);
    return `${number}.${move.color === 'b' ? '..' : ''} ${formatSan(move.san, settings.notation)}`;
  }

  return (
    <div
      className="eval-graph"
      onMouseMove={(e) => setHover(plyFromEvent(e))}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => onSelect(plyFromEvent(e))}
      role="img"
      aria-label="Bewertungsverlauf der Partie"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={area} className="eval-area" />
        <line x1="0" x2="100" y1="50" y2="50" className="eval-mid" />
        <line x1={x(ply)} x2={x(ply)} y1="0" y2="100" className="eval-current" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" className="eval-hover" />
        )}
      </svg>

      {moves.map((m, i) =>
        MARKED.includes(m.cls) ? (
          <span
            key={i}
            className="eval-dot"
            style={{
              left: `${x(i + 1)}%`,
              top: `${y(positions[i + 1].eval.win)}%`,
              background: CLASSES[m.cls].color,
            }}
          />
        ) : null,
      )}

      {hover !== null && (
        <div className={`eval-tooltip ${x(hover) > 70 ? 'left' : ''}`} style={{ left: `${x(hover)}%` }}>
          <strong>{label(hover)}</strong>
          <span>{positions[hover].eval.text}</span>
          {hover > 0 && (
            <span className="eval-tooltip-class">
              <i style={{ background: CLASSES[moves[hover - 1].cls].color }} />
              {CLASSES[moves[hover - 1].cls].name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
