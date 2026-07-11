# Financial Plan — deploy to GitHub Pages

This is a standalone version of your planner: no build step, no npm install.
It's plain HTML/JS that loads React, Recharts, and the icons straight from a
CDN in the browser, and saves your data in `localStorage` on your phone —
nothing is sent to any server.

## 1. Push it to GitHub

1. Create a new repository on GitHub (public or private both work with Pages
   on a paid plan; public is required on the free plan).
2. Upload every file in this folder (`index.html`, `app.js`, `manifest.json`,
   `sw.js`, `icons/`) to the **root** of that repo — keep the `icons/` folder
   structure as-is.
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source: Deploy from a branch**, branch
   `main`, folder `/ (root)`. Save.
5. GitHub gives you a URL like `https://<your-username>.github.io/<repo-name>/`
   — it can take a minute or two to go live the first time.

## 2. Install it on your iPhone

1. Open that URL in **Safari** (has to be Safari, not Chrome — only Safari
   can add a home-screen web app on iOS).
2. Tap the Share icon → **Add to Home Screen** → Add.
3. Open it from the home screen icon from now on. It launches full-screen,
   no browser bar, and works offline after the first load.

## How your data is stored

Your plan is saved in the browser's `localStorage`, scoped to that exact
URL. A few things worth knowing:

- **It persists across sessions** — closing the app, restarting your phone,
  etc. all leave it intact.
- **Installed home-screen apps get more durable storage than a regular
  Safari tab.** Regular Safari tabs are subject to Apple's "Intelligent
  Tracking Prevention," which can clear site data after 7 days of not
  visiting a site in the browser. Once you've used **Add to Home Screen**,
  the app runs in a separate storage context that isn't subject to that
  7-day eviction — this is how iOS home-screen web apps are documented to
  behave. It is not, however, an ironclad guarantee against every scenario
  (e.g. you manually clear Safari's data, a major iOS update, or you delete
  and re-add the icon) — see the backup note below.
- **Uninstalling the home-screen icon does not necessarily delete the data**
  (it stays until Safari's storage is cleared some other way) — but don't
  rely on that either.

**Because of that last point, use the Export/Import backup buttons at the
bottom of the app** every so often (I added these specifically for this
deployment). Export saves a `.json` file of your entire plan — email it to
yourself, save it to Files/iCloud, whatever. Import loads one back in. Treat
it the way you'd treat a backup of anything else you don't want to lose.

## Updating the app later

If you come back to me for more changes, I'll hand you an updated `app.js`
(and possibly `index.html`/`sw.js`). Replace those files in the repo (same
paths), commit, and GitHub Pages redeploys automatically in a minute or two.
One thing to do every time: bump the `CACHE_NAME` version string at the top
of `sw.js` (e.g. `fin-plan-v1` → `fin-plan-v2`) — otherwise the service
worker may keep serving the old cached version for a while on your phone.

## One honest caveat

This environment has no live internet access, so I compiled and
syntax-checked everything locally but could not load the actual page in a
real browser against the live CDN. The one part I couldn't verify end-to-end
is whether the exact CDN versions (React, Recharts, Lucide icons via
esm.sh) resolve cleanly together at runtime. If something looks broken after
you deploy it — most likely the charts or icons not rendering — open Safari's
Web Inspector (or Chrome desktop first, easier to debug) and check the
console for errors, then send me what you see and I'll fix the specific CDN
reference.
