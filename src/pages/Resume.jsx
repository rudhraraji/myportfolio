import { useEffect, useState } from 'react';
import { api, RESUME_URL } from '../api.js';
import { profile } from '../data/portfolio.js';
import { FileIcon, DownloadIcon } from '../components/Icons.jsx';

const kb = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function Resume() {
  // undefined = still loading, null = none uploaded (or server unreachable)
  const [info, setInfo] = useState(undefined);

  const [preview, setPreview] = useState(''); // blob URL of the PDF, shown in the page
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    api('/resume/info').then(setInfo).catch(() => setInfo(null));
  }, []);

  // The download link forces a file download, so for the on-page view we fetch the PDF
  // ourselves and show it from a local blob URL. Word files can't be shown in a browser.
  const isPdf = info?.name?.toLowerCase().endsWith('.pdf');
  useEffect(() => {
    if (!isPdf) return;
    let url = '';
    let cancelled = false;
    fetch(RESUME_URL)
      .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPreview(url);
      })
      .catch(() => !cancelled && setPreviewFailed(true));
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [isPdf, info?.id]);

  // Word (.docx) resumes: the server converts them to HTML so the contents show on the page.
  const isDocx = info?.name?.toLowerCase().endsWith('.docx');
  const [docHtml, setDocHtml] = useState('');
  const [docFailed, setDocFailed] = useState(false);
  useEffect(() => {
    if (!isDocx) return;
    let cancelled = false;
    api('/resume/content')
      .then((data) => !cancelled && setDocHtml(data.html))
      .catch(() => !cancelled && setDocFailed(true));
    return () => { cancelled = true; };
  }, [isDocx, info?.id]);

  return (
    <>
      <h2 className="page-title">Resume</h2>

      {info === undefined && <p className="contact-intro">Loading…</p>}

      {info === null && (
        <p className="contact-intro">
          My resume isn't available to download right now. Please call me at{' '}
          <a href={`tel:${profile.phoneIntl}`}>{profile.phone}</a> and I'll send you a copy.
        </p>
      )}

      {info && (
        <>
          <p className="contact-intro">
            {isPdf || isDocx ? 'View my resume below, or download a copy.' : 'Download a copy of my resume.'}
          </p>
          <div className="resume-card">
            <FileIcon size={40} />
            <div className="resume-meta">
              <strong>{info.name}</strong>
              <span>
                {kb(info.size)}
                {info.placeholder ? ' · full version coming soon' : ` · updated ${new Date(info.uploadedAt).toLocaleDateString()}`}
              </span>
            </div>
            <a className="resume-download" href={RESUME_URL} download>
              <DownloadIcon size={18} /> Download
            </a>
          </div>
          {isPdf && !previewFailed && (
            preview
              ? <iframe className="resume-view" src={preview} title={`Resume: ${info.name}`} />
              : <p className="contact-intro">Loading preview…</p>
          )}
          {isPdf && previewFailed && <p className="contact-intro">The preview couldn't load. Use the Download button instead.</p>}
          {isDocx && !docFailed && (
            docHtml
              // Converted and cleaned on the server (see /api/resume/content).
              ? <article className="resume-doc" dangerouslySetInnerHTML={{ __html: docHtml }} />
              : <p className="contact-intro">Loading resume…</p>
          )}
          {isDocx && docFailed && <p className="contact-intro">The resume couldn't be shown here. Use the Download button instead.</p>}
          {!isPdf && !isDocx && <p className="contact-intro">This file type can't be shown in the browser. Use the Download button to open it.</p>}
        </>
      )}
    </>
  );
}
