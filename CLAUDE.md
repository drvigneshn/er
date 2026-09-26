# Pediatric ER Companion — project context

Weight-based paediatric ER protocols and doses (status epilepticus, anaphylaxis, DKA, septic
and dengue shock, snake bite, scorpion, OP, asthma, dehydration/SAM, resus card, SVT, croup,
bronchiolitis, hyperkalaemia, hypoglycaemia). Plain HTML/CSS/JS, no build step.
Sister app of Code Blue Companion (`drvigneshn/cbc`, https://cbc.pediaos.com).

## Hosting
- **Live at:** https://er.pediaos.com — GitHub Pages from the `main` branch, root folder.
- `CNAME` holds the domain; DNS is a CNAME at Hostinger (`er` → `drvigneshn.github.io`).
- Deploy = commit and push to `main`. Always `git fetch` first; never clobber newer work.

## Files
- `index.html` — the whole app. Protocol data is the `P` array, references `REFS`, home
  groups `G`, search keywords `KW`. Saves weight/pins/theme to `localStorage` key `perc`.
- `sw.js` — offline service worker. `manifest.webmanifest` + icons — installable PWA.

## Versioning (every change)
Bump both, kept in sync: the footer `<span class="vbadge">vX.Y.Z</span>` in `index.html`, and
`const CACHE = 'perc-vX.Y.Z'` in `sw.js` (this is what pushes updates to returning users).
Small change → patch; new protocol/feature → minor.

## Clinical content
Doses and protocols are the author's (Dr Vignesh N, paediatrician). Don't change a dose,
maximum or protocol step unless asked; flag suspected errors instead.

## Testing
No test suite. Extract the last `<script>` from `index.html` and run `node --check` on it;
load the page in Chromium (Playwright) and check for page errors.
