# Raji Rudhrakumar — Portfolio (React)

React + Vite rebuild of the original Ruby on Rails portfolio
(`rudhraraji/myportfolio`). Same sections and look — Know Me, Skills,
Education, Experience, Portfolio — with jQuery/Bootstrap replaced by React
components and plain CSS.

## Run locally

```bash
npm install
npm run dev
```

## Contact

The Contact page provides a tap-to-call link and does not collect or deliver messages.

## Admin portal (edit the Experience tab)

1. Add `ADMIN_PASSWORD=...` to `.env` and restart `npm run server`.
2. Open the site at `#admin` (e.g. http://localhost:5173/#admin) and log in.
3. Add, edit, reorder or delete jobs and their clients/projects, then click **Save changes**.

Experience is stored in `src/data/experience.json`. The server updates that file on
save (keeping the previous version in `experience.backup.json`), and the Experience tab
loads it live from `/api/experience`. A static build (GitHub Pages) shows the copy
from the last build, so rebuild/redeploy after editing if the site is hosted that way.

Production (one Node host such as Render or Railway): `npm install && npm run build`,
then `npm start` serves both the site and the API. If the site stays on GitHub
Pages instead, host the server separately, build with
`VITE_API_URL=https://your-server.example.com`, and set `ALLOWED_ORIGIN` on the server.

## Build

```bash
npm run build   # outputs static files to dist/
```

## CI/CD: GitLab → Vercel

`.gitlab-ci.yml` runs on GitLab (https://gitlab.com/rudhraraji/myportfolio):

- every push and merge request builds the site;
- merge requests get a Vercel preview deploy;
- pushes to `master` deploy to production (https://rajirudhrakumar.vercel.app).

To deploy, push to GitHub: `.github/workflows/mirror-to-gitlab.yml` copies `master`
to GitLab, and GitLab's pipeline deploys it. (Pushing to GitLab directly also deploys.)
The GitHub workflow needs the repository secret `GITLAB_TOKEN` (a GitLab personal access
token with `write_repository`); the GitLab pipeline needs the CI/CD variables
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

## Deploy to GitHub Pages

```bash
npm run deploy  # builds and pushes dist/ to the gh-pages branch
```

Then in the repo: Settings → Pages → Source: `gh-pages` branch.
Netlify / Vercel also work: build command `npm run build`, output `dist`.

## Editing content

All text, skills, jobs and projects live in `src/data/portfolio.js`.
Images are in `src/assets/`.

## Structure

```
src/
  data/portfolio.js      content
  components/            Sidebar, Navbar (round tabs), SkillBar, CircleChart, Icons
  pages/                 Home, Skills, Education, Experience, Portfolio
  router.js              tiny hash router (#/skills etc.) — no server config needed
  styles.css
```
