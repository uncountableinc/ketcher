import { KetSerializer, Struct } from 'ketcher-core';
import { load } from '../shared';
import { serverTransform } from '.';

jest.mock('../shared', () => ({
  load: jest.fn((struct, options) => ({ type: 'LOAD', struct, options })),
}));

const PLAIN_KET = JSON.stringify({
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

const METHODS = [
  'layout',
  'clean',
  'aromatize',
  'dearomatize',
  'calculateCip',
  'toggleExplicitHydrogens',
] as const;

function canvasStruct(hideAbsLabel: boolean): Struct {
  const struct = new KetSerializer().deserialize(PLAIN_KET);
  struct.hideAbsLabel = hideAbsLabel;
  return struct;
}

async function loadedStructAfter(
  method: (typeof METHODS)[number],
  hideAbsLabel: boolean,
): Promise<Struct> {
  const struct = canvasStruct(hideAbsLabel);
  const respond = jest.fn(async () => ({ struct: PLAIN_KET }));
  const server = Object.assign(Promise.resolve(), { [method]: respond });
  const state = {
    editor: {
      struct: () => struct,
      selection: () => null,
      explicitSelected: () => ({}),
      errorHandler: jest.fn(),
    },
    server,
    options: { getServerSettings: () => ({}) },
  };
  const dispatch = jest.fn((action) => action);

  serverTransform(method)(dispatch, () => state as never);

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(respond).toHaveBeenCalled();
  return (load as jest.Mock).mock.calls[0][0] as Struct;
}

describe('serverTransform keeps the hideAbsLabel marker', () => {
  it.each(METHODS)('%s keeps a hidden structure hidden', async (method) => {
    expect((await loadedStructAfter(method, true)).hideAbsLabel).toBe(true);
  });

  it.each(METHODS)('%s keeps a visible structure visible', async (method) => {
    expect((await loadedStructAfter(method, false)).hideAbsLabel).toBe(false);
  });
});
