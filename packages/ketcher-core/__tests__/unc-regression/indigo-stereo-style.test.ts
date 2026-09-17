import { RemoteStructService } from 'infrastructure/services/struct/remoteStructService';
import { ketcherProvider } from 'application/utils';

jest.mock('application/utils', () => ({
  ...jest.requireActual('application/utils'),
  ketcherProvider: { getKetcher: jest.fn() },
}));

/*
 * Fork commit under test:
 *   f2e76d0ce  fix
 *
 * The editor has a showStereoFlags setting that controls whether enhanced
 * stereo flags are drawn on the canvas. Indigo renders the server-side images
 * the app stores and prints, and it has its own switch for the same thing:
 * render-stereo-style.
 *
 * Vanilla never sent it, so a server-rendered image always carried the Indigo
 * default no matter what the canvas showed, and the image disagreed with the
 * structure the user had just drawn. The fork threads a stereoStyle option
 * through to the render call.
 *
 * The option stays absent from the request when the caller does not set one,
 * so Indigo keeps applying its own default for every existing caller.
 */

const KETCHER_ID = 'ketcher-test';
const API_PATH = 'https://indigo.example/v2/';

function stubIndigoResponse() {
  const requestBodies: Array<Record<string, unknown>> = [];

  global.fetch = jest.fn(async (_url: unknown, init: { body: string }) => {
    requestBodies.push(JSON.parse(init.body));
    return { ok: true, text: async () => 'base64-image' };
  }) as unknown as typeof fetch;

  return requestBodies;
}

function serviceWithKetcherId() {
  (ketcherProvider.getKetcher as jest.Mock).mockReturnValue({
    editor: { options: () => ({ ignoreChiralFlag: false }) },
  });

  const service = new RemoteStructService(API_PATH, {});
  service.addKetcherId(KETCHER_ID);
  return service;
}

describe('the stereo style reaches Indigo image rendering', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends render-stereo-style when the caller asks for one', async () => {
    const requestBodies = stubIndigoResponse();

    await serviceWithKetcherId().generateImageAsBase64('molfile', {
      outputFormat: 'png',
      stereoStyle: 'ext',
    });

    expect(requestBodies[0].options).toMatchObject({
      'render-stereo-style': 'ext',
    });
  });

  it.each(['old', 'none;'] as const)(
    'passes %s through unchanged',
    async (stereoStyle) => {
      const requestBodies = stubIndigoResponse();

      await serviceWithKetcherId().generateImageAsBase64('molfile', {
        outputFormat: 'svg',
        stereoStyle,
      });

      expect(requestBodies[0].options).toMatchObject({
        'render-stereo-style': stereoStyle,
      });
    },
  );

  it('leaves the option out when the caller sets none', async () => {
    const requestBodies = stubIndigoResponse();

    await serviceWithKetcherId().generateImageAsBase64('molfile', {
      outputFormat: 'png',
    });

    expect(requestBodies[0].options).not.toHaveProperty('render-stereo-style');
  });
});
