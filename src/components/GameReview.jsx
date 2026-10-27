import { useEffect, useState } from 'react';
import { ChartLine } from 'lucide-react';
import MoveBadge from './MoveBadge.jsx';
import { CLASSES } from '../analysis/classify.js';
import { analysePgn, buildPgn, openPgnInAnalysis } from '../analysis/analyseGame.js';

// Gleiche Tiefe wie "Normal" auf der Analyse-Seite – dann kann sie das Ergebnis direkt übernehmen
const DEPTH = 13;

// Diese Kategorien werden in der Kurzübersicht gezählt
const HIGHLIGHTS = ['brilliant', 'great', 'best', 'miss', 'mistake', 'blunder'];

// Kurze Auswertung direkt nach einer Partie. Die Analyse startet automatisch im Hintergrund.
//   game: chess.js-Partie (fertig gespielt), white/black: Namen, me: 'w', 'b' oder null,
//   result: Ergebnis wie "1-0" (z. B. nach Aufgabe, steht nicht in den Zügen)
export default function GameReview({ game, white, black, me, result: gameResult }) {
  const [pgn] = useState(() => buildPgn(game, white, black, gameResult));
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    const job = analysePgn(pgn, DEPTH, (done, total) => active && setProgress({ done, total }));
    job.promise.then((res) => active && res && setResult(res));
    return () => {
      active = false;
      job.stopListening();
    };
  }, [pgn]);

  const sides = [
    { color: 'w', name: me === 'w' ? 'Du' : white },
    { color: 'b', name: me === 'b' ? 'Du' : black },
  ];

  return (
    <div className="game-review">
      <p className="game-review-title">
        <ChartLine size={18} /> Partie-Auswertung
      </p>

      {!result ? (
        <div className="line-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <span className="muted small">
            Stockfish prüft deine Züge … {progress.done}/{progress.total}
          </span>
        </div>
      ) : (
        <>
          <div className="review-sides">
            {sides.map((side) => (
              <div key={side.color} className="review-side">
                <span className={`accuracy-value ${side.color === 'w' ? 'white' : 'black'}`}>
                  {result.summary[side.color].accuracy.toFixed(1)}
                </span>
                <span className="muted small">{side.name}</span>
                <div className="review-counts">
                  {HIGHLIGHTS.filter((cls) => result.summary[side.color].counts[cls] > 0).map((cls) => (
                    <span key={cls} className="review-count" title={CLASSES[cls].name}>
                      <MoveBadge cls={cls} size={18} />
                      {result.summary[side.color].counts[cls]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="muted small review-caption">Genauigkeit in Prozent</p>
        </>
      )}

      <button className="btn btn-primary" onClick={() => openPgnInAnalysis(pgn)}>
        <ChartLine size={18} /> {result ? 'Ganze Analyse ansehen' : 'Zur Analyse'}
      </button>
    </div>
  );
}
