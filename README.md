# ivomfrazao.github.io

Personal portfolio and CV site. Built with plain HTML, CSS, and vanilla JS. Content is pre-rendered at build time for SEO, with JavaScript enhancing for interactivity.

## Running locally

The site fetches `data/cv.json` at runtime, so it must be served over HTTP (opening `index.html` directly in the browser won't work due to CORS restrictions on `file://`).

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Any port works — `8000` is just a convention.

## Adding content

All content lives in two places:

- **`data/cv.json`** — companies, roles, projects, education, certifications, and side projects
- **`case-studies/*.md`** — one Markdown file per case study

To add a case study, create `case-studies/your-slug.md` and set `"caseStudySlug": "your-slug"` on the project in `cv.json`.

After any content change, run the build step before committing (see below).

## CSS and JS structure

All styles live in a single `css/style.css`, segmented by section comments. All JavaScript for the main page lives in `js/app.js`, also segmented. The case study page has its own `js/case-study-loader.js`.

The consolidation was done to reduce HTTP round-trips — six CSS requests and six JS module requests on the main page each carry significant overhead on GitHub Pages, which shows up in Lighthouse.

When editing styles or logic, work in `css/style.css` and `js/app.js` respectively.

## Build step

`build.js` is a zero-dependency Node.js script that pre-renders content into `index.html` and generates a static `case-studies/{slug}.html` per Markdown file. Run it before every commit:

```bash
node build.js
```

The script reads `data/cv.json` and `case-studies/*.md`, then injects pre-rendered HTML between `<!-- BUILD_START/END -->` markers in `index.html`. Running it multiple times is safe — it is idempotent.

This ensures crawlers (Bing, social media unfurlers, Google's first-pass indexing) see fully populated HTML rather than empty JS placeholders.

## Deploying

Run `node build.js`, then push to the `main` branch. GitHub Pages serves the files directly.
