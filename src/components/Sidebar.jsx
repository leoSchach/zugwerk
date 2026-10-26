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

// hideOnMobile: auf dem Handy ist unten nur Platz für wenige Einträge
const MAIN_ITEMS = [
  { route: '', label: 'Start', icon: House },
  { route: 'spielen', label: 'Spielen', icon: Swords },
  { route: 'freies-brett', label: 'Freies Brett', icon: Grid3x3, hideOnMobile: true },
];

const LEARN_ITEMS = [
  { route: 'lernen', label: 'Übersicht', mobileLabel: 'Lernen', icon: GraduationCap },
  { route: 'lektionen', label: 'Lektionen', icon: BookOpen, hideOnMobile: true },
  { route: 'puzzles', label: 'Puzzles', icon: Puzzle },
  { route: 'eroeffnungen', label: 'Eröffnungen', icon: Library, hideOnMobile: true },
  { route: 'analyse', label: 'Analyse', icon: ChartLine, hideOnMobile: true },
];

function NavItem({ item, current }) {
  const Icon = item.icon;
  const classes = ['nav-item'];
  if (current === item.route) classes.push('active');
  if (item.hideOnMobile) classes.push('hide-mobile');
  if (item.mobileLabel) classes.push('has-mobile-label');
  return (
    <a href={`#/${item.route}`} className={classes.join(' ')}>
      <Icon size={20} />
      <span className="nav-label">{item.label}</span>
      {item.mobileLabel && <span className="nav-label-mobile">{item.mobileLabel}</span>}
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
