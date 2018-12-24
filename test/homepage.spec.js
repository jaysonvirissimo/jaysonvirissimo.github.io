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

  // TODO: Add biography
  describe('marketing grid', () => {
    let marketing;

    beforeEach(() => marketing = mockDocument.querySelector('.marketing'));

    it('should exist', () => {
      assert(marketing, 'There should be a `.marketing` element.');
    });

    it('should have a cointainer', () => {
      const el = marketing.querySelector('.nes-container');
      assert(el);
    });

    it('should have a row', () => {
      const el = marketing.querySelector('.nes-container .row');
      assert(el);
    });

    describe('columns', () => {
      let columns = [];

      beforeEach(() => {
        if (marketing) {
          columns = Array.from(marketing.querySelectorAll('.row .col-sm-4, .row .col-md-4, .row .col-lg-4'));
        }
      });

      it('should exist', () => {
        assert(columns.length === 3, 'The `.row` should have three column elements.');
      });

      it('should have a Font Awesome icon', () => {
        columns.forEach(column => {
          const icon = column.querySelector('.fa');
          const iconClasses = Array.from(icon.classList);
          assert(icon, 'All row columns should have an icon.');
          assert(
            iconClasses.find(className => className.startsWith('fa-')),
            'Icon classes need to start with `fa-` or they will not work.'
          );
        });
      });

      it('should have a title', () => {
        columns.forEach(column => {
          const h2 = column.querySelector('h2');
          assert(h2, 'All columns should have an `h2` element.');
          assert(h2.textContent.trim() !== '', 'The `h2` elements should not be empty.');
        })
      });

      it('should have a paragraph', () => {
        columns.forEach(column => {
          const p = column.querySelector('p');
          assert(p, 'All columns should have a `p` element.');
          assert(p.textContent.trim() !== '', 'The `p` elements should not be empty.');
        });
      });
    });
  });

  // TODO: Update resume
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
