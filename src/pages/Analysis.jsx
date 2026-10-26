import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Plus,
} from 'lucide-react';
import Board from '../components/Board.jsx';
import EvalBar from '../components/EvalBar.jsx';
import EvalGraph from '../components/EvalGraph.jsx';
import MoveBadge, { badgeSvg } from '../components/MoveBadge.jsx';
import { CLASSES, CLASS_ORDER } from '../analysis/classify.js';
import { analyseGame, getAnalysisPgn, parsePgn, setAnalysisPgn } from '../analysis/analyseGame.js';
import { colorName, formatSan } from '../chess-utils.js';
import { useSettings } from '../settings.jsx';

const DEPTHS = [
  { depth: 10, name: 'Schnell' },
  { depth: 13, name: 'Normal' },
  { depth: 16, name: 'Genau' },
];

// Morphys "Opernpartie" (1858) als Beispiel – mit brillantem Damenopfer am Ende
const EXAMPLE_PGN = `[White "Paul Morphy"]
[Black "Herzog von Braunschweig & Graf Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

// Ergebnisse merken, damit beim Zurückkehren nicht neu analysiert werden muss
let cache = { key: null, result: null };

export default function Analysis() {
  const [pgn, setPgn] = useState(getAnalysisPgn);
  const [depth, setDepth] = useState(13);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [result, setResult] = useState(null);
  const [parsed, setParsed] = useState(null);
  const jobRef = useRef(null);

  function start(text = pgn, searchDepth = depth) {
    const game = parsePgn(text);
    if (!game) {
      setError(true);
      return;
    }
    setError(false);
    setAnalysisPgn(text);
    setParsed(game);

    const key = `${searchDepth}|${text}`;
    if (cache.key === key) {
      setResult(cache.result);
      return;
    }

    jobRef.current?.cancel();
    setResult(null);
    setProgress({ done: 0, total: game.history.length + 1 });
    const job = analyseGame(game.history, searchDepth, (done, total) => setProgress({ done, total }));
    jobRef.current = job;
    job.promise.then((res) => {
      if (!res) return;
      cache = { key, result: res };
      setProgress(null);
      setResult(res);
    });
  }

  // Wurde eine Partie übergeben (z. B. aus "Spielen"), gleich analysieren
  useEffect(() => {
    if (pgn) start(pgn);
    return () => jobRef.current?.cancel();
  }, []);

  function cancel() {
    jobRef.current?.cancel();
    setProgress(null);
  }

  function newAnalysis() {
    cancel();
    setResult(null);
    setParsed(null);
    setPgn('');
  }

  if (result && parsed) {
    return <Review game={parsed} result={result} onNew={newAnalysis} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Analyse</h1>
        <p>Stockfish prüft jeden Zug deiner Partie – von brillant bis Patzer.</p>
      </header>

      {progress ? (
        <div className="card analysis-progress">
          <h2>Partie wird analysiert …</h2>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <p className="muted">
            Stellung {progress.done} von {progress.total}
          </p>
          <button className="btn" onClick={cancel}>
            Abbrechen
          </button>
        </div>
      ) : (
        <div className="card analysis-input">
          <label className="label" htmlFor="pgn">
            Partie im PGN-Format
          </label>
          <textarea
            id="pgn"
            className={`input pgn-input ${error ? 'error' : ''}`}
            value={pgn}
            onChange={(e) => {
              setPgn(e.target.value);
              setError(false);
            }}
            placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5 …\n\nTipp: Bei Lichess oder chess.com findest du unter jeder Partie „PGN kopieren“.'}
          />
          {error && <p className="error-text">Das ist keine gültige Partie im PGN-Format.</p>}

          <p className="label">Genauigkeit</p>
          <div className="segmented">
            {DEPTHS.map((d) => (
              <button
                key={d.depth}
                className={depth === d.depth ? 'active' : ''}
                onClick={() => setDepth(d.depth)}
              >
                {d.name}
              </button>
            ))}
          </div>

          <div className="input-actions">
            <button className="btn btn-primary btn-large" onClick={() => start()} disabled={!pgn.trim()}>
              Analysieren
            </button>
            <button
              className="btn btn-large"
              onClick={() => {
                setPgn(EXAMPLE_PGN);
                start(EXAMPLE_PGN);
              }}
            >
              <FileText size={18} /> Beispielpartie
            </button>
          </div>
          <p className="muted small">
            Du kannst auch nach einer Partie gegen einen Bot oder auf dem freien Brett auf
            „Analysieren“ klicken.
          </p>
        </div>
      )}
    </div>
  );
}

function Review({ game, result, onNew }) {
  const { settings } = useSettings();
  const { positions, moves, summary } = result;
  const [ply, setPly] = useState(moves.length);
  const [orientation, setOrientation] = useState('white');

  const go = (target) => setPly(Math.max(0, Math.min(moves.length, target)));

  // Pfeiltasten zum Vor- und Zurückspringen
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') go(ply - 1);
      if (e.key === 'ArrowRight') go(ply + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const position = positions[ply];
  const move = ply > 0 ? moves[ply - 1] : null;
  const showBest = move && move.bestUci && !['best', 'brilliant', 'great', 'forced'].includes(move.cls);

  const boardConfig = useMemo(() => {
    const shapes = [];
    if (move) shapes.push({ orig: move.to, customSvg: { html: badgeSvg(move.cls) } });
    if (showBest) {
      shapes.push({ orig: move.bestUci.slice(0, 2), dest: move.bestUci.slice(2, 4), brush: 'green' });
    }
    return {
      fen: position.fen,
      orientation,
      turnColor: colorName(position.fen.split(' ')[1]),
      lastMove: move ? [move.from, move.to] : undefined,
      viewOnly: true,
      drawable: { autoShapes: shapes },
    };
  }, [ply, orientation]);

  const white = game.headers.White && game.headers.White !== '?' ? game.headers.White : 'Weiß';
  const black = game.headers.Black && game.headers.Black !== '?' ? game.headers.Black : 'Schwarz';
  const san = (s) => formatSan(s, settings.notation);

  // Zugliste als Paare
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([i, i + 1]);

  return (
    <div className="page game-page">
      <header className="page-header review-header">
        <div>
          <h1>Partie-Analyse</h1>
          <p>
            {white} – {black}
            {game.headers.Result && game.headers.Result !== '*' && ` · ${game.headers.Result}`}
          </p>
        </div>
        <button className="btn" onClick={onNew}>
          <Plus size={18} /> Neue Analyse
        </button>
      </header>

      <div className="game-layout">
        <div className="board-column">
          <div className="board-with-bar">
            <EvalBar win={position.eval.win} text={position.eval.text} orientation={orientation} />
            <Board config={boardConfig} />
          </div>
          <div className="board-controls">
            <button className="icon-btn" onClick={() => go(0)} title="Zum Anfang">
              <ChevronsLeft />
            </button>
            <button className="icon-btn" onClick={() => go(ply - 1)} title="Zurück (←)">
              <ChevronLeft />
            </button>
            <button className="icon-btn" onClick={() => go(ply + 1)} title="Vor (→)">
              <ChevronRight />
            </button>
            <button className="icon-btn" onClick={() => go(moves.length)} title="Zum Ende">
              <ChevronsRight />
            </button>
            <button
              className="icon-btn"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
              title="Brett drehen"
            >
              <ArrowUpDown />
            </button>
          </div>
          <EvalGraph positions={positions} moves={moves} ply={ply} onSelect={go} />
        </div>

        <aside className="card game-panel">
          <div className="move-feedback">
            {move ? (
              <>
                <p className="feedback-title">
                  <MoveBadge cls={move.cls} size={28} />
                  <span>
                    <strong>{san(move.san)}</strong> {CLASSES[move.cls].text}
                  </span>
                  <span className="feedback-eval">{position.eval.text}</span>
                </p>
                {showBest && move.bestSan && (
                  <p className="muted">
                    Besser war <strong className="best-move">{san(move.bestSan)}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="muted">Ausgangsstellung. Klicke auf einen Zug oder nutze die Pfeiltasten.</p>
            )}
          </div>

          <div className="accuracy">
            <div>
              <span className="accuracy-value white">{summary.w.accuracy.toFixed(1)}</span>
              <span className="muted small">{white}</span>
            </div>
            <span className="muted small accuracy-label">Genauigkeit</span>
            <div>
              <span className="accuracy-value black">{summary.b.accuracy.toFixed(1)}</span>
              <span className="muted small">{black}</span>
            </div>
          </div>

          <table className="class-table">
            <tbody>
              {CLASS_ORDER.map((cls) => (
                <tr key={cls}>
                  <td className="count">{summary.w.counts[cls]}</td>
                  <td className="class-name">
                    <MoveBadge cls={cls} size={20} /> {CLASSES[cls].name}
                  </td>
                  <td className="count">{summary.b.counts[cls]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="move-list review-moves">
            {pairs.map(([w, b], i) => (
              <div className="move-row" key={i}>
                <span className="move-number">{i + 1}.</span>
                {[w, b].map((index) =>
                  moves[index] ? (
                    <button
                      key={index}
                      className={`move review-move ${ply === index + 1 ? 'current' : ''}`}
                      onClick={() => go(index + 1)}
                    >
                      <MoveBadge cls={moves[index].cls} size={16} />
                      {san(moves[index].san)}
                    </button>
                  ) : (
                    <span key={index} />
                  ),
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
