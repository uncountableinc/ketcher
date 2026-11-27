import { Atom, Struct, Vec2, fromPaste } from 'ketcher-core';
import { load } from './shared';

const mockPasteAction = { operations: [] };
const mockChangeEventDispatch = jest.fn();

jest.mock('ketcher-core', () => {
  const actual = jest.requireActual('ketcher-core');
  return {
    ...actual,
    fromPaste: jest.fn(() => [mockPasteAction, {}, {}]),
    CoordinateTransformation: {
      ...actual.CoordinateTransformation,
      pageToModel: jest.fn(
        ({ clientX, clientY }: { clientX: number; clientY: number }) =>
          new actual.Vec2(clientX, clientY),
      ),
    },
    ketcherProvider: {
      getKetcher: jest.fn(() => ({
        changeEvent: { dispatch: mockChangeEventDispatch },
      })),
    },
  };
});

function createStruct() {
  const struct = new Struct();
  struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
  return struct;
}

function createEditor() {
  const ctab = {};
  const currentStruct = new Struct();
  return {
    render: {
      ctab,
      clientArea: {
        getBoundingClientRect: () => ({
          left: 10,
          top: 20,
          width: 200,
          height: 100,
        }),
      },
    },
    update: jest.fn(),
    centerStruct: jest.fn(),
    zoomAccordingContent: jest.fn(),
    selection: jest.fn(),
    struct: jest.fn(() => currentStruct),
    event: {
      change: { dispatch: jest.fn() },
      confirm: { dispatch: jest.fn() },
    },
    ketcherId: 'ketcher-id',
    errorHandler: jest.fn(),
  };
}

async function runLoad(
  editor: ReturnType<typeof createEditor>,
  struct: Struct,
  options: Record<string, unknown>,
) {
  const dispatch = jest.fn();
  const getState = () => ({
    editor,
    server: undefined,
    options: { getServerSettings: () => ({}) },
  });
  await load(struct, options)(dispatch, getState);
  return dispatch;
}

function isPasteToolAction(action: unknown) {
  return (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    action.type === 'ACTION' &&
    'action' in action &&
    (action.action as { tool?: string }).tool === 'paste'
  );
}

describe('load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('commits a fragment that is not a paste to the canvas center', async () => {
    const editor = createEditor();
    const struct = createStruct();

    const dispatch = await runLoad(editor, struct, { fragment: true });

    expect(fromPaste).toHaveBeenCalledWith(
      editor.render.ctab,
      struct,
      new Vec2(110, 70),
    );
    expect(editor.update).toHaveBeenCalledWith(mockPasteAction, false);
    expect(editor.centerStruct).toHaveBeenCalled();
    expect(
      dispatch.mock.calls.some(([action]) => isPasteToolAction(action)),
    ).toBe(false);
  });

  it('activates the paste tool for a pasted fragment', async () => {
    const editor = createEditor();
    const struct = createStruct();

    const dispatch = await runLoad(editor, struct, {
      fragment: true,
      isPaste: true,
    });

    expect(fromPaste).not.toHaveBeenCalled();
    expect(editor.update).not.toHaveBeenCalled();
    expect(
      dispatch.mock.calls.some(([action]) => isPasteToolAction(action)),
    ).toBe(true);
  });

  it('dispatches change events for a load that is not an Indigo call', async () => {
    const editor = createEditor();

    await runLoad(editor, createStruct(), {});

    expect(editor.errorHandler).not.toHaveBeenCalled();
    expect(editor.event.change.dispatch).toHaveBeenCalled();
    expect(mockChangeEventDispatch).toHaveBeenCalled();
  });
});
