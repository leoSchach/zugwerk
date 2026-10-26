import {
  BookOpen,
  ChartLine,
  GraduationCap,
  Grid3x3,
  House,
  Library,
  Puzzle,
  Settings,
  Swords,
} from 'lucide-react';

const MAIN_ITEMS = [
  { route: '', label: 'Start', icon: House },
  { route: 'spielen', label: 'Spielen', icon: Swords },
  { route: 'freies-brett', label: 'Freies Brett', icon: Grid3x3 },
];

const LEARN_ITEMS = [
  { route: 'lernen', label: 'Übersicht', icon: GraduationCap, hideOnMobile: true },
  { route: 'puzzles', label: 'Puzzles', icon: Puzzle },
  { label: 'Lektionen', icon: BookOpen, soon: true },
  { label: 'Eröffnungen', icon: Library, soon: true },
  { route: 'analyse', label: 'Analyse', icon: ChartLine },
];

function NavItem({ item, current }) {
  const Icon = item.icon;
  if (item.soon) {
    return (
      <span className="nav-item disabled" title="Bald verfügbar">
        <Icon size={20} />
        <span className="nav-label">{item.label}</span>
        <span className="badge">bald</span>
      </span>
    );
  }
  return (
    <a
      href={`#/${item.route}`}
      className={`nav-item ${current === item.route ? 'active' : ''} ${item.hideOnMobile ? 'hide-mobile' : ''}`}
    >
      <Icon size={20} />
      <span className="nav-label">{item.label}</span>
    </a>
  );
}

export default function Sidebar({ current }) {
  return (
    <nav className="sidebar">
      <a href="#/" className="logo">
        <span className="logo-icon">♞</span>
        <span className="logo-text">Zugwerk</span>
      </a>

      <a href="#/spielen" className="play-button">
        <Swords size={18} />
        <span>Neue Partie</span>
      </a>

      <div className="nav-group">
        {MAIN_ITEMS.map((item) => (
          <NavItem key={item.label} item={item} current={current} />
        ))}
      </div>

      <div className="nav-group">
        <p className="nav-heading">Lernen</p>
        {LEARN_ITEMS.map((item) => (
          <NavItem key={item.label} item={item} current={current} />
        ))}
      </div>

      <div className="nav-group nav-bottom">
        <NavItem
          item={{ route: 'einstellungen', label: 'Einstellungen', icon: Settings }}
          current={current}
        />
      </div>
    </nav>
  );
}
