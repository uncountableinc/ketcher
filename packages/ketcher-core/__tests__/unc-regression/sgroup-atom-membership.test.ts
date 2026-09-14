import { Atom, SGroup, Struct, Vec2 } from 'domain/entities';

/*
 * Fork commit under test:
 *   43ebbcc69  fix subbrackets
 *
 * getGroupFromAtomId returns the first S-group holding an atom. Nested
 * S-groups (a sub-bracket inside an outer bracket) share member atoms, so the
 * inner or the outer group was silently dropped wherever that single-result
 * lookup was used — MacromoleculesConverter collected only one group per atom
 * and the other bracket vanished from the converted fragment.
 *
 * getGroupsFromAtomId / getGroupIdsFromAtomId return every group for the atom.
 */

function nestedSGroupFixture() {
  const struct = new Struct();
  const atomIds = [new Vec2(0, 0), new Vec2(1, 0), new Vec2(2, 0)].map((pp) =>
    struct.atoms.add(new Atom({ label: 'C', pp })),
  );

  const outer = new SGroup('SRU');
  outer.atoms = [...atomIds];
  const outerId = struct.sgroups.add(outer);
  atomIds.forEach((aid) => struct.atomAddToSGroup(outerId, aid));

  // The inner group covers a subset, so atomIds[1] belongs to both.
  const inner = new SGroup('SUP');
  inner.atoms = [atomIds[1]];
  const innerId = struct.sgroups.add(inner);
  struct.atomAddToSGroup(innerId, atomIds[1]);

  return { struct, atomIds, outer, inner, outerId, innerId };
}

describe('S-group membership for a nested atom', () => {
  it('returns every group id holding the shared atom', () => {
    const { struct, atomIds, outerId, innerId } = nestedSGroupFixture();

    const ids = struct.getGroupIdsFromAtomId(atomIds[1]);

    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining([outerId, innerId]));
  });

  it('returns every group object holding the shared atom', () => {
    const { struct, atomIds, outer, inner } = nestedSGroupFixture();

    const groups = struct.getGroupsFromAtomId(atomIds[1]);

    expect(groups).toHaveLength(2);
    expect(groups).toEqual(expect.arrayContaining([outer, inner]));
  });

  it('returns only the outer group for an atom outside the sub-bracket', () => {
    const { struct, atomIds, outer } = nestedSGroupFixture();

    expect(struct.getGroupsFromAtomId(atomIds[0])).toEqual([outer]);
  });

  it('returns nothing for an atom in no group', () => {
    const { struct } = nestedSGroupFixture();
    const looseAtomId = struct.atoms.add(
      new Atom({ label: 'O', pp: new Vec2(9, 9) }),
    );

    expect(struct.getGroupIdsFromAtomId(looseAtomId)).toEqual([]);
    expect(struct.getGroupsFromAtomId(looseAtomId)).toEqual([]);
  });
});
