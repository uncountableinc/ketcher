/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { waitForPageInit } from '@utils';

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
});
