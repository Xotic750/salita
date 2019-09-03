const path = require('path');
const npm = require('npm');
const jsonFilePlus = require('json-file-plus');
const Table = require('cli-table');
const chalk = require('chalk');
const semver = require('semver');

const deps = {
  dependencies: {section: 'dep', title: 'Dependencies'},
  devDependencies: {section: 'dev', title: 'Development Dependencies'},
  peerDependencies: {section: 'peer', title: 'Peer Dependencies'},
};

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
 * @param {object} packagePlus - The packagePlus object.
 * @returns {Promise<object>} The package.json object.
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
  /*  Need to require here, because NPM does all sorts of funky global attaching. */
  /* eslint-disable-next-line global-require */
  const view = require('npm/lib/view');
  const prefix = npm.config.get('save-prefix');

  /* Call View directly to ensure the arguments actually work. */
  view([name, 'dist-tags'], true, function cb(err, desc) {
    if (err) {
      callback(err, {});
    } else {
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
 * @param {function(Array<object>): Array<number>} fn - The function to execute on resolve.
 * @returns {function(Promise<object>): (Promise<Array<number>>)} - Promise of result lengths.
 */
const createMapThen = function createMapThen(fn) {
  return function mapThen(promise) {
    return promise.then(fn);
  };
};

/**
 * @param {object} results - The results object.
 * @returns {[number, number]} The array of dependency counts.
 */
const getDepCounts = function getDepCounts(results) {
  const changedDeps = results.filter(function iteratee({isChanged}) {
    return isChanged;
  }).length;

  return [results.length, changedDeps];
};

/**
 * @param {object} packagePlus - The packagePlus object.
 * @param {{sections: Array<string>, json: boolean, 'only-changed': boolean, 'ignore-stars': boolean, 'ignore-pegged': boolean}} options - The user options.
 * @returns {{lookups: Array<Promise<object>>, promises: Array<Promise<object>>}} The object of promise arrays.
 */
const getDepPromises = function getDepPromises(packagePlus, options) {
  const {data} = packagePlus;
  const {sections, json, 'only-changed': onlyChanged, 'ignore-stars': ignoreStars, 'ignore-pegged': ignorePegged} = options;
  const iteratee = function iteratee(promisesObject, key) {
    const {section, title} = deps[key];

    if (sections.indexOf(section) !== -1) {
      const depLookup = Promise.all(dependenciesLookup(data[key], {stars: ignoreStars, pegged: ignorePegged}));
      promisesObject.lookups.push(depLookup);

      const create = json ? createResultJSON(key, onlyChanged) : createResultTable(title, onlyChanged);
      promisesObject.promises.push(depLookup.then(create));
    }

    return promisesObject;
  };

  return Object.keys(deps).reduce(iteratee, {lookups: [], promises: []});
};

/**
 *
 * @param {object} options - The user options.
 * @returns {function(object): object} The packagePlus object.
 */
const createFoundPackageJsonLogger = function createFoundPackageJsonLogger(options) {
  const {json} = options;

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
const printEach = function printEach(results) {
  results.map(String).forEach(function innerIteratee(result) {
    console.log(result);
  });
};

/**
 * @param {{lookups: Array<Promise<object>>, promises: Array<Promise<object>>}} depPromises - The object of promise arrays.
 * @param {boolean} json - To print JSON or not.
 * @returns {function(Array): {lookups: Array<Promise<object>>, promises: Array<Promise<object>>}} The depPromises object.
 */
const createPrinter = function createPrinter(depPromises, json) {
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
 * @param {object} options - The user options.
 * @returns {function(object): Promise<{pkg: object, dep: {lookups: Array<Promise<object>>, promises: Array<Promise<object>>}}>} The pkg and dep objects.
 */
const createPromiseAllPromises = function createPromiseAllPromises(options) {
  return function promiseAllPromises(pkg) {
    const depPromises = getDepPromises(pkg, options);

    /* Wait for all of them to resolve. */
    return Promise.all(depPromises.promises)
      .then(createPrinter(depPromises, options.json))
      .then(function thenee(dep) {
        return {pkg, dep};
      });
  };
};

/**
 * @param {{lookups: Array<Promise<object>>, promises: Array<Promise<object>>}} dep - The depPromises object.
 * @returns {Promise<Array<Array<number>>>} The promised array of counts.
 */
const getPromiseCounts = function getPromiseCounts(dep) {
  return Promise.all(dep.lookups.map(createMapThen(getDepCounts)));
};

/**
 * @param {function(Promise<Array<Array<number>>>): *} callback - The callback function.
 * @param {object} options - The user options.
 * @returns {function({packagePlus: object, dep: object})} - The callback result.
 */
const createPromiseCallback = function createPromiseCallback(callback, options) {
  return function promiseCallback({packagePlus, dep}) {
    const counts = getPromiseCounts(dep);

    /* Write back the package.json. */
    if (options['dry-run']) {
      return callback(counts);
    }

    return packagePlus.save(callback.bind(null, counts));
  };
};

/**
 * The main entry point.
 *
 * @param {string} dir - The working directory.
 * @param {object} options - The user options.
 * @param {function(Promise<Array<Array<number>>>): *} callback - The callback function.
 * @returns {Promise<*>} The done promise.
 */
const salita = function salita(dir, options, callback) {
  const filename = path.join(dir, 'package.json');
  /** @type {Promise<object>} */
  const packagePlus = jsonFilePlus(filename);

  return packagePlus
    .then(loadNPM)
    .then(createFoundPackageJsonLogger(options))
    .then(createPromiseAllPromises(options))
    .then(createPromiseCallback(callback, options))
    .done();
};

Object.defineProperty(salita, 'sections', {
  enumerable: true,
  value: Object.keys(deps).map(function iteratee(key) {
    return deps[key].section;
  }),
});

if (Object.freeze) {
  Object.freeze(salita.sections);
}

module.exports = salita;
