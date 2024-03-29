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

`npm run build-resumes` rebuilds the HTML and PDF resumes based on changes to the JSON version.

`npm run deploy` runs the tests suite and conditionally commits all the static assets to `master` branch and deploys to production.