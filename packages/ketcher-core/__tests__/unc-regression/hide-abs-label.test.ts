import 'domain/serializers';
import { KetSerializer } from 'domain/serializers';
import { headerToKet } from 'domain/serializers/ket/toKet/headerToKet';
import { Struct } from 'domain/entities/struct';
import { Atom } from 'domain/entities/atom';
import { Fragment } from 'domain/entities/fragment';
import { Vec2 } from 'domain/entities/vec2';
import { Pile } from 'domain/entities/pile';
import { DrawingEntitiesManager } from 'domain/entities/DrawingEntitiesManager';
import { MacromoleculesConverter } from 'application/editor/MacromoleculesConverter';
import { Action } from 'application/editor/actions/action';
import { StructSetHideAbsLabel } from 'application/editor/operations/StructSetHideAbsLabel';
import { Indigo } from 'application/indigo';
import { Ketcher } from 'application/ketcher';
import ReEnhancedFlag from 'application/render/restruct/reenhancedFlag';
import type { ReStruct } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import type { StructService } from 'domain/services';

/*
 * Fork behaviour under test: a struct-level hideAbsLabel marker.
 *
 * The platform lets a user hide the ABS enhanced stereo label for one stored
 * structure. The marker lives on the Struct, round-trips through the KET
 * header, survives clone, mode conversion and Indigo transforms, and makes
 * the renderer skip only the ABS flag. Stereo data stays unchanged.
 */

function stereoStruct(stereoLabel: string, hideAbsLabel = false): Struct {
  const struct = new Struct();
  const first = struct.atoms.add(
    new Atom({ label: 'C', pp: new Vec2(0, 0), fragment: 0, stereoLabel }),
  );
  struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(1, 0), fragment: 0 }));
  const fragmentId = struct.frags.add(new Fragment([first]));
  struct.frags.get(fragmentId)?.updateStereoFlag(struct);
  struct.hideAbsLabel = hideAbsLabel;
  return struct;
}

function ketWithHeader(header?: Record<string, unknown>): string {
  return JSON.stringify({
    ...(header ? { header } : {}),
    root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
    mol0: {
      type: 'molecule',
      atoms: [
        { label: 'C', location: [0, 0, 0] },
        { label: 'C', location: [1, 0, 0] },
      ],
      bonds: [{ type: 1, atoms: [0, 1] }],
    },
  });
}

describe('the KET header carries hideAbsLabel', () => {
  it('omits the key for the visible default', () => {
    expect(headerToKet(new Struct())?.hideAbsLabel).toBeUndefined();
  });

  it('writes the key only as true', () => {
    expect(headerToKet(stereoStruct('abs', true))).toEqual({
      hideAbsLabel: true,
    });
  });

  it('round-trips a hidden structure through serialize and deserialize', () => {
    const serializer = new KetSerializer();
    const ket = serializer.serialize(stereoStruct('abs', true));

    expect(JSON.parse(ket).header).toEqual({ hideAbsLabel: true });
    expect(serializer.deserialize(ket).hideAbsLabel).toBe(true);
  });

  it('keeps a visible structure visible through a round trip', () => {
    const serializer = new KetSerializer();
    const ket = serializer.serialize(stereoStruct('abs'));

    expect(JSON.parse(ket).header?.hideAbsLabel).toBeUndefined();
    expect(serializer.deserialize(ket).hideAbsLabel).toBe(false);
  });

  it.each([
    ['an absent header', undefined],
    ['a false value', { hideAbsLabel: false }],
  ])('reads %s as the visible default', (_name, header) => {
    expect(
      new KetSerializer().deserializeMicromolecules(ketWithHeader(header))
        .hideAbsLabel,
    ).toBe(false);
  });

  it('reads an exact true as hidden', () => {
    expect(
      new KetSerializer().deserializeMicromolecules(
        ketWithHeader({ hideAbsLabel: true }),
      ).hideAbsLabel,
    ).toBe(true);
  });
});

