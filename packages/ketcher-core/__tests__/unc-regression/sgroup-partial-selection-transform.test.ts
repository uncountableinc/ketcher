import { fromFlip } from 'application/editor/actions/rotate';
import { getRelSGroupsBySelection } from 'application/editor/actions/utils';
import { ReStruct, Render } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import { Atom, SGroup, Struct, Vec2 } from 'domain/entities';

/*
 * Fork commit under test: restores the pre-v3.7.0 rule in
 * getRelSGroupsBySelection.
 *
 * The helper decides which S-groups a flip, rotate or drag carries along with
 * the selected atoms. Four call sites share it: flip and rotate
 * (actions/rotate.ts), drag (actions/fragment.ts) and the rotate tool.
 *
 *   v3.6.0  the group came along only when EVERY member atom was selected.
 *   v3.7.0  any selected member atom dragged the whole group's data label.
 *
 * v3.7.0's rule makes the result depend on how the user split the edit.
 * Dragging two members of a bracket separately moves the data label twice,
 * where dragging them together moves it once, so the label drifts away from
 * its bracket with every partial edit. A partial selection reshapes a group's
 * contents rather than relocating the group, so the label should stay put and
 * let the bracket geometry redraw from the member positions.
 *
 * The fork restores the containment rule while keeping v3.7.0's Set return
 * type, so the four callers are untouched.
 *
 * Two traps when editing this fixture, both of which make it prove nothing:
 *   - the S-group label must sit off the flip axis, or flipping it is a no-op
 *     and the assertion passes on every version;
 *   - upstream v3.6.0 returns a Pool here and v3.7.0 a Set, so read it with
 *     forEach the way the production callers do, not by spreading.
 */

const MEMBER_POSITIONS = [
  new Vec2(0, 0),
  new Vec2(1, 0),
  new Vec2(2, 0),
  new Vec2(3, 0),
];
const LABEL_POSITION = new Vec2(0.5, 2);
const FLIP_CENTER = new Vec2(1.5, 0);
const SECOND_FLIP_CENTER = new Vec2(4, 0);
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

  it('does not carry the group when only some member atoms are selected', () => {
    const { struct, memberIds } = dataSGroupFixture();

    expect(carriedSGroupIds(struct, memberIds.slice(0, 2))).toEqual([]);
  });

  it('does not carry the group for a single member atom', () => {
    const { struct, memberIds } = dataSGroupFixture();

    expect(carriedSGroupIds(struct, [memberIds[0]])).toEqual([]);
  });

  it('carries the group when the selection also holds atoms outside it', () => {
    const { struct, sgroupId, memberIds } = dataSGroupFixture();
    const outsideAtomId = struct.atoms.add(
      new Atom({ label: 'O', pp: OUTSIDE_ATOM_POSITION }),
    );

    expect(carriedSGroupIds(struct, [...memberIds, outsideAtomId])).toEqual([
      sgroupId,
    ]);
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
  it('leaves the bracket label alone when only some member atoms are flipped', () => {
    const { struct, sgroup, memberIds } = dataSGroupFixture();
    const restruct = restructFor(struct);

    fromFlip(
      restruct,
      { atoms: memberIds.slice(0, 2) },
      'horizontal',
      FLIP_CENTER,
    );

    expect(sgroup.pp?.x).toBeCloseTo(LABEL_POSITION.x);
    expect(sgroup.pp?.y).toBeCloseTo(LABEL_POSITION.y);
  });

  /*
   * The two halves flip about different axes on purpose. Mirroring twice
   * about the SAME axis cancels, so that version of this test passed on
   * upstream v3.7.0 as well and discriminated nothing.
   */
  it('leaves the bracket label alone when the group is flipped in halves', () => {
    const { struct, sgroup, memberIds } = dataSGroupFixture();
    const restruct = restructFor(struct);

    fromFlip(
      restruct,
      { atoms: memberIds.slice(0, 2) },
      'horizontal',
      FLIP_CENTER,
    );
    fromFlip(
      restruct,
      { atoms: memberIds.slice(2) },
      'horizontal',
      SECOND_FLIP_CENTER,
    );

    expect(sgroup.pp?.x).toBeCloseTo(LABEL_POSITION.x);
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
