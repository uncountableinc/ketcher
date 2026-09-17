import { keyNorm } from 'utilities';

/*
 * Fork commit under test:
 *   905baf429  fix bug
 *
 * keynorm turns a keyboard event into the hotkey string the editor looks up.
 * It reads the key name out of a keycode table, and that table does not cover
 * every code a browser can report - synthetic events, some IME and media keys,
 * and anything a test harness dispatches without a keycode all miss.
 *
 * Vanilla then called .length on the undefined name and threw out of the
 * keydown handler, which takes the whole editor's keyboard handling down with
 * it. The fork checks the name is present first.
 */

const UNMAPPED_KEYCODE = 0;
const LETTER_A_KEYCODE = 65;

function keyboardEvent(keyCode: number, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', init);
  Object.defineProperty(event, 'keyCode', { value: keyCode });
  return event;
}

describe('keynorm survives a keycode it has no name for', () => {
  it('does not throw on an unmapped keycode', () => {
    expect(() => keyNorm(keyboardEvent(UNMAPPED_KEYCODE))).not.toThrow();
  });

  it('does not throw with a modifier held', () => {
    expect(() =>
      keyNorm(keyboardEvent(UNMAPPED_KEYCODE, { shiftKey: true })),
    ).not.toThrow();
  });

  it('does not throw when looking an unmapped keycode up in a hotkey map', () => {
    expect(() =>
      keyNorm.lookup({ a: 'atom' }, keyboardEvent(UNMAPPED_KEYCODE)),
    ).not.toThrow();
  });

  it('still resolves a keycode it does have a name for', () => {
    expect(keyNorm(keyboardEvent(LETTER_A_KEYCODE))).toBe('a');
  });
});
