import { BookOpen, ChartLine, Grid3x3, Library, Puzzle, Swords } from 'lucide-react';

const AREAS = [
  {
    icon: Puzzle,
    title: 'Puzzles',
    text: 'Taktik trainieren mit über 4 Millionen Aufgaben aus der Lichess-Datenbank.',
    color: '#81b64c',
  },
  {
    icon: BookOpen,
    title: 'Lektionen',
    text: 'Schritt für Schritt: von den Grundregeln über Gabel und Fesselung bis zum Endspiel.',
    color: '#4fc3f7',
  },
  {
    icon: Library,
    title: 'Eröffnungen',
    text: 'Lerne die wichtigsten Eröffnungen und übe sie wie mit Karteikarten.',
    color: '#ffb74d',
  },
  {
    icon: ChartLine,
    title: 'Analyse',
    text: 'Lass deine Partien von Stockfish prüfen: Fehler, Patzer und beste Züge.',
    color: '#ba68c8',
  },
];

export default function Learn() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Lernen</h1>
        <p>Alles, wofür man anderswo Premium braucht – hier kostenlos. Daran bauen wir gerade.</p>
      </header>

      <div className="card-grid">
        {AREAS.map((area) => (
          <div className="card feature-card soon" key={area.title}>
            <span className="feature-icon" style={{ background: area.color }}>
              <area.icon size={24} />
            </span>
            <h3>
              {area.title} <span className="badge">bald</span>
            </h3>
            <p className="muted">{area.text}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title">Schon jetzt verfügbar</h2>
      <div className="card-grid">
        <a className="card feature-card link" href="#/spielen">
          <span className="feature-icon" style={{ background: '#e57373' }}>
            <Swords size={24} />
          </span>
          <h3>Gegen Bots spielen</h3>
          <p className="muted">8 Gegner von Anfänger bis Großmeister.</p>
        </a>
        <a className="card feature-card link" href="#/freies-brett">
          <span className="feature-icon" style={{ background: '#90a4ae' }}>
            <Grid3x3 size={24} />
          </span>
          <h3>Freies Brett</h3>
          <p className="muted">Stellungen aufbauen und Züge ausprobieren.</p>
        </a>
      </div>
    </div>
  );
}
