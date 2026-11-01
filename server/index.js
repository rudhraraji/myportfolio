// Node.js (Express) backend for the portfolio.
// - GET/PUT /api/experience serve and update the Experience tab (PUT needs admin login).
// - GET /api/resume downloads the current resume; admins upload new versions and manage history.
// - In production it also serves the built React site from dist/.
import express from 'express';
import cors from 'cors';
import mammoth from 'mammoth';
import { readFile, writeFile, rename, copyFile, mkdir, unlink } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3001;
const {
  ALLOWED_ORIGIN, // e.g. https://your-username.github.io when the site is hosted separately
  ADMIN_PASSWORD, // password for the admin portal (#admin); admin is disabled when unset
} = process.env;

const app = express();
// Small JSON limit for most routes; saving experience has its own larger limit below.
const smallJson = express.json({ limit: '20kb' });
app.use((req, res, next) => (req.path === '/api/experience' ? next() : smallJson(req, res, next)));
if (ALLOWED_ORIGIN) app.use('/api', cors({ origin: ALLOWED_ORIGIN.split(',').map((s) => s.trim()) }));

// Simple in-memory rate limit: `max` requests per IP per 15 minutes, tracked per bucket.
const hits = new Map();
const WINDOW = 15 * 60 * 1000;
function tooMany(bucket, ip, max = 5) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

// ---------- Admin login ----------
// Logging in with ADMIN_PASSWORD returns a random session token, valid for 8 hours.
const sessions = new Map(); // token -> expiry time
const SESSION_MS = 8 * 60 * 60 * 1000;
const sha = (s) => createHash('sha256').update(String(s)).digest();

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin is turned off. Set ADMIN_PASSWORD in the server .env file.' });
  if (tooMany('login', req.ip, 10)) return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  if (!timingSafeEqual(sha(req.body?.password ?? ''), sha(ADMIN_PASSWORD))) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  res.json({ token });
});

app.post('/api/admin/logout', (req, res) => {
  sessions.delete((req.get('authorization') || '').replace(/^Bearer /, ''));
  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer /, '');
  const expiry = sessions.get(token);
  if (!expiry || expiry < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: expiry ? 'Your login has expired. Please log in again.' : 'Please log in first.' });
  }
  next();
}

// ---------- Experience ----------
// Stored in src/data/experience.json so the static build always has the latest saved copy too.
const EXPERIENCE_FILE = path.join(root, 'src', 'data', 'experience.json');

const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const strList = (v, max = 1000) => (Array.isArray(v) ? v : []).map((s) => str(s, max)).filter(Boolean).slice(0, 50);

// Keep only known fields, trimmed and size-limited, so a bad request can't break the page.
function cleanExperience(list) {
  if (!Array.isArray(list)) throw new Error('Experience must be a list of jobs.');
  if (list.length > 50) throw new Error('Too many jobs (maximum 50).');
  return list.map((job, i) => {
    const out = {
      role: str(job?.role, 150),
      company: str(job?.company, 150),
      period: str(job?.period, 100),
      skills: str(job?.skills, 1000),
      responsibilities: strList(job?.responsibilities),
      projects: (Array.isArray(job?.projects) ? job.projects : []).slice(0, 30).map((p) => ({
        name: str(p?.name, 200),
        period: str(p?.period, 100),
        url: str(p?.url, 300),
        description: str(p?.description, 2000),
        skills: str(p?.skills, 1000),
        items: strList(p?.items),
        links: (Array.isArray(p?.links) ? p.links : []).slice(0, 20)
          .map((l) => ({ text: str(l?.text, 200), url: str(l?.url, 300) }))
          .filter((l) => l.url),
      })),
    };
    if (!out.role) throw new Error(`Job ${i + 1} needs a role / job title.`);
    out.projects.forEach((p, j) => {
      if (!p.name) throw new Error(`Client/project ${j + 1} under "${out.role}" needs a name.`);
    });
    return out;
  });
}

app.get('/api/experience', async (_req, res) => {
  try {
    res.json(JSON.parse(await readFile(EXPERIENCE_FILE, 'utf8')));
  } catch (err) {
    console.error('Failed to read experience:', err);
    res.status(500).json({ error: 'Could not load experience.' });
  }
});

