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

Automatically upgrade all dependencies and devDependencies to their latest
stable semver.

### Install

```bash
npm install @xotic750/salita -g
```

### Usage

```bash
# Change into directory with package.json.
cd my_project

# Upgrade all dependencies.
salita
```

### Options

- `--no-color`: prevents colorized output
- `--json`: provides parseable JSON output (also disables colors)
- `--dry-run` / `-n`: prevents changes to `package.json`
- `--update`: reflects the changes in `package.json`
- `--ignore-stars`: ignore updates to packages that are set to "`*`"
- `--ignore-pegged`: ignore updates to packages that are pegged to a single version, rather than a range
- `--check`: implies "dry-run"; and returns with an exit code matching the number of updated dependencies.
- `--sections`: comma-separated list of sections to process, default: dep dev peer opt
- `--only-changed`: only show packages that have (or would have) changed

### Example

You can see in the example below that dependencies are always resolved to
their latest stable, instead of just the latest version tagged:

![Terminal](http://tbranyen.com/u/7bc20890.png)
