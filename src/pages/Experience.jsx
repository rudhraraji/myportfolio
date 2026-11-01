import { useEffect, useState } from 'react';
import bundled from '../data/experience.json';
import { api } from '../api.js';

function Columns({ skills, items = [], links = [] }) {
  if (!skills && !items.length && !links.length) return null;
  return (
    <div className="proj-cols">
      <div>
        {skills && (<><h4>Skills Used</h4><p>{skills}</p></>)}
      </div>
      <div>
        {(items.length > 0 || links.length > 0) && (
          <>
            <h4>{items.length ? 'Responsibilities' : 'Links'}</h4>
            <ul className="xplist">
              {items.map((i, n) => <li key={n}>{i}</li>)}
              {links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.text || l.url}</a></li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Project({ p }) {
  return (
    <div className="box">
      <h3>
        {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.name}</a> : p.name}
        {p.period && <span className="proj-period"> · {p.period}</span>}
      </h3>
      {p.description && <p>{p.description}</p>}
      <Columns skills={p.skills} items={p.items} links={p.links} />
    </div>
  );
}

export default function Experience() {
  // Show the copy bundled with the site straight away, then swap in the live copy from the server.
  const [experience, setExperience] = useState(bundled);

  useEffect(() => {
    let alive = true;
    api('/experience').then((data) => alive && Array.isArray(data) && setExperience(data)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <>
      <h2 className="page-title">Experience</h2>
      {experience.map((job, idx) => (
        <article key={idx} className="xppanel">
          <header className="xp-head">
            <div className="xp-title">
              <div className="xp-title-row">
                <h3>{job.role}</h3>
                {job.period && <span className="xp-period">{job.period}</span>}
              </div>
              {job.company && <p className="xp-company">{job.company}</p>}
            </div>          </header>
          <div className="xp-body">
            {(job.skills || job.responsibilities?.length > 0) && (
              <div className="box">
                <Columns skills={job.skills} items={job.responsibilities} />
              </div>
            )}
            {job.projects?.map((p, n) => <Project key={n} p={p} />)}
          </div>
        </article>
      ))}
    </>
  );
}
