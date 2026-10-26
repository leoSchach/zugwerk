import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Dumbbell, Star } from 'lucide-react';
import Board from '../components/Board.jsx';
import { REPERTOIRE } from '../openings/repertoire.js';
import { MASTERY_RUNS, useOpeningProgress } from '../openings/progress.js';
import { LearnMode, PracticeMode, linePositions } from '../openings/Course.jsx';
import Lexicon from '../openings/Lexicon.jsx';

const COLOR_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'white', label: 'Mit Weiß' },
  { id: 'black', label: 'Mit Schwarz' },
];

export default function Openings() {
  const [tab, setTab] = useState('trainer');
  const [colorFilter, setColorFilter] = useState('all');
  const [openingId, setOpeningId] = useState(null);
  const [mode, setMode] = useState('learn');
  const { progressFor, markLearned, recordRun } = useOpeningProgress();

  const opening = REPERTOIRE.find((o) => o.id === openingId);

  if (opening) {
    return (
      <div className="page game-page">
        <header className="page-header course-header">
          <button className="btn" onClick={() => setOpeningId(null)}>
            <ArrowLeft size={18} /> Übersicht
          </button>
          <div>
            <h1>{opening.name}</h1>
            <p>
              {opening.eco} · mit {opening.color === 'white' ? 'Weiß' : 'Schwarz'} · {opening.level}
            </p>
          </div>
          <div className="segmented course-modes">
            <button className={mode === 'learn' ? 'active' : ''} onClick={() => setMode('learn')}>
              <BookOpen size={18} /> Lernen
            </button>
            <button className={mode === 'practice' ? 'active' : ''} onClick={() => setMode('practice')}>
              <Dumbbell size={18} /> Üben
            </button>
          </div>
        </header>

        {mode === 'learn' ? (
          <LearnMode
            opening={opening}
            onFinished={() => markLearned(opening.id)}
            onPractice={() => setMode('practice')}
          />
        ) : (
          <PracticeMode opening={opening} onRunFinished={(perfect) => recordRun(opening.id, perfect)} />
        )}
      </div>
    );
  }

  const shown = REPERTOIRE.filter((o) => colorFilter === 'all' || o.color === colorFilter);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Eröffnungen</h1>
        <p>Lerne die wichtigsten Eröffnungen Zug für Zug – und übe sie, bis du sie auswendig kannst.</p>
      </header>

      <div className="tabs">
        <button className={tab === 'trainer' ? 'active' : ''} onClick={() => setTab('trainer')}>
          Trainer
        </button>
        <button className={tab === 'lexikon' ? 'active' : ''} onClick={() => setTab('lexikon')}>
          Lexikon
        </button>
      </div>

      {tab === 'lexikon' ? (
        <Lexicon />
      ) : (
        <>
          <div className="segmented filter-row">
            {COLOR_FILTERS.map((f) => (
              <button
                key={f.id}
                className={colorFilter === f.id ? 'active' : ''}
                onClick={() => setColorFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="opening-grid">
            {shown.map((o) => (
              <OpeningCard
                key={o.id}
                opening={o}
                progress={progressFor(o.id)}
                onOpen={() => {
                  setOpeningId(o.id);
                  setMode('learn');
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OpeningCard({ opening, progress, onOpen }) {
  const positions = useMemo(() => linePositions(opening.moves.map(([san]) => san)), [opening]);
  const last = positions[positions.length - 1];
  const boardConfig = useMemo(
    () => ({ fen: last.fen, orientation: opening.color, viewOnly: true, lastMove: last.lastMove }),
    [opening],
  );
  const stars = Math.min(progress.perfect, MASTERY_RUNS);

  return (
    <button className="card opening-card" onClick={onOpen}>
      <div className="opening-board">
        <Board config={boardConfig} coordinates={false} />
      </div>
      <div className="opening-body">
        <div className="opening-tags">
          <span className="badge">{opening.eco}</span>
          <span className={`badge color-${opening.color}`}>{opening.color === 'white' ? 'Weiß' : 'Schwarz'}</span>
          <span className="badge">{opening.level}</span>
        </div>
        <h3>{opening.name}</h3>
        <p className="muted small">{opening.description}</p>
        <div className="opening-progress">
          <span className={progress.learned ? 'learned' : 'muted'}>
            <Check size={16} /> {progress.learned ? 'Gelernt' : 'Noch nicht gelernt'}
          </span>
          <span className="stars" title={`${progress.perfect} fehlerfreie Durchläufe`}>
            {Array.from({ length: MASTERY_RUNS }, (_, i) => (
              <Star key={i} size={16} className={i < stars ? 'filled' : ''} />
            ))}
          </span>
        </div>
      </div>
    </button>
  );
}
