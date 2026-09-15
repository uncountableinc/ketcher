/* eslint-disable no-magic-numbers */
import { Page } from '@playwright/test';

/*
 * Self-contained KET fixtures for the Uncountable regression specs. Building
 * them here rather than reading a committed file keeps each spec readable and
 * keeps it working when the shared test-data set is reorganised.
 */

function micromoleculeKet(molecule: Record<string, unknown>): string {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
    mol0: { type: 'molecule', ...molecule },
  });
}

const CHAIN_ATOMS = [
  { label: 'C', location: [0, 0, 0] },
  { label: 'C', location: [1, 0.5, 0] },
  { label: 'C', location: [2, 0, 0] },
  { label: 'C', location: [3, 0.5, 0] },
  { label: 'C', location: [4, 0, 0] },
];

const CHAIN_BONDS = [
  { type: 1, atoms: [0, 1] },
  { type: 1, atoms: [1, 2] },
  { type: 1, atoms: [2, 3] },
  { type: 1, atoms: [3, 4] },
];

/** A plain five-carbon chain, no s-group. */
export const PLAIN_CHAIN_KET = micromoleculeKet({
  atoms: CHAIN_ATOMS,
  bonds: CHAIN_BONDS,
});

/** The same chain with an SRU repeating unit over its three middle atoms. */
export const SRU_CHAIN_KET = micromoleculeKet({
  atoms: CHAIN_ATOMS,
  bonds: CHAIN_BONDS,
  sgroups: [
    { type: 'SRU', atoms: [1, 2, 3], subscript: 'n', connectivity: 'hh' },
  ],
});

/** The same chain with a contracted superatom over its three middle atoms. */
export const SUPERATOM_CHAIN_KET = micromoleculeKet({
  atoms: CHAIN_ATOMS,
  bonds: CHAIN_BONDS,
  sgroups: [{ type: 'SUP', atoms: [1, 2, 3], name: 'Abbrev', expanded: true }],
});

export async function setMolecule(page: Page, ket: string): Promise<void> {
  await page.evaluate(async (value) => {
    await window.ketcher.setMolecule(value);
  }, ket);
}

export async function atomCount(page: Page): Promise<number> {
  return page.evaluate(() => window.ketcher.editor.struct().atoms.size);
}

export async function sgroupCount(page: Page): Promise<number> {
  return page.evaluate(() => window.ketcher.editor.struct().sgroups.size);
}
