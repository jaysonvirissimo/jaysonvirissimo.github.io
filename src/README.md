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
`npm run build:resume` rebuilds the JSON, HTML, and PDF resumes in `src/documents/` from it with the in-repo theme in `themes/plain/`, and fails if the PDF runs past two pages.

Pushing to `development` runs the test suite and, if it passes, deploys `src/` to production via GitHub Actions (`.github/workflows/pages.yml`).