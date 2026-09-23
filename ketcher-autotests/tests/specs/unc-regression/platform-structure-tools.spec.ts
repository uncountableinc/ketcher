/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { waitForPageInit } from '@utils';
import {
  atomCount,
  PLAIN_CHAIN_KET,
  setMolecule,
  SHORT_CHAIN_KET,
} from './fixtures';

/*
 * No fork commit under test. These pin the two ketcher APIs the platform's
 * Bodie chemical-structure tools drive, and nothing else:
 *
 *   chemical_structure_replace -> ketcher.setMolecule(structure)
 *   chemical_structure_clear   -> ketcher.editor.clear()
 *
 * Both were reported broken on v3.7.0 with no reproduction attached. The
 * platform cannot test them without an LLM in the loop, and its own drawer
 * does not expose the instance to a browser test, so they are pinned here
 * where the demo build does expose it.
 *
 * Note that `editor.clear()` is NOT the Clear Canvas toolbar action, which
 * calls `editor.struct(null)` through a thunk. Testing the button would leave
 * the API the platform actually calls uncovered.
 */

const PLAIN_CHAIN_ATOM_COUNT = 5;
const SHORT_CHAIN_ATOM_COUNT = 2;
const EMPTY_CANVAS_ATOM_COUNT = 0;

test.describe('the ketcher APIs the platform structure tools drive', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('setMolecule replaces the canvas rather than adding to it', async ({
    page,
  }) => {
    await setMolecule(page, PLAIN_CHAIN_KET);
    expect(await atomCount(page)).toBe(PLAIN_CHAIN_ATOM_COUNT);

    // The replace tool promises a replacement. An append would read as 7 here.
    await setMolecule(page, SHORT_CHAIN_KET);
    expect(await atomCount(page)).toBe(SHORT_CHAIN_ATOM_COUNT);
  });

  test('editor.clear empties the canvas', async ({ page }) => {
    await setMolecule(page, PLAIN_CHAIN_KET);
    expect(await atomCount(page)).toBe(PLAIN_CHAIN_ATOM_COUNT);

    await page.evaluate(() => window.ketcher.editor.clear());

    expect(await atomCount(page)).toBe(EMPTY_CANVAS_ATOM_COUNT);
    expect(
      await page.evaluate(() => window.ketcher.editor.struct().isBlank()),
    ).toBe(true);
  });

  test('the editor still takes a structure after a clear', async ({ page }) => {
    await setMolecule(page, PLAIN_CHAIN_KET);
    await page.evaluate(() => window.ketcher.editor.clear());

    await setMolecule(page, SHORT_CHAIN_KET);

    expect(await atomCount(page)).toBe(SHORT_CHAIN_ATOM_COUNT);
  });
});
