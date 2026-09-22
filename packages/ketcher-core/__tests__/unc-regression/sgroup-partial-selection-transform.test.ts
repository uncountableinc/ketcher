import { fromFlip } from 'application/editor/actions/rotate';
import { getRelSGroupsBySelection } from 'application/editor/actions/utils';
import { ReStruct, Render } from 'application/render';
import { RenderOptions } from 'application/render/render.types';
import { Atom, SGroup, Struct, Vec2 } from 'domain/entities';

/*
 * Upstream behaviour change, inherited at v3.7.0 — not a fork patch.
 *
 * getRelSGroupsBySelection decides which S-groups a flip, rotate or drag
 * carries along with the selected atoms. Its rule changed:
 *
 *   v3.6.0  struct.sgroups.filter((_id, sg) =>
 *             !sg.data.attached && !sg.data.absolute &&
 *             difference(sg.atoms, selectedAtoms).length === 0)
 *           -> the group came along only when EVERY member atom was selected.
 *
 *   v3.7.0  every selected atom contributes each group it belongs to
 *           -> ANY member atom now drags the whole group's data label.
 *
 * So transforming part of a formulation bracket used to leave the bracket
 * label alone and now moves it. Four call sites share the helper: flip and
 * rotate (actions/rotate.ts), drag (actions/fragment.ts) and the rotate tool.
 *
 * Measured, not predicted: on upstream v3.6.0 the two partial-selection tests
 * fail and the rest pass, so those two are what separates the versions. The
 * full-selection and exclusion tests assert behaviour both versions share,
 * which is what makes the pair meaningful rather than broadly broken.
 *
 * These tests pin the v3.7.0 rule so a later upgrade cannot change it
 * silently. If we decide the v3.6.0 rule was the right one for formulation
 * brackets, this file is where that decision gets recorded — invert the
 * partial-selection expectations rather than deleting them.
 *
 * Two traps this fixture avoids, both of which make the test prove nothing:
 *   - the label must sit off the flip axis, or flipping it is a no-op;
 *   - the helper returns a Pool on v3.6.0 and a Set on v3.7.0, so read it
 *     with forEach, the way the production callers do, rather than spreading.
 */

const MEMBER_POSITIONS = [
  new Vec2(0, 0),
  new Vec2(1, 0),
  new Vec2(2, 0),
  new Vec2(3, 0),
];
const LABEL_POSITION = new Vec2(0.5, 2);
const FLIP_CENTER = new Vec2(1.5, 0);
const FLIPPED_LABEL_X = 2 * FLIP_CENTER.x - LABEL_POSITION.x;
const OUTSIDE_ATOM_POSITION = new Vec2(9, 9);

function dataSGroupFixture({
  absolute = false,
  attached = false,
}: { absolute?: boolean; attached?: boolean } = {}) {
  const struct = new Struct();
  const memberIds = MEMBER_POSITIONS.map((pp) =>
    struct.atoms.add(new Atom({ label: 'C', pp })),
  );

  const sgroup = new SGroup('DAT');
  sgroup.atoms = [...memberIds];
  sgroup.pp = LABEL_POSITION.get_xy0();
  sgroup.data.fieldName = 'FORMULATION';
  sgroup.data.fieldValue = 'bracket-label';
  sgroup.data.attached = attached;
  sgroup.data.absolute = absolute;
  const sgroupId = struct.sgroups.add(sgroup);
  sgroup.id = sgroupId;
  memberIds.forEach((aid) => struct.atomAddToSGroup(sgroupId, aid));

  return { struct, sgroup, sgroupId, memberIds };
}

function restructFor(struct: Struct) {
  const render = new Render(
    document as unknown as HTMLElement,
    {
      microModeScale: 20,
      width: 100,
      height: 100,
    } as RenderOptions,
  );
  const restruct = new ReStruct(struct, render);
  render.ctab = restruct;
  return restruct;
}

// forEach yields the S-group first on both a Pool and a Set, so this reads the
// same on either version, exactly as fromStructureFlip reads it.
function carriedSGroupIds(struct: Struct, selectedAtoms: number[]): number[] {
  const ids: number[] = [];
  getRelSGroupsBySelection(struct, selectedAtoms).forEach((sgroup: SGroup) => {
    ids.push(sgroup.id);
  });
  return ids.sort();
}

describe('S-groups carried by a selection', () => {
  it('carries the group when every member atom is selected', () => {
    const { struct, sgroupId, memberIds } = dataSGroupFixture();

    expect(carriedSGroupIds(struct, memberIds)).toEqual([sgroupId]);
  });

  it('carries the group when only some member atoms are selected', () => {
    const { struct, sgroupId, memberIds } = dataSGroupFixture();

    expect(carriedSGroupIds(struct, memberIds.slice(0, 2))).toEqual([sgroupId]);
  });

  it('carries the group for a single member atom', () => {
    const { struct, sgroupId, memberIds } = dataSGroupFixture();

    expect(carriedSGroupIds(struct, [memberIds[0]])).toEqual([sgroupId]);
  });

  it('carries each group once however many of its atoms are selected', () => {
    const { struct, sgroupId, memberIds } = dataSGroupFixture();

    expect(carriedSGroupIds(struct, memberIds)).toEqual([sgroupId]);
  });

  it('carries nothing when no selected atom belongs to the group', () => {
    const { struct } = dataSGroupFixture();
    const outsideAtomId = struct.atoms.add(
      new Atom({ label: 'O', pp: OUTSIDE_ATOM_POSITION }),
    );

    expect(carriedSGroupIds(struct, [outsideAtomId])).toEqual([]);
  });

  it('never carries an absolutely positioned data group', () => {
    const { struct, memberIds } = dataSGroupFixture({ absolute: true });

    expect(carriedSGroupIds(struct, memberIds)).toEqual([]);
  });

  it('never carries an attached data group', () => {
    const { struct, memberIds } = dataSGroupFixture({ attached: true });

    expect(carriedSGroupIds(struct, memberIds)).toEqual([]);
  });
});

describe('Flipping part of a formulation bracket', () => {
  it('moves the bracket label when only some member atoms are flipped', () => {
    const { struct, sgroup, memberIds } = dataSGroupFixture();
    const restruct = restructFor(struct);

    fromFlip(
      restruct,
      { atoms: memberIds.slice(0, 2) },
      'horizontal',
      FLIP_CENTER,
    );

    expect(sgroup.pp?.x).toBeCloseTo(FLIPPED_LABEL_X);
    expect(sgroup.pp?.y).toBeCloseTo(LABEL_POSITION.y);
  });

  it('moves the bracket label when every member atom is flipped', () => {
    const { struct, sgroup, memberIds } = dataSGroupFixture();
    const restruct = restructFor(struct);

    fromFlip(restruct, { atoms: memberIds }, 'horizontal', FLIP_CENTER);

    expect(sgroup.pp?.x).toBeCloseTo(FLIPPED_LABEL_X);
  });

  it('leaves the bracket label alone when no member atom is flipped', () => {
    const { struct, sgroup } = dataSGroupFixture();
    const outsideAtomId = struct.atoms.add(
      new Atom({ label: 'O', pp: OUTSIDE_ATOM_POSITION }),
    );
    const restruct = restructFor(struct);

    fromFlip(restruct, { atoms: [outsideAtomId] }, 'horizontal', FLIP_CENTER);

    expect(sgroup.pp?.x).toBeCloseTo(LABEL_POSITION.x);
  });
});
