// Talks to the Node server. In dev, Vite forwards /api to it. If the site is hosted
// separately from the server (e.g. GitHub Pages), set VITE_API_URL to the server's address.
const API = import.meta.env.VITE_API_URL || '';

// Direct link for downloading the resume.
export const RESUME_URL = `${API}/api/resume`;

// Downloads a file that needs admin login (a plain link can't send the login token).
export async function downloadFile(path, filename, token) {
  let res;
  try {
    res = await fetch(`${API}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error("Couldn't reach the server. Is it running (npm run server)?");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Download failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Sends a file's raw bytes (used for the resume upload).
export async function uploadFile(path, file, token) {
  let res;
  try {
    res = await fetch(`${API}/api${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(file.name),
      },
      body: file,
    });
  } catch {
    throw new Error("Couldn't reach the server. Is it running (npm run server)?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Upload failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    const err = new Error("Couldn't reach the server. Is it running (npm run server)?");
    err.offline = true;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}
