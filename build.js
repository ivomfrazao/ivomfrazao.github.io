'use strict';

const fs   = require('fs');
const path = require('path');

/* ── DATE UTILS (mirrored from app.js) ────────────────────────────── */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(s) {
  const [y, m] = s.split('-');
  return m ? `${MONTHS[+m - 1]} ${y}` : y;
}

function formatDateRange(start, end) {
  return `${formatDate(start)} – ${end ? formatDate(end) : 'Present'}`;
}

function formatCompanyYears(start, end) {
  const sy = start.split('-')[0];
  const ey = end ? end.split('-')[0] : 'Present';
  return sy === ey ? sy : `${sy} – ${ey}`;
}

/* ── HTML / MARKDOWN UTILS ───────────────────────────────────────── */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;
  let paraLines = [];

  function flushPara() {
    if (paraLines.length) {
      out.push(`<p>${inline(paraLines.join(' '))}</p>`);
      paraLines = [];
    }
  }
  function flushList() {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^### /.test(line)) {
      flushPara(); flushList();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (/^## /.test(line)) {
      flushPara(); flushList();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (/^# /.test(line)) {
      flushPara(); flushList();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (/^[-*] /.test(line)) {
      flushPara();
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      flushPara();
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`);
    } else if (line === '' || line === '---') {
      flushPara(); flushList();
    } else {
      if (inUl || inOl) flushList();
      paraLines.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join('\n');
}

/* ── INJECT HELPERS ──────────────────────────────────────────────── */

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inject(html, id, content) {
  const s = `<!-- BUILD_START:${id} -->`;
  const e = `<!-- BUILD_END:${id} -->`;
  return html.replace(
    new RegExp(`${escRe(s)}[\\s\\S]*?${escRe(e)}`),
    `${s}${content}${e}`
  );
}

function setSectionVisible(html, className, visible) {
  return html.replace(
    new RegExp(`(<section[^>]*?class="${escRe(className)}"[^>]*?)(?:\\s*style="[^"]*")?([^>]*>)`, 'g'),
    visible ? '$1$2' : '$1 style="display:none"$2'
  );
}

/* ── PROFILE LINKS ───────────────────────────────────────────────── */

const ICONS = {
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  github:   '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  email:    '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>',
};

function renderProfileLinks(profile) {
  const defs = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'github',   label: 'GitHub'   },
    { key: 'email',    label: 'Email'    },
  ];
  return defs.map(({ key, label }) => {
    const val = profile.links?.[key];
    if (!val) return '';
    const href   = key === 'email' ? `mailto:${val}` : val;
    const target = key !== 'email' ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="profile-link" href="${esc(href)}"${target} aria-label="${esc(label)}"><span>${esc(label)}</span>${ICONS[key]}</a>`;
  }).join('');
}

/* ── PROJECT CARDS ───────────────────────────────────────────────── */

function makeTag(text) {
  return `<span class="tag">${esc(text)}</span>`;
}

function renderFeaturedCard(p) {
  const cta = p.caseStudySlug
    ? { href: `case-studies/${p.caseStudySlug}.html`, label: 'Read case study →', external: false }
    : p.url
      ? { href: p.url, label: 'View project →', external: true }
      : { href: `#${p.id}`, label: 'See in timeline ↓', external: false };

  const targetAttr = cta.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const tags       = (p.tags ?? []).slice(0, 4).map(makeTag).join('');
  const tagsHtml   = tags ? `<div class="featured-card__tags">${tags}</div>` : '';

  return (
    `<a class="featured-card" href="${esc(cta.href)}"${targetAttr}>` +
    `<h3 class="featured-card__title">${esc(p.title)}</h3>` +
    `<div class="featured-card__footer">${tagsHtml}` +
    `<span class="featured-card__cta">${cta.label}</span></div></a>`
  );
}

function renderProjectCard(p) {
  const badgeHtml   = p.type === 'flagship'
    ? '<span class="project-card__badge">★ Flagship</span>' : '';
  const taglineHtml = p.tagline
    ? `<p class="project-card__tagline">${esc(p.tagline)}</p>` : '';
  const tags        = (p.tags ?? []).slice(0, 4).map(makeTag).join('');
  const tagsHtml    = tags ? `<div class="project-card__tags">${tags}</div>` : '';
  const linkHtml    = p.caseStudySlug
    ? `<a class="project-card__link" href="case-studies/${esc(p.caseStudySlug)}.html">View case study →</a>` : '';
  const footerHtml  = (tagsHtml || linkHtml)
    ? `<div class="project-card__footer">${tagsHtml}${linkHtml}</div>` : '';

  return (
    `<div class="project-card project-card--${esc(p.type)}" id="${esc(p.id)}">` +
    `<div class="project-card__top">` +
    `<span class="project-card__title">${esc(p.title)}</span>${badgeHtml}</div>` +
    `${taglineHtml}${footerHtml}</div>`
  );
}

/* ── TIMELINE ────────────────────────────────────────────────────── */

function renderRoleBlock(role) {
  const header = (
    `<div class="role-block__header">` +
    `<span class="role-title">${esc(role.title)}</span>` +
    `<span class="role-dates">${esc(formatDateRange(role.dateStart, role.dateEnd))}</span>` +
    `</div>`
  );
  const summary = role.summary
    ? `<p class="role-summary">${esc(role.summary)}</p>` : '';

  const sorted = [...(role.projects ?? [])].sort((a, b) =>
    a.type === 'flagship' && b.type !== 'flagship' ? -1 :
    a.type !== 'flagship' && b.type === 'flagship' ?  1 : 0
  );
  const projectsHtml = sorted.length
    ? `<div class="role-projects">${sorted.map(renderProjectCard).join('')}</div>` : '';

  return `<div class="role-block" data-role="${esc(role.id)}">${header}${summary}${projectsHtml}</div>`;
}

function renderCompanyBlock(company, roles) {
  const years    = formatCompanyYears(company.dateStart, company.dateEnd);
  const dotClass = company.dateEnd ? 'company-dot' : 'company-dot company-dot--current';
  const nameInner = company.url
    ? `<a href="${esc(company.url)}" target="_blank" rel="noopener noreferrer">${esc(company.name)}</a>`
    : esc(company.name);
  const descHtml     = company.description
    ? `<p class="company-description">${esc(company.description)}</p>` : '';
  const roleListHtml = roles.length
    ? `<div class="role-list">${roles.map(renderRoleBlock).join('')}</div>` : '';

  return (
    `<div class="company-block" data-company="${esc(company.id)}">` +
    `<div class="company-block__date">${esc(years)}</div>` +
    `<div class="company-block__dot-col"><div class="${dotClass}"></div></div>` +
    `<div class="company-block__content">` +
    `<span class="company-date-mobile">${esc(years)}</span>` +
    `<h3 class="company-name">${nameInner}</h3>` +
    `${descHtml}${roleListHtml}` +
    `</div></div>`
  );
}

function renderTimeline(companies) {
  // Default sort: reversed=true (newest first) — companies are already newest-first in the JSON.
  // Within each company, roles are reversed so the most recent role appears first.
  return companies
    .map(company => renderCompanyBlock(company, [...company.roles].reverse()))
    .join('\n');
}

/* ── EDUCATION & CERTIFICATIONS ──────────────────────────────────── */

function renderEduCard(entry) {
  const highlights = entry.highlights ?? [];
  const hlHtml = highlights.length
    ? `<ul class="edu-card__highlights">${highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`
    : '';
  return (
    `<div class="edu-card">` +
    `<h3 class="edu-card__degree">${esc(entry.degree)}</h3>` +
    `<p class="edu-card__institution">${esc(entry.institution)}</p>` +
    `<p class="edu-card__dates">${esc(formatDateRange(entry.dateStart, entry.dateEnd))}</p>` +
    `${hlHtml}</div>`
  );
}

function renderCertifications(certs) {
  const grouped = new Map();
  for (const cert of certs) {
    if (!grouped.has(cert.issuer)) grouped.set(cert.issuer, []);
    grouped.get(cert.issuer).push(cert);
  }
  return [...grouped.entries()].map(([issuer, items]) => {
    const chips = items
      .map(c => `<div class="cert-chip"><span class="cert-chip__name">${esc(c.name)}</span></div>`)
      .join('');
    return (
      `<div class="cert-group">` +
      `<span class="cert-group__label">${esc(issuer)}</span>` +
      `<div class="cert-group__chips">${chips}</div>` +
      `</div>`
    );
  }).join('\n');
}

/* ── FRONT MATTER PARSER (mirrored from case-study-loader.js) ─────── */

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: raw };
  const fm = {};
  match[1].split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    fm[key] = val.startsWith('[') && val.endsWith(']')
      ? val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
      : val;
  });
  return { fm, body: match[2] };
}

