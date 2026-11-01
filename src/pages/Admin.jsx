import { useEffect, useState } from 'react';
import { api, uploadFile, downloadFile, RESUME_URL } from '../api.js';

// Admin portal (open the site at #admin). Log in with ADMIN_PASSWORD from the server's .env,
// edit jobs and clients/projects with the form, then Save to update the Experience tab.

const TOKEN_KEY = 'portfolio-admin-token';
const store = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } },
  set: (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

let nextId = 1;
const uid = () => `k${nextId++}`;

// Lists are edited as text: one bullet point per line, links as "Text | https://url".
const toLines = (arr = []) => arr.join('\n');
const fromLines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const linksToText = (links = []) => links.map((l) => (l.text ? `${l.text} | ${l.url}` : l.url)).join('\n');
const textToLinks = (s) => fromLines(s).map((line) => {
  const i = line.lastIndexOf('|');
  return i < 0 ? { text: '', url: line } : { text: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
});

const toForm = (list) => list.map((j) => ({
  _id: uid(), role: j.role || '', company: j.company || '', period: j.period || '',
  skills: j.skills || '', responsibilities: toLines(j.responsibilities),
  projects: (j.projects || []).map((p) => ({
    _id: uid(), name: p.name || '', period: p.period || '', url: p.url || '', description: p.description || '',
    skills: p.skills || '', items: toLines(p.items), links: linksToText(p.links),
  })),
}));

const fromForm = (jobs) => jobs.map((j) => ({
  role: j.role, company: j.company, period: j.period, skills: j.skills,
  responsibilities: fromLines(j.responsibilities),
  projects: j.projects.map((p) => ({
    name: p.name, period: p.period, url: p.url, description: p.description, skills: p.skills,
    items: fromLines(p.items), links: textToLinks(p.links),
  })),
}));

const newJob = () => ({ _id: uid(), role: '', company: '', period: '', skills: '', responsibilities: '', projects: [] });
const newProject = () => ({ _id: uid(), name: '', period: '', url: '', description: '', skills: '', items: '', links: '' });

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
};

function Field({ label, value, onChange, textarea, hint, rows = 4, required, placeholder }) {
  return (
    <label className="adm-field">
      <span>{label}{required && <em> *</em>}</span>
      {textarea
        ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { password } });
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="page-title">Admin</h2>
      <form className="contact-form" onSubmit={submit}>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="current-password" />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        {error && <p className="form-status error" role="alert">{error}</p>}
      </form>
    </>
  );
}

function ProjectEditor({ p, n, total, onChange, onMove, onRemove }) {
  const set = (k) => (v) => onChange({ ...p, [k]: v });
  return (
    <div className="adm-project">
      <div className="adm-row-head">
        <strong>Client / project {n + 1}{p.name && `: ${p.name}`}</strong>
        <div className="adm-actions">
          <button type="button" onClick={() => onMove(-1)} disabled={n === 0} title="Move up">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={n === total - 1} title="Move down">↓</button>
          <button type="button" className="danger" onClick={onRemove}>Remove</button>
        </div>
      </div>
      <div className="adm-grid">
        <Field label="Client / project name" value={p.name} onChange={set('name')} required placeholder="e.g. RACV – DERA App" />
        <Field label="Dates" value={p.period} onChange={set('period')} placeholder="e.g. Sep 25 – May 26" />
        <Field label="Website (optional)" value={p.url} onChange={set('url')} placeholder="https://…" />
        <Field label="Skills" value={p.skills} onChange={set('skills')} placeholder="Comma separated" />
      </div>
      <Field label="Description (optional)" value={p.description} onChange={set('description')} textarea rows={2} />
      <Field label="Responsibilities" value={p.items} onChange={set('items')} textarea rows={6} hint="One bullet point per line." />
      <Field label="Links (optional)" value={p.links} onChange={set('links')} textarea rows={2} hint='One per line, as "Link text | https://url".' />
    </div>
  );
}

