// A zero-dependency JSON Resume theme that renders the same HTML for the
// browser and for the PDF, so the two never drift. Plain headings, no
// tables, no icon fonts, no external assets: easy for ATS parsers to read.

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

// Puppeteer options the build honours when rendering this theme to PDF.
export const pdf = { media: 'print', preferCSSPageSize: true };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

// Formats an ISO date string without ever constructing a Date, so the
// machine's time zone cannot shift "2019-01-01" into December.
export function formatDate(iso, { monthly = true } = {}) {
  if (!iso) return '';
  const [year, month] = String(iso).split('-');
  if (!monthly || !month) return year;
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

const dateRange = (start, end) => {
  const from = formatDate(start);
  const to = end ? formatDate(end) : 'Present';
  return from ? `${from} – ${to}` : to;
};

const hostOf = (url) => {
  try {
    const { host, pathname } = new URL(url);
    return `${host.replace(/^www\./, '')}${pathname.replace(/\/$/, '')}`;
  } catch {
    return url;
  }
};

const link = (url, text = hostOf(url)) => `<a href="${escape(url)}">${escape(text)}</a>`;

const section = (title, body) => (body ? `<section>\n<h2>${escape(title)}</h2>\n${body}\n</section>` : '');

function header(basics = {}) {
  const location = basics.location ?? {};
  const place = [location.city, location.region].filter(Boolean).join(', ');
  // Two deliberate lines: where and how to reach me, then the links. One
  // long line would wrap at an arbitrary point in the PDF.
  const lines = [
    [place, location.remote ? 'Remote' : '', basics.email ? link(`mailto:${basics.email}`, basics.email) : ''],
    [basics.website || basics.url ? link(basics.website || basics.url) : '', ...(basics.profiles ?? []).map((p) => (p.url ? link(p.url) : ''))],
  ]
    .map((items) => items.filter(Boolean))
    .filter((items) => items.length);

  return `<header>
<h1>${escape(basics.name)}</h1>
${basics.label ? `<p class="label">${escape(basics.label)}</p>` : ''}
${lines.map((items) => `<p class="contact">${items.join('<span class="sep"> · </span>')}</p>`).join('\n')}
</header>`;
}

function skills(groups = []) {
  if (!groups.length) return '';
  return groups
    .map((g) => {
      const words = (g.keywords ?? []).map(escape).join(', ');
      return g.name ? `<p class="skills"><strong>${escape(g.name)}:</strong> ${words}</p>` : `<p class="skills">${words}</p>`;
    })
    .join('\n');
}

function work(entries = []) {
  return entries
    .map((w) => {
      const company = w.company ?? w.name;
      const bullets = (w.highlights ?? []).map((h) => `<li>${escape(h)}</li>`).join('\n');
      return `<article class="entry">
<div class="entry-head"><span class="entry-title"><strong>${escape(w.position)}</strong>, ${escape(company)}</span><span class="entry-dates">${escape(dateRange(w.startDate, w.endDate))}</span></div>
${w.summary ? `<p class="entry-summary">${escape(w.summary)}</p>` : ''}
${bullets ? `<ul>\n${bullets}\n</ul>` : ''}
</article>`;
    })
    .join('\n');
}

function projects(entries = []) {
  return entries
    .map((p) => {
      const name = p.url ? link(p.url, p.name) : escape(p.name);
      return `<p class="project"><strong>${name}</strong>: ${escape(p.description)}</p>`;
    })
    .join('\n');
}

function certificates(entries = []) {
  return entries
    .map((c) => {
      const name = c.url ? link(c.url, c.name) : escape(c.name);
      const meta = [c.issuer, formatDate(c.date)].filter(Boolean).map(escape).join(', ');
      return `<p class="certificate"><strong>${name}</strong>${meta ? `, ${meta}` : ''}</p>`;
    })
    .join('\n');
}

function education(entries = []) {
  return entries
    .map((e) => {
      const degree = [e.studyType, e.area].filter(Boolean).join(', ');
      const when = e.endDate ? formatDate(e.endDate, { monthly: false }) : '';
      return `<div class="entry-head compact"><span><strong>${escape(degree)}</strong>, ${escape(e.institution)}</span><span class="entry-dates">${escape(when)}</span></div>`;
    })
    .join('\n');
}

function languages(entries = []) {
  if (!entries.length) return '';
  return `<p>${entries.map((l) => escape(l.fluency ? `${l.language} (${l.fluency})` : l.language)).join('<span class="sep"> · </span>')}</p>`;
}

export function render(resume = {}) {
  const basics = resume.basics ?? {};
  const body = [
    header(basics),
    section('Summary', basics.summary ? `<p>${escape(basics.summary)}</p>` : ''),
    section('Skills', skills(resume.skills)),
    section('Experience', work(resume.work)),
    section('Projects', projects(resume.projects)),
    section('Certifications', certificates(resume.certificates)),
    section('Education', education(resume.education)),
    section('Languages', languages(resume.languages)),
  ]
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(basics.name)}${basics.label ? ` – ${escape(basics.label)}` : ''}</title>
<style>
${css}
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

export default { render, pdf };
