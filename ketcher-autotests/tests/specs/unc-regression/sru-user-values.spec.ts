/* eslint-disable no-magic-numbers */
import { Page, test, expect } from '@playwright/test';
import { openFileAndAddToCanvas, pressButton, waitForPageInit } from '@utils';
import { selectAllStructuresOnCanvas } from '@utils/canvas/selectSelection';
import { getKet } from '@utils/formats';
import { SGroupRepeatPattern } from '@utils/sgroup';
import { LeftToolbar } from '@tests/pages/molecules/LeftToolbar';

/*
 * Fork commit under test:
 *   37c0a4b53  dont override user set values
 *
 * structconv applied the SRU defaults ('n' subscript, head-to-tail
 * connectivity) whenever the S-group type was SRU, including when the user had
 * already chosen their own. Whatever the chemist typed in the dialog was
 * silently replaced on the next conversion.
 *
 * The defaults must apply only when both fields are still unset.
 */

const USER_SUBSCRIPT = 'A';
const DEFAULT_SUBSCRIPT = 'n';

async function createSruPolymer(
  page: Page,
  polymerLabel: string,
  repeatPattern: SGroupRepeatPattern,
) {
  await selectAllStructuresOnCanvas(page);
  await LeftToolbar(page).sGroup();
  await page.locator('span').filter({ hasText: 'Data' }).click();
  await page.getByRole('option', { name: 'SRU Polymer' }).click();
  await page.getByLabel('Polymer label').fill(polymerLabel);
  await page
    .locator('label')
    .filter({ hasText: 'Repeat Pattern' })
    .locator('span')
    .nth(1)
    .click();
  await page.getByRole('option', { name: repeatPattern }).click();
  await pressButton(page, 'Apply');
}

test.describe('SRU polymer keeps user-set values', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('keeps a user-set subscript instead of the default', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(page, 'KET/simple-chain.ket');

    await createSruPolymer(
      page,
      USER_SUBSCRIPT,
      SGroupRepeatPattern.HeadToHead,
    );
    const sgroups = JSON.parse(await getKet(page)).mol0.sgroups;

    expect(sgroups).toHaveLength(1);
    expect(sgroups[0].subscript).toBe(USER_SUBSCRIPT);
    expect(sgroups[0].subscript).not.toBe(DEFAULT_SUBSCRIPT);
  });

  test('keeps a user-set repeat pattern instead of head-to-tail', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(page, 'KET/simple-chain.ket');

    await createSruPolymer(
      page,
      USER_SUBSCRIPT,
      SGroupRepeatPattern.HeadToHead,
    );
    const sgroups = JSON.parse(await getKet(page)).mol0.sgroups;

    expect(sgroups[0].connectivity).toBe('hh');
  });
});
