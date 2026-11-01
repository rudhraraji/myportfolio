import education from '../data/Education.json';

const LABEL = { degree: 'Degree', international: 'International certification', tricentis: 'Tricentis certification', other: 'Certificate' };

export default function Education() {
  return (
    <>
      <h2 className="page-title">Education &amp; Certifications</h2>

      {/* <ul className="tl-legend" aria-label="Legend">
        <li><span className="tl-swatch is-degree" /> Degree</li>
        <li><span className="tl-swatch is-international" /> International certification</li>
        <li><span className="tl-swatch is-tricentis" /> Tricentis certification</li>
        <li><span className="tl-swatch is-other" /> Certificates &amp; other</li>
      </ul> */}

      <ol className="timeline">
        {education.map((e) => (
          <li
            key={e.year + e.title}
            className={`tl-item is-${e.category}`}
          >
            <span className="tl-year">{e.year}</span>
            <article className="tl-card">
              <h3>
                <span className="tl-type">{LABEL[e.category]}</span>
                {e.title}
              </h3>
              {e.school && <p>{e.school}</p>}
              {e.result && <footer>{e.result}</footer>}
            </article>
          </li>
        ))}
      </ol>
    </>
  );
}