app.put('/api/experience', express.json({ limit: '500kb' }), requireAdmin, async (req, res) => {
  let data;
  try {
    data = cleanExperience(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    // Keep a backup of the previous version, then write the new one in a single step.
    if (existsSync(EXPERIENCE_FILE)) await copyFile(EXPERIENCE_FILE, EXPERIENCE_FILE.replace(/\.json$/, '.backup.json'));
    const tmp = `${EXPERIENCE_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
    await rename(tmp, EXPERIENCE_FILE);
    res.json({ ok: true, experience: data });
  } catch (err) {
    console.error('Failed to save experience:', err);
    res.status(500).json({ error: 'Could not save experience.' });
  }
});

// ---------- Resume ----------
// Every upload is kept in server/uploads/resumes/ as history. One of them is "current":
// that's the one the public site shows and downloads. Admins can switch the current
// version, take it off the site, or delete old versions.
// The admin uploads the raw file bytes, with the original name in the X-Filename header.
const UPLOAD_DIR = path.join(root, 'server', 'uploads');
const RESUME_DIR = path.join(UPLOAD_DIR, 'resumes');
const RESUME_META = path.join(UPLOAD_DIR, 'resume.json'); // { current: id | null, history: [newest first] }
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_TYPES = {
  '.pdf': { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [0x50, 0x4b] }, // zip
  '.doc': { mime: 'application/msword', magic: [0xd0, 0xcf, 0x11, 0xe0] },
};

async function readResumes() {
  let meta;
  try {
    meta = JSON.parse(await readFile(RESUME_META, 'utf8'));
  } catch {
    return { current: null, history: [] };
  }
  // Older format stored a single resume as { file, name, ... }: move it into history.
  if (!Array.isArray(meta.history)) {
    await mkdir(RESUME_DIR, { recursive: true });
    const id = `${Date.parse(meta.uploadedAt) || Date.now()}-old`;
    const file = `${id}${path.extname(meta.file)}`;
    try {
      await rename(path.join(UPLOAD_DIR, meta.file), path.join(RESUME_DIR, file));
      meta = { current: id, history: [{ id, file, name: meta.name, mime: meta.mime, size: meta.size, uploadedAt: meta.uploadedAt }] };
    } catch {
      meta = { current: null, history: [] };
    }
    await writeResumes(meta);
  }
  return meta;
}

async function writeResumes(meta) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const tmp = `${RESUME_META}.tmp`;
  await writeFile(tmp, JSON.stringify(meta, null, 2));
  await rename(tmp, RESUME_META);
}

// Run changes one at a time so two quick admin actions can't overwrite each other.
let resumeQueue = Promise.resolve();
const withResumes = (fn) => {
  const run = resumeQueue.then(async () => fn(await readResumes()));
  resumeQueue = run.catch(() => {});
  return run;
};

// Shown on the site whenever no uploaded resume is current (e.g. before the first upload).
const DEFAULT_RESUME = path.join(root, 'server', 'default-resume.pdf');
const placeholder = () => existsSync(DEFAULT_RESUME)
  ? { placeholder: true, name: 'Resume.pdf', mime: 'application/pdf', size: statSync(DEFAULT_RESUME).size, path: DEFAULT_RESUME }
  : null;

const publicInfo = (v) => ({ id: v.id, name: v.name, size: v.size, uploadedAt: v.uploadedAt, placeholder: v.placeholder || undefined });
const currentResume = (meta) => meta.history.find((v) => v.id === meta.current) || placeholder();
const sendResume = (res, v) => { res.type(v.mime); res.download(v.path || path.join(RESUME_DIR, v.file), v.name); };

// Public: the current resume.
app.get('/api/resume/info', async (_req, res) => {
  const v = currentResume(await readResumes());
  if (!v) return res.status(404).json({ error: 'No resume uploaded yet.' });
  res.json(publicInfo(v));
});

app.get('/api/resume', async (_req, res) => {
  const v = currentResume(await readResumes());
  if (!v) return res.status(404).json({ error: 'No resume uploaded yet.' });
  sendResume(res, v);
});

// Public: the current resume as HTML, so the Resume tab can show a Word file's contents.
// (PDFs are shown by the browser directly; old .doc files can't be converted.)
const htmlCache = new Map(); // version id -> html
// Mammoth escapes text, but links come straight from the document: keep only safe ones.
const safeHtml = (html) => html
  .replace(/\shref="([^"]*)"/g, (m, url) => (/^(https?:|mailto:|tel:|#)/i.test(url) ? m : ''))
  .replace(/\ssrc="([^"]*)"/g, (m, url) => (/^data:image\/(png|jpe?g|gif|webp);/i.test(url) ? m : ''))
  .replace(/<a id="[^"]*"><\/a>/g, '') // empty bookmark anchors from Word
  .replace(/<a\s/g, '<a target="_blank" rel="noopener noreferrer" ')
  .replace(/\t+/g, '<span class="doc-tab"></span>'); // Word tab stops (e.g. "Job title    Dates")
const DOCX_STYLES = ["p[style-name='List Paragraph'] => ul > li:fresh"];

app.get('/api/resume/content', async (_req, res) => {
  const v = currentResume(await readResumes());
  if (!v) return res.status(404).json({ error: 'No resume uploaded yet.' });
  if (!v.file?.endsWith('.docx')) return res.status(415).json({ error: 'Only Word (.docx) resumes can be shown as a page.' });
  try {
    if (!htmlCache.has(v.id)) {
      const { value } = await mammoth.convertToHtml({ path: path.join(RESUME_DIR, v.file) }, { styleMap: DOCX_STYLES });
      htmlCache.set(v.id, safeHtml(value));
    }
    res.json({ id: v.id, html: htmlCache.get(v.id) });
  } catch (err) {
    console.error('Failed to convert resume:', err);
    res.status(500).json({ error: "Couldn't read the Word file." });
  }
});

// Admin: upload a new version (it becomes current; older ones stay in history).
app.put('/api/resume', requireAdmin, express.raw({ type: () => true, limit: MAX_RESUME_BYTES }), async (req, res) => {
  const name = path.basename(decodeURIComponent(req.get('x-filename') || 'resume.pdf'))
    .replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  const ext = path.extname(name).toLowerCase();
  const type = RESUME_TYPES[ext];
  const body = req.body;
  if (!type) return res.status(400).json({ error: 'Please upload a PDF or Word file.' });
  if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ error: 'The file is empty.' });
  if (!type.magic.every((b, i) => body[i] === b)) return res.status(400).json({ error: `That doesn't look like a real ${ext} file.` });
  try {
    const version = await withResumes(async (meta) => {
      await mkdir(RESUME_DIR, { recursive: true });
      const id = `${Date.now()}-${randomBytes(3).toString('hex')}`;
      const v = { id, file: `${id}${ext}`, name, mime: type.mime, size: body.length, uploadedAt: new Date().toISOString() };
      await writeFile(path.join(RESUME_DIR, v.file), body);
      await writeResumes({ current: id, history: [v, ...meta.history] });
      return v;
    });
    res.json({ ok: true, ...publicInfo(version) });
  } catch (err) {
    console.error('Failed to save resume:', err);
    res.status(500).json({ error: 'Could not save the resume.' });
  }
});

// Admin: take the resume off the site (the file stays in history).
app.delete('/api/resume', requireAdmin, async (_req, res) => {
  await withResumes((meta) => writeResumes({ ...meta, current: null }));
  res.json({ ok: true });
});

// Admin: list every uploaded version, newest first.
app.get('/api/resume/history', requireAdmin, async (_req, res) => {
  const meta = await readResumes();
  res.json({ current: meta.current, history: meta.history.map(publicInfo) });
});

// Admin: download any version.
app.get('/api/resume/history/:id', requireAdmin, async (req, res) => {
  const v = (await readResumes()).history.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'That version no longer exists.' });
  sendResume(res, v);
});

