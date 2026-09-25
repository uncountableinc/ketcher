/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { undoByKeyboard, waitForPageInit } from '@utils';
import { getAtomLocator } from '@utils/canvas/atoms/getAtomLocator/getAtomLocator';
import { copyAndPaste } from '@utils/canvas/selectSelection';
import { CommonLeftToolbar } from '@tests/pages/common/CommonLeftToolbar';
import {
  atomCount,
  PLAIN_CHAIN_KET,
  setMolecule,
  sgroupCount,
  SRU_CHAIN_KET,
} from './fixtures';

/*
 * Fork commits under test:
 *   96513d3d6  fix copy and paste
 *   f6362eda8  fix bracket paste
 *   243b653df  fix undo stack
 */

test.describe('clipboard and undo', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('copy and paste adds a second copy of the structure', async ({
    page,
  }) => {
    await setMolecule(page, PLAIN_CHAIN_KET);
    const original = await atomCount(page);

    await copyAndPaste(page);

    expect(await atomCount(page)).toBe(original * 2);
  });

  test('pasting a structure with an s-group keeps its brackets', async ({
    page,
  }) => {
    // Bracket positions are recomputed on load. That recompute used to run
    // without a render and threw, losing the pasted group's brackets.
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await setMolecule(page, SRU_CHAIN_KET);
    expect(await sgroupCount(page)).toBe(1);

    await copyAndPaste(page);

    expect(await sgroupCount(page)).toBe(2);
    expect(pageErrors).toEqual([]);
  });

  test('undo restores an atom an erase removed', async ({ page }) => {
    await setMolecule(page, PLAIN_CHAIN_KET);
    const before = await atomCount(page);

    await CommonLeftToolbar(page).erase();
    await getAtomLocator(page, { atomLabel: 'C' }).nth(0).click();
    const afterErase = await atomCount(page);
    await undoByKeyboard(page);

    expect(afterErase).toBe(before - 1);
    expect(await atomCount(page)).toBe(before);
  });

  test('undo restores a structure that carries an s-group', async ({
    page,
  }) => {
    // The editor used to sync its props on a deprecated lifecycle hook, which
    // let the undo stack drift out of step with the rendered structure. An
    // s-group is the case where that drift was first seen.
    await setMolecule(page, SRU_CHAIN_KET);
    const original = {
      atoms: await atomCount(page),
      sgroups: await sgroupCount(page),
    };

    await CommonLeftToolbar(page).erase();
    await getAtomLocator(page, { atomLabel: 'C' }).nth(0).click();
    await undoByKeyboard(page);

    expect({
      atoms: await atomCount(page),
      sgroups: await sgroupCount(page),
    }).toEqual(original);
  });
});
