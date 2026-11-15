'use strict';

/*
 * Verifies the social/SEO meta tags on every HTML page and the images they point to.
 *
 *   node scripts/check-meta.js
 *
 * Checks, per page: all required tags present exactly once, absolute https URLs,
 * og:description 100-159 chars (LinkedIn warns under 100), matching meta description,
 * articles also need author, article:author and article:published_time, og:image file exists
 * in assets/og/, is a 1200x627 PNG and is under 1 MB. Exits non-zero on any failure.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://ivomfrazao.github.io';

const pages = [
  'index.html',
  'case-study.html',
  ...fs.readdirSync(path.join(ROOT, 'case-studies')).filter(f => f.endsWith('.html')).sort().map(f => `case-studies/${f}`),
];

const REQUIRED = [
  ['name', 'description'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:url'],
  ['property', 'og:type'],
  ['property', 'og:site_name'],
  ['name', 'twitter:card'],
];
const ABSOLUTE = [['property', 'og:image'], ['property', 'og:url'], ['name', 'twitter:image']];

function unesc(s) {
  return s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function metaValues(head, attr, key) {
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(':', '\\:')}"\\s+content="([^"]*)"`, 'g');
  return [...head.matchAll(re)].map(m => unesc(m[1]));
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
}

let failures = 0;
const fail = (page, msg) => { failures++; console.log(`  FAIL ${page}: ${msg}`); };

console.log('Page | og:title | og:image | author | published');
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const get  = (attr, key) => metaValues(head, attr, key);

  for (const [attr, key] of REQUIRED) {
    const n = get(attr, key).length;
    if (n !== 1) fail(page, `${key} appears ${n} times (expected 1)`);
  }
  for (const key of ['twitter:title', 'twitter:description', 'twitter:image', 'og:image:width', 'og:image:height']) {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    if (get(attr, key).length !== 1) fail(page, `${key} should appear exactly once`);
  }
  for (const [attr, key] of ABSOLUTE) {
    const v = get(attr, key)[0];
    if (!v || !v.startsWith(`${SITE}/`)) fail(page, `${key} is not an absolute ${SITE}/ URL: ${v}`);
  }

  const [title]  = get('property', 'og:title');
  const [desc]   = get('property', 'og:description');
  const [meta]   = get('name', 'description');
  const [image]  = get('property', 'og:image');
  const [url]    = get('property', 'og:url');
  const [type]   = get('property', 'og:type');
  const [card]   = get('name', 'twitter:card');

  if (desc && (desc.length >= 160 || desc.length < 100)) fail(page, `og:description is ${desc.length} chars (needs 100-159)`);
  if (meta !== desc)               fail(page, 'meta description differs from og:description');
  if (card !== 'summary_large_image') fail(page, `twitter:card is ${card}`);
  if (get('name', 'twitter:image')[0] !== image) fail(page, 'twitter:image differs from og:image');
  if (get('name', 'twitter:title')[0] !== title) fail(page, 'twitter:title differs from og:title');
  if (get('property', 'og:site_name')[0] !== 'Ivo Frazão') fail(page, 'og:site_name is not "Ivo Frazão"');

  const expectedType = page.startsWith('case-studies/') ? 'article' : 'website';
  if (type !== expectedType) fail(page, `og:type is ${type}, expected ${expectedType}`);

  const expectedUrl = page === 'index.html' ? `${SITE}/` : `${SITE}/${page}`;
  if (url !== expectedUrl) fail(page, `og:url is ${url}, expected ${expectedUrl}`);

  if (type === 'article') {
    const [author] = get('name', 'author');
    const [authorUrl] = get('property', 'article:author');
    const [published] = get('property', 'article:published_time');
    if (get('name', 'author').length !== 1 || !author) fail(page, 'missing or duplicate <meta name="author">');
    if (get('property', 'article:author').length !== 1 || !/^https:\/\//.test(authorUrl || '')) fail(page, 'article:author must appear once as an absolute https URL');
    if (get('property', 'article:published_time').length !== 1 || !/^\d{4}-\d{2}-\d{2}/.test(published || '') || isNaN(Date.parse(published))) fail(page, `article:published_time missing or invalid: ${published}`);
  }

  if (page.startsWith('case-studies/')) {
    const h1 = (html.match(/<h1 class="case-study-hero__title">([^<]*)<\/h1>/) || [])[1];
    if (h1 === undefined || unesc(h1) !== title) fail(page, `og:title "${title}" does not match page h1 "${h1}"`);
  }

  if (image) {
    const [imgPath, query = ''] = image.replace(`${SITE}/`, '').split('?');
    const rel = imgPath;
    const file = path.join(ROOT, rel);
    if (!rel.startsWith('assets/og/') || !rel.endsWith('.png')) fail(page, `og:image not under assets/og/ as .png: ${image}`);
    else if (!fs.existsSync(file)) fail(page, `og:image file missing: ${rel}`);
    else {
      const hash = require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
      if (query !== `v=${hash}`) fail(page, `og:image version is "${query}", expected "v=${hash}" (run: node build.js)`);
      const size = pngSize(file);
      if (!size) fail(page, `${rel} is not a PNG`);
      else {
        if (size.width !== 1200 || size.height !== 627) fail(page, `${rel} is ${size.width}x${size.height}, expected 1200x627`);
        if (size.bytes >= 1024 * 1024) fail(page, `${rel} is ${size.bytes} bytes (limit: under 1 MB)`);
      }
    }
  }

  console.log(`${page} | ${title} | ${image} | ${get('name', 'author')[0] ?? '-'} | ${get('property', 'article:published_time')[0] ?? '-'}`);
}

console.log(failures ? `\n${failures} problem(s) found.` : `\nAll ${pages.length} pages OK.`);
process.exit(failures ? 1 : 0);
