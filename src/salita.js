import path from 'path';
import npm from 'npm';
import jsonFilePlus from 'json-file-plus';
import Table from 'cli-table';
import chalk from 'chalk';
import semver from 'semver';
import view from 'npm/lib/view';

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

/**
 * @typedef {object} DepSubObject
 * @property {string} section
 * @property {string} title
 */

/**
 * @typedef {object} DepObject
 * @property {DepSubObject} dependencies
 * @property {DepSubObject} devDependencies
 * @property {DepSubObject} peerDependencies
 */

/** @type {DepObject} */
const deps = {
  dependencies: {section: 'dep', title: 'Dependencies'},
  devDependencies: {section: 'dev', title: 'Development Dependencies'},
  peerDependencies: {section: 'peer', title: 'Peer Dependencies'},
};

/** @type {Array<string>} */
const depsKeys = Object.keys(deps);

/** @type {Array<string>} */
const depsSections = depsKeys.map(function iteratee(key) {
  return deps[key].section;
});

/**
 * @param {object} tableChars - Table options chars.
 * @param {string} key - Char key.
 * @returns {object} Table options chars.
 */
const charsIteratee = function charsIteratee(tableChars, key) {
  tableChars[key] = '';

  return tableChars;
};

/**
 * @returns {Table} The CLI table.
 */
const getTable = function getTable() {
  const table = new Table({});

  table.options.chars = Object.keys(table.options.chars).reduce(charsIteratee, {});

  return table;
};

/**
 * @param {string} key - The section name.
 * @param {boolean} onlyChanged - Only changed option.
 * @returns {function(*): object} The bound result to JSON function.
 */
const createResultJSON = function createResultJSON(key, onlyChanged) {
  const predicate = function predicate(result) {
    return !onlyChanged || result.isChanged;
  };

  return function resultJSON(results) {
    return {
      [key]: results.filter(predicate),
    };
  };
};

/**
 * @param {string} message - Message in chalk colour.
 * @param {object} result - Package result.
 * @returns {Array<string>} - Row message array.
 */
const getRowFromTo = function getRowFromTo(message, result) {
  return [message, result.name, 'from', chalk.yellow(result.before), 'to', chalk.yellow(result.after)];
};

/**
 * @param {string} message - Message in chalk colour.
 * @param {object} result - Package result.
 * @returns {Array<string>} - Row message array.
 */
const getRowAt = function getRowAt(message, result) {
  return [message, result.name, 'at', chalk.yellow(result.before)];
};

/**
 * @param {object} result - Package result.
 * @returns {boolean} Indicates if the range is satisfied.
 */
const isRangeSatisfied = function isRangeSatisfied(result) {
  return result.isUpdatable || result.isStar || result.isPegged;
};

/**
 * @param {boolean} onlyChanged - Only changed option.
 * @returns {function(object): Array<string>} - Row iteratee.
 */
