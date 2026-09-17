import { test, expect } from '@playwright/test';
import { waitForPageInit } from '@utils';
import { SettingsDialog } from '@tests/pages/molecules/canvas/SettingsDialog';
import { TopRightToolbar } from '@tests/pages/molecules/TopRightToolbar';

/*
 * Fork commits under test:
 *   4e21564a4  initOptionsState function
 *   8b92271fc  replace ajv with jsonschema in react
 *
 * Two faults meet in this dialog. saveSettings called `initOptionsState.getSettings()`
 * — a property read on the factory rather than a call to it — so applying the
 * dialog threw and the chosen settings were never re-read. Separately, the swap
 * from ajv to jsonschema left the form machinery validating without a base URL,
 * so jsonschema called `new URL('')` and took the editor down as the dialog
 * opened, before anything could be applied at all.
 */

test.describe('the Settings dialog', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('opens without taking the editor down', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await TopRightToolbar(page).Settings();

    expect(pageErrors).toEqual([]);
    await expect(SettingsDialog(page).applyButton).toBeVisible();
  });

  test('applies without throwing', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await TopRightToolbar(page).Settings();
    await SettingsDialog(page).apply();

    expect(pageErrors).toEqual([]);
  });
});
