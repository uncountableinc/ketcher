#!/usr/bin/env node
/*
 * Checks that every source file the Uncountable fork changed is accounted for
 * in unc-fork-coverage.json.
 *
 * The regression suite was built from a hand-written list of interesting
 * commits, and that list turned out to be incomplete: eleven fork behaviours
 * had no entry and therefore no test. A commit list cannot be checked, because
 * nothing says when it is missing an entry. The set of changed files can be,
 * so that is what this script compares.
 *
 * Run it whenever the fork gains a commit that touches package source, and
 * before starting an upstream merge.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifestPath = join(dirname(fileURLToPath(import.meta.url)), 'unc-fork-coverage.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const forkRef = process.argv[2] ?? manifest.forkRef;

const changedFiles = execFileSync(
  'git',
  ['diff', '--name-only', manifest.mergeBase, forkRef],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter((path) => /^packages\/[^/]+\/src\//.test(path));

const claimed = new Set(manifest.behaviours.flatMap((behaviour) => behaviour.files));

const unclaimed = changedFiles.filter((path) => !claimed.has(path));
const stale = [...claimed].filter((path) => !changedFiles.includes(path)).sort();

console.log(`merge base   ${manifest.mergeBase.slice(0, 9)}`);
console.log(`fork ref     ${forkRef}`);
console.log(`behaviours   ${manifest.behaviours.length}`);
console.log(`changed src  ${changedFiles.length} files`);

if (unclaimed.length > 0) {
  console.error(`\n${unclaimed.length} changed file(s) no behaviour claims:`);
  for (const path of unclaimed) console.error(`  ${path}`);
  console.error('\nAdd each one to a behaviour in unc-fork-coverage.json, with a test or a');
  console.error('written reason it needs none.');
}

if (stale.length > 0) {
  console.error(`\n${stale.length} claimed file(s) the fork no longer changes:`);
  for (const path of stale) console.error(`  ${path}`);
  console.error('\nDrop them from unc-fork-coverage.json.');
}

if (unclaimed.length > 0 || stale.length > 0) process.exit(1);

const untested = manifest.behaviours.filter((behaviour) => behaviour.covered.startsWith('none:'));
console.log(`\nAll changed source files are accounted for.`);
console.log(`${manifest.behaviours.length - untested.length} behaviours have a test; ${untested.length} carry a written reason they need none:`);
for (const behaviour of untested) console.log(`  ${behaviour.key}`);
