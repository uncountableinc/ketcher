import {
  Atom,
  Bond,
  SGroup,
  SGroupAttachmentPoint,
  Struct,
  Vec2,
} from 'domain/entities';

/*
 * Fork commit under test:
 *   9f488c2d0  MAT-77406: draw a contracted abbreviation at its group centre
 *
 * SGroup.getContractedPosition resolves an anchor through the attachment point,
 * then a crossing-bond atom, then this.atoms[0]. A standalone abbreviation has
 * neither, so it reached atoms[0] — an arbitrary member of the hidden
 * structure. The label was then drawn up to one molecule-radius away from the
 * structure it names, and the error grew with the molecule.
 *
 * The fix returns the group centre from the atoms[0] fallback ONLY. The
 * attachment-point and crossing-bond branches must keep their old anchors, so a
 * bonded abbreviation such as B(OH)2 still meets its bond.
 */

// A square: centre (1, 1), first member at (0, 0). The two differ, so a test
// that confuses them cannot pass by accident.
const MEMBER_POSITIONS = [
  new Vec2(0, 0),
  new Vec2(2, 0),
  new Vec2(2, 2),
  new Vec2(0, 2),
];
const EXPECTED_CENTRE = new Vec2(1, 1);
const OUTSIDE_POSITION = new Vec2(5, 0);

interface Fixture {
  struct: Struct;
  sgroup: SGroup;
  memberIds: number[];
}

function contractedSuperatom(): Fixture {
  const struct = new Struct();
  const memberIds = MEMBER_POSITIONS.map((pp) =>
    struct.atoms.add(new Atom({ label: 'C', pp })),
  );

  const sgroup = new SGroup('SUP');
  sgroup.data.name = 'Abbrev';
  sgroup.atoms = [...memberIds];
  const sgroupId = struct.sgroups.add(sgroup);
  memberIds.forEach((aid) => struct.atomAddToSGroup(sgroupId, aid));

  return { struct, sgroup, memberIds };
}

function atomPosition(struct: Struct, atomId: number): Vec2 {
  const atom = struct.atoms.get(atomId);
  if (atom === undefined) {
    throw new Error(`Fixture has no atom ${atomId}`);
  }
  return atom.pp;
}

describe('contracted abbreviation anchor', () => {
  it('anchors a standalone abbreviation at the group centre', () => {
    const { struct, sgroup } = contractedSuperatom();

    const { position } = sgroup.getContractedPosition(struct);

    expect(position.x).toBeCloseTo(EXPECTED_CENTRE.x);
    expect(position.y).toBeCloseTo(EXPECTED_CENTRE.y);
  });

  it('does not anchor a standalone abbreviation at its first member atom', () => {
    const { struct, sgroup, memberIds } = contractedSuperatom();
    const firstMember = atomPosition(struct, memberIds[0]);

    const { position } = sgroup.getContractedPosition(struct);

    expect(position.x).not.toBeCloseTo(firstMember.x);
    expect(position.y).not.toBeCloseTo(firstMember.y);
  });

  it('still anchors a bonded abbreviation at its crossing-bond atom', () => {
    const { struct, sgroup, memberIds } = contractedSuperatom();
    const outsideId = struct.atoms.add(
      new Atom({ label: 'C', pp: OUTSIDE_POSITION }),
    );
    const crossingAtomId = memberIds[1];
    struct.bonds.add(
      new Bond({
        begin: crossingAtomId,
        end: outsideId,
        type: Bond.PATTERN.TYPE.SINGLE,
      }),
    );

    const { atomId, position } = sgroup.getContractedPosition(struct);

    expect(atomId).toBe(crossingAtomId);
    expect(position.x).toBeCloseTo(atomPosition(struct, crossingAtomId).x);
    expect(position.y).toBeCloseTo(atomPosition(struct, crossingAtomId).y);
  });

  it('still anchors an abbreviation with an attachment point at that atom', () => {
    const { struct, sgroup, memberIds } = contractedSuperatom();
    const anchorId = memberIds[2];
    sgroup.addAttachmentPoint(
      new SGroupAttachmentPoint(anchorId, undefined, undefined),
    );

    const { atomId, position } = sgroup.getContractedPosition(struct);

    expect(atomId).toBe(anchorId);
    expect(position.x).toBeCloseTo(atomPosition(struct, anchorId).x);
    expect(position.y).toBeCloseTo(atomPosition(struct, anchorId).y);
  });
});
