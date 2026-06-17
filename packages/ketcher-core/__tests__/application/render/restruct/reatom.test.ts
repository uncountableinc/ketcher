import { ReStruct, Render } from 'application/render';
import { RenderOptions } from 'application/render/render.types';
import { KetSerializer } from 'domain/serializers';

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
