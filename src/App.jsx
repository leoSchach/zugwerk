import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Home from './pages/Home.jsx';
import PlayBots from './pages/PlayBots.jsx';
import FreeBoard from './pages/FreeBoard.jsx';
import Learn from './pages/Learn.jsx';
import Puzzles from './pages/Puzzles.jsx';
import Analysis from './pages/Analysis.jsx';
import Openings from './pages/Openings.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const PAGES = {
  '': Home,
  spielen: PlayBots,
  'freies-brett': FreeBoard,
  lernen: Learn,
  puzzles: Puzzles,
  analyse: Analysis,
  eroeffnungen: Openings,
  einstellungen: SettingsPage,
};

// Die aktuelle Seite steht in der Adresse hinter dem #, z. B. "#/spielen"
function currentRoute() {
  return window.location.hash.replace(/^#\/?/, '');
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const Page = PAGES[route] ?? Home;

  return (
    <div className="layout">
      <Sidebar current={PAGES[route] ? route : ''} />
      <main className="content">
        <Page />
      </main>
    </div>
  );
}
