const fs = require('fs');
const jsdom = require('jsdom');
const { assert } = require('chai');

const sourceMarkup = fs.readFileSync('./src/index.html');
const mockDocument = jsdom.jsdom(sourceMarkup);

describe('My home page', () => {
  describe('carousel', () => {
    let carousel;

    beforeEach(() => carousel = mockDocument.querySelector('.carousel'));

    it('should exist', () => {
      assert(carousel, 'There should be a `.carousel` element.');
    });

    it('should have at least 3 carousel items', () => {
      assert(carousel, 'There should be a `.carousel` element.');
      const items = Array.from(carousel.querySelectorAll('.item'));
      assert(items.length >= 3, 'The carousel should have `.item` elements.');

      items.forEach(item => {
        const h1 = item.querySelector('h1');
        assert(h1, 'Items should have `h1` elements.');

        const p = item.querySelector('p');
        assert(p, 'Items should have `p` elements.');

        const img = item.querySelector('img');
        assert(p, 'Items should have `img` elements.');
      });
    });
  });

  describe('marketing grid', () => {
    let marketing;

    beforeEach(() => marketing = mockDocument.querySelector('.marketing'));

    it('should exist', () => {
      assert(marketing, 'There should be a `.marketing` element.');
    });

    it('should have a cointainer', () => {
      const el = marketing.querySelector('.container');
      assert(el, 'The `.marketing` element should have a `.container` element.');
    });

    it('should have a row', () => {
      const el = marketing.querySelector('.container .row');
      assert(el, 'The `.container` should have a `.row` element.');
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

  describe('resume section', () => {
    let resume;

    beforeEach(() => resume = mockDocument.querySelector('#resume'));

    it('should exist', () => {
      assert.isOk(resume, 'There should be a `#resume` section.');
    });

    it('should contain a heading', () => {
      const h1 = resume.querySelector('h1');
      assert(h1.textContent.trim().toLowerCase() === 'résumé', 'The `h1` should be named properly.');
    });

    it('should contain links to resumes', () => {
      const links = Array.from(resume.querySelectorAll('a'));
      assert(links.length === 3, 'There should be three seperate resume links.');
    });
  });

  describe('footer', () => {
    let footer;
    beforeEach(() => footer = mockDocument.querySelector('.footer, footer'));

    it('should exist', () => {
      assert.isOk(footer, 'There should be a `footer` element.');
    });

    it('should have a container', () => {
      const el = footer.querySelector('.container');
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
      const el = footer && footer.querySelector('.container h3');
      assert.isOk(el, 'The footer should contain an `h3` element.');
      assert.isOk(el.textContent.trim() !== '', 'The `h3` element should have content.');
    });

    it('should have a paragraph', () => {
      const el = footer && footer.querySelector('.container p');
      assert.isOk(el, 'The footer should contain a `p` element.');
      assert.isOk(el.textContent.trim() !== '', 'The footer paragraph should have content.');
    });
  })
});