// Admin: make an older version the current one.
app.post('/api/resume/history/:id/restore', requireAdmin, async (req, res) => {
  const ok = await withResumes(async (meta) => {
    if (!meta.history.some((x) => x.id === req.params.id)) return false;
    await writeResumes({ ...meta, current: req.params.id });
    return true;
  });
  if (!ok) return res.status(404).json({ error: 'That version no longer exists.' });
  res.json({ ok: true });
});

// Admin: delete a version for good. Deleting the current one takes it off the site.
app.delete('/api/resume/history/:id', requireAdmin, async (req, res) => {
  const ok = await withResumes(async (meta) => {
    const v = meta.history.find((x) => x.id === req.params.id);
    if (!v) return false;
    await writeResumes({
      current: meta.current === v.id ? null : meta.current,
      history: meta.history.filter((x) => x.id !== v.id),
    });
    htmlCache.delete(v.id);
    await unlink(path.join(RESUME_DIR, v.file)).catch(() => {});
    return true;
  });
  if (!ok) return res.status(404).json({ error: 'That version no longer exists.' });
  res.json({ ok: true });
});

// Too-large uploads: give a friendly message instead of Express's default HTML error.
app.use((err, _req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'File is too large (maximum 5 MB).' });
  next(err);
});

// Serve the built React app (after `npm run build`).
const dist = path.join(root, 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(ADMIN_PASSWORD ? 'Admin portal enabled' : 'Admin portal disabled: set ADMIN_PASSWORD in .env to enable it');
});
