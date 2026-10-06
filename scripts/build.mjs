#!/usr/bin/env node
// Usage:
//   node scripts/build.mjs                          build the public resume into src/documents/ (fails if over 2 pages)
//   node scripts/build.mjs <slug>                   build private/variants/<slug>/variant.yaml into out/<slug>/
//   node scripts/build.mjs --new <slug>             scaffold private/variants/<slug>/ listing every id
//   node scripts/build.mjs --new <slug> --from <preset>   scaffold from private/presets/<preset>.yaml
//
// private/ is an optional overlay kept outside this repository (set
// RESUME_PRIVATE_DIR to use another path). Its overlay.json adds non-public
// entries and tags for variants; the public build never reads it.

// Third-party themes format dates like "2019-01-01" in local time, which
// shifts them a month early west of UTC. The in-repo theme never builds a Date.
process.env.TZ = 'UTC';

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { catalog, compose, withOverlay } from './lib/compose.mjs';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const master = JSON.parse(readFileSync(join(root, 'resume/master.json'), 'utf8'));
const privateDir = process.env.RESUME_PRIVATE_DIR || join(root, 'private');
const overlayPath = join(privateDir, 'overlay.json');
// The master plus the private overlay, for variants only.
const full = withOverlay(master, existsSync(overlayPath) ? JSON.parse(readFileSync(overlayPath, 'utf8')) : undefined);

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const DEFAULT_THEMES = { html: 'plain', pdf: 'plain' };
const PUBLIC_MAX_PAGES = 2;

