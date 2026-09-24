/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { clickOnAtom, selectUndoByKeyboard, waitForPageInit } from '@utils';
import { selectAllStructuresOnCanvas } from '@utils/canvas/selectSelection';
import { CommonLeftToolbar } from '@tests/pages/common/CommonLeftToolbar';
import { LeftToolbar } from '@tests/pages/molecules/LeftToolbar';
import {
  RepeatPatternOption,
  TypeOption,
} from '@tests/pages/constants/s-GroupPropertiesDialog/Constants';
import { SGroupPropertiesDialog } from '@tests/pages/molecules/canvas/S-GroupPropertiesDialog';
import { PLAIN_CHAIN_KET, setMolecule } from './fixtures';

/*
 * Fork commit under test:
 *   cb5b18637  fix undo crash after creating SRU polymer S-group
 *              (MAT-68021 / MAT-75711, Sentry UNC-F-8GE)
 *
 * Creating an SRU polymer S-group used to clone the whole structure to
 * recompute implicit hydrogens, which renumbered atom and fragment ids and
 * stranded the ids recorded on the undo stack. Undoing the S-group creation
 * then threw "Cannot set properties of undefined (setting 'implicitHCount')".
 * Erasing an atom first leaves an id gap, so the renumbering is observable.
 */

const STALE_ATOM_ERROR =
  "Cannot set properties of undefined (setting 'implicitHCount')";

test.describe('SRU polymer undo', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('undo of an SRU polymer S-group does not throw on stale atoms', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await setMolecule(page, PLAIN_CHAIN_KET);
    await CommonLeftToolbar(page).erase();
    await clickOnAtom(page, 'C', 3);

    await selectAllStructuresOnCanvas(page);
    await LeftToolbar(page).sGroup();
    await SGroupPropertiesDialog(page).setOptions({
      Type: TypeOption.SRUPolymer,
      PolymerLabel: 'A',
      RepeatPattern: RepeatPatternOption.HeadToTail,
    });

    await selectUndoByKeyboard(page);

    expect(errors.filter((error) => error.includes(STALE_ATOM_ERROR))).toEqual(
      [],
    );
  });
});
