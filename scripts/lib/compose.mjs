// Turns the master resume plus an optional per-job variant into a plain
// JSON Resume document (string highlights, no master-only fields) that a
// theme can render.

const isPublic = (item) => item.public !== false;
const strip = ({ id, tags, public: _public, ...rest }) => rest;

function selectHighlights(entry, spec) {
  const byId = new Map(entry.highlights.map((h) => [h.id, h]));
  const where = `work.${entry.id}`;

  let selected;
  if (spec?.highlights) {
    selected = spec.highlights.map((id) => {
      const highlight = byId.get(id);
      if (!highlight) throw new Error(`${where}: unknown highlight "${id}"`);
      return highlight;
    });
  } else {
    selected = entry.highlights.filter(isPublic);
  }

  const rewrite = spec?.rewrite ?? {};
  const selectedIds = new Set(selected.map((h) => h.id));
  for (const id of Object.keys(rewrite)) {
    if (!selectedIds.has(id)) {
      throw new Error(`${where}: rewrite for "${id}", which is not a selected highlight`);
    }
  }

  return selected.map((h) => ({ id: h.id, text: rewrite[h.id] ?? h.text, rewritten: Object.hasOwn(rewrite, h.id) }));
}

function composeWork(master, variantWork = {}) {
  const knownIds = new Set(master.work.map((w) => w.id));
  for (const id of Object.keys(variantWork)) {
    if (!knownIds.has(id)) throw new Error(`work: unknown entry "${id}"`);
  }

  const report = [];
  const work = [];
  for (const entry of master.work) {
    const spec = variantWork[entry.id];
    if (spec === false) continue;
    // A non-public entry only appears when the variant asks for it.
    if (spec === undefined && !isPublic(entry)) continue;

    const highlights = selectHighlights(entry, spec === true ? undefined : spec);
    const { highlights: _, ...rest } = strip(entry);

    work.push({
      ...rest,
      name: entry.company,
      ...(spec?.summary ? { summary: spec.summary } : {}),
      ...(spec?.position ? { position: spec.position } : {}),
      highlights: highlights.map((h) => h.text),
    });
    report.push({ id: entry.id, highlights });
  }
  return { work, report };
}

// Skill group names (case-insensitive) or loose keywords, in output order.
function composeSkills(master, choice) {
  if (!choice) return master.skills;

  const groups = new Map(master.skills.filter((g) => g.name).map((g) => [g.name.toLowerCase(), g]));
  const result = [];
  const loose = [];
  for (const item of choice) {
    if (typeof item === 'object') {
      result.push(item);
    } else if (groups.has(item.toLowerCase())) {
      result.push(groups.get(item.toLowerCase()));
    } else {
      loose.push(item);
    }
  }
  if (loose.length) result.push({ keywords: loose });
  return result;
}

// A list of ids in output order, false for none, or omitted for the public
// entries. Used for education, projects, and certificates.
export function selectById(master, section, choice) {
  const items = master[section] ?? [];
  let selected;
  if (choice === false) {
    selected = [];
  } else if (choice) {
    const byId = new Map(items.map((e) => [e.id, e]));
    selected = choice.map((id) => {
      const entry = byId.get(id);
      if (!entry) throw new Error(`${section}: unknown id "${id}"`);
      return entry;
    });
  } else {
    selected = items.filter(isPublic);
  }
  return selected.map(strip);
}

function composeLanguages(master, choice) {
  const languages = master.languages ?? [];
  if (choice === false) return [];
  if (!choice) return languages.filter(isPublic).map(strip);
  return choice.map((name) => {
    const language = languages.find((l) => l.language.toLowerCase() === name.toLowerCase());
    if (!language) throw new Error(`languages: unknown language "${name}"`);
    return strip(language);
  });
}

export function compose(master, variant = {}) {
  const vb = variant.basics ?? {};
  const { website, ...basics } = master.basics;

  const { work, report } = composeWork(master, variant.work);
  const resume = {
    basics: {
      ...basics,
      ...(website ? { website, url: website } : {}),
      ...(vb.label ? { label: vb.label } : {}),
      ...(vb.summary ? { summary: vb.summary } : {}),
    },
    work,
    projects: selectById(master, 'projects', variant.projects),
    certificates: selectById(master, 'certificates', variant.certificates),
    education: selectById(master, 'education', variant.education),
    languages: composeLanguages(master, variant.languages),
    skills: composeSkills(master, variant.skills),
  };

  return { resume, report };
}

// Merges a private overlay into the master: extra work entries, highlights
// appended per work entry, extra projects, certificates, education, and
// languages, and tags keyed by id. Overlay items default to non-public, so
// the public selection never changes.
export function withOverlay(master, overlay) {
  if (!overlay) return master;
  const hidden = (item) => ({ public: false, ...item });
  const tags = overlay.tags ?? {};
  const tag = (item) => (item.id && tags[item.id] ? { ...item, tags: tags[item.id] } : item);

  const knownIds = new Set(master.work.map((w) => w.id));
  for (const id of Object.keys(overlay.highlights ?? {})) {
    if (!knownIds.has(id)) throw new Error(`overlay highlights: unknown work entry "${id}"`);
  }

  const work = [
    ...master.work.map((w) => ({
      ...w,
      highlights: [...w.highlights.map(tag), ...(overlay.highlights?.[w.id] ?? []).map(hidden)],
    })),
    ...(overlay.work ?? []).map(hidden),
  ];

  const merged = { ...master, work };
  for (const section of ['projects', 'certificates', 'education', 'languages']) {
    merged[section] = [...(master[section] ?? []).map(tag), ...(overlay[section] ?? []).map(hidden)];
  }
  return merged;
}

// Every selectable id in the master, for scaffolding variants.
export function catalog(master) {
  return {
    work: master.work.map((w) => ({
      id: w.id,
      title: `${w.position}, ${w.company}`,
      public: isPublic(w),
      highlights: w.highlights.map((h) => ({ id: h.id, text: h.text, public: isPublic(h) })),
    })),
    skills: master.skills.flatMap((g) => (g.name ? [g.name] : g.keywords)),
    skillGroups: master.skills.filter((g) => g.name).map((g) => ({ name: g.name, keywords: g.keywords })),
    projects: (master.projects ?? []).map((p) => ({ id: p.id, name: p.name, public: isPublic(p) })),
    certificates: (master.certificates ?? []).map((c) => ({ id: c.id, name: `${c.name}, ${c.issuer}`, public: isPublic(c) })),
    education: master.education.map((e) => ({ id: e.id, name: `${e.area}, ${e.institution}`, public: isPublic(e) })),
    languages: (master.languages ?? []).map((l) => l.language),
  };
}
