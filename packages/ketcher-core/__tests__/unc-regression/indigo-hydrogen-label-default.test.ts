import { getLabelRenderModeForIndigo } from 'infrastructure/services/helpers';
import { ketcherProvider } from 'application/utils';

jest.mock('application/utils', () => ({
  ...jest.requireActual('application/utils'),
  ketcherProvider: { getKetcher: jest.fn() },
}));

/*
 * Fork commit under test:
 *   446e1cf11  default to terminal hetero
 *
 * getLabelRenderModeForIndigo maps the editor's showHydrogenLabels setting onto
 * the mode Indigo understands. The fallback for an unmapped or missing setting
 * was OFF, which makes Indigo strip every hydrogen label from the structure it
 * returns. TERMINAL_HETERO matches what the canvas already shows, so a server
 * round trip no longer silently drops labels.
 */

const KETCHER_ID = 'ketcher-test';

function mockShowHydrogenLabels(showHydrogenLabels: unknown) {
  (ketcherProvider.getKetcher as jest.Mock).mockReturnValue({
    editor: { options: () => ({ showHydrogenLabels }) },
  });
}

describe('Indigo hydrogen label fallback', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to terminal-hetero when the setting is missing', () => {
    mockShowHydrogenLabels(undefined);

    expect(getLabelRenderModeForIndigo(KETCHER_ID)).toBe('terminal-hetero');
  });

  it('falls back to terminal-hetero for a setting it does not map', () => {
    mockShowHydrogenLabels('some-unmapped-mode');

    expect(getLabelRenderModeForIndigo(KETCHER_ID)).toBe('terminal-hetero');
  });

  it('never falls back to none, which strips every label', () => {
    mockShowHydrogenLabels(undefined);

    expect(getLabelRenderModeForIndigo(KETCHER_ID)).not.toBe('none');
  });
});
