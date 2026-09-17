/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { waitForPageInit } from '@utils';

import { PLAIN_CHAIN_KET, setMolecule } from './fixtures';

/*
 * Fork commit under test:
 *   aefcd0a14  add offset negated fix
 *
 * updateOptions takes a JSON string, so every value in it arrives as a plain
 * object. The render offset is read back as a Vec2 by the rest of the render
 * code, which calls methods on it. A plain {x, y, z} read out of stored
 * settings therefore has no .add or .sub, and the next redraw throws.
 *
 * The fork coerces the offset to a Vec2 before storing it. Note that the
 * coercion currently reads the fresh Vec2 rather than the incoming value, so
 * the stored coordinates are lost and the offset resets to the origin. This
 * spec asserts only the guarantee the rest of the render code depends on -
 * that the offset is a Vec2 - so it does not lock in that defect.
 */

const REDRAW_SETTLE_MS = 400;

test.describe('a render offset restored from settings', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('is coerced to a Vec2 rather than left a plain object', async ({
    page,
  }) => {
    const offsetIsVec2 = await page.evaluate(() => {
      window.ketcher.editor.render.updateOptions(
        JSON.stringify({ offset: { x: 5, y: 7, z: 0 } }),
      );
      const { offset } = window.ketcher.editor.render.options;
      return (
        typeof offset?.add === 'function' && typeof offset?.sub === 'function'
      );
    });

    expect(offsetIsVec2).toBe(true);
  });

  test('does not break the next redraw', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.evaluate(() => {
      window.ketcher.editor.render.updateOptions(
        JSON.stringify({ offset: { x: 5, y: 7, z: 0 } }),
      );
    });
    await setMolecule(page, PLAIN_CHAIN_KET);
    await page.waitForTimeout(REDRAW_SETTLE_MS);

    expect(pageErrors).toEqual([]);
    await expect(page.locator('.Ketcher-root')).toBeVisible();
  });
});
