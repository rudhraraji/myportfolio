import { profile, rotatingSkills, intro } from '../data/portfolio.js';
import { LinkedInIcon, GitHubIcon, PhoneIcon, MailIcon, PinIcon } from '../components/Icons.jsx';
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
    { Icon: PhoneIcon, title: 'Phone', text: profile.phone, href: `tel:${profile.phoneIntl}`, cls: 'block-1' },
    { Icon: MailIcon, title: 'E-mail', text: profile.email, href: `mailto:${profile.email}`, cls: 'block-2' },
    { Icon: LinkedInIcon, title: 'LinkedIn', text: 'rajirudhrakumar', href: profile.linkedin, cls: 'block-li' },
    { Icon: GitHubIcon, title: 'GitHub', text: 'rudhraraji', href: profile.github, cls: 'block-gh' },
    { Icon: PinIcon, title: 'Location', text: profile.location,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.location)}`, cls: 'block-3' },
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

      <section className="info-grid">
        {info.map(({ Icon, title, text, href, cls }) => {
          const body = <><Icon size={36} /><h3>{title}</h3><p>{text}</p></>;
          return href
            ? <a key={title} className={`block block-link ${cls}`} href={href}
                {...(href.startsWith('http') && { target: '_blank', rel: 'noreferrer' })}>{body}</a>
            : <div key={title} className={`block ${cls}`}>{body}</div>;
        })}
      </section>
    </>
  );
}
