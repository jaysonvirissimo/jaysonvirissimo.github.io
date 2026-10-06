import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { assert } from 'chai';
import { catalog, compose } from '../scripts/lib/compose.mjs';

const require = createRequire(import.meta.url);
const { validate } = require('@jsonresume/schema');
const master = JSON.parse(readFileSync(new URL('../resume/master.json', import.meta.url), 'utf8'));

const isValid = (resume) => new Promise((resolve) => validate(resume, (errors) => resolve(errors)));

describe('Master resume', () => {
  it('has unique ids', () => {
    const ids = [
      ...master.work.map((w) => w.id),
      ...master.work.flatMap((w) => w.highlights.map((h) => h.id)),
      ...master.education.map((e) => e.id),
    ];
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
  });

  it('gives every highlight an id and text', () => {
    master.work.flatMap((w) => w.highlights).forEach((h) => {
      assert.match(h.id, /^[a-z0-9-]+$/);
      assert.isNotEmpty(h.text.trim());
    });
  });
});

describe('compose', () => {
  describe('without a variant', () => {
    const { resume } = compose(master);

    it('produces a schema-valid JSON Resume', async () => {
      assert.isNull(await isValid(resume));
    });

    it('includes only public highlights, as strings', () => {
      const expected = master.work.flatMap((w) => w.highlights.filter((h) => h.public !== false).map((h) => h.text));
      assert.deepEqual(resume.work.flatMap((w) => w.highlights), expected);
    });

    it('strips master-only fields', () => {
      const json = JSON.stringify(resume);
      assert.notInclude(json, '"tags"');
      assert.notInclude(json, '"public"');
      resume.work.forEach((w) => assert.notProperty(w, 'id'));
      resume.education.forEach((e) => assert.notProperty(e, 'id'));
    });
  });

  describe('with a variant', () => {
    const variant = {
      basics: { label: 'Principal Engineer', summary: 'Engineer who ships integrations.' },
      work: {
        subscribe: {
          highlights: ['sub-ci-runtime', 'sub-bd-integration'],
          rewrite: { 'sub-ci-runtime': 'Cut CI runtime by ~5 minutes' },
          summary: 'Owned broker-dealer integrations',
        },
        jetpack: false,
      },
      skills: ['Ruby', 'Rails'],
      education: ['finra-sie'],
      languages: false,
    };
    const { resume, report } = compose(master, variant);
    const subscribe = resume.work.find((w) => w.company === 'SUBSCRIBE');

    it('produces a schema-valid JSON Resume', async () => {
      assert.isNull(await isValid(resume));
    });

    it('overrides basics', () => {
      assert.equal(resume.basics.label, 'Principal Engineer');
      assert.equal(resume.basics.summary, 'Engineer who ships integrations.');
    });

    it('keeps the variant order and applies rewrites', () => {
      const original = master.work[0].highlights.find((h) => h.id === 'sub-bd-integration').text;
      assert.deepEqual(subscribe.highlights, ['Cut CI runtime by ~5 minutes', original]);
      assert.deepEqual(report[0].highlights.map((h) => h.rewritten), [true, false]);
    });

    it('overrides a work summary', () => {
      assert.equal(subscribe.summary, 'Owned broker-dealer integrations');
    });

    it('drops entries set to false and keeps unlisted entries public', () => {
      assert.notInclude(resume.work.map((w) => w.company), 'JetPack Enterprises');
      const handshake = resume.work.find((w) => w.company === 'Handshake');
      assert.lengthOf(handshake.highlights, master.work.find((w) => w.id === 'handshake').highlights.length);
    });

    it('selects skills, education, and languages', () => {
      assert.deepEqual(resume.skills, [{ keywords: ['Ruby', 'Rails'] }]);
      assert.deepEqual(resume.education.map((e) => e.institution), ['FINRA']);
      assert.deepEqual(resume.languages, []);
    });
  });

  describe('errors', () => {
    const cases = {
      'an unknown work entry': { work: { nope: false } },
      'an unknown highlight': { work: { subscribe: { highlights: ['nope'] } } },
      'a rewrite of an unselected highlight': {
        work: { subscribe: { highlights: ['sub-lms'], rewrite: { 'sub-ci-runtime': 'x' } } },
      },
      'an unknown education id': { education: ['nope'] },
      'an unknown language': { languages: ['Klingon'] },
    };

    Object.entries(cases).forEach(([name, variant]) => {
      it(`rejects ${name}`, () => {
        assert.throws(() => compose(master, variant), /nope|Klingon|sub-ci-runtime/);
      });
    });
  });
});

describe('catalog', () => {
  it('lists every highlight id', () => {
    const ids = catalog(master).work.flatMap((w) => w.highlights.map((h) => h.id));
    assert.lengthOf(ids, master.work.flatMap((w) => w.highlights).length);
  });
});
