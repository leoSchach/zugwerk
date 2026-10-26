import { Grid3x3, GraduationCap, Puzzle, Swords } from 'lucide-react';
import Board from '../components/Board.jsx';
import Avatar from '../components/Avatar.jsx';
import { BOTS } from '../bots.js';

// Für die Startseite: das Schlussbild von Morphys berühmter "Opernpartie" (1858)
const HERO_CONFIG = {
  fen: '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17',
  viewOnly: true,
  lastMove: ['d1', 'd8'],
  turnColor: 'black',
  check: true,
};

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-text">
          <h1>
            Schach lernen.
            <br />
            <span className="accent">Kostenlos.</span>
          </h1>
          <p className="hero-sub">
            Spiele gegen Bots in jeder Stärke, löse Puzzles, probiere Züge auf dem freien Brett aus und werde
            Schritt für Schritt besser – ohne Abo.
          </p>
          <div className="hero-buttons">
            <a className="btn btn-primary btn-large" href="#/spielen">
              <Swords size={20} /> Gegen Bot spielen
            </a>
            <a className="btn btn-large" href="#/puzzles">
              <Puzzle size={20} /> Puzzles lösen
            </a>
            <a className="btn btn-large" href="#/freies-brett">
              <Grid3x3 size={20} /> Freies Brett
            </a>
          </div>
        </div>
        <div className="hero-board">
          <Board config={HERO_CONFIG} />
        </div>
      </section>

      <h2 className="section-title">Wähle deinen Gegner</h2>
      <div className="bot-strip">
        {BOTS.map((bot) => (
          <a key={bot.id} href="#/spielen" className="bot-chip" title={bot.description}>
            <Avatar piece={bot.piece} color={bot.color} size={44} />
            <span>
              <strong>{bot.name}</strong>
              <span className="muted small">ca. {bot.elo}</span>
            </span>
          </a>
        ))}
      </div>

      <h2 className="section-title">Lernen</h2>
      <a className="card learn-teaser" href="#/lektionen">
        <GraduationCap size={32} />
        <div>
          <h3>Neu im Schach? Starte mit den Lektionen</h3>
          <p className="muted">20 Lektionen zum Mitmachen – von den Figuren bis zum Mattsetzen.</p>
        </div>
      </a>
    </div>
  );
}
