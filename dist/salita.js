"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var path = require('path');

var npm = require('npm');

var jsonFile = require('json-file-plus');

var Table = require('cli-table');

var chalk = require('chalk');

var semver = require('semver');

var deps = {
  dependencies: {
    section: 'dep',
    title: 'Dependencies'
  },
  devDependencies: {
    section: 'dev',
    title: 'Development Dependencies'
  },
  peerDependencies: {
    section: 'peer',
    title: 'Peer Dependencies'
  }
};
/**
 * @param {object} tableChars - Table options chars.
 * @param {string} key - Char key.
 * @returns {object} Table options chars.
 */

var charsIteratee = function charsIteratee(tableChars, key) {
  tableChars[key] = '';
  return tableChars;
};
/**
 * @returns {Table} The CLI table.
 */


var getTable = function getTable() {
  var table = new Table({});
  table.options.chars = Object.keys(table.options.chars).reduce(charsIteratee, {});
  return table;
};
/**
 * @param {string} key - The section name.
 * @param {boolean} onlyChanged - Only changed option.
 * @returns {function(*): object} The bound result to JSON function.
 */


var createResultJSON = function createResultJSON(key, onlyChanged) {
  var predicate = function predicate(result) {
    return !onlyChanged || result.isChanged;
  };

  return function resultJSON(results) {
    return _defineProperty({}, key, results.filter(predicate));
  };
};
/**
 * @param {string} message - Message in chalk colour.
 * @param {object} result - Package result.
 * @returns {Array<string>} - Row message array.
 */


var getRowFromTo = function getRowFromTo(message, result) {
  return [message, result.name, 'from', chalk.yellow(result.before), 'to', chalk.yellow(result.after)];
};
/**
 * @param {string} message - Message in chalk colour.
 * @param {object} result - Package result.
 * @returns {Array<string>} - Row message array.
 */


var getRowAt = function getRowAt(message, result) {
  return [message, result.name, 'at', chalk.yellow(result.before)];
};
/**
 * @param {object} result - Package result.
 * @returns {boolean} Indicates if the range is satisfied.
 */


var isRangeSatisfied = function isRangeSatisfied(result) {
  return result.isUpdatable || result.isStar || result.isPegged;
};
/**
 * @param {boolean} onlyChanged - Only changed option.
 * @returns {function(object): Array<string>} - Row iteratee.
 */


var createRowIteratee = function createRowIteratee(onlyChanged) {
  return function rowIteratee(result) {
    if (result.isChanged) {
      return getRowFromTo(chalk.green('Changed: '), result);
    }

    if (result.error) {
      return [].concat(_toConsumableArray(getRowAt(chalk.red('Package not found: '), result)), [chalk.bold.red('?')]);
    }

    if (!isRangeSatisfied(result)) {
      return getRowFromTo(chalk.red('Requested range not satisfied by: '), result);
    }

    return onlyChanged ? null : getRowAt(chalk.blue('Kept: '), result);
  };
};
/**
 * @param {Array<string>} a - Reference element.
 * @param {Array<string>} b - Compare element.
 * @returns {number} A -1 if a before b; 1 if a after b; 0 if they are equivalent.
 */


var sortByName = function sortByName(a, b) {
  return a[1].localeCompare(b[1]);
};
/**
 * @param {string} caption - Section caption.
 * @param {boolean} onlyChanged - Only changed options.
 * @returns {function(Array<object>): [string, Table]} The array of chalked caption and CLI table.
 */


var createResultTable = function createResultTable(caption, onlyChanged) {
  return function resultTable(results) {
    var table = getTable();

    if (results.length > 0) {
      var tableRows = results.map(createRowIteratee(onlyChanged)).filter(Boolean);
      table.push.apply(table, _toConsumableArray(tableRows));
      table.sort(sortByName);
    } else {
      table.push([chalk.gray('None found')]);
    }

    return [chalk.green.underline("".concat(caption, ":")), table];
  };
};
/**
 * @param {object} pkg - The package.json object.
 * @returns {Promise<object>} The package.json object.
 */


