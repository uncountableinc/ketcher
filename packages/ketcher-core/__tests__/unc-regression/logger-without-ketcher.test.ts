import { KetcherLogger, LogLevel } from 'utilities';

/*
 * Fork commit under test:
 *   81d4c7d75  remove logger error
 *
 * Vanilla's logger threw "Ketcher needs to be initialized before KetcherLogger
 * is used" whenever it read its settings and window.ketcher was not set yet.
 *
 * Every operation and serializer logs through it, so anything that runs before
 * or after the global is installed hits that throw. The app mounts and
 * unmounts the drawer inside a dialog, which leaves both windows open: a
 * structure converted during startup, and any logging from a component still
 * tearing down after the global is gone.
 *
 * The fork returns empty settings instead. Logging then degrades to silence
 * rather than throwing out of the caller.
 */

describe('the logger tolerates a missing ketcher global', () => {
  // The global is typed as a fully-built Ketcher; the logger only reads
  // .logging off it, so the test installs just that.
  const ketcherGlobal = window as unknown as { ketcher?: unknown };

  afterEach(() => {
    delete ketcherGlobal.ketcher;
  });

  it('reads settings without a ketcher global', () => {
    expect(() => KetcherLogger.settings).not.toThrow();
    expect(KetcherLogger.settings).toEqual({});
  });

  it('does not throw out of a log call', () => {
    expect(() => KetcherLogger.log('message')).not.toThrow();
    expect(() =>
      KetcherLogger.error('context', new Error('boom')),
    ).not.toThrow();
  });

  it('still reads the settings the global carries', () => {
    ketcherGlobal.ketcher = {
      logging: { enabled: true, level: LogLevel.ERROR },
    };

    expect(KetcherLogger.settings).toEqual({
      enabled: true,
      level: LogLevel.ERROR,
    });
  });
});
