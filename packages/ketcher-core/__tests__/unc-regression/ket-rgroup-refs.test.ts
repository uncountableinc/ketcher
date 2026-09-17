import { KetSerializer } from 'domain/serializers';

/*
 * Fork commit under test:
 *   270480fe0  fix r labels
 *
 * An rg-label node records the R-groups it stands for in $refs. Files written
 * by other tools, and R-group members with no assigned label, omit the key
 * entirely. moleculeToStruct called source.$refs.map unguarded, so the whole
 * document failed to load on a TypeError rather than loading with no label.
 */

function rgLabelKet(node: Record<string, unknown>): string {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
    mol0: {
      type: 'molecule',
      atoms: [
        { type: 'rg-label', location: [0, 0, 0], ...node },
        { label: 'C', location: [1, 0, 0] },
      ],
      bonds: [{ type: 1, atoms: [0, 1] }],
    },
  });
}

describe('rg-label atoms without $refs', () => {
  it('loads an rg-label node that omits $refs', () => {
    expect(() =>
      new KetSerializer().deserializeMicromolecules(rgLabelKet({})),
    ).not.toThrow();
  });

  it('gives the unlabelled rg-label atom no R-group label', () => {
    const struct = new KetSerializer().deserializeMicromolecules(
      rgLabelKet({}),
    );

    expect(struct.atoms.get(0)?.label).toBe('R#');
    expect(struct.atoms.get(0)?.rglabel).toBeFalsy();
  });

  it('still reads the label when $refs is present', () => {
    const struct = new KetSerializer().deserializeMicromolecules(
      rgLabelKet({ $refs: ['rg-1'] }),
    );

    expect(struct.atoms.get(0)?.label).toBe('R#');
    expect(struct.atoms.get(0)?.rglabel).toBeTruthy();
  });
});
