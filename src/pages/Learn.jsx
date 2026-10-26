import { BookOpen, ChartLine, Grid3x3, Library, Puzzle, Swords } from 'lucide-react';

const AREAS = [
  {
    route: 'lektionen',
    icon: BookOpen,
    title: 'Lektionen',
    text: '20 Lektionen zum Mitmachen: von den Figuren über Gabel und Fesselung bis zum Mattsetzen.',
    color: '#4fc3f7',
  },
  {
    route: 'puzzles',
    icon: Puzzle,
    title: 'Puzzles',
    text: 'Fast 6.000 Taktikaufgaben aus der Lichess-Datenbank, passend zu deiner Wertung.',
    color: '#81b64c',
  },
  {
    route: 'eroeffnungen',
    icon: Library,
    title: 'Eröffnungen',
    text: '12 Eröffnungen mit Erklärungen lernen und üben, dazu ein Lexikon mit über 3.800 Varianten.',
    color: '#ffb74d',
  },
  {
    route: 'analyse',
    icon: ChartLine,
    title: 'Analyse',
    text: 'Stockfish bewertet jeden Zug: von brillant über verpasst bis Patzer.',
    color: '#ba68c8',
  },
  {
    route: 'spielen',
    icon: Swords,
    title: 'Gegen Bots spielen',
    text: '8 Gegner von Anfänger bis Großmeister.',
    color: '#e57373',
  },
  {
    route: 'freies-brett',
    icon: Grid3x3,
    title: 'Freies Brett',
    text: 'Stellungen aufbauen und Züge ausprobieren.',
    color: '#90a4ae',
  },
];

export default function Learn() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Lernen</h1>
        <p>Alles, wofür man anderswo Premium braucht – hier kostenlos.</p>
      </header>

      <div className="card-grid">
        {AREAS.map((area) => (
          <a className="card feature-card link" href={`#/${area.route}`} key={area.route}>
            <span className="feature-icon" style={{ background: area.color }}>
              <area.icon size={24} />
            </span>
            <h3>{area.title}</h3>
            <p className="muted">{area.text}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
