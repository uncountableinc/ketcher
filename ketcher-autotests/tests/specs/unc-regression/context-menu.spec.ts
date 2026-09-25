/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { getAtomLocator } from '@utils/canvas/atoms/getAtomLocator/getAtomLocator';
import { waitForPageInit } from '@utils';
import { ContextMenu } from '@tests/pages/common/ContextMenu';
import { PLAIN_CHAIN_KET, setMolecule } from './fixtures';

/*
 * Fork commits under test:
 *   bf79b6f0c / 259898396 / b70744dde  context-menu and right-click capture
 *
 * The editor binds its context-menu handler with { capture: true } so it wins
 * over a host application's own handler. That makes the binding easy to break
 * in two directions: the editor's own menu stops opening, or the editor starts
 * suppressing right-click for the whole page.
 *
 * Only the first direction is testable here. The demo page is entirely the
 * editor, so there is no "outside the editor" region to right-click; that half
 * belongs in the host application's own end-to-end tests.
 */

test.describe('right-click inside the editor', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
    await setMolecule(page, PLAIN_CHAIN_KET);
  });

  test('opens the editor context menu on an atom', async ({ page }) => {
    const atom = getAtomLocator(page, { atomLabel: 'C' }).first();

    await ContextMenu(page, atom).open();

    await expect(ContextMenu(page, atom).contextMenuBody).toBeVisible();
  });

  test('suppresses the browser menu for the editor canvas', async ({
    page,
  }) => {
    const atom = getAtomLocator(page, { atomLabel: 'C' }).first();
    await ContextMenu(page, atom).open();

    const preventedInsideCanvas = await atom.evaluate(
      (element) =>
        !element.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        ),
    );

    expect(preventedInsideCanvas).toBe(true);
  });
});
