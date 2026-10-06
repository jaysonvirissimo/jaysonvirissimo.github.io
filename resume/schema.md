# Resume formats

## `master.json`

The source of truth: everything true and worth saying. It is a [JSON Resume](https://jsonresume.org/schema) document that uses the **legacy** field names (`work[].company`, `basics.website`), because the spartan and short themes read those. On top of that it adds a few fields that only the build reads:

| Field | Where | Meaning |
| --- | --- | --- |
| `id` | `work[]`, `work[].highlights[]`, `education[]` | Stable kebab-case id that variants refer to. Never reuse or rename one that a variant might reference. |
| `text` | `work[].highlights[]` | The bullet. Highlights are objects here; the build flattens them to strings. |
| `tags` | highlights, education | Free-form topic labels that help `/tailor` match a job description. Never rendered. |
| `public` | highlights, education | `false` keeps the item off the default public resume while leaving it available to variants. Defaults to `true`. |

## `tailored/<slug>/variant.yaml`

Each variant is one job's selection from the master. Every key is optional; anything left out falls back to the public default.

```yaml
target: { company: Acme, role: Staff Engineer, url: https://... }  # notes only; not rendered

basics:
  label: Senior Software Engineer     # replaces basics.label
  summary: "One or two sentences."    # adds a top-of-resume summary

work:
  subscribe:
    highlights: [sub-second-integration, sub-bd-integration]   # listed order = output order
    rewrite:                          # only for ids selected above
      sub-bd-integration: "Reworded text..."
    summary: "Replacement role summary"
    position: Staff Software Engineer # optional title override
  handshake: true                     # same as leaving it out: public highlights
  jetpack: false                      # drop the entry

skills: [Ruby, Rails, GraphQL]        # keywords in order; skill group names also work
education: [asu, finra-sie]           # ids in order, or false
languages: [English]                  # names, or false

htmlTheme: spartan                    # optional; jsonresume-theme-<name>
pdfTheme: short
```

An unknown id fails the build, so typos never get dropped silently.

## Building

- `npm run build:resume` builds the master's public selection into `src/documents/resume.{json,html,pdf}`.
- `npm run tailor:new <slug>` creates `tailored/<slug>/` with `job.md` and a `variant.yaml` that lists every id.
- `npm run tailor <slug>` builds into `out/<slug>/` and warns when the PDF runs past 2 pages.

`tailored/` and `out/` are gitignored.
