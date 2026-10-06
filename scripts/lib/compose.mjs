// Turns the master resume plus an optional per-job variant into a plain
// JSON Resume document (legacy field names, string highlights) that the
// spartan and short themes can render.

const isPublic = (item) => item.public !== false;

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

    const highlights = selectHighlights(entry, spec === true ? undefined : spec);
    const { id, highlights: _, ...rest } = entry;

    work.push({
      ...rest,
      ...(spec?.summary ? { summary: spec.summary } : {}),
      ...(spec?.position ? { position: spec.position } : {}),
      highlights: highlights.map((h) => h.text),
    });
    report.push({ id, highlights });
  }
  return { work, report };
}

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

// A list of education ids in output order, false for none, or omitted for
// the public entries.
function composeEducation(master, choice) {
  let selected;
  if (choice === false) {
    selected = [];
  } else if (choice) {
    const byId = new Map(master.education.map((e) => [e.id, e]));
    selected = choice.map((id) => {
      const entry = byId.get(id);
      if (!entry) throw new Error(`education: unknown id "${id}"`);
      return entry;
    });
  } else {
    selected = master.education.filter(isPublic);
  }
  return selected.map(({ id, tags, public: _, ...rest }) => rest);
}

function composeLanguages(master, choice) {
  if (choice === false) return [];
  if (!choice) return master.languages;
  return choice.map((name) => {
    const language = master.languages.find((l) => l.language.toLowerCase() === name.toLowerCase());
    if (!language) throw new Error(`languages: unknown language "${name}"`);
    return language;
  });
}

export function compose(master, variant = {}) {
  const vb = variant.basics ?? {};

  const { work, report } = composeWork(master, variant.work);
  const resume = {
    basics: {
      ...master.basics,
      ...(vb.label ? { label: vb.label } : {}),
      ...(vb.summary ? { summary: vb.summary } : {}),
    },
    work,
    education: composeEducation(master, variant.education),
    languages: composeLanguages(master, variant.languages),
    skills: composeSkills(master, variant.skills),
  };

  return { resume, report };
}

// Every selectable id in the master, for scaffolding variants and for /tailor.
export function catalog(master) {
  return {
    work: master.work.map((w) => ({
      id: w.id,
      title: `${w.position}, ${w.company}`,
      highlights: w.highlights.map((h) => ({ id: h.id, text: h.text, public: isPublic(h) })),
    })),
    skills: master.skills.flatMap((g) => (g.name ? [g.name] : g.keywords)),
    education: master.education.map((e) => ({ id: e.id, name: `${e.area}, ${e.institution}`, public: isPublic(e) })),
    languages: master.languages.map((l) => l.language),
  };
}
