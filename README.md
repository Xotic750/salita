<a
  href="https://travis-ci.org/Xotic750/salita"
  title="Travis status">
<img
  src="https://travis-ci.org/Xotic750/salita.svg?branch=master"
  alt="Travis status" height="18">
</a>
<a
  href="https://david-dm.org/Xotic750/salita"
  title="Dependency status">
<img src="https://david-dm.org/Xotic750/salita/status.svg"
  alt="Dependency status" height="18"/>
</a>
<a
  href="https://david-dm.org/Xotic750/salita?type=dev"
  title="devDependency status">
<img src="https://david-dm.org/Xotic750/salita/dev-status.svg"
  alt="devDependency status" height="18"/>
</a>
<a
  href="https://badge.fury.io/js/%40xotic750%2Fsalita"
  title="npm version">
<img src="https://badge.fury.io/js/%40xotic750%2Fsalita.svg"
  alt="npm version" height="18">
</a>
<a
  href="https://bettercodehub.com/results/Xotic750/salita"
  title="bettercodehub score">
<img src="https://bettercodehub.com/edge/badge/Xotic750/salita?branch=master"
  alt="bettercodehub score" height="18">
</a>
<a
  href="https://coveralls.io/github/Xotic750/salita?branch=master"
  title="Coverage Status">
<img src="https://coveralls.io/repos/github/Xotic750/salita/badge.svg?branch=master"
  alt="Coverage Status" height="18">
</a>

# Salita

Automatically upgrade all dependencies and devDependencies to their latest stable semver.

### CLI

#### Install

```bash
npm install @xotic750/salita -g
```

#### Options

- `--no-color`: prevents colorized output
- `--json`: provides parseable JSON output (also disables colors)
- `--dry-run` / `-n`: prevents changes to `package.json`
- `--update`: reflects the changes in `package.json`
- `--ignore-stars`: ignore updates to packages that are set to "`*`" or "`latest`"
- `--ignore-pegged`: ignore updates to packages that are pegged to a single version, rather than a range
- `--check`: implies "dry-run"; and returns with an exit code matching the number of updated dependencies.
- `--sections`: comma-separated list of sections to process, default: dep dev peer opt
- `--only-changed`: only show packages that have (or would have) changed
- `--quiet`: do not print information

#### Example

