import { skillGroups } from '../data/portfolio.js';
import { CodeIcon } from '../components/Icons.jsx';

export default function Skills() {
  return (
    <>
      <h2 className="page-title">Skills</h2>
      <section>
        <h3 className="with-icon"><CodeIcon /> Technical Skills</h3>
        <div className="skill-groups">
          {skillGroups.map(({ label, color, skills, wide }) => (
            <div key={label} className={`skill-group${wide ? ' wide' : ''}`} style={{ '--c': color }}>
              <h4>{label}</h4>
              <ul>{skills.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
