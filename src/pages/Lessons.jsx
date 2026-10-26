import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Play, Trophy } from 'lucide-react';
import { ALL_LESSONS, CHAPTERS } from '../lessons/content.js';
import { MoveStep, PlayStep, StarsStep, TextStep } from '../lessons/steps.jsx';

const STORAGE_KEY = 'zugwerk-lektionen';

// Abgeschlossene Lektionen, im Browser gespeichert
function useLessonProgress() {
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    } catch {
      // Speichern nicht möglich – egal
    }
  }, [completed]);

  return {
    isDone: (id) => completed.includes(id),
    markDone: (id) => setCompleted((old) => (old.includes(id) ? old : [...old, id])),
    count: completed.length,
  };
}

const STEP_COMPONENTS = { text: TextStep, stars: StarsStep, move: MoveStep, play: PlayStep };

export default function Lessons() {
  const progress = useLessonProgress();
  const [lessonId, setLessonId] = useState(null);
  const lesson = ALL_LESSONS.find((l) => l.id === lessonId);

  if (lesson) {
    return (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        onComplete={() => progress.markDone(lesson.id)}
        onExit={() => setLessonId(null)}
        onNext={(id) => setLessonId(id)}
      />
    );
  }

  const nextLesson = ALL_LESSONS.find((l) => !progress.isDone(l.id));
  const percent = Math.round((progress.count / ALL_LESSONS.length) * 100);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Lektionen</h1>
        <p>Von den ersten Zügen bis zum Mattsetzen – Schritt für Schritt und zum Mitmachen.</p>
      </header>

      <div className="card lessons-summary">
        <div className="lessons-summary-text">
          <strong>
            {progress.count} von {ALL_LESSONS.length} Lektionen abgeschlossen
          </strong>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {nextLesson ? (
          <button className="btn btn-primary btn-large" onClick={() => setLessonId(nextLesson.id)}>
            <Play size={18} /> {progress.count ? 'Weiterlernen' : 'Loslegen'}: {nextLesson.title}
          </button>
        ) : (
          <span className="all-done">
            <Trophy size={20} /> Alles geschafft!
          </span>
        )}
      </div>

      {CHAPTERS.map((chapter, chapterIndex) => {
        const done = chapter.lessons.filter((l) => progress.isDone(l.id)).length;
        return (
          <section key={chapter.id} className="chapter">
            <div className="chapter-header">
              <span className="chapter-number">{chapterIndex + 1}</span>
              <div>
                <h2>{chapter.title}</h2>
                <p className="muted">{chapter.description}</p>
              </div>
              <span className="muted small chapter-count">
                {done}/{chapter.lessons.length}
              </span>
            </div>
            <div className="lesson-grid">
              {chapter.lessons.map((l) => (
                <button
                  key={l.id}
                  className={`lesson-tile ${progress.isDone(l.id) ? 'done' : ''}`}
                  onClick={() => setLessonId(l.id)}
                >
                  <span className="lesson-check">{progress.isDone(l.id) && <Check size={16} />}</span>
                  <span className="lesson-title">{l.title}</span>
                  <span className="muted small">{l.steps.length} Schritte</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LessonPlayer({ lesson, onComplete, onExit, onNext }) {
  const [index, setIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState(() => new Set());
  const [finished, setFinished] = useState(false);

  const step = lesson.steps[index];
  const StepComponent = STEP_COMPONENTS[step.type];
  const stepDone = doneSteps.has(index);
  const isLast = index === lesson.steps.length - 1;
  const nextLesson = ALL_LESSONS[ALL_LESSONS.findIndex((l) => l.id === lesson.id) + 1];

  function markStepDone() {
    setDoneSteps((old) => new Set(old).add(index));
  }

  function next() {
    if (isLast) {
      onComplete();
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  }

  const footer = (
    <div className="lesson-nav">
      <button className="btn" onClick={() => setIndex(index - 1)} disabled={index === 0}>
        <ChevronLeft size={18} /> Zurück
      </button>
      <button className="btn btn-primary" onClick={next} disabled={!stepDone}>
        {isLast ? 'Abschließen' : 'Weiter'} <ChevronRight size={18} />
      </button>
    </div>
  );

  return (
    <div className="page game-page">
      <header className="page-header course-header">
        <button className="btn" onClick={onExit}>
          <ArrowLeft size={18} /> Alle Lektionen
        </button>
        <div>
          <h1>{lesson.title}</h1>
          <p>{lesson.chapterTitle}</p>
        </div>
        <div className="step-dots" aria-label={`Schritt ${index + 1} von ${lesson.steps.length}`}>
          {lesson.steps.map((_, i) => (
            <span
              key={i}
              className={`step-dot ${i === index ? 'current' : ''} ${doneSteps.has(i) ? 'done' : ''}`}
            />
          ))}
        </div>
      </header>

      {finished ? (
        <div className="card lesson-finished">
          <Trophy size={48} />
          <h2>Lektion „{lesson.title}“ abgeschlossen!</h2>
          <div className="input-actions">
            {nextLesson && (
              <button className="btn btn-primary btn-large" onClick={() => onNext(nextLesson.id)}>
                Nächste Lektion: {nextLesson.title} <ChevronRight size={18} />
              </button>
            )}
            <button className="btn btn-large" onClick={onExit}>
              Zur Übersicht
            </button>
          </div>
        </div>
      ) : (
        <StepComponent key={index} step={step} onDone={markStepDone} footer={footer} />
      )}
    </div>
  );
}
