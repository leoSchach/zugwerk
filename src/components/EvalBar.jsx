// Senkrechter Balken neben dem Brett: je mehr Weiß, desto besser steht Weiß.
export default function EvalBar({ win, text, orientation }) {
  const whiteOnTop = orientation === 'black';
  const whiteBetter = win >= 50;
  return (
    <div className={`eval-bar ${whiteOnTop ? 'flipped' : ''}`} title={`Bewertung: ${text}`}>
      <div className="eval-white" style={{ height: `${win}%` }} />
      <span className={`eval-text ${whiteBetter === !whiteOnTop ? 'bottom' : 'top'} ${whiteBetter ? 'on-white' : ''}`}>
        {text.replace('-', '')}
      </span>
    </div>
  );
}