// An in-repo theme (themes/<name>/index.mjs) wins over an installed
// jsonresume-theme-<name> package.
export async function loadTheme(name) {
  const local = join(root, 'themes', name, 'index.mjs');
  if (existsSync(local)) return import(pathToFileURL(local).href);
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

async function renderPdf(html, path, options = {}) {
  const puppeteer = (await import('puppeteer')).default;
  // GitHub's Ubuntu runners block Chrome's sandbox.
  const browser = await puppeteer.launch({ args: process.env.CI ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType(options.media ?? 'screen');
    const pdf = await page.pdf({
      path,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: options.preferCSSPageSize ?? false,
    });
    // Count leaf page objects ("/Type /Page", not "/Type /Pages").
    return (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  } finally {
    await browser.close();
  }
}

async function build({ source = master, variant = {}, outDir, pdfName, maxPages, strict = false }) {
  const { resume, report } = compose(source, variant);
  await validate(resume);

  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'resume.json');
  const htmlPath = join(outDir, 'resume.html');
  const pdfPath = join(outDir, pdfName);

  const htmlTheme = await loadTheme(variant.htmlTheme ?? DEFAULT_THEMES.html);
  const pdfTheme = await loadTheme(variant.pdfTheme ?? DEFAULT_THEMES.pdf);

  writeFileSync(jsonPath, `${JSON.stringify(resume, null, 2)}\n`);
  writeFileSync(htmlPath, htmlTheme.render(resume));
  const pages = await renderPdf(pdfTheme.render(resume), pdfPath, pdfTheme.pdf ?? {});

  console.log('Highlights selected:');
  for (const { id, highlights } of report) {
    const rewrites = highlights.filter((h) => h.rewritten).length;
    console.log(`  ${id.padEnd(16)} ${highlights.length}${rewrites ? ` (${rewrites} rewritten)` : ''}`);
  }
  console.log(`  projects         ${resume.projects.length}`);
  console.log(`  certificates     ${resume.certificates.length}`);
  console.log(`\nWrote:\n  ${[jsonPath, htmlPath, pdfPath].map((p) => relative(root, p)).join('\n  ')}`);
  console.log(`\nPDF: ${pages} page${pages === 1 ? '' : 's'}`);
  if (maxPages && pages > maxPages) {
    const message = `PDF is longer than ${maxPages} pages; trim the ${strict ? 'public selection in resume/master.json' : 'variant'}.`;
    if (strict) throw new Error(message);
    console.warn(`WARNING: ${message}`);
  }
}

// The full catalog as YAML comments, so a variant author can see every id.
function catalogComments() {
  const c = catalog(full);
  const lines = ['# ---- Every selectable id (non-public ones are marked) ----', '# work:'];
  for (const w of c.work) {
    lines.push(`#   ${w.id}:   # ${w.title}${w.public ? '' : ' (non-public entry)'}`);
    for (const h of w.highlights) {
      lines.push(`#     ${h.public ? '' : '(non-public) '}${h.id}   # ${h.text.slice(0, 70)}${h.text.length > 70 ? '…' : ''}`);
    }
  }
  lines.push(`# skills groups: ${c.skillGroups.map((g) => JSON.stringify(g.name)).join(', ')}`);
  lines.push('# projects:');
  for (const p of c.projects) lines.push(`#   ${p.public ? '' : '(non-public) '}${p.id}   # ${p.name}`);
  lines.push('# certificates:');
  for (const e of c.certificates) lines.push(`#   ${e.public ? '' : '(non-public) '}${e.id}   # ${e.name}`);
  lines.push('# education:');
  for (const e of c.education) lines.push(`#   ${e.public ? '' : '(non-public) '}${e.id}   # ${e.name}`);
  lines.push(`# languages: ${c.languages.join(', ')}`);
  return lines.join('\n');
}

function scaffoldVariant(slug) {
  const c = catalog(full);
  const lines = [
    `# Variant for ${slug}. See the private overlay README for the format.`,
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
  lines.push(`skills: [${c.skillGroups.map((g) => JSON.stringify(g.name)).join(', ')}]`);
  lines.push('projects:');
  for (const p of c.projects) lines.push(`  ${p.public ? '' : '# '}- ${p.id}   # ${p.name}`);
  lines.push('certificates:');
  for (const e of c.certificates) lines.push(`  ${e.public ? '' : '# '}- ${e.id}   # ${e.name}`);
  lines.push('education:');
  for (const e of c.education) lines.push(`  ${e.public ? '' : '# '}- ${e.id}   # ${e.name}`);
  lines.push(`languages: [${c.languages.join(', ')}]   # or false`);
  return `${lines.join('\n')}\n`;
}

function scaffold(slug, preset) {
  const dir = join(privateDir, 'variants', slug);
  if (existsSync(dir)) throw new Error(`${dir} already exists`);

  let variant;
  if (preset) {
    const presetsDir = join(privateDir, 'presets');
    const presetPath = join(presetsDir, `${preset}.yaml`);
    if (!existsSync(presetPath)) {
      const presets = existsSync(presetsDir) ? readdirSync(presetsDir).map((f) => f.replace(/\.yaml$/, '')).join(', ') : 'none';
      throw new Error(`unknown preset "${preset}"; available: ${presets}`);
    }
    variant = [
      `# Variant for ${slug}, started from the ${preset} preset. See the private overlay README for the format.`,
      'target: { company: "", role: "", url: "" }',
      readFileSync(presetPath, 'utf8').trim(),
      '',
      catalogComments(),
      '',
    ].join('\n');
  } else {
    variant = scaffoldVariant(slug);
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'job.md'), `# ${slug}\n\nURL:\n\n## Job description\n\n\n## Notes\n\n`);
  writeFileSync(join(dir, 'variant.yaml'), variant);
  console.log(`Created ${dir}/job.md and variant.yaml${preset ? ` (from the ${preset} preset)` : ''}`);
}

async function main(args) {
  if (args[0] === '--new') {
    if (!SLUG.test(args[1] ?? '')) throw new Error('usage: npm run variant:new <slug> [-- --from <preset>]   (lowercase, digits, dashes)');
    const fromIndex = args.indexOf('--from');
    const preset = fromIndex === -1 ? undefined : args[fromIndex + 1];
    if (fromIndex !== -1 && !preset) throw new Error('--from needs a preset name');
    return scaffold(args[1], preset);
  }

  const slug = args[0];
  if (!slug) {
    return build({ outDir: join(root, 'src/documents'), pdfName: 'resume.pdf', maxPages: PUBLIC_MAX_PAGES, strict: true });
  }

  if (!SLUG.test(slug)) throw new Error(`invalid slug "${slug}"`);
  const variantPath = join(privateDir, 'variants', slug, 'variant.yaml');
  if (!existsSync(variantPath)) throw new Error(`${variantPath} not found; run npm run variant:new ${slug}`);

  const variant = YAML.parse(readFileSync(variantPath, 'utf8')) ?? {};
  const pdfName = `${master.basics.name.replace(/\s+/g, '-')}-Resume.pdf`;
  return build({ source: full, variant, outDir: join(root, 'out', slug), pdfName, maxPages: 2 });
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
