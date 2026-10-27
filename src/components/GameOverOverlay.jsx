import { useEffect, useMemo, useState } from 'react';
import { Flag, Handshake, Trophy, X } from 'lucide-react';

const ICONS = { win: Trophy, draw: Handshake, loss: Flag };
const CONFETTI_COLORS = ['#81b64c', '#f0c03c', '#4fc3f7', '#e57373', '#ba68c8', '#ffffff'];

// Großes Ergebnisfenster über dem Brett am Ende einer Partie.
//   outcome: 'win' | 'draw' | 'loss', title, subtitle, extra: z. B. Wertungsänderung,
//   children: Knöpfe (z. B. Revanche)
// Erscheint kurz verzögert, damit man den letzten Zug (z. B. das Matt) noch sieht.
export default function GameOverOverlay({ outcome, title, subtitle, extra, children }) {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const Icon = ICONS[outcome];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(timer);
  }, []);

  // Konfetti: zufällige Position, Farbe, Größe und Verzögerung je Schnipsel
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        tilt: Math.random() * 360,
      })),
    [],
  );

  if (!visible || closed) return null;

  return (
    <div className={`game-over game-over-${outcome}`}>
      {outcome === 'win' && (
        <div className="confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 0.45,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                transform: `rotate(${c.tilt}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="game-over-card" role="dialog" aria-label={title}>
        <button className="game-over-close" onClick={() => setClosed(true)} title="Schließen">
          <X size={18} />
        </button>
        <span className="game-over-icon">
          <Icon size={40} />
        </span>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {extra}
        <div className="game-over-actions">
          {children}
          <button className="btn" onClick={() => setClosed(true)}>
            Brett ansehen
          </button>
        </div>
      </div>
    </div>
  );
}
