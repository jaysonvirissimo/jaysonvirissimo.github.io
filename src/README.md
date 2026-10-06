# Info
This is my professional website.
You can visit the live site [here](https://virissimo.info/).
The SNES favicon was made by [Jojo Mendoza](https://www.deviantart.com/hopstarter) under the [CC Attribution-Noncommercial-No Derivate 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) license.

# Development Flow
Clone the repo and switch to the development branch:
```
git clone https://github.com/jaysonvirissimo/jaysonvirissimo.github.io.git
cd jaysonvirissimo.github.io/
git checkout development
```
Install dependencies with `npm install`.
Use `npm start` to run the site locally. 
`npm test` runs the test suite.

`resume/master.json` is the source of truth for the résumé; `resume/schema.md` documents its format.
`npm run build:resume` rebuilds the JSON, HTML, and PDF resumes in `src/documents/` from it.

To tailor a résumé for a job, run `/tailor <job URL or pasted description>` in Claude Code, or run `npm run tailor:new acme`, edit `tailored/acme/variant.yaml`, and run `npm run tailor acme`.
Tailored output goes to `out/acme/`; `tailored/` and `out/` are gitignored.

Pushing to `development` runs the test suite and, if it passes, deploys `src/` to production via GitHub Actions (`.github/workflows/pages.yml`).