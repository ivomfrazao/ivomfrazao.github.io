'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UTILS — date formatting
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr) {
  const [year, month] = dateStr.split('-');
  return month ? `${MONTHS[parseInt(month, 10) - 1]} ${year}` : year;
}

function formatDateRange(start, end) {
  return `${formatDate(start)} – ${end ? formatDate(end) : 'Present'}`;
}

function formatCompanyYears(start, end) {
  const startYear = start.split('-')[0];
  const endYear   = end ? end.split('-')[0] : 'Present';
  return startYear === endYear ? startYear : `${startYear} – ${endYear}`;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOGGLE — timeline sort order button
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function initToggle(container, initialReversed, onChange) {
  const btn = document.createElement('button');
  btn.className = 'order-toggle';

  let reversed = initialReversed;

  function sync() {
    btn.textContent = reversed ? 'Show most recent first ↑' : 'Show oldest first ↓';
  }

  btn.addEventListener('click', () => {
    reversed = !reversed;
    localStorage.setItem('timeline-order-v2', reversed ? 'reverse' : 'chrono');
    sync();
    onChange(reversed);
  });

  sync();
  container.appendChild(btn);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PROJECT CARDS — featured, side projects, timeline
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function renderFeatured(projects, container) {
  if (!projects.length) {
    container.closest('.featured-section').style.display = 'none';
    return;
  }
  projects.forEach(p => container.appendChild(makeFeaturedCard(p)));
}

function makeFeaturedCard(p) {
  const cta = p.caseStudySlug
    ? { href: `case-study.html?slug=${p.caseStudySlug}`, label: 'Read case study →', external: false }
    : p.url
      ? { href: p.url, label: 'View project →', external: true }
      : { href: `#${p.id}`, label: 'See in timeline ↓', external: false };

  const a = el('a', 'featured-card');
  a.href = cta.href;
  if (cta.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }

  const title = el('h3', 'featured-card__title');
  title.textContent = p.title;
  a.appendChild(title);

  const footer = el('div', 'featured-card__footer');

  if (p.tags?.length) {
    const tags = el('div', 'featured-card__tags');
    p.tags.slice(0, 4).forEach(t => tags.appendChild(makeTag(t)));
    footer.appendChild(tags);
  }

  if (cta) {
    const ctaEl = el('span', 'featured-card__cta');
    ctaEl.textContent = cta.label;
    footer.appendChild(ctaEl);
  }

  a.appendChild(footer);
  return a;
}

function renderSideProjects(projects, container) {
  projects.forEach(p => container.appendChild(makeFeaturedCard(p)));
}

function renderProjectCards(projects, container) {
  const sorted = [...projects].sort((a, b) =>
    a.type === 'flagship' && b.type !== 'flagship' ? -1 :
    a.type !== 'flagship' && b.type === 'flagship' ?  1 : 0
  );
  sorted.forEach(p => container.appendChild(makeProjectCard(p)));
}

function makeProjectCard(p) {
  const card = el('div', `project-card project-card--${p.type}`);
  card.id = p.id;

  const top = el('div', 'project-card__top');
  const title = el('span', 'project-card__title');
  title.textContent = p.title;
  top.appendChild(title);

  if (p.type === 'flagship') {
    const badge = el('span', 'project-card__badge');
    badge.textContent = '★ Flagship';
    top.appendChild(badge);
  }
  card.appendChild(top);

  if (p.tagline) {
    const tagline = el('p', 'project-card__tagline');
    tagline.textContent = p.tagline;
    card.appendChild(tagline);
  }

  if (p.tags?.length || p.caseStudySlug) {
    const footer = el('div', 'project-card__footer');

    if (p.tags?.length) {
      const tags = el('div', 'project-card__tags');
      p.tags.slice(0, 4).forEach(t => tags.appendChild(makeTag(t)));
      footer.appendChild(tags);
    }

    if (p.caseStudySlug) {
      const link = el('a', 'project-card__link');
      link.href = `case-study.html?slug=${p.caseStudySlug}`;
      link.textContent = 'View case study →';
      footer.appendChild(link);
    }

    card.appendChild(footer);
  }

  return card;
}

function makeTag(text) {
  const span = el('span', 'tag');
  span.textContent = text;
  return span;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TIMELINE — company blocks and role list
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderTimeline(companies, reversed, container) {
  container.innerHTML = '';

  const orderedCompanies = reversed ? [...companies] : [...companies].reverse();

  orderedCompanies.forEach(company => {
    const orderedRoles = reversed ? [...company.roles].reverse() : company.roles;
    container.appendChild(makeCompanyBlock(company, orderedRoles));
  });
}

function makeCompanyBlock(company, roles) {
  const block = el('div', 'company-block');
  block.dataset.company = company.id;

  const dateCol = el('div', 'company-block__date');
  dateCol.textContent = formatCompanyYears(company.dateStart, company.dateEnd);
  block.appendChild(dateCol);

  const dotCol = el('div', 'company-block__dot-col');
  const dot = el('div', 'company-dot');
  if (!company.dateEnd) dot.classList.add('company-dot--current');
  dotCol.appendChild(dot);
  block.appendChild(dotCol);

  const content = el('div', 'company-block__content');

  const dateMobile = el('span', 'company-date-mobile');
  dateMobile.textContent = formatCompanyYears(company.dateStart, company.dateEnd);
  content.appendChild(dateMobile);

  const nameEl = el('h3', 'company-name');
  if (company.url) {
    const a = el('a');
    a.href = company.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = company.name;
    nameEl.appendChild(a);
  } else {
    nameEl.textContent = company.name;
  }
  content.appendChild(nameEl);

  if (company.description) {
    const desc = el('p', 'company-description');
    desc.textContent = company.description;
    content.appendChild(desc);
  }

  if (roles.length) {
    const roleList = el('div', 'role-list');
    roles.forEach(role => roleList.appendChild(makeRoleBlock(role)));
    content.appendChild(roleList);
  }

  block.appendChild(content);
  return block;
}

function makeRoleBlock(role) {
  const block = el('div', 'role-block');
  block.dataset.role = role.id;

  const header = el('div', 'role-block__header');
  const title  = el('span', 'role-title');
  title.textContent = role.title;
  const dates  = el('span', 'role-dates');
  dates.textContent = formatDateRange(role.dateStart, role.dateEnd);
  header.appendChild(title);
  header.appendChild(dates);
  block.appendChild(header);

  if (role.summary) {
    const summary = el('p', 'role-summary');
    summary.textContent = role.summary;
    block.appendChild(summary);
  }

  if (role.projects?.length) {
    const projectsEl = el('div', 'role-projects');
    renderProjectCards(role.projects, projectsEl);
    block.appendChild(projectsEl);
  }

  return block;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EDUCATION & CERTIFICATIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderEducation(entries, container) {
  entries.forEach(entry => container.appendChild(makeEduCard(entry)));
}

function renderCertifications(certs, container) {
  const grouped = groupBy(certs, c => c.issuer);
  grouped.forEach((items, issuer) => {
    const group = document.createElement('div');
    group.className = 'cert-group';

    const label = document.createElement('span');
    label.className = 'cert-group__label';
    label.textContent = issuer;
    group.appendChild(label);

    const chips = document.createElement('div');
    chips.className = 'cert-group__chips';
    items.forEach(cert => chips.appendChild(makeCertChip(cert)));
    group.appendChild(chips);

    container.appendChild(group);
  });
}

function makeEduCard(entry) {
  const card = document.createElement('div');
  card.className = 'edu-card';

  const degree = document.createElement('h3');
  degree.className = 'edu-card__degree';
  degree.textContent = entry.degree;
  card.appendChild(degree);

  const institution = document.createElement('p');
  institution.className = 'edu-card__institution';
  institution.textContent = entry.institution;
  card.appendChild(institution);

  const dates = document.createElement('p');
  dates.className = 'edu-card__dates';
  dates.textContent = formatDateRange(entry.dateStart, entry.dateEnd);
  card.appendChild(dates);

  if (entry.highlights?.length) {
    const list = document.createElement('ul');
    list.className = 'edu-card__highlights';
    entry.highlights.forEach(h => {
      const li = document.createElement('li');
      li.textContent = h;
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  return card;
}

function makeCertChip(cert) {
  const chip = document.createElement('div');
  chip.className = 'cert-chip';
  const name = document.createElement('span');
  name.className = 'cert-chip__name';
  name.textContent = cert.name;
  chip.appendChild(name);
  return chip;
}

function groupBy(arr, keyFn) {
  const map = new Map();
  arr.forEach(item => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN — bootstrap and profile render
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function init() {
  const res  = await fetch('data/cv.json');
  const data = await res.json();

  renderProfile(data.profile, data.languages);

  const featuredProjects = [
    ...data.companies.flatMap(c => c.roles.flatMap(r => r.projects ?? [])),
    ...(data.sideProjects ?? []),
  ].filter(p => p.featured && (p.caseStudySlug || p.url));
  renderFeatured(featuredProjects, document.getElementById('featured-grid'));

  const reversed = localStorage.getItem('timeline-order-v2') !== 'chrono';
  const container = document.getElementById('timeline-container');
  renderTimeline(data.companies, reversed, container);

  initToggle(
    document.getElementById('toggle-container'),
    reversed,
    (rev) => renderTimeline(data.companies, rev, container)
  );

  const sideProjects = data.sideProjects ?? [];
  const spGrid = document.getElementById('personal-projects-grid');
  if (spGrid) {
    if (sideProjects.length) {
      renderSideProjects(sideProjects, spGrid);
    } else {
      spGrid.closest('.personal-projects-section').style.display = 'none';
    }
  }

  if (data.education?.length) {
    renderEducation(data.education, document.getElementById('edu-grid'));
  } else {
    document.querySelector('.education-section')?.style.setProperty('display', 'none');
  }

  if (data.certifications?.length) {
    renderCertifications(data.certifications, document.getElementById('certs-grid'));
  } else {
    document.querySelector('.certifications-section')?.style.setProperty('display', 'none');
  }

  initScrollAnimations();
}

function renderProfile(profile, languages) {
  document.getElementById('profile-name').textContent     = profile.name;
  document.getElementById('profile-tagline').textContent  = profile.tagline;
  document.getElementById('profile-location').textContent = profile.location;

  if (languages?.length) {
    const el = document.getElementById('profile-languages');
    el.textContent = languages.map(l => {
      const lvl = l.level.toLowerCase();
      if (lvl === 'native' || lvl === 'fluent') return l.name;
      if (lvl.includes('beginner')) return `${l.name} (learning)`;
      return `${l.name} (${lvl})`;
    }).join(' · ');
  }

  const ICONS = {
    linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    github:   `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
    email:    `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>`,
  };

  const nav = document.getElementById('profile-links');
  const defs = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'github',   label: 'GitHub'   },
    { key: 'email',    label: 'Email'    },
  ];
  defs.forEach(({ key, label }) => {
    const val = profile.links?.[key];
    if (!val) return;
    const a = document.createElement('a');
    a.className = 'profile-link';
    a.href      = key === 'email' ? `mailto:${val}` : val;
    if (key !== 'email') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.setAttribute('aria-label', label);
    a.innerHTML = `<span>${label}</span>${ICONS[key]}`;
    nav.appendChild(a);
  });
}

function initScrollAnimations() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        entry.target.classList.remove('fade-in-hidden');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );

  document.querySelectorAll('.company-block, .featured-card').forEach(el => {
    el.classList.add('fade-in-hidden');
    observer.observe(el);
  });
}

init();
