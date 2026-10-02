# Pediatric ER Companion — project context

Weight-based paediatric ER protocols and doses (status epilepticus, anaphylaxis, DKA, septic
and dengue shock, snake bite, scorpion, OP, asthma, dehydration/SAM, resus card, SVT, croup,
bronchiolitis, hyperkalaemia, hypoglycaemia). Plain HTML/CSS/JS, no build step.
Sister app of Code Blue Companion (`drvigneshn/cbc`, https://cbc.pediaos.com).

## Hosting
- **Live at:** https://er.pediaos.com — GitHub Pages from the `main` branch, root folder.
- `CNAME` holds the domain; DNS is a CNAME at Hostinger (`er` → `drvigneshn.github.io`).
- The old address cbc.pediaos.com/er/ redirects here (handled in the `drvigneshn/cbc` repo, `er/`).
- Deploy = commit and push to `main`. Always `git fetch` first; never clobber newer work.

## Files
- `index.html` — the whole app. Protocol data is the `P` array, references `REFS`, home
  groups `G`, search keywords `KW`. Saves weight/est flag/pins/theme/layout/text size to
  `localStorage` key `perc` (read again by a tiny script in `<head>` to avoid a theme flash).
- `sw.js` — offline service worker. `manifest.webmanifest` + icons — installable PWA.

## UI (v1.1+)
- Look = "Clinical Slate": Inter, white/slate, one blue accent (#1D4ED8), red only for danger,
  amber for "estimated/verify". Themes via `data-app-theme` = `day` / `night` / `bright` on
  `<html>`; style only through the CSS variables so all three work. CSS is in `rem`, so the
  text sizer (`--ts`, 85–135%) scales everything.
- Disclaimer gate `#gate` shows once per browser session, i.e. on every app launch
  (`sessionStorage percAck`); footer "Read the disclaimer" reopens it. It must fit one phone
  screen without scrolling. The Medshark award belongs to Code Blue Companion — don't show it here.
- `about.html` and `privacy.html` are linked from the footer; keep the privacy page accurate
  (no accounts/analytics; localStorage only; Google Fonts; browser speech recognition).
- Top bar: logo + name + version | weight + age (age select sets an *estimated* weight and
  flags it) | voice, colour-mode, Aa (text size + layout panel `#disp`).
- Layouts: Auto / Mobile / Tablet (list beside protocol) / Landscape (also 2-column phases).
- Weight checks: outside 0.5–150 kg is rejected; <2 or >100 kg shows "verify".

## Versioning (every change)
Bump all together: every `vX.Y.Z` in `index.html` (top bar, disclaimer gate, footer —
`grep -n 'v1\.' index.html`), the badge in `about.html`, and `const CACHE = 'perc-vX.Y.Z'` in
`sw.js` (this is what pushes updates to returning users). Small change → patch; new
protocol/feature → minor.

## Preview → live workflow (new clinical content)
- New protocols, drugs or scores go into `preview.html` first (a full copy of the app with
  `const PREVIEW = true`, a review banner, "New" markers and `noindex`). The author reviews it
  at https://er.pediaos.com/preview.html. `sw.js` never caches `preview.html`.
- Go live only when the author approves: copy `preview.html` → `index.html`, set
  `PREVIEW = false`, remove the `.pvbanner` div and the `robots` meta, then bump versions.
- In v1.2 the new data sits after the original `KW` block: `NEWP` (new protocol ids),
  `DRUGS` / `DCLS` (drug library; `forms` give strengths so volumes are computed when a
  use's unit matches), `SCORES` (scores need every item answered before a result shows;
  `calc` entries are calculators/reference), `LUND`, `VITALS`.
- When a drug appears in both a protocol and the library, the doses must match.

## Clinical content
Doses and protocols are the author's (Dr Vignesh N, paediatrician). Don't change a dose,
maximum or protocol step unless asked; flag suspected errors instead.

## Testing
No test suite. Extract the last `<script>` from `index.html` and run `node --check` on it;
load the page in Chromium (Playwright) and check for page errors.
