// Express API for the portfolio, shared by the local server (server/index.js) and Vercel (api/index.js).
// - GET/PUT /api/experience serve and update the Experience tab (PUT needs admin login).
// - GET /api/resume downloads the current resume; admins upload new versions and manage history.
import express from 'express';
import cors from 'cors';
import mammoth from 'mammoth';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { randomBytes, timingSafeEqual, createHash, createHmac } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorage, Conflict } from './storage.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {
  ALLOWED_ORIGIN, // e.g. https://your-username.github.io when the site is hosted separately
  ADMIN_PASSWORD, // password for the admin portal (#admin); admin is disabled when unset
} = process.env;

const storage = createStorage(root);
export const storageKind = storage.kind;

const app = express();
export default app;
if (process.env.VERCEL) app.set('trust proxy', true); // so req.ip is the visitor, not Vercel's proxy

// Small JSON limit for most routes; saving experience has its own larger limit below.
const smallJson = express.json({ limit: '20kb' });
app.use((req, res, next) => (req.path === '/api/experience' ? next() : smallJson(req, res, next)));
if (ALLOWED_ORIGIN) app.use('/api', cors({ origin: ALLOWED_ORIGIN.split(',').map((s) => s.trim()) }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Simple in-memory rate limit: `max` requests per IP per 15 minutes, tracked per bucket.
// (On Vercel each server instance keeps its own count, so this is a best-effort brake.)
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
// Logging in with ADMIN_PASSWORD returns a signed token valid for 8 hours: "<expiry>.<signature>".
// It's signed with a key made from the password, so it works on any server instance, and
// changing the password logs everyone out.
const SESSION_MS = 8 * 60 * 60 * 1000;
const sha = (s) => createHash('sha256').update(String(s)).digest();
const signingKey = () => sha(`portfolio-admin-session:${ADMIN_PASSWORD}`);
const sign = (exp) => createHmac('sha256', signingKey()).update(String(exp)).digest('hex');
const loggedOut = new Set(); // best effort: tokens logged out on this instance

function checkToken(token) {
  const [exp, sig] = String(token).split('.');
  if (!ADMIN_PASSWORD || !exp || !sig || loggedOut.has(token)) return 'invalid';
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'invalid';
  return Number(exp) > Date.now() ? 'ok' : 'expired';
}

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin is turned off. Set ADMIN_PASSWORD on the server.' });
  if (tooMany('login', req.ip, 10)) return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  if (!timingSafeEqual(sha(req.body?.password ?? ''), sha(ADMIN_PASSWORD))) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  const exp = Date.now() + SESSION_MS;
  res.json({ token: `${exp}.${sign(exp)}` });
});

const bearer = (req) => (req.get('authorization') || '').replace(/^Bearer /, '');

app.post('/api/admin/logout', (req, res) => {
  loggedOut.add(bearer(req));
  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  const state = checkToken(bearer(req));
  if (state !== 'ok') {
    return res.status(401).json({ error: state === 'expired' ? 'Your login has expired. Please log in again.' : 'Please log in first.' });
  }
  next();
}

// ---------- Experience ----------
const BUNDLED_EXPERIENCE = path.join(root, 'src', 'data', 'experience.json');

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

// Saved copy if there is one, otherwise the copy that shipped with the site.
async function readExperience() {
  const saved = await storage.readJSON('experience');
  return saved ? saved.data : JSON.parse(await readFile(BUNDLED_EXPERIENCE, 'utf8'));
}

app.get('/api/experience', async (_req, res) => {
  try {
    res.json(await readExperience());
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
    await storage.writeJSON('experience', data);
    res.json({ ok: true, experience: data });
  } catch (err) {
    console.error('Failed to save experience:', err);
    res.status(500).json({ error: 'Could not save experience.' });
  }
});

// ---------- Resume ----------
// Every upload is kept as history. One of them is "current": that's the one the public
// site shows and downloads. Admins can switch the current version, take it off the site,
// or delete old versions. The admin uploads the raw file bytes, with the original name in
// the X-Filename header.
// Vercel limits request bodies to 4.5 MB, so uploads are capped at 4 MB everywhere.
const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const RESUME_TYPES = {
  '.pdf': { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [0x50, 0x4b] }, // zip
  '.doc': { mime: 'application/msword', magic: [0xd0, 0xcf, 0x11, 0xe0] },
};

// The list of versions: { current: id | null, history: [newest first] }.
async function readResumes() {
  const saved = await storage.readJSON('resume');
  const meta = saved?.data;
  return {
    meta: Array.isArray(meta?.history) ? meta : { current: null, history: [] },
    version: saved?.version ?? null,
  };
}

// Apply a change to the version list. Changes run one at a time on this server, and on
// Vercel a change made elsewhere in between is detected and the change is retried.
let resumeQueue = Promise.resolve();
function withResumes(fn) {
  const run = resumeQueue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      const { meta, version } = await readResumes();
      const { next, result } = await fn(meta);
      if (!next) return result;
      try {
        await storage.writeJSON('resume', next, version);
        return result;
      } catch (err) {
        if (!(err instanceof Conflict) || attempt >= 2) throw err;
      }
    }
  });
  resumeQueue = run.catch(() => {});
  return run;
}

// Shown on the site whenever no uploaded resume is current (e.g. before the first upload).
const DEFAULT_RESUME = path.join(root, 'server', 'default-resume.pdf');
const placeholder = () => (existsSync(DEFAULT_RESUME)
  ? { placeholder: true, name: 'Resume.pdf', mime: 'application/pdf', size: statSync(DEFAULT_RESUME).size, path: DEFAULT_RESUME }
  : null);

