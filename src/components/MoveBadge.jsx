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
      {info.symbol}
    </span>
  );
}

// Das gleiche Abzeichen als SVG für chessground (Feld = 100×100)
export function badgeSvg(cls) {
  const { color, symbol } = CLASSES[cls];
  return `<g transform="translate(78 22)">
    <circle r="20" fill="${color}" stroke="#fff" stroke-width="4"/>
    <text text-anchor="middle" dominant-baseline="central" y="1" fill="#fff"
      font-family="system-ui, sans-serif" font-weight="800" font-size="${symbol.length > 1 ? 20 : 24}">${symbol}</text>
  </g>`;
}
