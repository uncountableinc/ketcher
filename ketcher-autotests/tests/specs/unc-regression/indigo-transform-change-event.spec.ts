/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { openFileAndAddToCanvas, waitForPageInit } from '@utils';
import { getKet } from '@utils/formats';
import { IndigoFunctionsToolbar } from '@tests/pages/molecules/IndigoFunctionsToolbar';

/*
 * Fork commit under test:
 *   f22519419  MAT-76710: Persist indigo transform results (Calculate CIP) on save
 *
 * Indigo transforms (Calculate CIP, Layout, Aromatize) route through load(),
 * which re-renders the canvas but never fires a change event. The platform
 * captures the structure from that event, so the transformed struct was never
 * captured and the calculated CIP labels were lost on save. The canvas looked
 * right, which is why this needs an event assertion and not a screenshot.
 *
 * The fix dispatches the editor change event after a non-fragment Indigo
 * transform load, matching what update() already does.
 */

const CHANGE_MARKER = 'unc-regression: indigo transform fired change';

test.describe('Indigo transform fires a change event', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('Calculate CIP dispatches the editor change event', async ({ page }) => {
    await openFileAndAddToCanvas(
      page,
      'Molfiles-V2000/structure-with-stereo-bonds.mol',
    );

    await page.evaluate((marker) => {
      window.ketcher.editor.subscribe('change', () => console.log(marker));
    }, CHANGE_MARKER);

    const changeEvent = page.waitForEvent(
      'console',
      (msg) => msg.text() === CHANGE_MARKER,
    );

    await IndigoFunctionsToolbar(page).calculateCIP();

    await expect(changeEvent).resolves.toBeTruthy();
  });

  test('Calculate CIP result is present in the saved KET', async ({ page }) => {
    await openFileAndAddToCanvas(
      page,
      'Molfiles-V2000/structure-with-stereo-bonds.mol',
    );

    await IndigoFunctionsToolbar(page).calculateCIP();
    const ket = await getKet(page);

    expect(JSON.parse(ket)).toBeTruthy();
    expect(ket).toContain('"cip"');
  });
});
