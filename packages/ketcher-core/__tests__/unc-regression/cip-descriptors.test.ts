import { KetSerializer } from 'domain/serializers';
import { AtomCIP, BondCIP } from 'domain/entities/types';

import { micromoleculeKet } from './fixtures';

/*
 * Fork commits under test:
 *   cda0f264a  CIP: accept RS atom descriptor (MAT-75502)
 *   b674564bc  MAT-75503: accept atom-attached P/M CIP descriptors (allene)
 *   1d6c9ac5b  MAT-75503: accept axial P/M bond CIP descriptors in KET schema
 *
 * Indigo emits CIP descriptors that vanilla Ketcher's KET schema rejects:
 * "RS" for a stereocentre in an "&" (AND) group, and "M"/"P" for axial
 * stereochemistry (biaryl on the bond, allene on the central atom). KET
 * validation ran before the struct was built, so a single unknown descriptor
 * failed the whole deserialize with "Cannot deserialize input JSON."
 *
 * These assert behaviour, not the schema file, so they hold across the
 * upstream ajv -> jsonschema validator swap.
 */

function structWithAtomCip(cip: string) {
  return new KetSerializer().deserializeMicromolecules(
    micromoleculeKet({
      atoms: [
        { label: 'C', location: [0, 0, 0], cip },
        { label: 'C', location: [1, 0, 0] },
      ],
      bonds: [{ type: 1, atoms: [0, 1] }],
    }),
  );
}

function structWithBondCip(cip: string) {
  return new KetSerializer().deserializeMicromolecules(
    micromoleculeKet({
      atoms: [
        { label: 'C', location: [0, 0, 0] },
        { label: 'C', location: [1, 0, 0] },
      ],
      bonds: [{ type: 2, atoms: [0, 1], cip }],
    }),
  );
}

describe('atom CIP descriptors survive KET deserialization', () => {
  // R/S/r/s are the vanilla set and must keep working.
  it.each(['R', 'S', 'r', 's'])('accepts the vanilla descriptor %s', (cip) => {
    expect(structWithAtomCip(cip).atoms.get(0)?.cip).toBe(cip);
  });

  it('accepts RS, emitted for a stereocentre in an AND group', () => {
    expect(structWithAtomCip('RS').atoms.get(0)?.cip).toBe('RS');
  });

  it.each(['M', 'P'])(
    'accepts the axial descriptor %s attached to an allene centre',
    (cip) => {
      expect(structWithAtomCip(cip).atoms.get(0)?.cip).toBe(cip);
    },
  );
});

describe('bond CIP descriptors survive KET deserialization', () => {
  it.each(['Z', 'E'])('accepts the vanilla descriptor %s', (cip) => {
    expect(structWithBondCip(cip).bonds.get(0)?.cip).toBe(cip);
  });

  it.each(['M', 'P'])(
    'accepts the axial descriptor %s on a biaryl bond',
    (cip) => {
      expect(structWithBondCip(cip).bonds.get(0)?.cip).toBe(cip);
    },
  );
});

describe('CIP enums cover every descriptor Indigo emits', () => {
  it('AtomCIP includes RS, M and P', () => {
    expect(Object.values(AtomCIP)).toEqual(
      expect.arrayContaining(['R', 'S', 'r', 's', 'RS', 'M', 'P']),
    );
  });

  it('BondCIP includes M and P', () => {
    expect(Object.values(BondCIP)).toEqual(
      expect.arrayContaining(['Z', 'E', 'M', 'P']),
    );
  });
});
