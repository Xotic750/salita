"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var path = require('path');

var npm = require('npm');

var jsonFilePlus = require('json-file-plus');

var Table = require('cli-table');

var chalk = require('chalk');

var semver = require('semver');
/**
 * @typedef {object} PackagePlus
 * @property {object} data
 * @property {object} format
 * @property {Function} get
 * @property {Function} set
 * @property {Function} remove
 * @property {string} filename
 * @property {Function} save
 */


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
var depsKeys = Object.keys(deps);
var depsSections = depsKeys.map(function iteratee(key) {
  return deps[key].section;
});
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
 * @param {PackagePlus} packagePlus - The packagePlus object.
 * @returns {Promise<PackagePlus>} The package.json object.
 */


var loadNPM = function loadNPM(packagePlus) {
  return new Promise(function executee(resolve, reject) {
    npm.load({}, function callback(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  }).then(function thenee() {
    return packagePlus;
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
 * @param {Array} latest - The latest result array.
 * @returns {Array} The latest result array.
 */


var assertLatestLength = function assertLatestLength(latest) {
  if (latest.length !== 1) {
    throw new Error("expected 1 version key, got: ".concat(latest));
  }

  return latest;
};
/**
 * Given a package name, lookup the semantic tags.
 *
 * @param {string} name - The module name.
 * @param {function(Error, {prefix: (undefined|string), tags: (undefined|object)}): *} callback - A function to call with the dist tags.
 */


var lookupDistTags = function lookupDistTags(name, callback) {
  /*  Need to require here, because NPM does all sorts of funky global attaching. */

  /* eslint-disable-next-line global-require */
  var view = require('npm/lib/view');

  var prefix = npm.config.get('save-prefix');
  /* Call View directly to ensure the arguments actually work. */

  view([name, 'dist-tags'], true, function cb(err, desc) {
    if (err) {
      callback(err, {});
    } else {
      var latest = assertLatestLength(Object.keys(desc));
      var tags = desc[latest]['dist-tags'];
      callback(null, {
        prefix: prefix,
        tags: tags
      });
    }
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
 * @param {object} section - A section object.
 * @returns {boolean} Is it a populated section object.
 */


var isSection = function isSection(section) {
  return _typeof(section) === 'object' && Boolean(section) && Object.keys(section).length > 0;
};
/**
 * @param {{version: *, isUpdatable: boolean, existing: string, updated: string}} params - Parameters to check.
 * @returns {boolean} - Has the version changed.
 */


var isVersionChanged = function isVersionChanged(_ref5) {
  var version = _ref5.version,
      isUpdatable = _ref5.isUpdatable,
      existing = _ref5.existing,
      updated = _ref5.updated;
  return version !== null && isUpdatable && existing !== updated;
};
/**
 * @param {{section: object, name: string, data: object, existing: string}} params - The parameters.
 * @returns {{isUpdatable: boolean, before: string, isChanged: boolean, name: string, after: string}} The result.
 */


var updateDescriptorAndGetResult = function updateDescriptorAndGetResult(_ref6) {
  var section = _ref6.section,
      name = _ref6.name,
      data = _ref6.data,
      existing = _ref6.existing;
  var version = data.tags.latest;
  var isUpdatable = getIsUpdatable(existing, version);
  var updated = data.prefix + version;
  var isChanged = isVersionChanged({
    version: version,
    isUpdatable: isUpdatable,
    existing: existing,
    updated: updated
  });

  if (isChanged) {
    /* Actually write to the package descriptor. */
    section[name] = updated;
  }

  return {
    after: updated,
    before: existing,
    isChanged: isChanged,
    isUpdatable: isUpdatable,
    name: name
  };
};
/**
 * @param {{resolve: Function, section: object, name: string}} params - The parameters.
 * @returns {function(Error, {prefix: (undefined|string), tags: (undefined|object)})} The callback function.
 */


var createLookupDistTagsCallback = function createLookupDistTagsCallback(_ref7) {
  var resolve = _ref7.resolve,
      section = _ref7.section,
      name = _ref7.name;
  return function lookupDistTagsCallback(error, data) {
    var existing = section[name];

    if (error) {
      resolve({
        after: existing,
        before: existing,
        error: error,
        isChanged: false,
        isUpdatable: false,
        name: name
      });
    } else {
      resolve(updateDescriptorAndGetResult({
        section: section,
        name: name,
        data: data,
        existing: existing
      }));
    }
  };
};
/**
 * CreateDependenciesLookup.
 *
 * @param {object} section - The package.json section object.
 * @param {{stars: boolean, pegged: boolean}} ignore - Ignore options.
 * @returns {Array<Promise<object>>} An array of the promised objects.
 */


var dependenciesLookup = function dependenciesLookup(section, ignore) {
  /* See if any dependencies of this type exist. */
  if (isSection(section) === false) {
    return [];
  }
  /* Loop through and map the "lookup latest" to promises. */


  var _getNamesAndUntouched = getNamesAndUntouched(section, ignore),
      names = _getNamesAndUntouched.names,
      untouched = _getNamesAndUntouched.untouched;

  var mapNameToLatest = function mapNameToLatest(name) {
    return new Promise(function executee(resolve) {
      lookupDistTags(name, createLookupDistTagsCallback({
        resolve: resolve,
        section: section,
        name: name
      }));
    });
  };

  return names.map(mapNameToLatest).concat(untouched);
};
/**
 * @param {function(Array<object>): TotalsArray} fn - The function to execute on resolve.
 * @returns {function(Promise<object>): (Promise<TotalsArray>)} - Promise of result lengths.
 */


var createMapThen = function createMapThen(fn) {
  return function mapThen(promise) {
    return promise.then(fn);
  };
};
/**
 * Total and Changed.
 *
 * @typedef {Array<number>} TotalsArray
 */

/**
 * @param {object} results - The results object.
 * @returns {TotalsArray} The array of dependency counts.
 */


var getDepCounts = function getDepCounts(results) {
  /** @type {number} */
  var changedDeps = results.filter(function iteratee(_ref8) {
    var isChanged = _ref8.isChanged;
    return isChanged;
  }).length;
  /** @type {number} */

  var totalDeps = results.length;
  return [totalDeps, changedDeps];
};
/**
 * @typedef {object} DepPromises
 * @property {Array<Promise<object>>} lookups
 * @property {Array<Promise<object>>} promises
 */

/**
 * @param {PackagePlus} packagePlus - The packagePlus object.
 * @param {{sections: Array<string>, json: boolean, onlyChanged: boolean, ignoreStars: boolean, ignorePegged: boolean}} options - The user options.
 * @returns {DepPromises} The object of promise arrays.
 */


var getDepPromises = function getDepPromises(packagePlus, options) {
  var data = packagePlus.data;
  var sections = options.sections,
      json = options.json,
      onlyChanged = options.onlyChanged,
      ignoreStars = options.ignoreStars,
      ignorePegged = options.ignorePegged;
  /**
   * @param {DepPromises} depPromises - The object of promise arrays.
   * @param {string} key - The deps key.
   * @returns {DepPromises} The object of promise arrays.
   */

  var iteratee = function iteratee(depPromises, key) {
    var _deps$key = deps[key],
        section = _deps$key.section,
        title = _deps$key.title;

    if (sections.indexOf(section) !== -1) {
      var depLookup = Promise.all(dependenciesLookup(data[key], {
        stars: ignoreStars,
        pegged: ignorePegged
      }));
      depPromises.lookups.push(depLookup);
      var create = json ? createResultJSON(key, onlyChanged) : createResultTable(title, onlyChanged);
      depPromises.promises.push(depLookup.then(create));
    }

    return depPromises;
  };

  return depsKeys.reduce(iteratee, {
    lookups: [],
    promises: []
  });
};
/**
 *
 * @param {object} options - The user options.
 * @returns {function(PackagePlus): PackagePlus} The packagePlus object.
 */


var createFoundPackageJsonLogger = function createFoundPackageJsonLogger(options) {
  var json = options.json;
  return function foundPackageJsonLogger(packagePlus) {
    if (packagePlus && !json) {
      console.log('Found package.json.');
    }

    return packagePlus;
  };
};
/**
 * @param {object} results - The results object.
 */


var printEach = function printEach(results) {
  results.map(String).forEach(function innerIteratee(result) {
    console.log(result);
  });
};
/**
 * @param {DepPromises} depPromises - The object of promise arrays.
 * @param {boolean} json - To print JSON or not.
 * @returns {function(Array): DepPromises} The depPromises object.
 */


var createPrinter = function createPrinter(depPromises, json) {
  return function printer(depResults) {
    if (json) {
      console.log(JSON.stringify(Object.assign.apply(null, [{}].concat(depResults)), null, 2));
    } else {
      depResults.forEach(printEach);
    }

    return depPromises;
  };
};
/**
 * @typedef {object} PlusPromises
 * @property {PackagePlus} packagePlus
 * @property {DepPromises} depPromises
 */

/**
 * @param {object} options - The user options.
 * @returns {function(PackagePlus): Promise<PlusPromises>} The packagePlus and depPromises.
 */


var createPromiseAllPromises = function createPromiseAllPromises(options) {
  return function promiseAllPromises(packagePlus) {
    var depPromises = getDepPromises(packagePlus, options);
    /* Wait for all of them to resolve. */

    return Promise.all(depPromises.promises).then(createPrinter(depPromises, options.json)).then(function thenee() {
      return {
        packagePlus: packagePlus,
        depPromises: depPromises
      };
    });
  };
};
/**
 * @param {DepPromises} depPromises - The depPromises object.
 * @returns {Promise<Array<TotalsArray>>} The promised array of counts.
 */


var getPromiseCounts = function getPromiseCounts(depPromises) {
  return Promise.all(depPromises.lookups.map(createMapThen(getDepCounts)));
};
/**
 * @typedef {object} TotalsObject
 * @property {number} changed
 * @property {number} total
 */

/**
 * @param {TotalsObject} acc - Totals accumulator.
 * @param {TotalsArray} category - Category counts.
 * @returns {TotalsObject} The totals accumulator.
 */


var countIteratee = function countIteratee(acc, category) {
  acc.changed += category[1];
  acc.total += category[0];
  return acc;
};
/**
 * @param {object} options - The user options.
 * @returns {function(PlusPromises): Promise<(TotalsObject|PackagePlus)>} - The final results.
 */


var createCountAndSave = function createCountAndSave(options) {
  var check = options.check,
      json = options.json;
  return function countAndSave(_ref9) {
    var packagePlus = _ref9.packagePlus,
        depPromises = _ref9.depPromises;
    return getPromiseCounts(depPromises).then(function thenee(counts) {
      var sums = counts.reduce(countIteratee, {
        changed: 0,
        total: 0
      });

      if (!json) {
        console.log("\n".concat(sums.changed, " updated out of ").concat(sums.total, " total dependencies."));
      }

      if (check) {
        return sums;
      }
      /* Write back the package.json. */


      return options.dryRun ? packagePlus : packagePlus.save();
    });
  };
};
/**
 * The main entry point.
 *
 * @param {string} dir - The working directory.
 * @param {object} options - The user options.
 * @returns {Promise<(TotalsObject|PackagePlus)>} The packagePlus promise.
 */


var salita = function salita(dir, options) {
  var filename = path.join(dir, 'package.json');
  /** @type {Promise<object>} */

  var packagePlus = jsonFilePlus(filename);
  return packagePlus.then(loadNPM).then(createFoundPackageJsonLogger(options)).then(createPromiseAllPromises(options)).then(createCountAndSave(options));
};

Object.defineProperty(salita, 'sections', {
  enumerable: true,
  get: function get() {
    return depsSections.slice();
  }
});
module.exports = salita;

//# sourceMappingURL=salita.js.map