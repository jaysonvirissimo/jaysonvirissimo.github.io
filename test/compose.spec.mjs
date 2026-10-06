import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { assert } from 'chai';
import YAML from 'yaml';
import { catalog, compose, selectById, withOverlay } from '../scripts/lib/compose.mjs';

const require = createRequire(import.meta.url);
const { validate } = require('@jsonresume/schema');
const { forbiddenPattern, PRIVATE_DIR } = require('./forbidden-terms.cjs');
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const master = JSON.parse(read('../resume/master.json'));

// A stand-in for the private overlay, so these tests never depend on it.
const fixtureOverlay = {
  tags: { 'sub-bd-integration': ['fintech'] },
  highlights: { subscribe: [{ id: 'fixture-hidden', text: 'A non-public highlight.' }] },
  work: [{ id: 'fixture-entry', company: 'Fixture Co', position: 'Engineer', startDate: '2010-01-01', endDate: '2011-01-01', highlights: [] }],
  projects: [{ id: 'fixture-project', name: 'Fixture Project', description: 'Non-public.' }],
  certificates: [],
  languages: [{ language: 'Latin', fluency: 'Reading' }],
};
const full = withOverlay(master, fixtureOverlay);

// The real overlay, when this checkout has one.
const overlayFile = `${PRIVATE_DIR}/overlay.json`;
const realOverlay = existsSync(overlayFile) ? JSON.parse(readFileSync(overlayFile, 'utf8')) : null;

const isValid = (resume) => new Promise((resolve) => validate(resume, (errors) => resolve(errors)));
const publicOf = (items) => items.filter((i) => i.public !== false);

