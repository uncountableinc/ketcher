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
import { PLAIN_CHAIN_KET, setMolecule, sgroupCount } from './fixtures';

/*
 * Fork commit under test:
 *   cb5b18637  fix undo crash after creating SRU polymer S-group
 *              (MAT-68021 / MAT-75711, Sentry UNC-F-8GE)
 *
 * Creating an SRU polymer S-group used to clone the whole structure to
 * recompute implicit hydrogens, which renumbered atom and fragment ids and
 * stranded the ids recorded on the undo stack. Erasing an atom first leaves an
 * id gap, so the renumbering is observable.
 *
 * The error the stale ids raise depends on the upstream version: at v3.6.0 it
 * was "Cannot set properties of undefined (setting 'implicitHCount')", at
 * v3.10.0 it is "S-Group not empty!". Either way the S-group stays on the
 * canvas. So the test asserts that undo removes the S-group and raises no page
 * error, rather than matching one message, which passes on v3.10.0 with the
 * fix reverted.
 */

test.describe('SRU polymer undo', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('undo removes an SRU polymer S-group created after an erase', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
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
    expect(await sgroupCount(page)).toBe(1);

    await selectUndoByKeyboard(page);

    expect(await sgroupCount(page)).toBe(0);
    expect(pageErrors).toEqual([]);
  });
});
