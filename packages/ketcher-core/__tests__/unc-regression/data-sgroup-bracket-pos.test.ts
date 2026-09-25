import { ReSGroup, ReStruct, Render } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import { Atom, SGroup, Struct, Vec2 } from 'domain/entities';

/*
 * Fork commit under test:
 *   a4394409c  MAT-73031: thread render through Data S-group draw
 *
 * drawGroupDat called SGroup.bracketPos with no render. bracketPos then falls
 * back to the `window.ketcher` global. The platform embeds Ketcher under a
 * non-default instance id, so that global is absent and every re-render with a
 * Data S-group on canvas threw.
 *
 * The behaviour to pin is the one the platform depends on: drawing a Data
 * S-group must not require the global. How that is achieved is upstream's
 * choice — our fix threaded the render through, and upstream may instead have
 * stopped calling bracketPos. Either satisfies this test, which is the point.
 */

const MEMBER_POSITIONS = [new Vec2(0, 0), new Vec2(1, 0), new Vec2(1, 1)];

function dataSGroupFixture() {
  const struct = new Struct();
  const memberIds = MEMBER_POSITIONS.map((pp) =>
    struct.atoms.add(new Atom({ label: 'C', pp })),
  );

  const sgroup = new SGroup('DAT');
  sgroup.atoms = [...memberIds];
  sgroup.data.fieldName = 'TEST_FIELD';
  sgroup.data.fieldValue = 'test-value';
  sgroup.data.attached = false;
  sgroup.data.absolute = true;
  const sgroupId = struct.sgroups.add(sgroup);
  memberIds.forEach((aid) => struct.atomAddToSGroup(sgroupId, aid));

  const render = new Render(
    document as unknown as HTMLElement,
    {
      microModeScale: 20,
      width: 100,
      height: 100,
    } as RenderOptions,
  );
  const restruct = new ReStruct(struct, render);
  render.ctab = restruct;

  return { struct, sgroup, restruct, render };
}

describe('Data S-group rendering under a non-default ketcher instance', () => {
  const globalScope = window as unknown as Record<string, unknown>;
  let savedKetcherGlobal: unknown;

  beforeEach(() => {
    // The platform embeds Ketcher under its own instance id, so no global exists.
    savedKetcherGlobal = globalScope.ketcher;
    delete globalScope.ketcher;
  });

  afterEach(() => {
    globalScope.ketcher = savedKetcherGlobal;
  });

  it('draws a Data S-group without reading the ketcher global', () => {
    const { sgroup, restruct } = dataSGroupFixture();

    expect(() => new ReSGroup(sgroup).draw(restruct, sgroup)).not.toThrow();
  });

  it('computes a bracket box from a threaded render, not the global', () => {
    const { struct, sgroup, restruct, render } = dataSGroupFixture();

    expect(() =>
      SGroup.bracketPos(sgroup, struct, restruct, render),
    ).not.toThrow();
    expect(sgroup.bracketBox).not.toBeNull();
  });
});
