import { CoordinateTransformation } from 'application/render/coordinateTransformation';
import { Vec2 } from 'domain/entities';
import type { Render } from 'application/render/raphaelRender';

/*
 * Fork commits under test:
 *   1ea33be22  actual fix
 *   33a078c8b  lint
 *
 * The app embeds the editor in a container that carries its own CSS transform
 * scale. Ketcher knows nothing about that outer scale, so every pointer
 * coordinate it reads from the DOM is off by that factor: clicks land away
 * from the atom under the cursor, and the error grows with distance from the
 * origin.
 *
 * The fork threads an externalZoomScale render option through both directions
 * of the canvas/view transform. The option is optional and defaults to 1, so
 * an embedder that does not set it sees no change.
 */

const EXTERNAL_SCALE = 2;
const INTERNAL_ZOOM = 1.5;

function renderWith(externalZoomScale?: number) {
  return {
    viewBox: { minX: 0, minY: 0 },
    options: { zoom: INTERNAL_ZOOM, externalZoomScale },
  } as unknown as Render;
}

describe('externalZoomScale is applied to canvas/view transforms', () => {
  it('scales a canvas point into the view by the external scale', () => {
    const point = new Vec2(10, 20);

    const scaled = CoordinateTransformation.canvasToView(
      point,
      renderWith(EXTERNAL_SCALE),
    );
    const unscaled = CoordinateTransformation.canvasToView(
      point,
      renderWith(undefined),
    );

    expect(scaled.x).toBeCloseTo(unscaled.x * EXTERNAL_SCALE);
    expect(scaled.y).toBeCloseTo(unscaled.y * EXTERNAL_SCALE);
  });

  it('undoes the external scale on the way back to the canvas', () => {
    const point = new Vec2(10, 20);
    const render = renderWith(EXTERNAL_SCALE);

    const roundTripped = CoordinateTransformation.viewToCanvas(
      CoordinateTransformation.canvasToView(point, render),
      render,
    );

    expect(roundTripped.x).toBeCloseTo(point.x);
    expect(roundTripped.y).toBeCloseTo(point.y);
  });

  it('leaves an embedder that sets no external scale unchanged', () => {
    const point = new Vec2(10, 20);

    const withoutOption = CoordinateTransformation.canvasToView(
      point,
      renderWith(undefined),
    );
    const withNeutralOption = CoordinateTransformation.canvasToView(
      point,
      renderWith(1),
    );

    expect(withoutOption.x).toBeCloseTo(withNeutralOption.x);
    expect(withoutOption.y).toBeCloseTo(withNeutralOption.y);
  });
});