describe('the enhanced flag renderer', () => {
  const options = {
    showStereoFlags: true,
    ignoreChiralFlag: false,
    absFlagLabel: 'ABS',
    andFlagLabel: 'AND Enantiomer',
    orFlagLabel: 'OR Enantiomer',
    mixedFlagLabel: 'Mixed',
    microModeScale: 40,
    font: 'Arial',
    fontszInPx: 13,
  } as unknown as RenderOptions;

  function drawnLabels(struct: Struct): string[] {
    const text = jest.fn(() => ({ attr: jest.fn().mockReturnThis() }));
    const restruct = {
      molecule: struct,
      render: {
        paper: { text },
        ctab: { addReObjectPath: jest.fn() },
      },
    } as unknown as ReStruct;

    new ReEnhancedFlag().show(restruct, 0, options);

    return text.mock.calls.map((call) => (call as unknown[])[2] as string);
  }

  it('draws ABS by default', () => {
    expect(drawnLabels(stereoStruct('abs'))).toEqual(['ABS']);
  });

  it('skips ABS when the struct hides it', () => {
    expect(drawnLabels(stereoStruct('abs', true))).toEqual([]);
  });

  it('keeps every other flag when the struct hides ABS', () => {
    expect(drawnLabels(stereoStruct('&1', true))).toEqual(['AND Enantiomer']);
    expect(drawnLabels(stereoStruct('or1', true))).toEqual(['OR Enantiomer']);
  });

  it('leaves the stereo data unchanged', () => {
    const struct = stereoStruct('abs', true);

    expect(struct.atoms.get(0)?.stereoLabel).toBe('abs');
    expect(struct.frags.get(0)?.enhancedStereoFlag).toBe('ABS');
  });
});

describe('StructSetHideAbsLabel', () => {
  function restructFor(struct: Struct) {
    return { molecule: struct, markItem: jest.fn() } as unknown as ReStruct;
  }

  it('sets the next value and invalidates the enhanced flags', () => {
    const struct = stereoStruct('abs');
    const restruct = restructFor(struct);

    new StructSetHideAbsLabel(false, true).perform(restruct);

    expect(struct.hideAbsLabel).toBe(true);
    expect(restruct.markItem).toHaveBeenCalledWith('enhancedFlags', 0, 1);
  });

  it('undoes and redoes to the exact values', () => {
    const struct = stereoStruct('abs');
    const restruct = restructFor(struct);
    const action = new Action();
    action.addOp(new StructSetHideAbsLabel(false, true));

    const undo = action.perform(restruct);
    expect(struct.hideAbsLabel).toBe(true);

    const redo = undo.perform(restruct);
    expect(struct.hideAbsLabel).toBe(false);

    redo.perform(restruct);
    expect(struct.hideAbsLabel).toBe(true);
  });
});

describe('the struct lifecycle keeps the marker', () => {
  it('defaults to visible on a new struct, which is what clear loads', () => {
    expect(new Struct().hideAbsLabel).toBe(false);
  });

  it('keeps the value through clone, also for an atom subset', () => {
    const struct = stereoStruct('abs', true);

    expect(struct.clone().hideAbsLabel).toBe(true);
    expect(struct.clone(new Pile([0])).hideAbsLabel).toBe(true);
  });

  it('leaves the target value of mergeInto unchanged in both directions', () => {
    const hiddenTarget = stereoStruct('abs', true);
    stereoStruct('abs').mergeInto(hiddenTarget);
    expect(hiddenTarget.hideAbsLabel).toBe(true);

    const visibleTarget = stereoStruct('abs');
    stereoStruct('abs', true).mergeInto(visibleTarget);
    expect(visibleTarget.hideAbsLabel).toBe(false);
  });

  it('keeps an empty hidden canvas hidden when a fragment merges into it', () => {
    const canvas = new Struct();
    canvas.hideAbsLabel = true;

    const merged = stereoStruct('abs').mergeInto(canvas.clone());

    expect(merged.hideAbsLabel).toBe(true);
  });

  it('keeps the value through a switch to Macromolecules mode and back', () => {
    const drawingEntitiesManager = new DrawingEntitiesManager();
    MacromoleculesConverter.convertStructToDrawingEntities(
      stereoStruct('abs', true).clone(),
      drawingEntitiesManager,
    );

    expect(
      drawingEntitiesManager.micromoleculesHiddenEntities.hideAbsLabel,
    ).toBe(true);

    const restored = new Struct();
    MacromoleculesConverter.convertDrawingEntitiesToStruct(
      drawingEntitiesManager,
      restored,
    );

    expect(restored.hideAbsLabel).toBe(true);
  });

  it('keeps the header key when Macromolecules mode serializes its hidden struct', () => {
    const drawingEntitiesManager = new DrawingEntitiesManager();
    drawingEntitiesManager.setMicromoleculesHiddenEntities(
      stereoStruct('abs', true),
    );

    const ket = new KetSerializer().serialize(
      drawingEntitiesManager.micromoleculesHiddenEntities.clone(),
      drawingEntitiesManager,
    );

    expect(JSON.parse(ket).header).toEqual({ hideAbsLabel: true });
  });

  it('keeps the value when Macromolecules mode deserializes a KET value', () => {
    const deserialized = new KetSerializer().deserializeToDrawingEntities(
      ketWithHeader({ hideAbsLabel: true }),
    );

    expect(
      deserialized?.drawingEntitiesManager.micromoleculesHiddenEntities
        .hideAbsLabel,
    ).toBe(true);
    expect(
      new KetSerializer().deserializeToStruct(
        ketWithHeader({ hideAbsLabel: true }),
      ).hideAbsLabel,
    ).toBe(true);
  });
});

