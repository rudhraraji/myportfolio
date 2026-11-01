import { useEffect, useRef, useState } from 'react';
import { useRoute } from './router.js';
import Sidebar from './components/Sidebar.jsx';
import Navbar, { NAV } from './components/Navbar.jsx';
import { MenuIcon, CloseIcon } from './components/Icons.jsx';
import Home from './pages/Home.jsx';
import Skills from './pages/Skills.jsx';
import Education from './pages/Education.jsx';
import Experience from './pages/Experience.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Resume from './pages/Resume.jsx';
import Admin from './pages/Admin.jsx';

// "admin" is reachable at #admin but deliberately not shown in the navbar.
// Old #contact links now open the Resume page.
const PAGES = { home: Home, skills: Skills, education: Education, experience: Experience, portfolio: Portfolio, resume: Resume, admin: Admin };
const ALIASES = { contact: 'resume' };

export default function App() {
  const hash = useRoute();
  const route = ALIASES[hash] || hash;
  const Page = PAGES[route] || Home;
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    mainRef.current?.scrollTo(0, 0);
    const item = NAV.find((n) => n.id === route);
    document.title = `${item ? item.label + ' · ' : ''}Raji Rudhrakumar — Portfolio`;
  }, [route]);

  return (
    <div className={`frame${menuOpen ? ' menu-open' : ''}`}>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle profile panel">
        {menuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
      <Sidebar />
      <div className="content">
        <Navbar route={route} />
        <main ref={mainRef} className="main" key={route}>
          <Page />
        </main>
      </div>
    </div>
  );
}
