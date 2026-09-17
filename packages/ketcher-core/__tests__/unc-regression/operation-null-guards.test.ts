// ketcher-core's operation modules form an import cycle that only resolves
// when a serializer entry point is loaded first.
import { KetSerializer } from 'domain/serializers';
import { Struct } from 'domain/entities';
import { AtomAttr } from 'application/editor/operations/atom/AtomAttr';
import { AlignDescriptors } from 'application/editor/operations/descriptors';

import { twoCarbonKet } from './fixtures';

/*
 * Fork patches under test, previously carried as patch-package patches against
 * the built ketcher-core bundle rather than in source:
 *   ketcher-core+3.6.0-unc48.patch
 *   ketcher-core+3.6.0-unc48+002+halfbond-recalc-guard.patch
 *
 * Each guards a lookup that vanilla dereferences unchecked. The app drives the
 * editor through setMolecule and undo/redo rather than the toolbar, so an
 * operation can be replayed against a structure that no longer holds the atom
 * or half bond it names. Vanilla throws out of the operation, which leaves the
 * editor with a half-applied action and no way back.
 *
 * BaseMode.onKeyDown carries the third patch. It needs a mounted macromolecule
 * editor to reach, so it has no test here.
 */

const MISSING_ATOM_ID = 999;
const MISSING_HALF_BOND_ID = 999;

function restructFor(struct: Struct) {
  return { molecule: struct, atoms: new Map() } as never;
}

describe('an atom attribute operation naming an atom that is gone', () => {
  const struct = new KetSerializer().deserializeMicromolecules(twoCarbonKet());

  it('does not throw when executed', () => {
    const operation = new AtomAttr(MISSING_ATOM_ID, 'label', 'N');

    expect(() => operation.execute(restructFor(struct))).not.toThrow();
  });

  it('reports itself as a no-op so the action drops it', () => {
    const operation = new AtomAttr(MISSING_ATOM_ID, 'label', 'N');

    expect(operation.isDummy(restructFor(struct))).toBe(true);
  });

  it('still applies to an atom that is present', () => {
    const operation = new AtomAttr(0, 'label', 'N');

    operation.execute(restructFor(struct));

    expect(struct.atoms.get(0)?.label).toBe('N');
  });
});

describe('aligning descriptors on a structure with no coordinates', () => {
  it('does not throw on an empty structure', () => {
    expect(() =>
      new AlignDescriptors().execute(restructFor(new Struct())),
    ).not.toThrow();
  });
});

describe('recalculating half bonds that are gone', () => {
  it('does not throw for a half bond id the structure does not hold', () => {
    expect(() =>
      new Struct().halfBondUpdate(MISSING_HALF_BOND_ID),
    ).not.toThrow();
  });

  it('does not throw when an atom names a half bond that is gone', () => {
    const struct = new KetSerializer().deserializeMicromolecules(
      twoCarbonKet(),
    );
    const atom = struct.atoms.get(0);
    if (atom === undefined) {
      throw new Error('the fixture parsed without its first atom');
    }
    atom.neighbors = [MISSING_HALF_BOND_ID];

    expect(() => struct.atomUpdateHalfBonds(0)).not.toThrow();
  });
});
