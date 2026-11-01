// Runs the portfolio server on your computer (npm run server / npm start).
// The API itself lives in app.js, which Vercel also uses (see api/index.js).
// After `npm run build` this also serves the built React site from dist/.
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import app, { root, storageKind } from './app.js';

const PORT = Number(process.env.PORT) || 3001;

const dist = path.join(root, 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Saving uploads and edits to: ${storageKind}`);
  console.log(process.env.ADMIN_PASSWORD ? 'Admin portal enabled' : 'Admin portal disabled: set ADMIN_PASSWORD in .env to enable it');
});
