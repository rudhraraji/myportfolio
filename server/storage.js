// Where the server keeps uploaded resumes and saved data.
// - On your computer: plain files (server/uploads/ and src/data/experience.json).
// - On Vercel: Vercel Blob (a private store), because Vercel's own disk is wiped between requests.
//   Used automatically when BLOB_READ_WRITE_TOKEN is set (Vercel adds it when a Blob store is connected).
import { readFile as fsRead, writeFile as fsWrite, rename, copyFile, mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { put, get, del, BlobPreconditionFailedError } from '@vercel/blob';

export class Conflict extends Error {}

function localStorage(root) {
  const uploads = path.join(root, 'server', 'uploads');
  // Experience stays in src/data so a local build always has the latest saved copy.
  const jsonPath = (name) => (name === 'experience'
    ? path.join(root, 'src', 'data', 'experience.json')
    : path.join(uploads, `${name}.json`));
  const filePath = (key) => path.join(uploads, 'resumes', path.basename(key));

  async function atomicWrite(file, data) {
    await mkdir(path.dirname(file), { recursive: true });
    await fsWrite(`${file}.tmp`, data);
    await rename(`${file}.tmp`, file);
  }

  return {
    kind: 'local files',
    async readJSON(name) {
      try { return { data: JSON.parse(await fsRead(jsonPath(name), 'utf8')), version: null }; } catch { return null; }
    },
    async writeJSON(name, data) {
      const file = jsonPath(name);
      if (name === 'experience' && existsSync(file)) await copyFile(file, file.replace(/\.json$/, '.backup.json'));
      await atomicWrite(file, JSON.stringify(data, null, 2) + '\n');
    },
    async writeFile(key, buffer) { await atomicWrite(filePath(key), buffer); },
    async readFile(key) { try { return await fsRead(filePath(key)); } catch { return null; } },
    async deleteFile(key) { await unlink(filePath(key)).catch(() => {}); },
  };
}

function blobStorage() {
  const opts = { access: 'private' };
  const jsonKey = (name) => `data/${name}.json`;
  const fileKey = (key) => `resumes/${path.basename(key)}`;

  async function read(key) {
    const res = await get(key, { ...opts, useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return { buffer: Buffer.from(await new Response(res.stream).arrayBuffer()), etag: res.blob.etag };
  }

  return {
    kind: 'Vercel Blob',
    async readJSON(name) {
      const r = await read(jsonKey(name));
      return r ? { data: JSON.parse(r.buffer.toString('utf8')), version: r.etag } : null;
    },
    // `version` (from readJSON) makes the write fail with Conflict if someone saved in between.
    async writeJSON(name, data, version) {
      try {
        await put(jsonKey(name), JSON.stringify(data, null, 2), {
          ...opts, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
          cacheControlMaxAge: 60, ...(version ? { ifMatch: version } : {}),
        });
      } catch (err) {
        if (err instanceof BlobPreconditionFailedError) throw new Conflict('Changed by someone else.');
        throw err;
      }
    },
    async writeFile(key, buffer, contentType) {
      await put(fileKey(key), buffer, { ...opts, contentType, addRandomSuffix: false, allowOverwrite: true });
    },
    async readFile(key) { return (await read(fileKey(key)))?.buffer ?? null; },
    async deleteFile(key) { await del(fileKey(key)).catch(() => {}); },
  };
}

export const createStorage = (root) => (process.env.BLOB_READ_WRITE_TOKEN ? blobStorage() : localStorage(root));