describe('Master resume', () => {
  const sections = ['projects', 'certificates', 'education'];

  it('has unique ids across work, highlights, projects, certificates, and education', () => {
    const ids = [
      ...master.work.map((w) => w.id),
      ...master.work.flatMap((w) => w.highlights.map((h) => h.id)),
      ...sections.flatMap((s) => master[s].map((e) => e.id)),
    ];
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
  });

  it('gives every highlight a kebab-case id and text', () => {
    master.work.flatMap((w) => w.highlights).forEach((h) => {
      assert.match(h.id, /^[a-z0-9-]+$/);
      assert.isNotEmpty(h.text.trim());
    });
  });

  it('gives every project and certificate an id', () => {
    sections.flatMap((s) => master[s]).forEach((e) => assert.match(e.id, /^[a-z0-9-]+$/));
  });

  it('uses absolute URLs everywhere', () => {
    const urls = [
      master.basics.website,
      ...master.basics.profiles.map((p) => p.url),
      ...master.projects.map((p) => p.url),
      ...master.certificates.map((c) => c.url),
    ].filter(Boolean);
    urls.forEach((url) => assert.doesNotThrow(() => new URL(url), url));
    urls.forEach((url) => assert.match(url, /^https:\/\//, url));
  });

  it('never names a partner firm', function () {
    const pattern = forbiddenPattern();
    if (!pattern) this.skip();
    assert.notMatch(JSON.stringify(master), pattern);
  });

  it('holds only public items and no tags (those live in the private overlay)', () => {
    const json = JSON.stringify(master);
    assert.notInclude(json, '"public"');
    assert.notInclude(json, '"tags"');
  });
});

describe('withOverlay', () => {
  it('leaves the public selection unchanged', () => {
    assert.deepEqual(compose(full).resume, compose(master).resume);
  });

  it('adds overlay items as non-public and applies tags by id', () => {
    const subscribe = full.work.find((w) => w.id === 'subscribe');
    assert.deepInclude(subscribe.highlights, { public: false, id: 'fixture-hidden', text: 'A non-public highlight.' });
    assert.deepEqual(subscribe.highlights.find((h) => h.id === 'sub-bd-integration').tags, ['fintech']);
    assert.isFalse(full.work.find((w) => w.id === 'fixture-entry').public);
    assert.isFalse(full.projects.find((p) => p.id === 'fixture-project').public);
  });

  it('rejects highlights for an unknown work entry', () => {
    assert.throws(() => withOverlay(master, { highlights: { nope: [] } }), /nope/);
  });

  describe('with the real overlay', () => {
    before(function () { if (!realOverlay) this.skip(); });

    it('keeps ids unique across the master and the overlay', () => {
      const merged = withOverlay(master, realOverlay);
      const ids = [
        ...merged.work.map((w) => w.id),
        ...merged.work.flatMap((w) => w.highlights.map((h) => h.id)),
        ...['projects', 'certificates', 'education'].flatMap((s) => merged[s].map((e) => e.id)),
      ];
      assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
    });

    it('leaves the public selection unchanged', () => {
      assert.deepEqual(compose(withOverlay(master, realOverlay)).resume, compose(master).resume);
    });
  });
});

describe('compose', () => {
  describe('without a variant', () => {
    const { resume } = compose(master);

    it('produces a schema-valid JSON Resume', async () => {
      assert.isNull(await isValid(resume));
    });

    it('includes only public work entries and highlights, as strings', () => {
      const expected = publicOf(master.work).flatMap((w) => publicOf(w.highlights).map((h) => h.text));
      assert.deepEqual(resume.work.flatMap((w) => w.highlights), expected);
      assert.deepEqual(resume.work.map((w) => w.company), publicOf(master.work).map((w) => w.company));
    });

    it('includes only public projects, certificates, education, and languages', () => {
      assert.deepEqual(resume.projects.map((p) => p.name), publicOf(master.projects).map((p) => p.name));
      assert.deepEqual(resume.certificates.map((c) => c.name), publicOf(master.certificates).map((c) => c.name));
      assert.deepEqual(resume.education.map((e) => e.institution), publicOf(master.education).map((e) => e.institution));
      assert.deepEqual(resume.languages.map((l) => l.language), publicOf(master.languages).map((l) => l.language));
    });

    it('strips master-only fields', () => {
      const json = JSON.stringify(resume);
      assert.notInclude(json, '"tags"');
      assert.notInclude(json, '"public"');
      [...resume.work, ...resume.projects, ...resume.certificates, ...resume.education].forEach((e) => assert.notProperty(e, 'id'));
    });

    it('adds modern field names next to the legacy ones', () => {
      assert.equal(resume.basics.url, master.basics.website);
      assert.equal(resume.basics.website, master.basics.website);
      resume.work.forEach((w) => assert.equal(w.name, w.company));
    });
  });

  describe('with a variant', () => {
    const variant = {
      basics: { label: 'Principal Engineer', summary: 'Engineer who ships integrations.' },
      work: {
        subscribe: {
          highlights: ['fixture-hidden', 'sub-bd-integration'],
          rewrite: { 'fixture-hidden': 'Reworded hidden highlight' },
          summary: 'Owned broker-dealer integrations',
        },
        'tn-swe': false,
      },
      skills: ['Fintech domain', 'Ruby', 'Rails'],
      projects: ['fixture-project', 'altkata'],
      certificates: false,
      education: ['asu'],
      languages: false,
    };
    const { resume, report } = compose(full, variant);
    const subscribe = resume.work.find((w) => w.company === 'SUBSCRIBE');

    it('produces a schema-valid JSON Resume', async () => {
      assert.isNull(await isValid(resume));
    });

    it('overrides basics', () => {
      assert.equal(resume.basics.label, 'Principal Engineer');
      assert.equal(resume.basics.summary, 'Engineer who ships integrations.');
    });

    it('keeps the variant order, applies rewrites, and allows non-public highlights', () => {
      const original = master.work[0].highlights.find((h) => h.id === 'sub-bd-integration').text;
      assert.deepEqual(subscribe.highlights, ['Reworded hidden highlight', original]);
      assert.deepEqual(report[0].highlights.map((h) => h.rewritten), [true, false]);
    });

    it('overrides a work summary', () => {
      assert.equal(subscribe.summary, 'Owned broker-dealer integrations');
    });

    it('drops entries set to false and keeps unlisted entries public', () => {
      assert.notInclude(resume.work.map((w) => w.position), 'Software Engineer, then Senior Software Engineer');
      const handshake = resume.work.find((w) => w.company === 'Handshake');
      const publicHighlights = publicOf(master.work.find((w) => w.id === 'handshake').highlights);
      assert.lengthOf(handshake.highlights, publicHighlights.length);
    });

    it('selects skill groups by name and collects loose keywords', () => {
      assert.deepEqual(resume.skills.map((g) => g.name), ['Fintech domain', undefined]);
      assert.deepEqual(resume.skills[1].keywords, ['Ruby', 'Rails']);
    });

    it('selects projects, certificates, education, and languages', () => {
      assert.deepEqual(resume.projects.map((p) => p.name), ['Fixture Project', 'Altkata']);
      assert.deepEqual(resume.certificates, []);
      assert.deepEqual(resume.education.map((e) => e.institution), ['Arizona State University']);
      assert.deepEqual(resume.languages, []);
    });
  });

  describe('errors', () => {
    const cases = {
      'an unknown work entry': { work: { nope: false } },
      'an unknown highlight': { work: { subscribe: { highlights: ['nope'] } } },
      'a rewrite of an unselected highlight': {
        work: { subscribe: { highlights: ['sub-lms'], rewrite: { 'sub-compliance': 'x' } } },
      },
      'an unknown education id': { education: ['nope'] },
      'an unknown project id': { projects: ['nope'] },
      'an unknown certificate id': { certificates: ['nope'] },
      'an unknown language': { languages: ['Klingon'] },
    };

    Object.entries(cases).forEach(([name, variant]) => {
      it(`rejects ${name}`, () => {
        assert.throws(() => compose(master, variant), /nope|Klingon|sub-compliance/);
      });
    });
  });
});

describe('selectById', () => {
  it('returns public entries by default, nothing for false, and the listed order otherwise', () => {
    assert.deepEqual(selectById(master, 'projects').map((p) => p.name), publicOf(master.projects).map((p) => p.name));
    assert.deepEqual(selectById(master, 'projects', false), []);
    assert.deepEqual(selectById(master, 'certificates', ['apollo-graph-developer', 'finra-sie']).map((c) => c.issuer), ['Apollo GraphQL', 'FINRA']);
  });
});

describe('private presets', () => {
  const dir = `${PRIVATE_DIR}/presets`;
  const presets = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.yaml')) : [];
  const merged = realOverlay ? withOverlay(master, realOverlay) : master;
  const load = (file) => YAML.parse(readFileSync(`${dir}/${file}`, 'utf8'));

  before(function () { if (!presets.length) this.skip(); });

  presets.forEach((file) => {
    it(`${file} composes into a schema-valid resume that names no partner firm`, async () => {
      const { resume } = compose(merged, load(file));
      assert.isNull(await isValid(resume));
      assert.isAbove(resume.work[0].highlights.length, 0);
      const pattern = forbiddenPattern();
      if (pattern) assert.notMatch(JSON.stringify(resume), pattern);
    });
  });

  it('fintech.yaml, when present, is identical to the public default', function () {
    if (!presets.includes('fintech.yaml')) this.skip();
    assert.deepEqual(compose(merged, load('fintech.yaml')).resume, compose(master).resume);
  });
});

describe('published resume.json', () => {
  const path = new URL('../src/documents/resume.json', import.meta.url);

  it('matches the master, so the committed build is never stale', function () {
    if (!existsSync(path)) this.skip();
    const published = JSON.parse(readFileSync(path, 'utf8'));
    assert.deepEqual(published, compose(master).resume, 'run `npm run build:resume` and commit src/documents/');
  });
});

describe('catalog', () => {
  const c = catalog(master);

  it('lists every highlight id', () => {
    const ids = c.work.flatMap((w) => w.highlights.map((h) => h.id));
    assert.lengthOf(ids, master.work.flatMap((w) => w.highlights).length);
  });

  it('lists projects, certificates, and skill groups', () => {
    assert.lengthOf(c.projects, master.projects.length);
    assert.lengthOf(c.certificates, master.certificates.length);
    assert.deepEqual(c.skillGroups.map((g) => g.name), master.skills.map((g) => g.name));
  });
});
