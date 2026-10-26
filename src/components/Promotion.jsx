import { useState } from 'react';

const ROLES = [
  { id: 'q', name: 'queen', label: 'Dame' },
  { id: 'n', name: 'knight', label: 'Springer' },
  { id: 'r', name: 'rook', label: 'Turm' },
  { id: 'b', name: 'bishop', label: 'Läufer' },
];

// Muss bei diesem Zug ein Bauer umgewandelt werden?
export function needsPromotion(game, from, to) {
  const piece = game.get(from);
  return piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
}

// Auswahl der Figur bei der Bauernumwandlung.
//   const promotion = usePromotion(orientation);
//   const piece = await promotion.ask('e8', 'white');   // 'q', 'n', 'r' oder 'b'
//   <Board overlay={promotion.dialog} … />
export function usePromotion(orientation) {
  const [pending, setPending] = useState(null); // { square, color, resolve }

  function ask(square, color) {
    return new Promise((resolve) => setPending({ square, color, resolve }));
  }

  function choose(role) {
    pending.resolve(role);
    setPending(null);
  }

  const dialog = pending && (
    <PromotionDialog square={pending.square} color={pending.color} orientation={orientation} onChoose={choose} />
  );

  return { ask, dialog };
}

function PromotionDialog({ square, color, orientation, onChoose }) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const column = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 8 - rank : rank - 1;
  // Die Auswahl geht vom Umwandlungsfeld aus nach innen ins Brett
  const fromTop = row === 0;

  return (
    <div className="promotion-backdrop">
      <div
        className={`cg-wrap promotion-column ${fromTop ? 'top' : 'bottom'}`}
        style={{ left: `${column * 12.5}%` }}
        role="dialog"
        aria-label="Figur für die Umwandlung wählen"
      >
        {ROLES.map((role) => (
          <button key={role.id} className="promotion-choice" onClick={() => onChoose(role.id)} title={role.label}>
            {/* chessground zeichnet Figuren als <piece>-Element; React kennt es nicht, daher als HTML */}
            <span className="promotion-piece" dangerouslySetInnerHTML={{ __html: `<piece class="${color} ${role.name}"></piece>` }} />
          </button>
        ))}
      </div>
    </div>
  );
}
