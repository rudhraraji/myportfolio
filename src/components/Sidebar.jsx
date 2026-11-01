import { useEffect, useState } from 'react';
import { profile } from '../data/portfolio.js';
import { api, RESUME_URL } from '../api.js';
import { MailIcon, PhoneIcon, ChatIcon, DownloadIcon } from './Icons.jsx';

const CONTACTS = [
  { id: 'email', Icon: MailIcon, color: '#F36E20', href: `mailto:${profile.email}`, text: profile.email },
  { id: 'phone', Icon: PhoneIcon, color: '#7db701', href: `tel:${profile.phoneIntl}`, text: profile.phone },
  { id: 'sms', Icon: ChatIcon, color: '#3498DB', href: `sms:${profile.phoneIntl}`, text: 'Send SMS' },
];
const RESUME = { id: 'resume', Icon: DownloadIcon, color: '#9b59b6', href: RESUME_URL, text: 'Download resume', download: true };

export default function Sidebar() {
  const [open, setOpen] = useState(null);
  // Only show the download button when a resume has been uploaded (and the server is reachable).
  const [hasResume, setHasResume] = useState(false);
  useEffect(() => {
    api('/resume/info').then(() => setHasResume(true)).catch(() => setHasResume(false));
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>{profile.name}</h1>
        <p>{profile.title}</p>
      </div>
      <img className="profile-img" src={profile.photo} alt={profile.name} />
      <div className="accordion">
        {(hasResume ? [...CONTACTS, RESUME] : CONTACTS).map(({ id, Icon, color, href, text, download }) => (
          <div key={id} className={`acc-item${open === id ? ' open' : ''}`} style={{ '--c': color }}>
            <button className="acc-head" onClick={() => setOpen(open === id ? null : id)}
              aria-expanded={open === id} aria-label={`Show ${id}`}>
              <Icon size={30} />
            </button>
            <div className="acc-body"><a href={href} download={download}>{text}</a></div>
          </div>
        ))}
      </div>
    </aside>
  );
}