var loadNPM = function loadNPM(pkg) {
  return new Promise(function executee(resolve, reject) {
    npm.load({}, function callback(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  }).then(function thenee() {
    return pkg;
  });
};
/**
 * @param {string} version - The package version.
 * @returns {boolean} Indicate if the version is pegged or not.
 */


var isVersionPegged = function isVersionPegged(version) {
  try {
    /* eslint-disable-next-line babel/new-cap */
    var range = semver.Range(version);
    return range.set.every(function predicate(comparators) {
      return comparators.length === 1 && String(comparators[0].operator || '') === '';
    });
  } catch (err) {
    /*
     * semver.Range doesn't support all version specifications (like git
     * references), so if it raises an error, assume the dep can be left
     * untouched:
     */
    return true;
  }
};
/**
 * Given a package name, lookup the semantic tags.
 *
 * @param {string} name - The module name.
 * @param {Function} callback - A function to call with the dist tags.
 */


var lookupDistTags = function lookupDistTags(name, callback) {
  // Need to require here, because NPM does all sorts of funky global attaching.

  /* eslint-disable-next-line global-require */
  var view = require('npm/lib/view');

  var prefix = npm.config.get('save-prefix'); // Call View directly to ensure the arguments actually work.

  view([name, 'dist-tags'], true, function cb(err, desc) {
    if (err) {
      return callback(err);
    }

    var latest = Object.keys(desc);

    if (latest.length !== 1) {
      throw new Error("expected 1 version key, got: ".concat(latest));
    }

    var tags = desc[latest]['dist-tags'];
    return callback(null, prefix, tags);
  });
};
/**
 * @param {string} existing - The existing package version from package.json file.
 * @param {string} version - The package version from update check.
 * @returns {boolean} Indicates if the package is updatable or not.
 */


var getIsUpdatable = function getIsUpdatable(existing, version) {
  try {
    /* eslint-disable-next-line babel/new-cap */
    var range = semver.Range(existing);
    return !semver.ltr(version, range);
  } catch (e) {
    return false;
  }
};
/**
 * @param {{name: string, version: string}} pkg - The package details.
 * @param {object} flags - Ignore flags.
 * @returns {Promise<object>} A promise that resolves to an untouched object.
 */


var createUntouched = function createUntouched(pkg, flags) {
  var name = pkg.name,
      version = pkg.version;
  return Promise.resolve(_objectSpread({}, {
    after: version,
    before: version,
    isChanged: false,
    isUpdatable: false,
    name: name
  }, {}, flags));
};
/**
 * @param {string} version - The package version.
 * @returns {boolean} Indicates if it is star or not.
 */


var isVersionStar = function isVersionStar(version) {
  return version === '*' || version === 'latest';
};
/**
 * @param {{names: Array<string>, section: object}} data - The names array and package.json section.
 * @param {{stars: boolean, pegged: boolean}} ignore - Ignore options.
 * @returns {{names: Array<string>, untouched: Array<Promise<object>>}} The filtered names and untouched objects.
 */


var reduceNamesAndUntouched = function reduceNamesAndUntouched(_ref2, _ref3) {
  var names = _ref2.names,
      section = _ref2.section;
  var stars = _ref3.stars,
      pegged = _ref3.pegged;

  var predicate = function predicate(filterObject, name) {
    var version = section[name];

    if (stars && isVersionStar(version)) {
      filterObject.untouched.push(createUntouched({
        name: name,
        version: version
      }, {
        isStar: true
      }));
    } else if (pegged && isVersionPegged(version)) {
      filterObject.untouched.push(createUntouched({
        name: name,
        version: version
      }, {
        isPegged: true
      }));
    } else {
      filterObject.names.push(name);
    }

    return filterObject;
  };

  return names.reduce(predicate, {
    names: [],
    untouched: []
  });
};
/**
 * @param {object} section - The section object.
 * @param {{stars: boolean, pegged: boolean}} ignore - Ignore options.
 * @returns {{names: Array<string>, untouched: Array<Promise<object>>}} The object of promise arrays.
 */


var getNamesAndUntouched = function getNamesAndUntouched(section, _ref4) {
  var stars = _ref4.stars,
      pegged = _ref4.pegged;
  var names = Object.keys(section);

  if (stars || pegged) {
    return reduceNamesAndUntouched({
      names: names,
      section: section
    }, {
      stars: stars,
      pegged: pegged
    });
  }

  return {
    names: names,
    untouched: []
  };
};
/**
 * CreateDependenciesLookup.
 *
 * @param {object} section - The package.json section object.
 * @param {{stars: boolean, pegged: boolean}} ignore - Ignore options.
 * @returns {Array<Promise<object>>}
 */


var dependenciesLookup = function dependenciesLookup(section, ignore) {
  // See if any dependencies of this type exist.
  if (!section || !Object.keys(section).length) {
    return [];
  } // Loop through and map the "lookup latest" to promises.


  var _getNamesAndUntouched = getNamesAndUntouched(section, ignore),
      names = _getNamesAndUntouched.names,
      untouched = _getNamesAndUntouched.untouched;

  var mapNameToLatest = function mapNameToLatest(name) {
    return new Promise(function executee(resolve) {
      lookupDistTags(name, function callback(error, prefix, distTags) {
        var existing = section[name];

        if (error) {
          return resolve({
            after: existing,
            before: existing,
            error: error,
            isChanged: false,
            isUpdatable: false,
            name: name
          });
        }

        var version = distTags.latest;
        var isUpdatable = getIsUpdatable(existing, version);
        var updated = prefix + version; // If there is no version or the version is the latest.

        var result = {
          after: updated,
          before: existing,
          isChanged: version !== null && isUpdatable && existing !== updated,
          isUpdatable: isUpdatable,
          name: name
        };

        if (result.isChanged) {
          // Actually write to the package descriptor.
          section[name] = updated;
        }

        return resolve(result);
      });
    });
  };

  return names.map(mapNameToLatest).concat(untouched);
};
/**
 * @param {function(Array<object>): Array<number>} fn - The function to execute on resolve.
 * @returns {function(Promise<object>): (Promise<Array<number>>)} - Promise of result lengths.
 */


var createMapThen = function createMapThen(fn) {
  return function mapThen(promise) {
    return promise.then(fn);
  };
};
/**
 * @param results
 * @returns {[*, *]}
 */


var getDepCounts = function getDepCounts(results) {
  var changedDeps = results.filter(function iteratee(_ref5) {
    var isChanged = _ref5.isChanged;
    return isChanged;
  }).length;
  return [results.length, changedDeps];
};
/**
 * @param data
 * @param options
 * @returns {{lookups: [], promises: []}}
 */


var getDepPromises = function getDepPromises(_ref6, options) {
  var data = _ref6.data;
  var sections = options.sections,
      json = options.json,
      onlyChanged = options['only-changed'],
      ignoreStars = options['ignore-stars'],
      ignorePegged = options['ignore-pegged'];
  return Object.keys(deps).reduce(function iteratee(promisesObject, key) {
    var _deps$key = deps[key],
        section = _deps$key.section,
        title = _deps$key.title;

    if (sections.indexOf(section) !== -1) {
      var depLookup = Promise.all(dependenciesLookup(data[key], {
        stars: ignoreStars,
        pegged: ignorePegged
      }));
      promisesObject.lookups.push(depLookup);
      var create = json ? createResultJSON(key, onlyChanged) : createResultTable(title, onlyChanged);
      promisesObject.promises.push(depLookup.then(create));
    }

    return promisesObject;
  }, {
    lookups: [],
    promises: []
  });
};
/**
 * The main entry point.
 */


var salita = function salita(dir, options, callback) {
  // Package.json.
  var filename = path.join(dir, 'package.json');
  jsonFile(filename).then(loadNPM).then(function thenee(pkg) {
    if (pkg && !options.json) {
      console.log('Found package.json.');
    }

    var dep = getDepPromises(pkg, options); // Wait for all of them to resolve.

    Promise.all(dep.promises).then(function theneeAll(depResults) {
      if (options.json) {
        console.log(JSON.stringify(Object.assign.apply(null, [{}].concat(depResults)), null, 2));
      } else {
        depResults.forEach(function outerIteratee(results) {
          results.map(String).forEach(function innerIteratee(result) {
            console.log(result);
          });
        });
      }

      var counts = Promise.all(dep.lookups.map(createMapThen(getDepCounts))); // Write back the package.json.

      if (options['dry-run']) {
        return callback(counts);
      }

      return pkg.save(callback.bind(null, counts));
    });
  }).done();
};

Object.defineProperty(salita, 'sections', {
  enumerable: true,
  value: Object.keys(deps).map(function iteratee(key) {
    return deps[key].section;
  })
});

if (Object.freeze) {
  Object.freeze(salita.sections);
}

module.exports = salita;

//# sourceMappingURL=salita.js.map