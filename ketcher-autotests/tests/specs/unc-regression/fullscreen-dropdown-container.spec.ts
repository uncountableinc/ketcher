/* eslint-disable no-magic-numbers */
import { test, expect, Page } from '@playwright/test';
import { waitForPageInit } from '@utils';
import { getAtomLocator } from '@utils/canvas/atoms/getAtomLocator/getAtomLocator';
import { ContextMenu } from '@tests/pages/common/ContextMenu';
import { PLAIN_CHAIN_KET, setMolecule } from './fixtures';

/*
 * Fork commits under test:
 *   83730d640  fix  (ZoomControls popover)
 *   3d3b76a6c  fix select container  (form Select menu)
 *   MAT-89356  the molecule editor's right-click context menu
 *
 * MUI renders a popover into a portal. Which element it portals into decides
 * whether the user can see it.
 *
 * In fullscreen the browser paints only the fullscreen element and its
 * descendants, so a popover portalled to document.body is invisible: the zoom
 * dropdown and every dialog select silently stop working. Outside fullscreen
 * the opposite holds - portalling into the editor root lets the root's own
 * overflow clip a dropdown that opens near an edge.
 *
 * Vanilla portals into the editor root unconditionally. The fork chooses per
 * state: the editor root while fullscreen, the document body otherwise.
 *
 * The context menu stays mounted while hidden, so it cannot read the state when
 * it opens. It follows the fullscreenchange event instead, which is why
 * pretendFullscreen dispatches one.
 *
 * Headless Chromium reports fullscreenEnabled but never enters fullscreen, so
 * the fullscreen case here overrides document.fullscreenElement rather than
 * pressing the button. That is what the component reads, so the branch under
 * test is the real one; only the transition into fullscreen is simulated.
 */

async function pretendFullscreen(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector('.Ketcher-root');
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => root,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

async function zoomDropdownIsInsideEditorRoot(page: Page): Promise<boolean> {
  // Both the micro and macro toolbars mount one, so scope to the visible one.
  await page
    .getByTestId('zoom-selector')
    .locator('visible=true')
    .first()
    .click();
  const zoomIn = page.getByTestId('zoom-in').locator('visible=true').first();
  await expect(zoomIn).toBeVisible();

  return zoomIn.evaluate((element) => element.closest('.Ketcher-root') != null);
}

async function contextMenuIsInsideEditorRoot(page: Page): Promise<boolean> {
  await setMolecule(page, PLAIN_CHAIN_KET);
  const atom = getAtomLocator(page, { atomLabel: 'C' }).first();
  await ContextMenu(page, atom).open();
  const menu = ContextMenu(page, atom).contextMenuBody.first();
  await expect(menu).toBeVisible();

  return menu.evaluate((element) => element.closest('.Ketcher-root') != null);
}

test.describe('dropdowns portal into the element the user can see', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('the zoom dropdown opens inside the editor root while fullscreen', async ({
    page,
  }) => {
    await pretendFullscreen(page);

    expect(await zoomDropdownIsInsideEditorRoot(page)).toBe(true);
  });

  test('the zoom dropdown opens outside the editor root otherwise', async ({
    page,
  }) => {
    expect(await page.evaluate(() => document.fullscreenElement != null)).toBe(
      false,
    );

    expect(await zoomDropdownIsInsideEditorRoot(page)).toBe(false);
  });

  test('the context menu opens inside the editor root while fullscreen', async ({
    page,
  }) => {
    await pretendFullscreen(page);

    expect(await contextMenuIsInsideEditorRoot(page)).toBe(true);
  });

  test('the context menu opens outside the editor root otherwise', async ({
    page,
  }) => {
    expect(await page.evaluate(() => document.fullscreenElement != null)).toBe(
      false,
    );

    expect(await contextMenuIsInsideEditorRoot(page)).toBe(false);
  });
});
