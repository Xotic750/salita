import fs from 'fs';
import rimraf from 'rimraf';
import powerSet from 'power-set-x';
import salita from '../src/salita';

const noop = function noop() {};

const resetTemp = function resetTemp() {
  rimraf.sync('__tests__/files/temp/package.json', {}, noop);
  const lessSource = fs.readFileSync('__tests__/files/all-deps/package.json', 'utf8');
  fs.writeFileSync('__tests__/files/temp/package.json', lessSource);
};

describe('salita', function() {
  describe('basic', function() {
    it('is a function', function() {
      expect.assertions(1);
      expect(typeof salita).toBe('function');
    });

    it('it has correct sections', function() {
      expect.assertions(1);
      expect(salita.sections).toMatchSnapshot();
    });

    it('it throws if path is not a string', function() {
      expect.assertions(1);
      expect(() => {
        salita();
      }).toThrowErrorMatchingSnapshot();
    });

    it('it returns a Promise', function() {
      expect.assertions(1);
      const actual = salita('__tests__/files/no-deps', {
        quiet: true,
      });
      expect(actual).toBeInstanceOf(Promise);
    });
  });

  powerSet(salita.sections)
    .concat(undefined, null, true, '')
    .forEach((sectionSet) => {
      const isArray = Array.isArray(sectionSet);
      describe(`with "${isArray ? '[' : ''}${sectionSet}${isArray ? ']' : ''}" section options enabled`, function() {
        it('should work with no sections', function() {
          expect.assertions(1);

          /* eslint-disable-next-line promise/param-names */
          return new Promise((done) => {
            return salita('__tests__/files/no-deps', {
              sections: sectionSet,
              quiet: true,
            }).then((obj) => {
              expect(obj).toMatchSnapshot();
              done();
            });
          });
        });

        it('should work with dep sections', function() {
          expect.assertions(1);

          /* eslint-disable-next-line promise/param-names */
          return new Promise((done) => {
            return salita('__tests__/files/dep', {
              sections: sectionSet,
              quiet: true,
            }).then((obj) => {
              expect(obj).toMatchSnapshot();
              done();
            });
          });
        });

        it('should work with dev sections', function() {
          expect.assertions(1);

          /* eslint-disable-next-line promise/param-names */
          return new Promise((done) => {
            return salita('__tests__/files/dev', {
              sections: sectionSet,
              quiet: true,
            }).then((obj) => {
              expect(obj).toMatchSnapshot();
              done();
            });
          });
        });

        it('should work with peer sections', function() {
          expect.assertions(1);

          /* eslint-disable-next-line promise/param-names */
          return new Promise((done) => {
            return salita('__tests__/files/peer', {
              sections: sectionSet,
              quiet: true,
            }).then((obj) => {
              expect(obj).toMatchSnapshot();
              done();
            });
          });
        });

        it('should work with all sections', function() {
          expect.assertions(1);

          /* eslint-disable-next-line promise/param-names */
          return new Promise((done) => {
            return salita('__tests__/files/all-deps', {
              sections: sectionSet,
              quiet: true,
            }).then((obj) => {
              expect(obj).toMatchSnapshot();
              done();
            });
          });
        });
      });
    });

  describe('stdout', function() {
    it('it emits with color', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        let stdout = '';
        const temp = process.stdout.write;
        process.stdout.write = function(value) {
          stdout += value;
        };

        return salita('__tests__/files/all-deps').then(() => {
          process.stdout.write = temp;
          expect(stdout).toMatchSnapshot();
          done();
        });
      });
    });

    it('it emits without color', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        let stdout = '';
        const temp = process.stdout.write;
        process.stdout.write = function(value) {
          stdout += value;
        };

        return salita('__tests__/files/all-deps', {color: false}).then(() => {
          process.stdout.write = temp;
          expect(stdout).toMatchSnapshot();
          done();
        });
      });
    });

    it('it emits json', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        let stdout = '';
        const temp = process.stdout.write;
        process.stdout.write = function(value) {
          stdout += value;
        };

        return salita('__tests__/files/all-deps', {json: true}).then(() => {
          process.stdout.write = temp;
          expect(stdout).toMatchSnapshot();
          done();
        });
      });
    });
  });

  describe('ignore', function() {
    it('pegged', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        return salita('__tests__/files/all-deps', {quiet: true, ignorePegged: true}).then((value) => {
          expect(value).toMatchSnapshot();
          done();
        });
      });
    });

    it('stars', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        return salita('__tests__/files/all-deps', {quiet: true, ignoreStars: true}).then((value) => {
          expect(value).toMatchSnapshot();
          done();
        });
      });
    });
  });

  describe('sections', function() {
    it('should work with invalid sections', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        return salita('__tests__/files/all-deps', {
          sections: ['foo', 'bar', 'dep'],
          quiet: true,
        }).then((obj) => {
          expect(obj).toMatchSnapshot();
          done();
        });
      });
    });

    it('should work with duplicate sections', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        return salita('__tests__/files/all-deps', {
          sections: ['dep', 'dep', 'dep'],
          quiet: true,
        }).then((obj) => {
          expect(obj).toMatchSnapshot();
          done();
        });
      });
    });
  });

  describe('check', function() {
    it('should return sums', function() {
      expect.assertions(1);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        return salita('__tests__/files/all-deps', {
          check: true,
          quiet: true,
        }).then((obj) => {
          expect(obj).toMatchSnapshot();
          done();
        });
      });
    });
  });

  describe('update', function() {
    it('should write to the file', function() {
      expect.assertions(2);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        resetTemp();

        return salita('__tests__/files/temp', {
          update: true,
          quiet: true,
        }).then((obj) => {
          expect(obj).toMatchSnapshot();
          const pkg = fs.readFileSync('__tests__/files/temp/package.json', 'utf8');
          resetTemp();
          expect(pkg).toMatchSnapshot();
          done();
        });
      });
    });
  });

  describe('invalid', function() {
    it('unknown package and version number', function() {
      expect.assertions(2);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        let stdout = '';
        const temp = process.stdout.write;
        process.stdout.write = function(value) {
          stdout += value;
        };

        return salita('__tests__/files/invalid', {color: false}).then((pkg) => {
          process.stdout.write = temp;
          expect(stdout).toMatchSnapshot();
          expect(pkg).toMatchSnapshot();
          done();
        });
      });
    });

    it('unknown package and version number when pegged', function() {
      expect.assertions(2);

      /* eslint-disable-next-line promise/param-names */
      return new Promise((done) => {
        let stdout = '';
        const temp = process.stdout.write;
        process.stdout.write = function(value) {
          stdout += value;
        };

        return salita('__tests__/files/invalid', {color: false, ignorePegged: true}).then((pkg) => {
          process.stdout.write = temp;
          expect(stdout).toMatchSnapshot();
          expect(pkg).toMatchSnapshot();
          done();
        });
      });
    });
  });
});