const createRowIteratee = function createRowIteratee(onlyChanged) {
  return function rowIteratee(result) {
    if (result.isChanged) {
      return getRowFromTo(chalk.green('Changed: '), result);
    }

    if (result.error) {
      return [...getRowAt(chalk.red('Package not found: '), result), chalk.bold.red('?')];
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
const sortByName = function sortByName(a, b) {
  return a[1].localeCompare(b[1]);
};

/**
 * @param {string} caption - Section caption.
 * @param {boolean} onlyChanged - Only changed options.
 * @returns {function(Array<object>): [string, Table]} The array of chalked caption and CLI table.
 */
const createResultTable = function createResultTable(caption, onlyChanged) {
  return function resultTable(results) {
    const table = getTable();

    if (results.length > 0) {
      const tableRows = results.map(createRowIteratee(onlyChanged)).filter(Boolean);

      table.push(...tableRows);
      table.sort(sortByName);
    } else {
      table.push([chalk.gray('None found')]);
    }

    return [chalk.green.underline(`${caption}:`), table];
  };
};

/**
 * @param {PackagePlus} packagePlus - The packagePlus object.
 * @returns {Promise<PackagePlus>} The package.json object.
 */
const loadNPM = function loadNPM(packagePlus) {
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
const isVersionPegged = function isVersionPegged(version) {
  try {
    /* eslint-disable-next-line babel/new-cap */
    const range = semver.Range(version);

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
const assertLatestLength = function assertLatestLength(latest) {
  if (latest.length !== 1) {
    throw new Error(`expected 1 version key, got: ${latest}`);
  }

  return latest;
};

/**
 * Given a package name, lookup the semantic tags.
 *
 * @param {string} name - The module name.
 * @param {function(Error, {prefix: (undefined|string), tags: (undefined|object)}): *} callback - A function to call with the dist tags.
 */
const lookupDistTags = function lookupDistTags(name, callback) {
  /* Need to require here, because NPM does all sorts of funky global attaching. */
  //* eslint-disable-next-line global-require */
  // const view = require('npm/lib/view');

  /* Call View directly to ensure the arguments actually work. */
  view([name, 'dist-tags'], true, function cb(err, desc) {
    if (err) {
      callback(err, {});
    } else {
      const prefix = npm.config.get('save-prefix');
      const latest = assertLatestLength(Object.keys(desc));
      const tags = desc[latest]['dist-tags'];

      callback(null, {prefix, tags});
    }
  });
};

/**
 * @param {string} existing - The existing package version from package.json file.
 * @param {string} version - The package version from update check.
 * @returns {boolean} Indicates if the package is updatable or not.
 */
const getIsUpdatable = function getIsUpdatable(existing, version) {
  try {
    /* eslint-disable-next-line babel/new-cap */
    const range = semver.Range(existing);

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
const createUntouched = function createUntouched(pkg, flags) {
  const {name, version} = pkg;

  return Promise.resolve({
    ...{
      after: version,
      before: version,
      isChanged: false,
      isUpdatable: false,
      name,
    },
    ...flags,
  });
};

/**
 * @param {string} version - The package version.
 * @returns {boolean} Indicates if it is star or not.
 */
const isVersionStar = function isVersionStar(version) {
  return version === '*' || version === 'latest';
};

/**
 * @param {{names: Array<string>, section: object}} data - The names array and package.json section.
 * @param {{stars: boolean, pegged: boolean}} ignore - Ignore options.
 * @returns {{names: Array<string>, untouched: Array<Promise<object>>}} The filtered names and untouched objects.
 */
const reduceNamesAndUntouched = function reduceNamesAndUntouched({names, section}, {stars, pegged}) {
  const predicate = function predicate(filterObject, name) {
    const version = section[name];

    if (stars && isVersionStar(version)) {
      filterObject.untouched.push(createUntouched({name, version}, {isStar: true}));
    } else if (pegged && isVersionPegged(version)) {
      filterObject.untouched.push(createUntouched({name, version}, {isPegged: true}));
    } else {
      filterObject.names.push(name);
    }

    return filterObject;
  };

  return names.reduce(predicate, {names: [], untouched: []});
};

/**
 * @param {object} section - The section object.
 * @param {{stars: boolean, pegged: boolean}} ignore - Ignore options.
 * @returns {{names: Array<string>, untouched: Array<Promise<object>>}} The object of promise arrays.
 */
const getNamesAndUntouched = function getNamesAndUntouched(section, {stars, pegged}) {
  const names = Object.keys(section);

  if (stars || pegged) {
    return reduceNamesAndUntouched({names, section}, {stars, pegged});
  }

  return {names, untouched: []};
};

/**
 * @param {object} section - A section object.
 * @returns {boolean} Is it a populated section object.
 */
const isSection = function isSection(section) {
  return typeof section === 'object' && Boolean(section) && Object.keys(section).length > 0;
};

/**
 * @param {{version: *, isUpdatable: boolean, existing: string, updated: string}} params - Parameters to check.
 * @returns {boolean} - Has the version changed.
 */
const isVersionChanged = function isVersionChanged({version, isUpdatable, existing, updated}) {
  return version !== null && isUpdatable && existing !== updated;
};

/**
 * @param {{section: object, name: string, data: object, existing: string}} params - The parameters.
 * @returns {{isUpdatable: boolean, before: string, isChanged: boolean, name: string, after: string}} The result.
 */
const updateDescriptorAndGetResult = function updateDescriptorAndGetResult({section, name, data, existing}) {
  const version = data.tags.latest;
  const isUpdatable = getIsUpdatable(existing, version);
  const updated = data.prefix + version;
  const isChanged = isVersionChanged({version, isUpdatable, existing, updated});

  if (isChanged) {
    /* Actually write to the package descriptor. */
    section[name] = updated;
  }

  return {after: updated, before: existing, isChanged, isUpdatable, name};
};

/**
 * @param {{resolve: Function, section: object, name: string}} params - The parameters.
 * @returns {function(Error, {prefix: (undefined|string), tags: (undefined|object)})} The callback function.
 */
const createLookupDistTagsCallback = function createLookupDistTagsCallback({resolve, section, name}) {
  return function lookupDistTagsCallback(error, data) {
    const existing = section[name];

    if (error) {
      resolve({after: existing, before: existing, error, isChanged: false, isUpdatable: false, name});
    } else {
      resolve(updateDescriptorAndGetResult({section, name, data, existing}));
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
const dependenciesLookup = function dependenciesLookup(section, ignore) {
  /* See if any dependencies of this type exist. */
  if (isSection(section) === false) {
    return [];
  }

  /* Loop through and map the "lookup latest" to promises. */
  const {names, untouched} = getNamesAndUntouched(section, ignore);

  const mapNameToLatest = function mapNameToLatest(name) {
    return new Promise(function executee(resolve) {
      lookupDistTags(name, createLookupDistTagsCallback({resolve, section, name}));
    });
  };

  return names.map(mapNameToLatest).concat(untouched);
};

/**
 * @param {function(Array<object>): TotalsArray} fn - The function to execute on resolve.
 * @returns {function(Promise<object>): (Promise<TotalsArray>)} - Promise of result lengths.
 */
const createMapThen = function createMapThen(fn) {
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
const getDepCounts = function getDepCounts(results) {
  /** @type {number} */
  const changedDeps = results.filter(function iteratee({isChanged}) {
    return isChanged;
  }).length;

  /** @type {number} */
  const totalDeps = results.length;

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
const getDepPromises = function getDepPromises(packagePlus, options) {
  const {data} = packagePlus;
  const {sections, json, onlyChanged, ignoreStars, ignorePegged} = options;
  /**
   * @param {DepPromises} depPromises - The object of promise arrays.
   * @param {string} key - The deps key.
   * @returns {DepPromises} The object of promise arrays.
   */
  const iteratee = function iteratee(depPromises, key) {
    const {section, title} = deps[key];

    if (sections.indexOf(section) !== -1) {
      const depLookup = Promise.all(dependenciesLookup(data[key], {stars: ignoreStars, pegged: ignorePegged}));
      depPromises.lookups.push(depLookup);

      const create = json ? createResultJSON(key, onlyChanged) : createResultTable(title, onlyChanged);
      depPromises.promises.push(depLookup.then(create));
    }

    return depPromises;
  };

  return depsKeys.reduce(iteratee, {lookups: [], promises: []});
};

/**
 *
 * @param {object} options - The user options.
 * @returns {function(PackagePlus): PackagePlus} The packagePlus object.
 */
const createFoundPackageJsonLogger = function createFoundPackageJsonLogger(options) {
  const {json, quiet} = options;

  return function foundPackageJsonLogger(packagePlus) {
    if (packagePlus && !json && !quiet) {
      process.stdout.write(`Found: ${packagePlus.filename}\n`);
    }

    return packagePlus;
  };
};

/**
 * @param {object} results - The results object.
 */
const printEach = function printEach(results) {
  results.map(String).forEach(function innerIteratee(result) {
    process.stdout.write(`${result}\n`);
  });
};

/**
 * @param {DepPromises} depPromises - The object of promise arrays.
 * @param {object} options - The user options.
 * @returns {function(Array): DepPromises} The depPromises object.
 */
const createPrinter = function createPrinter(depPromises, options) {
  const {json, quiet} = options;

  return function printer(depResults) {
    if (!quiet) {
      if (json) {
        process.stdout.write(`${JSON.stringify(Object.assign.apply(null, [{}].concat(depResults)), null, 2)}\n`);
      } else {
        depResults.forEach(printEach);
      }
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
const createPromiseAllPromises = function createPromiseAllPromises(options) {
  return function promiseAllPromises(packagePlus) {
    const depPromises = getDepPromises(packagePlus, options);

    /* Wait for all of them to resolve. */
    return Promise.all(depPromises.promises)
      .then(createPrinter(depPromises, options))
      .then(function thenee() {
        return {packagePlus, depPromises};
      });
  };
};

/**
 * @param {DepPromises} depPromises - The depPromises object.
 * @returns {Promise<Array<TotalsArray>>} The promised array of counts.
 */
const getPromiseCounts = function getPromiseCounts(depPromises) {
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
const countIteratee = function countIteratee(acc, category) {
  acc.changed += category[1];
  acc.total += category[0];

  return acc;
};

/**
 * @param {object} options - The user options.
 * @returns {function(PlusPromises): Promise<(TotalsObject|PackagePlus)>} - The final results.
 */
const createCountAndSave = function createCountAndSave(options) {
  const {check, json, quiet} = options;

  return function countAndSave({packagePlus, depPromises}) {
    return getPromiseCounts(depPromises).then(function thenee(counts) {
      const sums = counts.reduce(countIteratee, {changed: 0, total: 0});

      if (!json && !quiet) {
        process.stdout.write(`\n${sums.changed} updated out of ${sums.total} total dependencies.\n\n`);
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
 * @typedef {object} UserOptions
 * @property {boolean} color - Default true.
 * @property {boolean} json - Default false.
 * @property {boolean} dryRun - Default true.
 * @property {boolean} update - Default false.
 * @property {boolean} onlyChanged - Default false.
 * @property {boolean} check - Default false.
 * @property {Array<string>} sections - Default ['dep','dev','peer].
 * @property {boolean} quiet - Default false.
 * @property {boolean} ignorePegged - Default false.
 * @property {boolean} ignoreStars - Default false.
 */

/**
 * @returns {UserOptions} - The default values.
 */
const defaultOptions = function defaultOptions() {
  return {
    color: true,
    json: false,
    dryRun: true,
    update: false,
    onlyChanged: false,
    check: false,
    sections: depsSections,
    quiet: false,
    ignorePegged: false,
    ignoreStars: false,
  };
};

/**
 * @param {Array} optionValue - The user option value.
 * @param {Array} defaultValue - The default value.
 * @returns {Array} The normalize value.
 */
const normalizeSections = function normalizeSections(optionValue, defaultValue) {
  return optionValue.reduce(function iteratee(acc, item) {
    if (acc.indexOf(item) === -1 && defaultValue.indexOf(item) !== -1) {
      acc.push(item);
    }

    return acc;
  }, []);
};

/**
 * @param {UserOptions} opts - The default options.
 * @param {UserOptions} options - The user options.
 */
const normalizeValues = function normalizeValues(opts, options) {
  Object.keys(opts).forEach(function iteratee(key) {
    const defaultValue = opts[key];
    const optionValue = options[key];

    if (key === 'sections') {
      if (Array.isArray(optionValue)) {
        opts[key] = normalizeSections(optionValue, defaultValue);
      }
    } else if (typeof optionValue === 'boolean') {
      opts[key] = optionValue;
    }
  });
};

/**
 * @param {UserOptions} options - The user options.
 * @returns {UserOptions} Defaults merged with user options.
 */
const normalizeOptions = function normalizeOptions(options) {
  const opts = defaultOptions();

  if (typeof options === 'object' && options) {
    normalizeValues(opts, options);
  }

  return opts;
};

/**
 * The main entry point.
 *
 * @param {string} dir - The working directory.
 * @param {object} options - The user options.
 * @returns {Promise<(TotalsObject|PackagePlus)>} The packagePlus promise.
 */
const salita = function salita(dir, options) {
  if (typeof dir !== 'string') {
    throw new TypeError(`Path must be a string. Received ${dir}`);
  }

  const opts = normalizeOptions(options);
  chalk.enabled = opts.color && !opts.json;
  const filename = path.join(dir, 'package.json');
  /** @type {Promise<object>} */
  const packagePlus = jsonFilePlus(filename);

  return Promise.resolve(packagePlus)
    .then(loadNPM)
    .then(createFoundPackageJsonLogger(opts))
    .then(createPromiseAllPromises(opts))
    .then(createCountAndSave(opts));
};

Object.defineProperty(salita, 'sections', {
  enumerable: true,
  get() {
    return depsSections.slice();
  },
});

export default salita;
