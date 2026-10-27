import { Flag, Handshake, Trophy } from 'lucide-react';

const ICONS = { win: Trophy, draw: Handshake, loss: Flag };

// Ergebnis im Seitenpanel: groß und farbig, damit man es sofort sieht
export default function ResultBanner({ outcome, title, subtitle }) {
  const Icon = ICONS[outcome];
  return (
    <div className={`result-banner result-banner-${outcome}`}>
      <Icon size={28} />
      <span>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </span>
    </div>
  );
}
