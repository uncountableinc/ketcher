/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { waitForPageInit } from '@utils';
import { CommonLeftToolbar } from '@tests/pages/common/CommonLeftToolbar';
import { SelectionToolType } from '@tests/pages/constants/areaSelectionTool/Constants';

/*
 * Fork commits under test:
 *   c32453d96 / 36c00e15a  ketcher-id class, then holding the id in state
 *   6a59f2ba2              fullscreen fix
 *
 * The editor root carries a `ketcher-id-<id>` class so styling and fullscreen
 * can target one embedded instance rather than the whole page. The platform's
 * own stylesheet hangs off that root, so losing the class breaks its layout
 * silently — nothing throws, the drawer just renders wrong.
 */

test.describe('the editor root element', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('carries a ketcher-id class naming its instance', async ({ page }) => {
    const classes = await page.evaluate(() => {
      const root = document.querySelector('.Ketcher-root');
      return root === null ? null : Array.from(root.classList);
    });

    expect(classes).not.toBeNull();
    expect(classes?.some((name) => name.startsWith('ketcher-id-'))).toBe(true);
  });

  test('toggling fullscreen does not throw and returns to normal', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    // Both the micro and macro toolbars mount one, so scope to the visible one.
    const fullscreen = page
      .getByTestId('fullscreen-mode-button')
      .locator('visible=true')
      .first();
    await fullscreen.click();
    await page.waitForTimeout(600);
    await fullscreen.click();
    await page.waitForTimeout(600);

    expect(pageErrors).toEqual([]);
    await expect(page.locator('.Ketcher-root')).toBeVisible();
  });

  /*
   * A toolbar dropdown renders through `Portal`, which used to remove its
   * element from `document.querySelector('.Ketcher-root')`. The platform
   * embeds more than one editor on a page, so that selector can resolve to
   * another instance's root and `removeChild` throws a `NotFoundError`.
   */
  test('a toolbar dropdown closes cleanly beside a second editor root', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const toolbar = CommonLeftToolbar(page);
    await toolbar.areaSelectionDropdownExpandButton.click();
    const dropdown = page.getByTestId('multi-tool-dropdown').first();
    await expect(dropdown).toBeVisible();

    await page.evaluate(() => {
      const secondEditorRoot = document.createElement('div');
      secondEditorRoot.className = 'Ketcher-root';
      document.body.insertBefore(secondEditorRoot, document.body.firstChild);
    });

    await page
      .getByTestId(SelectionToolType.Lasso)
      .filter({ has: page.locator(':visible') })
      .first()
      .click();

    await expect(dropdown).toBeHidden();
    expect(pageErrors).toEqual([]);
  });
});
