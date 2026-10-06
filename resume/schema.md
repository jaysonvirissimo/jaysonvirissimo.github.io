# Resume formats

## `master.json`

The source of truth for the public resume. It is a [JSON Resume](https://jsonresume.org/schema) document that uses the **legacy** field names (`work[].company`, `basics.website`); the build adds the modern names (`work[].name`, `basics.url`) on output. On top of the schema it adds a few fields that only the build reads:

| Field | Where | Meaning |
| --- | --- | --- |
| `id` | `work[]`, `work[].highlights[]`, `projects[]`, `certificates[]`, `education[]` | Stable kebab-case id. Never reuse or rename one. |
| `text` | `work[].highlights[]` | The bullet. Highlights are objects here; the build flattens them to strings. |
| `location.remote` | `basics` | `true` prints "Remote" in the header. |

Sections: `basics` (with `summary`), `work`, `projects`, `certificates`, `education`, `languages`, `skills` (named groups).

Everything in `master.json` is public; a test fails if it carries `public` or `tags` fields. Rules for content: every claim must be defensible in an interview, numbers come from Jayson or from a source he can point to, and partner firms are never named (say "one of the largest US independent broker-dealers"). When a private list of names is present, a test fails the build if one of them appears.

## Private overlay

The build can also read an optional overlay directory that is not part of this repository (`private/`, or the path in `RESUME_PRIVATE_DIR`). Its `overlay.json` adds non-public items and tags by id, and it holds variant files that select from the master plus the overlay. `withOverlay` in `scripts/lib/compose.mjs` merges it; overlay items are always non-public, so the public build never changes. Without the overlay, the dependent tests are skipped.

## Themes

`themes/plain/` is the in-repo theme used for both HTML and PDF: one template, plain `h2` headings in the order Summary, Skills, Experience, Projects, Certifications, Education, Languages, no tables or icon fonts, and dates formatted from the ISO string so the time zone never shifts them. It exports `render(resume)` and `pdf = { media: 'print', preferCSSPageSize: true }`.

## Building

- `npm run build:resume` builds the master into `src/documents/resume.{json,html,pdf}` and **fails if the PDF runs past 2 pages**. Commit the rebuilt files; a test fails when `src/documents/resume.json` drifts from the master.
- `npm run variant <slug>` builds a variant from the overlay into `out/<slug>/` and warns when the PDF runs past 2 pages; `npm run variant:new <slug>` scaffolds one.

`out/` is gitignored. Rendering a PDF needs Chrome (Puppeteer); the tests do not.