// Resume: upload new versions; every upload is kept in the history list below,
// where any version can be downloaded, put back on the site, or deleted.
const RESUME_TYPES = '.pdf,.doc,.docx';
const MAX_RESUME_MB = 5;
const kb = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function ResumeUpload({ token, onAuthLost }) {
  const [history, setHistory] = useState(null); // every uploaded version, newest first
  const [currentId, setCurrentId] = useState(null); // the version shown on the site
  const [file, setFile] = useState(null); // newly picked file, not uploaded yet
  const [status, setStatus] = useState({ state: 'idle', text: '' });
  const [dragging, setDragging] = useState(false);

  const current = history?.find((v) => v.id === currentId) || null;

  function failed(err) {
    if (err.status === 401) onAuthLost();
    setStatus({ state: 'error', text: err.message });
  }

  async function load() {
    try {
      const data = await api('/resume/history', { token });
      setHistory(data.history);
      setCurrentId(data.current);
    } catch (err) {
      failed(err);
    }
  }

  useEffect(() => { load(); }, []);

  function pick(f) {
    setStatus({ state: 'idle', text: '' });
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!RESUME_TYPES.split(',').includes(ext)) return setStatus({ state: 'error', text: 'Please choose a PDF or Word file.' });
    if (f.size > MAX_RESUME_MB * 1024 * 1024) return setStatus({ state: 'error', text: `File is larger than ${MAX_RESUME_MB} MB.` });
    setFile(f);
  }

  // Runs an action, shows its result, then reloads the history list.
  async function act(fn, okText) {
    setStatus({ state: 'sending', text: 'Working…' });
    try {
      await fn();
      setStatus({ state: 'ok', text: okText });
      await load();
    } catch (err) {
      failed(err);
    }
  }

  const upload = () => act(async () => {
    await uploadFile('/resume', file, token);
    setFile(null);
  }, 'Resume uploaded and now live on the site. The previous version is kept in the history.');

  const unpublish = () => window.confirm('Take the resume off the site? The placeholder will show instead, and this version stays in the history.')
    && act(() => api('/resume', { method: 'DELETE', token }), 'Resume taken off the site. The placeholder is showing; this version is still in the history.');

  const restore = (v) => act(() => api(`/resume/history/${v.id}/restore`, { method: 'POST', token }),
    `"${v.name}" is now the resume on the site.`);

  const destroy = (v) => window.confirm(`Delete "${v.name}" (uploaded ${when(v.uploadedAt)}) for good?${v.id === currentId ? ' It is the one on the site, so the placeholder will show instead.' : ''}`)
    && act(() => api(`/resume/history/${v.id}`, { method: 'DELETE', token }), 'Version deleted.');

  const download = (v) => downloadFile(`/resume/history/${v.id}`, v.name, token).catch(failed);

  const busy = status.state === 'sending';

  return (
    <section className="adm-resume">
      <h3 className="adm-sub">Resume</h3>
      {current
        ? <p className="adm-empty">
            On the site: <a href={RESUME_URL}>{current.name}</a> · {kb(current.size)} · uploaded {when(current.uploadedAt)}
          </p>
        : <p className="adm-empty">
            On the site: <a href={RESUME_URL}>placeholder resume</a> (shown until you upload one
            {history?.length ? ' or pick one from the history below' : ''}).
          </p>}
      <label
        className={`adm-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
      >
        <input type="file" accept={RESUME_TYPES} onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} hidden />
        {file
          ? <span><strong>{file.name}</strong> · {kb(file.size)}</span>
          : <span>Drag a {current ? 'new ' : ''}resume here, or <u>click to choose a file</u></span>}
        <small>PDF or Word, up to {MAX_RESUME_MB} MB</small>
      </label>
      <div className="adm-actions">
        <button type="button" onClick={upload} disabled={!file || busy}>
          {busy && file ? 'Uploading…' : current ? 'Upload new version' : 'Upload resume'}
        </button>
        {file && <button type="button" onClick={() => setFile(null)} disabled={busy}>Clear</button>}
        {current && !file && <button type="button" className="danger" onClick={unpublish} disabled={busy}>Take off site</button>}
      </div>
      {status.text && <p className={`form-status ${status.state}`} role="status">{status.text}</p>}

      {history?.length > 0 && (
        <details className="adm-history" open>
          <summary>Upload history ({history.length})</summary>
          <ul>
            {history.map((v) => (
              <li key={v.id} className={v.id === currentId ? 'current' : ''}>
                <div className="adm-history-info">
                  <strong>{v.name}</strong>
                  <span>{when(v.uploadedAt)} · {kb(v.size)}{v.id === currentId && <em> · On the site</em>}</span>
                </div>
                <div className="adm-actions">
                  <button type="button" onClick={() => download(v)}>Download</button>
                  {v.id !== currentId && <button type="button" onClick={() => restore(v)} disabled={busy}>Use this one</button>}
                  <button type="button" className="danger" onClick={() => destroy(v)} disabled={busy}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function JobEditor({ job, n, total, onChange, onMove, onRemove }) {
  const set = (k) => (v) => onChange({ ...job, [k]: v });
  const setProjects = (projects) => onChange({ ...job, projects });
  const title = [job.role || 'New job', job.company].filter(Boolean).join(' | ');
  // New (empty) jobs start expanded; decided once so the card doesn't collapse while typing.
  const [startOpen] = useState(!job.role);

  return (
    <details className="adm-job" open={startOpen}>
      <summary>
        <span className="adm-job-title">{title}</span>
        <span className="adm-job-period">{job.period}</span>
      </summary>
      <div className="adm-job-body">
        <div className="adm-actions">
          <button type="button" onClick={() => onMove(-1)} disabled={n === 0}>↑ Move up</button>
          <button type="button" onClick={() => onMove(1)} disabled={n === total - 1}>↓ Move down</button>
          <button type="button" className="danger" onClick={onRemove}>Delete job</button>
        </div>
        <div className="adm-grid">
          <Field label="Role / job title" value={job.role} onChange={set('role')} required placeholder="e.g. Sr. Test Engineer" />
          <Field label="Company" value={job.company} onChange={set('company')} placeholder="e.g. Tech Mahindra Pty Ltd" />
          <Field label="Dates" value={job.period} onChange={set('period')} placeholder="e.g. January 2022 – June 2022" />        </div>
        <Field label="Skills (optional)" value={job.skills} onChange={set('skills')} placeholder="Comma separated — use this when the job has no separate clients" />
        <Field label="Responsibilities (optional)" value={job.responsibilities} onChange={set('responsibilities')} textarea rows={5} hint="One bullet point per line." />

        <h4 className="adm-sub">Clients / projects</h4>
        {job.projects.length === 0 && <p className="adm-empty">No clients or projects yet.</p>}
        {job.projects.map((p, i) => (
          <ProjectEditor key={p._id} p={p} n={i} total={job.projects.length}
            onChange={(np) => setProjects(job.projects.map((x) => (x._id === p._id ? np : x)))}
            onMove={(d) => setProjects(move(job.projects, i, d))}
            onRemove={() => window.confirm(`Remove "${p.name || 'this client/project'}"?`) && setProjects(job.projects.filter((x) => x._id !== p._id))} />
        ))}
        <button type="button" className="adm-add" onClick={() => setProjects([...job.projects, newProject()])}>+ Add client / project</button>
      </div>
    </details>
  );
}

export default function Admin() {
  const [token, setToken] = useState(store.get);
  const [jobs, setJobs] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', text: '' });

  const login = (t) => { store.set(t); setToken(t); };
  const logout = () => {
    if (dirty && !window.confirm('You have unsaved changes. Log out anyway?')) return;
    api('/admin/logout', { method: 'POST', token }).catch(() => {});
    store.set('');
    setToken('');
    setJobs(null);
    setDirty(false);
  };

  // Load the current experience once logged in.
  useEffect(() => {
    if (!token) return;
    api('/experience')
      .then((data) => setJobs(toForm(data)))
      .catch((err) => setStatus({ state: 'error', text: err.message }));
  }, [token]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (next) => { setJobs(next); setDirty(true); setStatus({ state: 'idle', text: '' }); };

  async function save() {
    setStatus({ state: 'sending', text: 'Saving…' });
    try {
      const { experience } = await api('/experience', { method: 'PUT', body: fromForm(jobs), token });
      setJobs(toForm(experience));
      setDirty(false);
      setStatus({ state: 'ok', text: 'Saved. The Experience tab is updated.' });
    } catch (err) {
      if (err.status === 401) { store.set(''); setToken(''); }
      setStatus({ state: 'error', text: err.message });
    }
  }

  if (!token) return <Login onLogin={login} />;

  return (
    <>
      <h2 className="page-title">Admin · Experience</h2>
      <div className="adm-toolbar">
        <button type="button" className="primary" onClick={save} disabled={!jobs || !dirty || status.state === 'sending'}>
          {status.state === 'sending' ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => update([newJob(), ...jobs])} disabled={!jobs}>+ Add job</button>
        <a href="#experience" className="adm-link">View Experience tab</a>
        <button type="button" className="adm-logout" onClick={logout}>Log out</button>
        {dirty && <span className="adm-dirty">Unsaved changes</span>}
      </div>
      {status.text && <p className={`form-status ${status.state}`} role="status">{status.text}</p>}

      <ResumeUpload token={token} onAuthLost={() => { store.set(''); setToken(''); }} />

      <h3 className="adm-sub">Experience</h3>

      {!jobs && status.state !== 'error' && <p className="adm-empty">Loading…</p>}
      {jobs?.map((job, i) => (
        <JobEditor key={job._id} job={job} n={i} total={jobs.length}
          onChange={(nj) => update(jobs.map((x) => (x._id === job._id ? nj : x)))}
          onMove={(d) => update(move(jobs, i, d))}
          onRemove={() => window.confirm(`Delete "${job.role || 'this job'}" and all its clients/projects?`) && update(jobs.filter((x) => x._id !== job._id))} />
      ))}
    </>
  );
}
