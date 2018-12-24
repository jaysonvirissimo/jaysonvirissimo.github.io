const fs = require('fs');
const jsdom = require('jsdom');
const { assert } = require('chai');

const sourceMarkup = fs.readFileSync('./src/index.html');
const mockDocument = jsdom.jsdom(sourceMarkup);

describe('My professional website', () => {
  describe('header', () => {
    let header;

    beforeEach(() => header = mockDocument.querySelector('header'));

    it('should exist', () => {
      assert(header);
    });

    it('should have a SNES controller', () => {
      const h1 = header.querySelector('h1');
      const controller = h1.querySelector('i.snes-logo');
      assert(controller);
    });

    it('should have my name', () => {
      const h1 = header.querySelector('h1');
      assert(h1.textContent.trim(), 'Jayson Virissimo');
    });

    it('should have my title', () => {
      const p = header.querySelector('p');
      assert(p.textContent.trim(), 'Full-Stack Developer')
    });
  });

  describe('resume section', () => {
    let resume;

    beforeEach(() => resume = mockDocument.querySelector('#resume'));

    it('should exist', () => {
      assert.isOk(resume);
    });

    it('should contain a title', () => {
      const h2 = resume.querySelector('h2');
      assert(h2.textContent.trim().toLowerCase() === 'résumé');
    });

    it('should contain links to resumes', () => {
      const links = Array.from(resume.querySelectorAll('a'));
      assert(links.length === 3);
    });
  });

  // TODO: Add biography
  describe('portfolio section', () => {
    let portfolio;

    beforeEach(() => portfolio = mockDocument.querySelector('#portfolio'));

    it('should exist', () => {
      assert(portfolio);
    });

    it('should have a title', () => {
      const h2 = portfolio.querySelector('h2');
      assert(h2.textContent.trim().toLowerCase() === 'portfolio');
    });

    describe('projects', () => {
      let projects = [];

      beforeEach(() => {
        if (portfolio) {
          projects = Array.from(portfolio.querySelectorAll('.project'));
        }
      });

      it('should exist', () => {
        assert(projects.length);
      });

      it('should have titles', () => {
        projects.forEach(project => {
          const h3 = project.querySelector('h3');
          assert(h3);
          assert(h3.textContent.trim() !== '');
        })
      });

      it('should have a description', () => {
        projects.forEach(project => {
          const p = project.querySelector('p.description');
          assert(p);
          assert(p.textContent.trim() !== '');
        });
      });
    });
  });

  describe('footer', () => {
    let footer;
    beforeEach(() => footer = mockDocument.querySelector('.footer, footer'));

    it('should exist', () => {
      assert.isOk(footer, 'There should be a `footer` element.');
    });

    it('should have a container', () => {
      const el = footer.querySelector('.nes-container');
      assert.isOk(el, 'A `.container` element should exist inside the `footer`.');
    });
  });

  describe('footer-elements', () => {
    let footer;
    beforeEach(() => footer = mockDocument.querySelector('.footer, footer'));

    it('should exist', () => {
      assert.isOk(footer, 'There should be a `footer` element.');
    });

    it('should have a title', () => {
      const el = footer && footer.querySelector('.nes-container h3');
      assert.isOk(el, 'The footer should contain an `h3` element.');
      assert.isOk(el.textContent.trim() !== '', 'The `h3` element should have content.');
    });

    it('should have a paragraph', () => {
      const el = footer && footer.querySelector('.nes-container p');
      assert.isOk(el, 'The footer should contain a `p` element.');
      assert.isOk(el.textContent.trim() !== '', 'The footer paragraph should have content.');
    });
  })
});