/* ── CASE STUDY PAGE TEMPLATE ─────────────────────────────────────── */

const CROSS_REFS = {
  'construction-site': [{ slug: 'pos-platform',      title: 'Point-of-Sale Platform',          note: 'same reverse-engineering approach, applied to a different system' }],
  'pos-platform':      [{ slug: 'construction-site', title: 'Construction Site Management App', note: 'same reverse-engineering approach, applied to a different system' }],
};

function renderTldr(fm) {
  if (!fm.tldrProblem || !fm.tldrDid || !fm.tldrOutcome) return '';
  return (
    `<div class="cs-tldr"><dl>` +
    `<dt>Problem</dt><dd>${inline(fm.tldrProblem)}</dd>` +
    `<dt>What I did</dt><dd>${inline(fm.tldrDid)}</dd>` +
    `<dt>Outcome</dt><dd>${inline(fm.tldrOutcome)}</dd>` +
    `</dl></div>`
  );
}

function renderCaseStudyPage(slug, fm, body, nextCase = null) {
  const title = fm.title || 'Case Study';

  const tagsHtml = Array.isArray(fm.tags) && fm.tags.length
    ? `<div class="case-study-hero__tags">${fm.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
    : '';

  const metaDefs = [
    { key: 'company',   label: 'Company' },
    { key: 'role',      label: 'Role'    },
    { key: 'dateRange', label: 'Project period'  },
  ];
  const metaItems = metaDefs
    .filter(d => fm[d.key])
    .map(({ key, label }) =>
      `<span class="case-study-hero__meta-item">` +
      `<span class="case-study-hero__meta-label">${label}</span><span class="case-study-hero__meta-value">${esc(fm[key])}</span>` +
      `</span>`
    ).join('');
  const metaHtml = metaItems ? `<div class="case-study-hero__meta">${metaItems}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Ivo Frazão</title>
  <meta name="description" content="${esc(title)} — case study by Ivo Frazão, Platform Software Engineer.">
  <meta property="og:type"        content="article">
  <meta property="og:title"       content="${esc(title)} — Ivo Frazão">
  <meta property="og:description" content="${esc(title)} — case study by Ivo Frazão, Platform Software Engineer.">
  <meta property="og:url"         content="https://ivomfrazao.github.io/case-studies/${esc(slug)}.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=optional" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=optional"></noscript>
  <link rel="stylesheet" href="../css/style.css">
  <script>(function(){var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)})();</script>
