import { readFileSync } from 'node:fs';
import { assert } from 'chai';
import { JSDOM } from 'jsdom';
import { escape, formatDate, pdf, render } from '../themes/plain/index.mjs';
import { compose } from '../scripts/lib/compose.mjs';
import { createRequire } from 'node:module';

const { forbiddenPattern } = createRequire(import.meta.url)('./forbidden-terms.cjs');

const master = JSON.parse(readFileSync(new URL('../resume/master.json', import.meta.url), 'utf8'));
const dom = (html) => new JSDOM(html).window.document;

const sample = {
  basics: {
    name: 'Ada Lovelace',
    label: 'Analyst',
    email: 'ada@example.com',
    website: 'https://example.com/',
    summary: 'Writes <b>notes</b> on engines.',
    location: { city: 'London', region: 'England', countryCode: 'GB', remote: true },
    profiles: [{ network: 'GitHub', username: 'ada', url: 'https://github.com/ada' }],
  },
  work: [
    {
      company: 'Analytical Engines',
      position: 'Analyst',
      startDate: '2019-01-01',
      endDate: '2022-04-29',
      summary: 'Programs & tables',
      highlights: ['Wrote the first program <script>alert(1)</script>', 'Second bullet'],
    },
    { company: 'Current', position: 'Lead', startDate: '2023-02-27', highlights: [] },
  ],
  projects: [{ name: 'Bernoulli', description: 'Numbers "fast"', url: 'https://example.com/bernoulli' }],
  certificates: [{ name: 'Cert', issuer: 'Issuer', date: '2025-01-09', url: 'https://example.com/cert' }],
  education: [{ institution: 'Home', area: 'Mathematics', studyType: 'Tutoring', endDate: '1833-06-01' }],
  languages: [{ language: 'English', fluency: 'Native speaker' }],
  skills: [{ name: 'Maths', keywords: ['Calculus', 'Algebra'] }, { keywords: ['Loose'] }],
};

describe('plain theme', () => {
  const html = render(sample);
  const doc = dom(html);
  const headings = () => Array.from(doc.querySelectorAll('h2')).map((h) => h.textContent);

  it('asks for print media with CSS page size', () => {
    assert.deepEqual(pdf, { media: 'print', preferCSSPageSize: true });
  });

  it('renders the sections in ATS order', () => {
    assert.deepEqual(headings(), ['Summary', 'Skills', 'Experience', 'Projects', 'Certifications', 'Education', 'Languages']);
  });

  it('puts name, label, location, and remote in the header', () => {
    const header = doc.querySelector('header');
    assert.equal(header.querySelector('h1').textContent, 'Ada Lovelace');
    assert.equal(header.querySelector('.label').textContent, 'Analyst');
    const contact = Array.from(header.querySelectorAll('.contact')).map((p) => p.textContent);
    assert.lengthOf(contact, 2);
    assert.include(contact[0], 'London, England');
    assert.include(contact[0], 'Remote');
    assert.include(contact[1], 'github.com/ada');
  });

  it('escapes HTML in content', () => {
    assert.notInclude(html, '<b>notes</b>');
    assert.notInclude(html, '<script>');
    assert.include(doc.querySelector('section p').textContent, '<b>notes</b>');
    assert.include(doc.querySelector('li').textContent, '<script>alert(1)</script>');
    assert.equal(escape('a<b>&"\''), 'a&lt;b&gt;&amp;&quot;&#39;');
  });

  it('formats dates without touching the time zone', () => {
    assert.equal(formatDate('2019-01-01'), 'Jan 2019');
    assert.equal(formatDate('2025-01-09'), 'Jan 2025');
    assert.equal(formatDate('2009-05-11', { monthly: false }), '2009');
    assert.equal(formatDate(''), '');
    const dates = Array.from(doc.querySelectorAll('.entry-dates')).map((d) => d.textContent);
    assert.include(dates, 'Jan 2019 – Apr 2022');
    assert.include(dates, 'Feb 2023 – Present');
  });

  it('renders skills groups, projects, certificates, and education', () => {
    assert.include(doc.querySelector('.skills').textContent, 'Maths: Calculus, Algebra');
    assert.equal(doc.querySelector('.project a').getAttribute('href'), 'https://example.com/bernoulli');
    assert.include(doc.querySelector('.certificate').textContent, 'Cert, Issuer, Jan 2025');
    assert.include(doc.querySelector('section:nth-of-type(6)').textContent, 'Tutoring, Mathematics, Home');
  });

  it('uses no tables, scripts, or external assets', () => {
    assert.isNull(doc.querySelector('table, script, link, img, iframe'));
    Array.from(doc.querySelectorAll('a')).forEach((a) => assert.match(a.getAttribute('href'), /^(https?:|mailto:)/));
  });

  it('renders an empty resume without throwing', () => {
    assert.doesNotThrow(() => render({}));
    assert.deepEqual(Array.from(dom(render({ basics: { name: 'X' } })).querySelectorAll('h2')), []);
  });

  it('renders the real master', function () {
    const real = dom(render(compose(master).resume));
    assert.equal(real.querySelector('h1').textContent, master.basics.name);
    assert.equal(real.querySelector('.label').textContent, master.basics.label);
    assert.include(Array.from(real.querySelectorAll('h2')).map((h) => h.textContent), 'Projects');
    const pattern = forbiddenPattern();
    if (pattern) assert.notMatch(real.body.textContent, pattern);
  });
});
