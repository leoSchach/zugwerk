import { BookOpen } from 'lucide-react';
import { CLASSES } from '../analysis/classify.js';

// Rundes Abzeichen mit dem Symbol einer Zugkategorie, z. B. "!!" für brillant
export default function MoveBadge({ cls, size = 20 }) {
  const info = CLASSES[cls];
  return (
    <span
      className="move-badge"
      style={{ background: info.color, width: size, height: size, fontSize: size * 0.55 }}
      title={info.name}
    >
      {cls === 'book' ? <BookOpen size={size * 0.6} strokeWidth={2.5} /> : info.symbol}
    </span>
  );
}

// Das gleiche Abzeichen als SVG für chessground (Feld = 100×100)
export function badgeSvg(cls) {
  const { color, symbol } = CLASSES[cls];
  if (cls === 'book') {
    // Aufgeschlagenes Buch statt Text
    return `<g transform="translate(78 22)">
    <circle r="20" fill="${color}" stroke="#fff" stroke-width="4"/>
    <path d="M-11,-7 L-1.5,-4 L-1.5,9 L-11,6 Z M11,-7 L1.5,-4 L1.5,9 L11,6 Z" fill="#fff"/>
  </g>`;
  }
  return `<g transform="translate(78 22)">
    <circle r="20" fill="${color}" stroke="#fff" stroke-width="4"/>
    <text text-anchor="middle" dominant-baseline="central" y="1" fill="#fff"
      font-family="system-ui, sans-serif" font-weight="800" font-size="${symbol.length > 1 ? 20 : 24}">${symbol}</text>
  </g>`;
}