</head>
<body>
  <nav class="breadcrumb">
    <a href="../index.html">← Back to Timeline</a>
  </nav>
  <main>
    <div id="case-study-container">
      <div class="case-study-hero">
        ${tagsHtml}
        <h1 class="case-study-hero__title">${esc(title)}</h1>
        ${metaHtml}
      </div>
      <div class="case-study-body">
        ${renderTldr(fm)}
        <article class="case-study-article">
${mdToHtml(body)}
        </article>
      </div>
    </div>
  </main>
  ${(() => {
    const refs = CROSS_REFS[slug];
    if (!refs || !refs.length) return '';
    const links = refs.map(r =>
      `<a href="${esc(r.slug)}.html" class="related-link">` +
      `<span class="related-link__title">${esc(r.title)}</span>` +
      `<span class="related-link__note">${esc(r.note)}</span>` +
      `</a>`
    ).join('');
    return `<nav class="case-study-related" aria-label="Related case studies"><span class="related-label">See also</span>${links}</nav>`;
  })()}
  ${nextCase
    ? `<nav class="case-study-next" aria-label="Next case study">` +
      `<a href="${esc(nextCase.slug)}.html" class="next-case-link">` +
      `<span class="next-case-label">Next case study</span>` +
      `<span class="next-case-title">${esc(nextCase.title)} →</span>` +
      `</a></nav>`
    : ''}
  <footer class="site-footer">
    <p><a href="../index.html">← Back to Timeline</a></p>
  </footer>
  <script defer src="../js/theme.js"></script>
  <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to light mode">
    <svg class="theme-toggle__icon theme-toggle__icon--sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    <svg class="theme-toggle__icon theme-toggle__icon--moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
