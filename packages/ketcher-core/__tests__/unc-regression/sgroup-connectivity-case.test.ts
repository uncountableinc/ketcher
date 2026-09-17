import molParsers from 'domain/serializers/mol/v2000';
import type { Struct } from 'domain/entities';

/*
 * Fork commits under test:
 *   783bc6497  fix issues
 *   493fcc1bd  remove changes causing case problems
 *   6ce75702d  add cop
 *
 * A polymer S-group carries a connectivity code in the molfile SCN line:
 * head-to-tail, head-to-head or either/unknown. Writers disagree about case,
 * so the same polymer arrives as HT from one source and ht from another.
 *
 * Downstream code compares the parsed value against lowercase literals, and
 * the S-group dialog matches its options the same way, so an uppercase code
 * read straight from the file silently fails every comparison: the bracket
 * label renders blank and the dialog opens with no option selected.
 *
 * Upstream lowercases in per-type post-load hooks, so the type decides whether
 * it happens at all: at the fork's base only SRU had one. The fork lowercases
 * in the SCN parse itself, which covers every S-group type.
 *
 * The type matters to this test. An SRU-only fixture passes everywhere and
 * proves nothing, so each case below names the type it parses.
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

function parseWithConnectivity(
  sgroupType: string,
  firstCode: string,
  secondCode: string,
) {
  const lines = [
    '   14.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '   15.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '   16.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '   17.0000   -3.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '1  2  1  0     0  0',
    `M  STY  2   1 ${sgroupType}   2 ${sgroupType}`,
    'M  SLB  2   1   1   2   2',
    `M  SCN  2   1  ${firstCode}   2  ${secondCode}`,
    'M  SAL  1   2   1   2',
    'M  SAL  2   2   3   4',
  ];

  const struct = molParsers.parseCTabV2000(lines, countsLine());

  return [connectivityOf(struct, 0), connectivityOf(struct, 1)];
}

// SRU has had a post-load hook since before the fork; GEN gained one upstream
// in v3.18.0; COP has none in either, so only the fork lowercases it.
const SGROUP_TYPES = ['SRU', 'GEN', 'COP'];

describe('S-group connectivity codes are lowercased on MOL parse', () => {
  it.each(SGROUP_TYPES)('lowercases an uppercase code on %s', (sgroupType) => {
    expect(parseWithConnectivity(sgroupType, 'HT', 'HH')).toEqual(['ht', 'hh']);
  });

  it.each(SGROUP_TYPES)(
    'leaves an already-lowercase code alone on %s',
    (sgroupType) => {
      expect(parseWithConnectivity(sgroupType, 'ht', 'hh')).toEqual([
        'ht',
        'hh',
      ]);
    },
  );

  it.each(SGROUP_TYPES)(
    'gives the same result whichever case the writer used on %s',
    (sgroupType) => {
      expect(parseWithConnectivity(sgroupType, 'EU', 'HT')).toEqual(
        parseWithConnectivity(sgroupType, 'eu', 'ht'),
      );
    },
  );
});