const publicInfo = (v) => ({ id: v.id, name: v.name, size: v.size, uploadedAt: v.uploadedAt, placeholder: v.placeholder || undefined });
const currentResume = (meta) => meta.history.find((v) => v.id === meta.current) || placeholder();

async function sendResume(res, v) {
  const data = v.path ? await readFile(v.path) : await storage.readFile(v.file);
  if (!data) return res.status(404).json({ error: 'The resume file is missing.' });
  res.attachment(v.name);
  res.type(v.mime);
  res.send(data);
}

const fail = (res, what) => (err) => {
  console.error(`Failed to ${what}:`, err);
  if (!res.headersSent) res.status(500).json({ error: `Could not ${what}.` });
};

// Public: the current resume.
app.get('/api/resume/info', async (_req, res) => {
  try {
    const v = currentResume((await readResumes()).meta);
    if (!v) return res.status(404).json({ error: 'No resume uploaded yet.' });
    res.json(publicInfo(v));
  } catch (err) { fail(res, 'load the resume')(err); }
});

app.get('/api/resume', async (_req, res) => {
  try {
    const v = currentResume((await readResumes()).meta);
    if (!v) return res.status(404).json({ error: 'No resume uploaded yet.' });
    await sendResume(res, v);
  } catch (err) { fail(res, 'load the resume')(err); }
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
  .replace(/\t+/g, '<span class="doc-tab"></span>') // Word tab stops (e.g. "Job title    Dates")
  // "Left <tab>|<tab> Right" lines (e.g. "Email: …  |  Mobile: …"): show the two parts at opposite edges.
  .replace(/<p>((?:(?!<\/?p>)[\s\S])*?)\s*(?:<span class="doc-tab"><\/span>\s*)+\|\s*(?:<span class="doc-tab"><\/span>\s*)+((?:(?!<\/?p>)[\s\S])*?)<\/p>/g,
    (_m, left, right) => `<p class="doc-split"><span>${left.trim()}</span><span>${right.trim()}</span></p>`);
const DOCX_STYLES = ["p[style-name='List Paragraph'] => ul > li:fresh"];

app.get('/api/resume/content', async (_req, res) => {
  try {
    const v = currentResume((await readResumes()).meta);
    if (!v) return res.status(404).json({ error: 'No resume uploaded yet.' });
    if (!v.file?.endsWith('.docx')) return res.status(415).json({ error: 'Only Word (.docx) resumes can be shown as a page.' });
    if (!htmlCache.has(v.id)) {
      const buffer = await storage.readFile(v.file);
      if (!buffer) return res.status(404).json({ error: 'The resume file is missing.' });
      const { value } = await mammoth.convertToHtml({ buffer }, { styleMap: DOCX_STYLES });
      htmlCache.set(v.id, safeHtml(value));
    }
    res.json({ id: v.id, html: htmlCache.get(v.id) });
  } catch (err) { fail(res, 'read the Word file')(err); }
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
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    const v = { id, file: `${id}${ext}`, name, mime: type.mime, size: body.length, uploadedAt: new Date().toISOString() };
    await storage.writeFile(v.file, body, type.mime);
    await withResumes((meta) => ({ next: { current: id, history: [v, ...meta.history] } }));
    res.json({ ok: true, ...publicInfo(v) });
  } catch (err) { fail(res, 'save the resume')(err); }
});

// Admin: take the resume off the site (the file stays in history).
app.delete('/api/resume', requireAdmin, async (_req, res) => {
  try {
    await withResumes((meta) => ({ next: { ...meta, current: null } }));
    res.json({ ok: true });
  } catch (err) { fail(res, 'update the resume')(err); }
});

// Admin: list every uploaded version, newest first.
app.get('/api/resume/history', requireAdmin, async (_req, res) => {
  try {
    const { meta } = await readResumes();
    res.json({ current: meta.current, history: meta.history.map(publicInfo) });
  } catch (err) { fail(res, 'load the resume history')(err); }
});

// Admin: download any version.
app.get('/api/resume/history/:id', requireAdmin, async (req, res) => {
  try {
    const v = (await readResumes()).meta.history.find((x) => x.id === req.params.id);
    if (!v) return res.status(404).json({ error: 'That version no longer exists.' });
    await sendResume(res, v);
  } catch (err) { fail(res, 'load that version')(err); }
});

// Admin: make an older version the current one.
app.post('/api/resume/history/:id/restore', requireAdmin, async (req, res) => {
  try {
    const ok = await withResumes((meta) => (meta.history.some((x) => x.id === req.params.id)
      ? { next: { ...meta, current: req.params.id }, result: true }
      : { result: false }));
    if (!ok) return res.status(404).json({ error: 'That version no longer exists.' });
    res.json({ ok: true });
  } catch (err) { fail(res, 'update the resume')(err); }
});

// Admin: delete a version for good. Deleting the current one takes it off the site.
app.delete('/api/resume/history/:id', requireAdmin, async (req, res) => {
  try {
    const v = await withResumes((meta) => {
      const found = meta.history.find((x) => x.id === req.params.id);
      if (!found) return { result: null };
      return {
        next: { current: meta.current === found.id ? null : meta.current, history: meta.history.filter((x) => x.id !== found.id) },
        result: found,
      };
    });
    if (!v) return res.status(404).json({ error: 'That version no longer exists.' });
    htmlCache.delete(v.id);
    await storage.deleteFile(v.file);
    res.json({ ok: true });
  } catch (err) { fail(res, 'delete that version')(err); }
});

// Too-large uploads: give a friendly message instead of Express's default HTML error.
app.use((err, _req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'File is too large (maximum 4 MB).' });
  next(err);
});