</body>
</html>`;
}

/* ── MAIN ────────────────────────────────────────────────────────── */

function main() {
  const data = JSON.parse(fs.readFileSync('data/cv.json', 'utf8'));
  const {
    profile,
    companies,
    featuredOrder  = [],
    sideProjects   = [],
    education      = [],
    certifications = [],
    languages      = [],
  } = data;

  /* index.html ─────────────────────────────────────────────────── */
  let html = fs.readFileSync('index.html', 'utf8');

  // Profile header
  html = inject(html, 'profile-name',     esc(profile.name));
  html = inject(html, 'profile-tagline',  esc(profile.tagline));
  html = inject(html, 'profile-location', esc(profile.location));

  const langText = languages.map(l => {
    const lvl = l.level.toLowerCase();
    if (lvl === 'native' || lvl === 'fluent') return l.name;
    if (lvl.includes('beginner'))             return `${l.name} (learning)`;
    return `${l.name} (${lvl})`;
  }).join(' · ');
  html = inject(html, 'profile-languages', esc(langText));
  html = inject(html, 'profile-links',     renderProfileLinks(profile));

  // Featured projects
  const allProjects = [
    ...companies.flatMap(c => c.roles.flatMap(r => r.projects ?? [])),
    ...sideProjects,
  ];
  const featuredRaw = allProjects.filter(p => p.featured && (p.caseStudySlug || p.url));
  const featured = featuredOrder.length
    ? [...featuredRaw].sort((a, b) => {
        const ai = featuredOrder.indexOf(a.id);
        const bi = featuredOrder.indexOf(b.id);
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
      })
    : featuredRaw;
  if (featured.length) {
    html = inject(html, 'featured-grid', featured.map(renderFeaturedCard).join('\n'));
    html = setSectionVisible(html, 'featured-section', true);
  } else {
    html = inject(html, 'featured-grid', '');
    html = setSectionVisible(html, 'featured-section', false);
  }

  // Career timeline (newest-first default)
  html = inject(html, 'timeline-container', renderTimeline(companies));

  // Personal projects
  if (sideProjects.length) {
    html = inject(html, 'personal-projects-grid', sideProjects.map(renderFeaturedCard).join('\n'));
    html = setSectionVisible(html, 'personal-projects-section', true);
  } else {
    html = inject(html, 'personal-projects-grid', '');
    html = setSectionVisible(html, 'personal-projects-section', false);
  }

  // Education
  if (education.length) {
    html = inject(html, 'edu-grid', education.map(renderEduCard).join('\n'));
    html = setSectionVisible(html, 'education-section', true);
  } else {
    html = inject(html, 'edu-grid', '');
    html = setSectionVisible(html, 'education-section', false);
  }

  // Certifications
  if (certifications.length) {
    html = inject(html, 'certs-grid', renderCertifications(certifications));
    html = setSectionVisible(html, 'certifications-section', true);
  } else {
    html = inject(html, 'certs-grid', '');
    html = setSectionVisible(html, 'certifications-section', false);
  }

  fs.writeFileSync('index.html', html);
  console.log('  Built index.html');

  /* Case study pages ───────────────────────────────────────────── */
  const featuredWithSlug = featured.filter(p => p.caseStudySlug);
  const caseStudyNext = {};
  for (let i = 0; i < featuredWithSlug.length; i++) {
    const curr = featuredWithSlug[i];
    const next = featuredWithSlug[(i + 1) % featuredWithSlug.length];
    caseStudyNext[curr.caseStudySlug] = { slug: next.caseStudySlug, title: next.title };
  }

  const mdFiles = fs.readdirSync('case-studies').filter(f => f.endsWith('.md'));
  for (const file of mdFiles) {
    const slug = path.basename(file, '.md');
    const raw  = fs.readFileSync(`case-studies/${file}`, 'utf8');
    const { fm, body } = parseFrontMatter(raw);
    fs.writeFileSync(`case-studies/${slug}.html`, renderCaseStudyPage(slug, fm, body, caseStudyNext[slug] ?? null));
    console.log(`  Built case-studies/${slug}.html`);
  }

  console.log('Build complete.');
}

main();
