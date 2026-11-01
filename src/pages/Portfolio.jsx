import { portfolio } from '../data/portfolio.js';
import { ExternalIcon } from '../components/Icons.jsx';

export default function Portfolio() {
  return (
    <>
      <h2 className="page-title">Portfolio</h2>
      <div className="gallery">
        {portfolio.map((p) => (
          <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="thumb">
            <img src={p.image} alt={p.name} loading="lazy" />
            <span className="thumb-cap">{p.name} <ExternalIcon size={14} /></span>
          </a>
        ))}
      </div>
    </>
  );
}
