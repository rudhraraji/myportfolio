import { profile, rotatingSkills, intro } from '../data/portfolio.js';
import { LinkedInIcon, GitHubIcon, PhoneIcon, MailIcon, PinIcon, CogIcon } from '../components/Icons.jsx';
import { useEffect, useState } from 'react';

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % rotatingSkills.length), 2500);
    return () => clearInterval(t);
  }, []);
  return <span key={i} className="rotating-word">{rotatingSkills[i]}</span>;
}

export default function Home() {
  const info = [
    { Icon: PhoneIcon, title: 'Phone', text: profile.phone, cls: 'block-1' },
    { Icon: MailIcon, title: 'E-mail', text: profile.email, cls: 'block-2' },
    { Icon: PinIcon, title: 'Location', text: profile.location, cls: 'block-3' },
    { Icon: CogIcon, title: 'Working In', text: profile.workingAt, cls: 'block-4 spin' },
  ];
  return (
    <>
      <h2 className="page-title">Know Me</h2>
      <section className="intro">
        <div className="hello">
          <p>Hello, I'm an Automation Engineer </p>
          <RotatingWord />
        </div>
        <blockquote>
          {intro.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
        </blockquote>
      </section>

      <section>
        <h3>Resources</h3>
        <div className="social">
          <a href={profile.linkedin} target="_blank" rel="noreferrer" className="social-btn" title="LinkedIn">
            <LinkedInIcon /> <span>LinkedIn</span>
          </a>
          <a href={profile.github} target="_blank" rel="noreferrer" className="social-btn" title="GitHub">
            <GitHubIcon /> <span>GitHub</span>
          </a>
        </div>
      </section>

      <section className="info-grid">
        {info.map(({ Icon, title, text, cls }) => (
          <div key={title} className={`block ${cls}`}>
            <Icon size={36} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
