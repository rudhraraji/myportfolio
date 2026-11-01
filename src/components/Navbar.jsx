import { UserIcon, ChartIcon, CapIcon, BriefcaseIcon, GridIcon, FileIcon } from './Icons.jsx';

export const NAV = [
  { id: 'home', label: 'Know Me', Icon: UserIcon, color: '#22c222' },
  { id: 'skills', label: 'Skills', Icon: ChartIcon, color: '#f82111' },
  { id: 'education', label: 'Education', Icon: CapIcon, color: '#3e5e9a' },
  { id: 'experience', label: 'Experience', Icon: BriefcaseIcon, color: '#fbb409' },
  { id: 'portfolio', label: 'Portfolio', Icon: GridIcon, color: '#fc6606' },
  { id: 'resume', label: 'Resume', Icon: FileIcon, color: '#9b59b6' },
];

export default function Navbar({ route }) {
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="tabs-liner" />
      {NAV.map(({ id, label, Icon, color }) => (
        <a key={id} href={`#${id}`} className={`tab${route === id ? ' active' : ''}`}
          style={{ '--tab': color }} title={label} aria-current={route === id ? 'page' : undefined}>
          <span className="tab-circle"><Icon /></span>
          <span className="tab-label">{label}</span>
        </a>
      ))}
    </nav>
  );
}
