import { Atom, Bond, SGroup, Struct, Vec2 } from 'domain/entities';
import {
  getLonePairDataPosition,
  LONE_PAIR_DATA_FIELD_NAME,
} from 'domain/helpers/lonePairDataPosition';
import { moleculeToKet } from 'domain/serializers/ket/toKet/moleculeToKet';
import molfile from 'domain/serializers/mol/common';

function createEtherStructure() {
  const struct = new Struct();
  const leftId = struct.atoms.add(
    new Atom({ label: 'C', pp: new Vec2(-1, 0) }),
  );
  const oxygenId = struct.atoms.add(
    new Atom({ label: 'O', pp: new Vec2(0, 0) }),
  );
  const rightId = struct.atoms.add(
    new Atom({ label: 'C', pp: new Vec2(1, 0) }),
  );
  struct.bonds.add(new Bond({ begin: leftId, end: oxygenId, type: 1 }));
  struct.bonds.add(new Bond({ begin: oxygenId, end: rightId, type: 1 }));
  struct.prepareLoopStructure();
  return { leftId, oxygenId, rightId, struct };
}

function addLonePairData(struct: Struct, oxygenId: number) {
  const sgroup = new SGroup('DAT');
  sgroup.atoms = [oxygenId];
  sgroup.data.attached = true;
  sgroup.data.absolute = true;
  sgroup.data.fieldName = LONE_PAIR_DATA_FIELD_NAME;
  sgroup.data.fieldValue = '.. ..';
  const sgroupId = struct.sgroups.add(sgroup);
  sgroup.id = sgroupId;
  struct.atomAddToSGroup(sgroupId, oxygenId);
  return { sgroup, sgroupId };
}

describe('lone-pair data position', () => {
  it('uses the upward direction without bonds', () => {
    const struct = new Struct();
    const atomId = struct.atoms.add(
      new Atom({ label: 'O', pp: new Vec2(0, 0) }),
    );

    const position = getLonePairDataPosition(struct, atomId);
    expect(position.x).toBeCloseTo(0);
    expect(position.y).toBeCloseTo(-0.6);
  });

  it('uses the widest bond sector', () => {
    const { oxygenId, struct } = createEtherStructure();

    const position = getLonePairDataPosition(struct, oxygenId);
    expect(position.x).toBeCloseTo(0);
    expect(position.y).toBeCloseTo(0.6);
  });

  it('uses the same position in KET and molfile output', () => {
    const { oxygenId, struct } = createEtherStructure();
    const { sgroup, sgroupId } = addLonePairData(struct, oxygenId);

    const ket = moleculeToKet(struct);
    expect(ket.sgroups[0]).toMatchObject({
      fieldName: LONE_PAIR_DATA_FIELD_NAME,
      fieldData: '.. ..',
    });
    expect(ket.sgroups[0].x).toBeCloseTo(0);
    expect(ket.sgroups[0].y).toBeCloseTo(-0.6);

    const mol = molfile.saveToMolfile.DAT(
      sgroup,
      struct,
      { [sgroupId]: 1 },
      { [oxygenId]: 1 },
      {},
    );
    expect(mol).toMatch(/M {2}SDD\s+1\s+0\.0000\s+-0\.6000/);
  });

  it('keeps the stored position of data without a position contribution', () => {
    const { oxygenId, struct } = createEtherStructure();
    const { sgroup, sgroupId } = addLonePairData(struct, oxygenId);
    sgroup.data.fieldName = 'OTHER_DATA';
    sgroup.pp = new Vec2(2, 3);

    const ket = moleculeToKet(struct);
    expect(ket.sgroups[0]).not.toHaveProperty('x');
    expect(ket.sgroups[0]).not.toHaveProperty('y');

    const mol = molfile.saveToMolfile.DAT(
      sgroup,
      struct,
      { [sgroupId]: 1 },
      { [oxygenId]: 1 },
      {},
    );
    expect(mol).toMatch(/M {2}SDD\s+1\s+2\.0000\s+-3\.0000/);
  });
});
