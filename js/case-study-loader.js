/* marked is loaded as a global from CDN in case-study.html */

async function load() {
  const slug      = new URLSearchParams(window.location.search).get('slug');
  const container = document.getElementById('case-study-container');

  if (!slug) {
    renderError(container, 'No case study specified.');
    return;
  }

  try {
    const res = await fetch(`case-studies/${slug}.md`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    const { fm, body } = parseFrontMatter(raw);
    render(container, fm, body);
    document.title = `${fm.title || 'Case Study'} — Ivo Frazão`;
  } catch (err) {
    renderError(container, 'Case study not found.');
    console.error(err);
  }
}

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

function render(container, fm, body) {
  container.innerHTML = '';

  /* Hero */
  const hero = document.createElement('div');
  hero.className = 'case-study-hero';

  if (fm.tags?.length) {
    const tagsEl = document.createElement('div');
    tagsEl.className = 'case-study-hero__tags';
    fm.tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsEl.appendChild(span);
    });
    hero.appendChild(tagsEl);
  }

  const title = document.createElement('h1');
  title.className = 'case-study-hero__title';
  title.textContent = fm.title || 'Case Study';
  hero.appendChild(title);

  const metaDefs = [
    { key: 'company',   label: 'Company'   },
    { key: 'role',      label: 'Role'       },
    { key: 'dateRange', label: 'Period'     },
  ];
  const hasAnyMeta = metaDefs.some(d => fm[d.key]);
  if (hasAnyMeta) {
    const meta = document.createElement('div');
    meta.className = 'case-study-hero__meta';
    metaDefs.forEach(({ key, label }) => {
      if (!fm[key]) return;
      const item = document.createElement('span');
      item.className = 'case-study-hero__meta-item';
      item.innerHTML =
        `<span class="case-study-hero__meta-label">${label}</span> ${fm[key]}`;
      meta.appendChild(item);
    });
    hero.appendChild(meta);
  }

  /* Body */
  const bodySection = document.createElement('div');
  bodySection.className = 'case-study-body';
  const article = document.createElement('article');
  article.className = 'case-study-article';
  /* marked.parse is safe here — content is our own authored markdown files */
  article.innerHTML = window.marked.parse(body);
  bodySection.appendChild(article);

  container.appendChild(hero);
  container.appendChild(bodySection);
}

function renderError(container, msg) {
  container.innerHTML = `
    <div class="case-study-error">
      <h2>Not Found</h2>
      <p>${msg}</p>
      <a href="index.html">← Back to Timeline</a>
    </div>`;
}

load();
