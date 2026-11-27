import {
  ReSGroup,
  ReStruct,
  Render,
  pickHostRenderOptions,
} from 'application/render';
import type {
  RenderOptions,
  RepeatUnitNotation,
} from 'application/render/render.types';
import { Atom, Bond, SGroup, Struct, Vec2 } from 'domain/entities';

/*
 * The platform sets a repeatUnitNotation render option per schema. With
 * `standard`, a repeat unit (SRU) group with exactly two crossing bonds on two
 * atoms gets one bracket across each crossing bond, as molfile SDI export and
 * the Indigo renderer already draw it. Every other group, and every group with
 * the option unset or `box`, keeps the axis-aligned box brackets.
 *
 * With `standard`, the SRU label also follows the Indigo renderer: no label
 * for head-to-tail, and lower-case hh and eu. Otherwise the label stays upper
 * case.
 *
 * The option is set by the embedder, not by the user settings, so it must
 * survive the renderer rebuild that a settings change triggers.
 */

const MICRO_MODE_SCALE = 20;

type BracketSegment = { start: Vec2; end: Vec2 };

function verticalChainFixture({
  sgroupType,
  memberIndexes,
  repeatUnitNotation,
  connectivity = 'ht',
}: {
  sgroupType: string;
  memberIndexes: number[];
  repeatUnitNotation?: RepeatUnitNotation;
  connectivity?: string;
}) {
  const struct = new Struct();
  const atomIds = [0, 1, 2, 3].map((y) =>
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, y) })),
  );
  for (let i = 0; i < atomIds.length - 1; ++i) {
    struct.bonds.add(
      new Bond({ begin: atomIds[i], end: atomIds[i + 1], type: 1 }),
    );
  }
  struct.initHalfBonds();
  struct.initNeighbors();

  const sgroup = new SGroup(sgroupType);
  const sgroupId = struct.sgroups.add(sgroup);
  memberIndexes.forEach((index) =>
    SGroup.addAtom(sgroup, atomIds[index], struct),
  );
  memberIndexes.forEach((index) =>
    struct.atomAddToSGroup(sgroupId, atomIds[index]),
  );
  if (sgroupType === 'SRU') {
    sgroup.data.subscript = 'n';
    sgroup.data.connectivity = connectivity;
  } else if (sgroupType === 'MUL') {
    sgroup.data.mul = 2;
  }

  const render = new Render(
    document as unknown as HTMLElement,
    {
      microModeScale: MICRO_MODE_SCALE,
      width: 100,
      height: 100,
      repeatUnitNotation,
    } as RenderOptions,
  );
  const restruct = new ReStruct(struct, render);
  render.ctab = restruct;

  return { sgroup, restruct };
}

function drawnBracketSegments(
  sgroup: SGroup,
  restruct: ReStruct,
): BracketSegment[] {
  const set = new ReSGroup(sgroup).draw(restruct, sgroup);
  return [0, 1].map((index) => {
    const path = set[index].attr('path');
    return {
      start: new Vec2(path[1][1], path[1][2]),
      end: new Vec2(path[2][1], path[2][2]),
    };
  });
}

function drawnLabels(sgroup: SGroup, restruct: ReStruct): string[] {
  const set = new ReSGroup(sgroup).draw(restruct, sgroup);
  const labels: string[] = [];
  set.forEach((element) => {
    if (element.type === 'text') {
      labels.push(element.attr('text'));
    }
  });
  return labels;
}

function expectSegmentsAcrossBondCenters(
  segments: BracketSegment[],
  bondCenterYs: number[],
) {
  const centerYs = segments
    .map(({ start, end }) => (start.y + end.y) / 2)
    .sort((a, b) => a - b);
  segments.forEach(({ start, end }) => {
    expect(start.y).toBeCloseTo(end.y);
    expect((start.x + end.x) / 2).toBeCloseTo(0);
  });
  centerYs.forEach((y, index) => {
    expect(y).toBeCloseTo(bondCenterYs[index] * MICRO_MODE_SCALE);
  });
}

function expectBoxSegments(segments: BracketSegment[]) {
  segments.forEach(({ start, end }) => {
    expect(start.x).toBeCloseTo(end.x);
    expect(start.y).not.toBeCloseTo(end.y);
  });
}

describe('repeat-unit notation option for SRU brackets', () => {
  it('draws standard brackets across the two crossing bonds of a repeat unit', () => {
    const { sgroup, restruct } = verticalChainFixture({
      sgroupType: 'SRU',
      memberIndexes: [1, 2],
      repeatUnitNotation: 'standard',
    });

    expectSegmentsAcrossBondCenters(
      drawnBracketSegments(sgroup, restruct),
      [0.5, 2.5],
    );
  });

  it('keeps box brackets when the option is unset', () => {
    const { sgroup, restruct } = verticalChainFixture({
      sgroupType: 'SRU',
      memberIndexes: [1, 2],
    });

    expectBoxSegments(drawnBracketSegments(sgroup, restruct));
  });

  it('keeps box brackets for the box notation', () => {
    const { sgroup, restruct } = verticalChainFixture({
      sgroupType: 'SRU',
      memberIndexes: [1, 2],
      repeatUnitNotation: 'box',
    });

    expectBoxSegments(drawnBracketSegments(sgroup, restruct));
  });

  it('keeps box brackets for a repeat unit with one crossing bond', () => {
    const { sgroup, restruct } = verticalChainFixture({
      sgroupType: 'SRU',
      memberIndexes: [2, 3],
      repeatUnitNotation: 'standard',
    });

    expectBoxSegments(drawnBracketSegments(sgroup, restruct));
  });

  it('keeps box brackets for a multiple group', () => {
    const { sgroup, restruct } = verticalChainFixture({
      sgroupType: 'MUL',
      memberIndexes: [1, 2],
      repeatUnitNotation: 'standard',
    });

    expectBoxSegments(drawnBracketSegments(sgroup, restruct));
  });
});

describe('repeat-unit notation option for SRU labels', () => {
  it.each([
    ['ht', ['n']],
    ['hh', ['n', 'hh']],
    ['eu', ['n', 'eu']],
  ])('shows the standard label for %s connectivity', (connectivity, labels) => {
    const { sgroup, restruct } = verticalChainFixture({
      sgroupType: 'SRU',
      memberIndexes: [1, 2],
      repeatUnitNotation: 'standard',
      connectivity,
    });

    expect(drawnLabels(sgroup, restruct)).toEqual(labels);
  });

  it.each([undefined, 'box' as const])(
    'keeps the upper-case label for the %s notation',
    (repeatUnitNotation) => {
      const { sgroup, restruct } = verticalChainFixture({
        sgroupType: 'SRU',
        memberIndexes: [1, 2],
        repeatUnitNotation,
      });

      expect(drawnLabels(sgroup, restruct)).toEqual(['n', 'HT']);
    },
  );
});

describe('host render options', () => {
  it('picks only the options the embedder owns', () => {
    expect(
      pickHostRenderOptions({
        externalZoomScale: 2,
        repeatUnitNotation: 'standard',
        zoom: 1.5,
        showAtomIds: true,
      }),
    ).toEqual({ externalZoomScale: 2, repeatUnitNotation: 'standard' });
  });

  it('omits host options that are not set', () => {
    expect(pickHostRenderOptions({ zoom: 1.5 })).toEqual({});
  });
});
