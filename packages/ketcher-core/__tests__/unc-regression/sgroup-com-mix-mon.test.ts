import { KetSerializer } from 'domain/serializers';
import { SGroup } from 'domain/entities';

/*
 * Fork commit under test:
 *   843206bc0  support com, mix, and mon sgroups
 *
 * Vanilla Ketcher knows GEN, MUL, SRU, SUP, DAT, queryComponent and COP. The
 * component (COM), mixture (MIX) and monomer (MON) S-group types are used in
 * formulation chemistry. KET validation rejected them outright, so a structure
 * carrying one failed to load at all.
 *
 * COM carries a subscript and a component number; MIX carries a subscript; MON
 * carries neither.
 */

function micromoleculeKet(sgroup: Record<string, unknown>): string {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
    mol0: {
      type: 'molecule',
      atoms: [
        { label: 'C', location: [0, 0, 0] },
        { label: 'C', location: [1, 0, 0] },
      ],
      bonds: [{ type: 1, atoms: [0, 1] }],
      sgroups: [{ atoms: [0, 1], ...sgroup }],
    },
  });
}

function deserializeSGroup(sgroup: Record<string, unknown>): SGroup {
  const struct = new KetSerializer().deserializeMicromolecules(
    micromoleculeKet(sgroup),
  );
  const first = Array.from(struct.sgroups.values())[0];
  expect(first).toBeDefined();
  return first;
}

describe('formulation S-group types are known', () => {
  it.each(['MON', 'MIX', 'COM'])('declares %s in SGroup.TYPES', (type) => {
    const knownTypes: Record<string, string> = SGroup.TYPES;
    expect(knownTypes[type]).toBe(type);
  });

  it('identifies each type through its own predicate', () => {
    expect(SGroup.isMONGroup(new SGroup('MON'))).toBe(true);
    expect(SGroup.isMIXGroup(new SGroup('MIX'))).toBe(true);
    expect(SGroup.isCOMGroup(new SGroup('COM'))).toBe(true);
  });

  it('does not confuse one formulation type for another', () => {
    expect(SGroup.isMONGroup(new SGroup('MIX'))).toBe(false);
    expect(SGroup.isMIXGroup(new SGroup('COM'))).toBe(false);
    expect(SGroup.isCOMGroup(new SGroup('MON'))).toBe(false);
  });
});

describe('formulation S-groups survive KET deserialization', () => {
  it('loads a MON group', () => {
    expect(deserializeSGroup({ type: 'MON' }).type).toBe('MON');
  });

  it('loads a MIX group and keeps its subscript', () => {
    const sgroup = deserializeSGroup({ type: 'MIX', subscript: 'blend' });

    expect(sgroup.type).toBe('MIX');
    expect(sgroup.data.subscript).toBe('blend');
  });

  it('loads a COM group and keeps its subscript and component number', () => {
    const sgroup = deserializeSGroup({
      type: 'COM',
      subscript: 'comp',
      compno: '2',
    });

    expect(sgroup.type).toBe('COM');
    expect(sgroup.data.subscript).toBe('comp');
    expect(sgroup.data.compno).toBe('2');
  });
});

describe('formulation S-groups survive a KET round trip', () => {
  it('writes a COM group back with its subscript and component number', () => {
    const serializer = new KetSerializer();
    const struct = serializer.deserializeMicromolecules(
      micromoleculeKet({ type: 'COM', subscript: 'comp', compno: '2' }),
    );

    const written = JSON.parse(serializer.serialize(struct));
    // The molecule key is generated, so find it rather than assuming mol0.
    const moleculeNode = Object.values(written).find(
      (node) =>
        typeof node === 'object' &&
        node !== null &&
        (node as { type?: string }).type === 'molecule',
    ) as { sgroups: Array<Record<string, unknown>> } | undefined;
    const sgroups = moleculeNode?.sgroups ?? [];

    expect(sgroups).toHaveLength(1);
    expect(sgroups[0].type).toBe('COM');
    expect(sgroups[0].subscript).toBe('comp');
    expect(sgroups[0].compno).toBe('2');
  });
});