describe('Indigo transforms keep the marker', () => {
  const transforms = [
    'layout',
    'clean',
    'aromatize',
    'dearomatize',
    'calculateCip',
    'automap',
    'toggleExplicitHydrogens',
  ] as const;

  function transformWithIndigo(
    name: (typeof transforms)[number],
    struct: Struct,
  ): Promise<Struct> {
    const respond = jest.fn(async () => ({ struct: ketWithHeader() }));
    const service = Object.fromEntries(
      transforms.map((transform) => [transform, respond]),
    ) as unknown as StructService;
    const indigo = new Indigo(service);
    const transform = indigo[name] as (
      input: Struct,
      options?: object,
    ) => Promise<Struct>;
    return transform.call(indigo, struct, {});
  }

  it.each(transforms)(
    '%s copies a hidden value onto the result',
    async (name) => {
      const result = await transformWithIndigo(name, stereoStruct('abs', true));

      expect(result.hideAbsLabel).toBe(true);
    },
  );

  it.each(transforms)('%s keeps a visible value visible', async (name) => {
    const result = await transformWithIndigo(name, stereoStruct('abs'));

    expect(result.hideAbsLabel).toBe(false);
  });
});

describe('the public Ketcher surface', () => {
  const originalMode = globalThis.isPolymerEditorTurnedOn;

  afterEach(() => {
    globalThis.isPolymerEditorTurnedOn = originalMode;
  });

  function ketcherWith(struct: Struct) {
    const restruct = { molecule: struct, markItem: jest.fn() };
    const editor = {
      struct: () => struct,
      render: { ctab: restruct },
      update: jest.fn(),
    };
    return {
      ketcher: { editor } as unknown as Ketcher,
      editor,
      restruct: restruct as unknown as ReStruct,
    };
  }

  it('reads the value of the Molecules struct', () => {
    const { ketcher } = ketcherWith(stereoStruct('abs', true));

    expect(Ketcher.prototype.getHideAbsLabel.call(ketcher)).toBe(true);
  });

  it('records one undoable history action', () => {
    const struct = stereoStruct('abs');
    const { ketcher, editor, restruct } = ketcherWith(struct);

    Ketcher.prototype.setHideAbsLabel.call(ketcher, true);

    expect(struct.hideAbsLabel).toBe(true);
    expect(editor.update).toHaveBeenCalledTimes(1);

    const undo = editor.update.mock.calls[0][0] as Action;
    undo.perform(restruct);

    expect(struct.hideAbsLabel).toBe(false);
  });

  it('records no history action for the current value', () => {
    const { ketcher, editor } = ketcherWith(stereoStruct('abs', true));

    Ketcher.prototype.setHideAbsLabel.call(ketcher, true);

    expect(editor.update).not.toHaveBeenCalled();
  });

  it('throws in Macromolecules mode', () => {
    globalThis.isPolymerEditorTurnedOn = true;
    const struct = stereoStruct('abs');
    const { ketcher } = ketcherWith(struct);

    expect(() =>
      Ketcher.prototype.setHideAbsLabel.call(ketcher, true),
    ).toThrow();
    expect(struct.hideAbsLabel).toBe(false);
  });
});
