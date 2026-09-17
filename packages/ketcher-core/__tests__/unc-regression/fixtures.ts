/*
 * Shared KET builders for the Uncountable regression suite.
 *
 * Local to this directory on purpose: the whole point of the suite is that it
 * copies onto a vanilla upstream checkout and runs there, so it must not reach
 * into the package's own test utilities, which upstream is free to reorganise.
 */

export function micromoleculeKet(molecule: Record<string, unknown>): string {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
    mol0: { type: 'molecule', ...molecule },
  });
}

/** Two bonded carbons, the smallest structure the serializers accept. */
export function twoCarbonKet(
  extra: {
    atomProps?: Record<string, unknown>;
    bondProps?: Record<string, unknown>;
    molecule?: Record<string, unknown>;
  } = {},
): string {
  return micromoleculeKet({
    atoms: [
      { label: 'C', location: [0, 0, 0], ...(extra.atomProps ?? {}) },
      { label: 'C', location: [1, 0, 0] },
    ],
    bonds: [{ type: 1, atoms: [0, 1], ...(extra.bondProps ?? {}) }],
    ...(extra.molecule ?? {}),
  });
}
