import type { RenderOptions } from './render.types';

export function pickHostRenderOptions({
  externalZoomScale,
  repeatUnitNotation,
}: Partial<RenderOptions>): Partial<RenderOptions> {
  return {
    ...(externalZoomScale !== undefined && { externalZoomScale }),
    ...(repeatUnitNotation !== undefined && { repeatUnitNotation }),
  };
}
