#!/usr/bin/env node
// Usage:
//   node scripts/build.mjs              build the public resume into src/documents/
//   node scripts/build.mjs <slug>       build tailored/<slug>/variant.yaml into out/<slug>/
//   node scripts/build.mjs --new <slug> scaffold tailored/<slug>/

// The themes format dates like "2019-01-01" in local time, which shifts them
// a month early west of UTC.
process.env.TZ = 'UTC';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { catalog, compose } from './lib/compose.mjs';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const master = JSON.parse(readFileSync(join(root, 'resume/master.json'), 'utf8'));

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const DEFAULT_THEMES = { html: 'spartan', pdf: 'short' };

function loadTheme(name) {
  return require(name.startsWith('jsonresume-theme-') ? name : `jsonresume-theme-${name}`);
}

function validate(resume) {
  const { validate: check } = require('@jsonresume/schema');
  return new Promise((resolve, reject) => {
    check(resume, (errors) => {
      if (!errors) return resolve();
      const lines = errors.map((e) => `  ${e.property}: ${e.message}`).join('\n');
      reject(new Error(`resume failed JSON Resume schema validation:\n${lines}`));
    });
  });
}

async function renderPdf(html, path) {
  const puppeteer = (await import('puppeteer')).default;
  // GitHub's Ubuntu runners block Chrome's sandbox.
  const browser = await puppeteer.launch({ args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // resume-cli rendered with screen styles; keep the same look.
    await page.emulateMediaType('screen');
    const pdf = await page.pdf({ path, format: 'Letter', printBackground: true });
    // Count leaf page objects ("/Type /Page", not "/Type /Pages").
    return (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  } finally {
    await browser.close();
  }
}

async function build({ variant = {}, outDir, pdfName, maxPages }) {
  const { resume, report } = compose(master, variant);
  await validate(resume);

  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'resume.json');
  const htmlPath = join(outDir, 'resume.html');
  const pdfPath = join(outDir, pdfName);

  writeFileSync(jsonPath, `${JSON.stringify(resume, null, 2)}\n`);
  writeFileSync(htmlPath, loadTheme(variant.htmlTheme ?? DEFAULT_THEMES.html).render(resume));
  const pages = await renderPdf(loadTheme(variant.pdfTheme ?? DEFAULT_THEMES.pdf).render(resume), pdfPath);

  console.log('Highlights selected:');
  for (const { id, highlights } of report) {
    const rewrites = highlights.filter((h) => h.rewritten).length;
    console.log(`  ${id.padEnd(16)} ${highlights.length}${rewrites ? ` (${rewrites} rewritten)` : ''}`);
  }
  console.log(`\nWrote:\n  ${[jsonPath, htmlPath, pdfPath].map((p) => relative(root, p)).join('\n  ')}`);
  console.log(`\nPDF: ${pages} page${pages === 1 ? '' : 's'}`);
  if (maxPages && pages > maxPages) console.warn(`WARNING: PDF is longer than ${maxPages} pages; trim the variant.`);
}

function scaffold(slug) {
  const dir = join(root, 'tailored', slug);
  if (existsSync(dir)) throw new Error(`${relative(root, dir)} already exists`);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'job.md'), `# ${slug}\n\nURL:\n\n## Job description\n\n\n## Notes\n\n`);

  const c = catalog(master);
  const lines = [
    `# Variant for ${slug}. See resume/schema.md for the format.`,
    'target: { company: "", role: "", url: "" }',
    'basics:',
    `  label: ${master.basics.label}`,
    '  # summary: "One or two sentences for this job."',
    'work:',
  ];
  for (const w of c.work) {
    lines.push(`  # ${w.title}`);
    lines.push(`  ${w.id}:`);
    lines.push('    highlights:');
    for (const h of w.highlights) {
      lines.push(`      ${h.public ? '' : '# '}- ${h.id}   # ${h.text.slice(0, 70)}${h.text.length > 70 ? '…' : ''}`);
    }
    if (!w.highlights.length) lines.push('      []');
    lines.push('    rewrite: {}');
  }
  lines.push(`skills: [${c.skills.map((s) => JSON.stringify(s)).join(', ')}]`);
  lines.push('education:');
  for (const e of c.education) lines.push(`  ${e.public ? '' : '# '}- ${e.id}   # ${e.name}`);
  lines.push(`languages: [${c.languages.join(', ')}]   # or false`);
  writeFileSync(join(dir, 'variant.yaml'), `${lines.join('\n')}\n`);

  console.log(`Created ${relative(root, dir)}/job.md and variant.yaml`);
}

async function main(args) {
  if (args[0] === '--new') {
    if (!SLUG.test(args[1] ?? '')) throw new Error('usage: npm run tailor:new <slug>   (lowercase, digits, dashes)');
    return scaffold(args[1]);
  }

  const slug = args[0];
  if (!slug) {
    return build({ outDir: join(root, 'src/documents'), pdfName: 'resume.pdf' });
  }

  if (!SLUG.test(slug)) throw new Error(`invalid slug "${slug}"`);
  const variantPath = join(root, 'tailored', slug, 'variant.yaml');
  if (!existsSync(variantPath)) throw new Error(`${relative(root, variantPath)} not found; run npm run tailor:new ${slug}`);

  const variant = YAML.parse(readFileSync(variantPath, 'utf8')) ?? {};
  const pdfName = `${master.basics.name.replace(/\s+/g, '-')}-Resume.pdf`;
  return build({ variant, outDir: join(root, 'out', slug), pdfName, maxPages: 2 });
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
