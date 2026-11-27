import { ReStruct, Render } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import { Atom, Bond, Struct, Vec2 } from 'domain/entities';

/*
 * Fork behaviour under test: a special atom with the label `Resin` draws as a
 * shaded bead sized to the atom hit area, in place of the italic text label,
 * so solid-phase synthesis structures read like the usual resin drawings.
 * Upstream draws the label as text.
 */

const MICRO_MODE_SCALE = 40;

function renderResinAttachedToCarbon() {
  const struct = new Struct();
  const resinId = struct.atoms.add(
    new Atom({ label: 'Resin', pp: new Vec2(0, 0) }),
  );
  const carbonId = struct.atoms.add(
    new Atom({ label: 'C', pp: new Vec2(1, 0) }),
  );
  struct.bonds.add(
    new Bond({
      begin: resinId,
      end: carbonId,
      type: Bond.PATTERN.TYPE.SINGLE,
    }),
  );
  struct.initHalfBonds();
  struct.initNeighbors();
  struct.setImplicitHydrogen();
  struct.markFragments();

  const render = new Render(
    document as unknown as HTMLElement,
    {
      microModeScale: MICRO_MODE_SCALE,
      width: 100,
      height: 100,
    } as RenderOptions,
  );
  const restruct = new ReStruct(struct, render);
  restruct.atoms.forEach((reAtom, aid) =>
    reAtom.show(restruct, aid, render.options),
  );
  return { render, restruct, resinId };
}

describe('resin bead render', () => {
  it('draws the Resin special atom as nested circles in place of a text label', () => {
    const { restruct, resinId } = renderResinAttachedToCarbon();

    const label = restruct.atoms.get(resinId)?.label;
    const nodeNames = Array.from(
      label?.path as unknown as ArrayLike<{ node: Element }>,
    ).map((element) => element.node.nodeName);

    expect(label?.text).toBe('Resin');
    expect(nodeNames).toEqual(['circle', 'circle', 'circle', 'circle']);
  });

  it('sizes the outer circle inside the atom hit radius', () => {
    const { render, restruct, resinId } = renderResinAttachedToCarbon();

    const label = restruct.atoms.get(resinId)?.label;
    const outer = (
      label?.path as unknown as ArrayLike<{ attr(name: string): number }>
    )[0];

    expect(outer.attr('r')).toBeCloseTo(
      MICRO_MODE_SCALE * 0.4 - render.options.lineWidth / 2,
    );
  });

  it('selects the Resin special atom with a circle around the bead', () => {
    const { render, restruct, resinId } = renderResinAttachedToCarbon();
    const padding = 3;

    const contour = restruct.atoms
      .get(resinId)
      ?.getSelectionContour(render, padding);

    expect(contour?.type).toBe('circle');
    expect(contour?.attr('r')).toBeCloseTo(
      MICRO_MODE_SCALE * 0.4 +
        render.options.fontszInPx * render.options.radiusScaleFactor +
        padding,
    );
  });
});
