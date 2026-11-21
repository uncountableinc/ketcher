import { ReStruct, Render } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import { KetSerializer } from 'domain/serializers';
import {
  checkIsSmartPropertiesExist,
  getAtomCustomQuery,
} from 'application/render/restruct';
import ReAtom from 'application/render/restruct/reatom';
import type ReStruct from 'application/render/restruct/restruct';
import type { RenderOptions } from 'application/render/render.types';
import { StereoColoringType } from 'application/render/restruct/generalEnumTypes';
import { Atom, Struct } from 'domain/entities';

describe('atom annotation DOM traversal', () => {
  it('applies stereo styling and an escaped query tooltip to the first tspan', () => {
    const atom = new Atom({
      label: 'C',
      stereoLabel: '&2',
      queryProperties: { customQuery: 'query<one>;query&two' },
    });
    const molecule = new Struct();
    const aid = molecule.atoms.add(atom);
    const reatom = new ReAtom(atom);
    const nodes: SVGElement[] = [];
    const text = jest.fn(() => {
      const node = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text',
      );
      node.append(
        document.createElementNS('http://www.w3.org/2000/svg', 'tspan'),
        document.createElementNS('http://www.w3.org/2000/svg', 'tspan'),
      );
      nodes.push(node);
      return {
        node,
        attr: jest.fn().mockReturnThis(),
        getBBox: () => ({ x: 0, y: 0, width: 10, height: 10 }),
        translateAbs: jest.fn(),
      };
    });
    const options = {
      microModeScale: 1,
      zoom: 1,
      lineWidth: 1,
      fontszInPx: 13,
      fontszsubInPx: 10,
      colorOfAndCenters: '#123456',
      colorStereogenicCenters: StereoColoringType.LabelsOnly,
      autoFadeOfStereoLabels: true,
      ignoreChiralFlag: true,
    } as RenderOptions;
    const restruct = {
      molecule,
      render: { paper: { text }, options },
      addReObjectPath: jest.fn(),
    } as unknown as ReStruct;
    jest.spyOn(reatom, 'setHover').mockImplementation(() => undefined);

    reatom.show(restruct, aid, options);

    const annotation = nodes[nodes.length - 1];
    const firstSpan = annotation.firstChild as SVGElement;
    expect(firstSpan.getAttribute('fill')).toBe('#123456');
    expect(firstSpan.getAttribute('fill-opacity')).toBe('0.9');
    expect(firstSpan.getAttribute('data-tooltip')).toBe(
      'query&lt;one&gt;; query&two',
    );
    expect((annotation.lastChild as SVGElement).attributes).toHaveLength(0);
  });
});

/**
 * A polymer (SRU) chain capped on one end by a `*` star atom and on the other
 * end by an explicit carbon: `*-[O-CH2-CH2]n-O-CH3`. The two atoms at indices
 * 0 (`*`) and 5 (`C`) are the terminal end groups.
 */
const STAR_CAPPED_POLYMER_KET = JSON.stringify({
  root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
  mol0: {
    type: 'molecule',
    atoms: [
      { label: '*', location: [0, 0, 0] },
      { label: 'O', location: [1, -0.5, 0] },
      { label: 'C', location: [2, 0, 0] },
      { label: 'C', location: [3, -0.5, 0] },
      { label: 'O', location: [4, 0, 0] },
      { label: 'C', location: [5, -0.5, 0] },
    ],
    bonds: [
      { type: 1, atoms: [0, 1] },
      { type: 1, atoms: [1, 2] },
      { type: 1, atoms: [2, 3] },
      { type: 1, atoms: [3, 4] },
      { type: 1, atoms: [4, 5] },
    ],
    sgroups: [
      { type: 'SRU', atoms: [1, 2, 3], subscript: 'n', connectivity: 'HT' },
    ],
  },
});

const STAR_CAP_ATOM_ID = 0;
const CARBON_CAP_ATOM_ID = 5;

function renderStruct(ket: string) {
  const struct = new KetSerializer().deserialize(ket);
  struct.initHalfBonds();
  struct.initNeighbors();
  struct.setImplicitHydrogen();
  struct.markFragments();

  const render = new Render(
    document as unknown as HTMLElement,
    {
      microModeScale: 20,
      width: 100,
      height: 100,
    } as RenderOptions,
  );
  const restruct = new ReStruct(struct, render);
  restruct.atoms.forEach((reAtom, aid) =>
    reAtom.show(restruct, aid, render.options),
  );
  return restruct;
}

describe('polymer star-cap end group rendering', () => {
  it('renders a `*` cap neighbouring an SRU as a carbon, like the other end group', () => {
    const restruct = renderStruct(STAR_CAPPED_POLYMER_KET);

    const starCap = restruct.atoms.get(STAR_CAP_ATOM_ID);
    const carbonCap = restruct.atoms.get(CARBON_CAP_ATOM_ID);

    expect(starCap?.showLabel).toBe(true);
    expect(starCap?.label?.text).toBe('C');
    expect(carbonCap?.label?.text).toBe('C');
  });
});

describe('atom query properties rendering', () => {
  it.each([
    { implicitHCount: 0, expected: 'h0' },
    {
      queryProperties: { ringMembership: 0 },
      expected: 'R0',
    },
    {
      queryProperties: { ringSize: 0 },
      expected: 'r0',
    },
    {
      queryProperties: { connectivity: 0 },
      expected: 'X0',
    },
  ])('renders $expected for a zero-valued query property', (attributes) => {
    const atom = new Atom({
      label: 'C',
      ...attributes,
    });

    expect(checkIsSmartPropertiesExist(atom)).toBe(true);
    expect(
      getAtomCustomQuery({
        ...atom,
        ...atom.queryProperties,
      }),
    ).toBe(attributes.expected);
  });
});
