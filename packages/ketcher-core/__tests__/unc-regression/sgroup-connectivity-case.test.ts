import molParsers from 'domain/serializers/mol/v2000';
import type { Struct } from 'domain/entities';

/*
 * Fork commits under test:
 *   783bc6497  fix issues
 *   493fcc1bd  remove changes causing case problems
 *   6ce75702d  add cop
 *
 * An SRU S-group carries a connectivity code in the molfile SCN line: head-to-
 * tail, head-to-head or either/unknown. Writers disagree about case, so the
 * same polymer arrives as HT from one source and ht from another.
 *
 * Downstream code compares the parsed value against lowercase literals, and
 * the S-group dialog matches its options the same way, so an uppercase code
 * read straight from the file silently fails every comparison: the bracket
 * label renders blank and the dialog opens with no option selected.
 *
 * The fork lowercases the value as it is parsed, so the case a writer happened
 * to use no longer reaches the rest of the editor.
 */

const SGROUP_ATOM_COUNT = 4;
const SGROUP_BOND_COUNT = 1;

function countsLine(): string[] {
  return [
    String(SGROUP_ATOM_COUNT).padStart(3, ' '),
    String(SGROUP_BOND_COUNT).padStart(3, ' '),
    '  0',
    '   ',
    '  1',
    '  0',
    '   ',
    '   ',
    '   ',
    '   ',
    '999',
    ' V2000',
  ];
}

function connectivityOf(struct: Struct, id: number) {
  const sgroup = struct.sgroups.get(id);
  if (sgroup === undefined) {
    throw new Error(`the molfile parsed without s-group ${id}`);
  }

  return sgroup.data.connectivity;
}

function parseWithConnectivity(firstCode: string, secondCode: string) {
  const lines = [
    '   14.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '   15.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '   16.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '   17.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '1  2  1  0     0  0',
    'M  STY  2   1 SRU   2 SRU',
    'M  SLB  2   1   1   2   2',
    `M  SCN  2   1  ${firstCode}   2  ${secondCode}`,
    'M  SAL  1   2   1   2',
    'M  SAL  2   2   3   4',
  ];

  const struct = molParsers.parseCTabV2000(lines, countsLine());

  return [connectivityOf(struct, 0), connectivityOf(struct, 1)];
}

describe('S-group connectivity codes are lowercased on MOL parse', () => {
  it('lowercases an uppercase code', () => {
    expect(parseWithConnectivity('HT', 'HH')).toEqual(['ht', 'hh']);
  });

  it('leaves an already-lowercase code alone', () => {
    expect(parseWithConnectivity('ht', 'hh')).toEqual(['ht', 'hh']);
  });

  it('gives the same result whichever case the writer used', () => {
    expect(parseWithConnectivity('EU', 'HT')).toEqual(
      parseWithConnectivity('eu', 'ht'),
    );
  });
});
