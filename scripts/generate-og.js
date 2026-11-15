'use strict';

/*
 * Generates the 1200x627 Open Graph preview images in assets/og/.
 *
 *   npm install      (once; installs @resvg/resvg-js, a dev-only dependency)
 *   npm run og       (or: node scripts/generate-og.js)
 *
 * One SVG template (cardSvg) is rendered to PNG for every page:
 *   - index.png          from data/cv.json (profile name + tagline)
 *   - <slug>.png         for each case-studies/<slug>.md (title + first tags)
 *   - case-study.png     for the legacy case-study.html shell
 *
 * To add a page: add the case study .md (see README), then re-run this script.
 * Colours and font mirror css/style.css (dark theme tokens, Inter).
 * Fonts live in scripts/fonts (Inter, SIL OFL 1.1) so output is reproducible.
 */

const fs   = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { parseFrontMatter } = require('../build.js');

const ROOT    = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'og');
const FONTS   = ['Inter_400Regular.ttf', 'Inter_600SemiBold.ttf', 'Inter_700Bold.ttf']
  .map(f => path.join(__dirname, 'fonts', f));

const W = 1200;
const H = 627;

/* Tokens from css/style.css (:root, dark theme) */
const C = {
  bg:        '#0e0e0e',
  surface:   '#161616',
  border:    '#262626',
  text:      '#f0f0f0',
  secondary: '#8a8a8a',
  accent:    '#60a5fa',
};

/*
 * Sizes are chosen so the card stays legible when LinkedIn shrinks it to
 * ~480px wide (scale 0.4): nothing below ~30px on the 1200px canvas, and the
 * lighter text is brightened rather than using the dim secondary grey.
 */
const PAD_X     = 80;
const MAX_TEXT  = W - PAD_X * 2;
const TITLE_PX  = 96;
const TITLE_LH  = 106;
const MAX_LINES = 2;
const SUB_PX    = 42;
const SUB_MIN   = 32;

const FONT_OPTS = {
  fontFiles: FONTS,
  loadSystemFonts: false,
  defaultFontFamily: 'Inter',
};

function xmlEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Text width in px, measured by resvg itself so wrapping matches the render. */
function measure(text, px, weight) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200">` +
    `<text x="0" y="100" font-family="Inter" font-size="${px}" font-weight="${weight}">${xmlEsc(text)}</text></svg>`;
  const bbox = new Resvg(svg, { font: FONT_OPTS }).getBBox();
  return bbox ? bbox.width : 0;
}

function wrap(text, px, weight, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, px, weight) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* Shrinks a single line until it fits (used for the subtitle). */
function fit(text, px, weight, maxWidth, minPx) {
  let size = px;
  while (size > minPx && measure(text, size, weight) > maxWidth) size -= 1;
  return size;
}

function cardSvg({ label, title, subtitle, name, role }) {
  const titleLines = wrap(title, TITLE_PX, 700, MAX_TEXT);
  if (titleLines.length > MAX_LINES) {
    throw new Error(`Title too long for the card (${titleLines.length} lines, max ${MAX_LINES}): "${title}"`);
  }

  const firstBaseline = 232;
  const titleSvg = titleLines
    .map((l, i) => `<text x="${PAD_X}" y="${firstBaseline + i * TITLE_LH}" font-size="${TITLE_PX}" font-weight="700" fill="${C.text}" letter-spacing="-2">${xmlEsc(l)}</text>`)
    .join('\n  ');
  const subY  = firstBaseline + (titleLines.length - 1) * TITLE_LH + 70;
  const subPx = fit(subtitle, SUB_PX, 400, MAX_TEXT, SUB_MIN);
  if (measure(subtitle, subPx, 400) > MAX_TEXT) {
    throw new Error(`Subtitle too long for the card: "${subtitle}"`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="16" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
  <rect x="24" y="24" width="8" height="${H - 48}" rx="4" fill="${C.accent}"/>

  <text x="${PAD_X}" y="112" font-size="30" font-weight="600" fill="${C.accent}" letter-spacing="5">${xmlEsc(label.toUpperCase())}</text>

  ${titleSvg}
  <text x="${PAD_X}" y="${subY}" font-size="${subPx}" font-weight="400" fill="${C.text}" fill-opacity="0.72">${xmlEsc(subtitle)}</text>

  <line x1="${PAD_X}" y1="${H - 140}" x2="${W - PAD_X}" y2="${H - 140}" stroke="#333333" stroke-width="2"/>
  <text x="${PAD_X}" y="${H - 66}" font-size="44" font-weight="600" fill="${C.text}">${xmlEsc(name)}</text>
  ${role ? `<text x="${W - PAD_X}" y="${H - 66}" font-size="32" font-weight="400" fill="${C.text}" fill-opacity="0.72" text-anchor="end">${xmlEsc(role)}</text>` : ''}
</svg>`;
}

/* ── Page list ─────────────────────────────────────────────────── */

function loadPages() {
  const cv   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cv.json'), 'utf8'));
  const base = { name: cv.profile.name, role: 'Backend & Identity Engineer' };

  const pages = [{
    file: 'index',
    ...base,
    name: 'ivomfrazao.github.io',   // the title is already the name, so the footer shows the address
    role: '',
    label: 'Portfolio',
    title: cv.profile.name,
    subtitle: cv.profile.tagline,
  }];

  const csDir = path.join(ROOT, 'case-studies');
  for (const f of fs.readdirSync(csDir).filter(f => f.endsWith('.md')).sort()) {
    const slug = path.basename(f, '.md');
    const { fm } = parseFrontMatter(fs.readFileSync(path.join(csDir, f), 'utf8'));
    if (!fm.title) throw new Error(`${f}: missing title in front matter`);
    const tags = Array.isArray(fm.tags) ? fm.tags.slice(0, 3) : [];
    pages.push({
      file: slug,
      ...base,
      label: 'Case study',
      title: fm.title,
      subtitle: tags.length ? tags.join(' · ') : 'Case study',
    });
  }

  pages.push({
    file: 'case-study',
    ...base,
    label: 'Case study',
    title: 'Case Study',
    subtitle: 'Project write-ups',
  });

  return pages;
}

/* ── Main ──────────────────────────────────────────────────────── */

function main() {
  for (const f of FONTS) {
    if (!fs.existsSync(f)) throw new Error(`Missing font file: ${f}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const page of loadPages()) {
    const png = new Resvg(cardSvg(page), {
      font: FONT_OPTS,
      fitTo: { mode: 'width', value: W },
    }).render().asPng();
    const out = path.join(OUT_DIR, `${page.file}.png`);
    fs.writeFileSync(out, png);
    console.log(`  assets/og/${page.file}.png  ${(png.length / 1024).toFixed(0)} KB  "${page.title}"`);
  }
}

if (require.main === module) main();

module.exports = { cardSvg, loadPages, FONT_OPTS, W };
