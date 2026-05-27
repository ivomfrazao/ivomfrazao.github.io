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
   PROJECT CARDS — timeline only
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function makeTag(text) {
  const span = el('span', 'tag');
  span.textContent = text;
  return span;
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
      link.href = `case-studies/${p.caseStudySlug}.html`;
      link.textContent = 'View case study →';
      footer.appendChild(link);
    }

    card.appendChild(footer);
  }

  return card;
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

  initScrollAnimations();
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
   SCROLL ANIMATIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
    // Skip elements already visible in the viewport — they were pre-rendered
    // and hiding them before fading back in would cause a visible flash.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add('fade-in-hidden');
    observer.observe(el);
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function init() {
  const res  = await fetch('data/cv.json');
  const data = await res.json();

  const reversed  = localStorage.getItem('timeline-order-v2') !== 'chrono';
  const container = document.getElementById('timeline-container');

  // The pre-rendered HTML uses newest-first (reversed=true). Only re-render
  // if the user's stored preference is chronological order.
  if (!reversed) {
    renderTimeline(data.companies, reversed, container);
  }

  initToggle(
    document.getElementById('toggle-container'),
    reversed,
    (rev) => renderTimeline(data.companies, rev, container)
  );

  initScrollAnimations();
}

init();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NAV — active section tracking (desktop + mobile)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function () {
  const sectionIds = [
    'featured-heading',
    'timeline-heading',
    'personal-projects-heading',
    'education-heading',
    'certifications-heading',
  ];
  const headings = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  if (!headings.length) return;

  // Offset: detect a section as active once its heading reaches within 80px of
  // the viewport top. Accounts for the 44px mobile top bar plus breathing room.
  const OFFSET = 80;
  let lastActiveId = null;
  let ticking = false;

  function getActiveId() {
    const scrollTop = window.scrollY + OFFSET;
    let activeId = headings[0].id;
    for (const h of headings) {
      if (h.getBoundingClientRect().top + window.scrollY <= scrollTop) {
        activeId = h.id;
      }
    }
    return activeId;
  }

  function updateActive() {
    const activeId = getActiveId();
    if (activeId === lastActiveId) return;
    lastActiveId = activeId;

    document.querySelectorAll('.side-nav a, .top-bar-link').forEach(a => {
      const isActive = a.getAttribute('href') === '#' + activeId;
      a.classList.toggle('active', isActive);
      if (isActive && a.classList.contains('top-bar-link')) {
        a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateActive(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  updateActive();
}());