```bash
# Change into directory with package.json.
cd my_project

# Upgrade all dependencies.
salita
Running in dry-run mode. Use --update to persist changes to package.json.
Found: /Users/me/my_project/package.json
Dependencies:
 Kept:   chalk           at  ^2.4.2  
 Kept:   cli-table       at  ^0.3.1  
 Kept:   json-file-plus  at  ^3.3.1  
 Kept:   npm             at  ^6.11.3 
 Kept:   semver          at  ^6.3.0  
 Kept:   yargs           at  ^14.0.0 
Development Dependencies:
 Kept:                               @babel/cli                                 at    ^7.5.5        
 Kept:                               @babel/core                                at    ^7.5.5        
 Kept:                               @babel/node                                at    ^7.5.5        
 Kept:                               @babel/plugin-transform-property-mutators  at    ^7.2.0        
 Kept:                               @babel/plugin-transform-runtime            at    ^7.5.5        
 Kept:                               @babel/preset-env                          at    ^7.5.5        
 Kept:                               @babel/runtime                             at    ^7.5.5        
 Kept:                               @types/jest                                at    ^24.0.18      
 Changed:                            @types/node                                from  ^12.7.3        to  ^12.7.4 
 Kept:                               @types/webpack                             at    ^4.39.1       
 Kept:                               @xotic750/eslint-config-recommended        at    ^1.1.9        
 Requested range not satisfied by:   babel-core                                 from  ^7.0.0-0       to  ^6.26.3 
 Kept:                               babel-eslint                               at    ^10.0.3       
 Kept:                               babel-loader                               at    ^8.0.6        
 Kept:                               babel-plugin-lodash                        at    ^3.3.4        
 Kept:                               caniuse-lite                               at    ^1.0.30000989 
 Kept:                               coveralls                                  at    ^3.0.6        
 Changed:                            cross-env                                  from  ^5.2.0         to  ^5.2.1  
 Kept:                               eslint                                     at    ^6.3.0        
 Kept:                               eslint-friendly-formatter                  at    ^4.0.1        
 Kept:                               eslint-import-resolver-webpack             at    ^0.11.1       
 Kept:                               eslint-loader                              at    ^3.0.0        
 Kept:                               eslint-plugin-babel                        at    ^5.3.0        
 Kept:                               eslint-plugin-compat                       at    ^3.3.0        
 Kept:                               eslint-plugin-css-modules                  at    ^2.11.0       
 Kept:                               eslint-plugin-eslint-comments              at    ^3.1.2        
 Kept:                               eslint-plugin-html                         at    ^6.0.0        
 Kept:                               eslint-plugin-import                       at    ^2.18.2       
 Kept:                               eslint-plugin-jest                         at    ^22.16.0      
 Changed:                            eslint-plugin-jsdoc                        from  ^15.8.4        to  ^15.9.1 
 Kept:                               eslint-plugin-json                         at    ^1.4.0        
 Kept:                               eslint-plugin-lodash                       at    ^6.0.0        
 Kept:                               eslint-plugin-no-use-extend-native         at    ^0.4.1        
 Kept:                               eslint-plugin-prefer-object-spread         at    ^1.2.1        
 Kept:                               eslint-plugin-prettier                     at    ^3.1.0        
 Kept:                               eslint-plugin-promise                      at    ^4.2.1        
 Kept:                               eslint-plugin-sort-class-members           at    ^1.6.0        
 Kept:                               eslint-plugin-switch-case                  at    ^1.1.2        
 Kept:                               jest                                       at    ^24.9.0       
 Kept:                               jest-cli                                   at    ^24.9.0       
 Kept:                               jest-file                                  at    ^1.0.0        
 Kept:                               lodash                                     at    ^4.17.15      
 Kept:                               lodash-webpack-plugin                      at    ^0.11.5       
 Kept:                               mkdirp                                     at    ^0.5.1        
 Changed:                            nodemon                                    from  ^1.19.1        to  ^1.19.2 
 Kept:                               power-set-x                                at    ^2.1.2        
 Kept:                               prettier                                   at    ^1.18.2       
 Kept:                               rimraf                                     at    ^3.0.0        
 Kept:                               source-map-loader                          at    ^0.2.4        
 Kept:                               strip-ansi                                 at    ^5.2.0        
 Kept:                               terser-webpack-plugin                      at    ^1.4.1        
 Kept:                               typescript                                 at    ^3.6.2        
 Kept:                               webpack                                    at    ^4.39.3       
 Kept:                               webpack-bundle-analyzer                    at    ^3.4.1        
 Kept:                               webpack-cli                                at    ^3.3.7        
 Kept:                               webpack-global-object-x                    at    ^1.0.0        
 Kept:                               webpack-merge                              at    ^4.2.2        
Peer Dependencies:
 None found 

4 updated out of 63 total dependencies.
```

### API

#### Install

```bash
npm install --save @xotic750/salita
```

#### Options

```js
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
```

#### Example

```js
import salita from '@xotic750/salita';

// Content of my_directory/package.json
// {
//   "name": "tests",
//   "version": "1.0.0",
//   "dependencies": {
//     "json3": "^3.1.0"
//   },
//     "devDependencies": {
//     "safe-to-string-x": "1.5.0"
//   },
//     "peerDependencies": {
//     "jquery-ui": "*"
//   }
// }

/**
 * The main entry point.
 *
 * @param {string} dir - The working directory.
 * @param {object} [options=UserOptions] - The user options.
 * @returns {Promise<(TotalsObject|PackagePlus)>} The promise of TotalsObject or PackagePlus.
 */
salita('my_directory', {
  check: true,
  quiet: true,
}).then((obj) => {
  console.log('Done.', obj);
  // {
  //   "changed": 3,
  //   "total": 3,
  // }
});

salita('my_directory', {
  quiet: true,
}).then((obj) => {
  console.log('Done.', obj);
  // {
  //   "data": {
  //     "dependencies": {
  //       "json3": "^3.3.3",
  //     },
  //     "devDependencies": {
  //       "safe-to-string-x": "^2.0.3",
  //     },
  //     "name": "tests",
  //     "peerDependencies": {
  //       "jquery-ui": "^1.12.1",
  //     },
  //     "version": "1.0.0",
  //   },
  //   "filename": "__tests__/files/temp/package.json",
  //   "format": {
  //     "indent": "  ",
  //     "trailing": false,
  //   },
  // }
});
```
