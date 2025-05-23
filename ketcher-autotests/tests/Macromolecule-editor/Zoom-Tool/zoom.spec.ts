/* eslint-disable no-magic-numbers */
import { Page, test, expect } from '@playwright/test';
import {
  takeEditorScreenshot,
  waitForPageInit,
  openFileAndAddToCanvasMacro,
  waitForRender,
  selectSnakeLayoutModeTool,
  clickInTheMiddleOfTheScreen,
  screenshotBetweenUndoRedoInMacro,
  moveMouseToTheMiddleOfTheScreen,
  takePageScreenshot,
  moveMouseAway,
  openStructurePasteFromClipboard,
  dragMouseTo,
  clickOnMiddleOfCanvas,
  zoomWithMouseWheel,
  clickOnCanvas,
  selectMacroBond,
  resetZoomLevelToDefault,
  ZoomOutByKeyboard,
  ZoomInByKeyboard,
  selectZoomInTool,
  selectZoomOutTool,
  selectZoomReset,
} from '@utils';
import { MacroBondTool } from '@utils/canvas/tools/selectNestedTool/types';
import { turnOnMacromoleculesEditor } from '@utils/macromolecules';
import { connectMonomersWithBonds } from '@utils/macromolecules/monomer';
import { Chems, Peptides } from '@utils/selectors/macromoleculeEditor';

async function zoomWithMouseScrollAndTakeScreenshot(page: Page) {
  const zoomLevelDelta = 600;
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -zoomLevelDelta);
  await page.keyboard.up('Control');
  await takeEditorScreenshot(page);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, zoomLevelDelta);
  await page.keyboard.up('Control');
  await takeEditorScreenshot(page);
}

test.describe('Zoom Tool', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
    await turnOnMacromoleculesEditor(page);
  });

  test('Check tooltip for a Zoom in, Zoom out, Reset buttons', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: Zoom in, Zoom out, Reset buttons tooltips are located in the top toolbar.
    */
    const icons = [
      {
        testId: 'zoom-in-button',
        title: 'Zoom In',
      },
      {
        testId: 'zoom-out-button',
        title: 'Zoom Out',
      },
      {
        testId: 'reset-zoom-button',
        title: 'Zoom 100%',
      },
    ];
    await page.getByTestId('zoom-selector').click();
    for (const icon of icons) {
      const iconButton = page.getByTestId(icon.testId);
      await expect(iconButton).toHaveAttribute('title', icon.title);
      await iconButton.hover();
      expect(icon.title).toBeTruthy();
    }
    await clickInTheMiddleOfTheScreen(page);
  });

  test('Validate that clicking "Zoom In"/"Zoom Out" buttons zooms into top left corner of canvas', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: "Zoom In"/"Zoom Out" buttons zooms into center of current view
    */
    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-with-bonds.ket',
      page,
    );
    await selectZoomInTool(page, 10);
    await clickInTheMiddleOfTheScreen(page);
    await takeEditorScreenshot(page);
    await selectZoomOutTool(page, 10);
    await clickInTheMiddleOfTheScreen(page);
    await takeEditorScreenshot(page);
  });

  test('Check that minimum value for zoom out is 20% and maximum value for zoom in is 400%', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: Minimum value for zoom out is 20% and maximum value for zoom in is 400%
    */
    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-with-bonds.ket',
      page,
    );
    await selectZoomOutTool(page, 10);

    await clickInTheMiddleOfTheScreen(page);
    let zoomValue = await page.getByTestId('zoom-selector').textContent();
    expect(zoomValue).toBe('20%');
    await takePageScreenshot(page);

    await selectZoomReset(page);
    await selectZoomInTool(page, 30);
    await clickInTheMiddleOfTheScreen(page);
    zoomValue = await page.getByTestId('zoom-selector').textContent();
    expect(zoomValue).toBe('400%');
    await takePageScreenshot(page);
  });

  test('Validate that mouse scrolling IN/OUT - zooms into center of current mouse position', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: Mouse scrolling IN/OUT - zooms into center of current mouse position
    */
    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-with-bonds.ket',
      page,
    );
    await page.getByText('DTrp2M').locator('..').first().hover();
    await zoomWithMouseScrollAndTakeScreenshot(page);
  });

  test('Check that button "Reset zoom" is reset zoom settings to 100%', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: Button "Reset zoom" is reset zoom settings to 100%
    */
    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-with-bonds.ket',
      page,
    );
    for (let i = 0; i < 10; i++) {
      await ZoomOutByKeyboard(page);
    }
    await moveMouseAway(page);
    await takeEditorScreenshot(page);
    await selectZoomReset(page);
    await clickInTheMiddleOfTheScreen(page);
    await moveMouseAway(page);
    await takeEditorScreenshot(page);
  });

  test('Check that hotkey "Ctrl + 0" is reset zoom settings to 100%', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: Hotkey "Ctrl + 0" is reset zoom settings to 100%
    */
    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-with-bonds.ket',
      page,
    );
    for (let i = 0; i < 10; i++) {
      await ZoomInByKeyboard(page);
    }
    await takeEditorScreenshot(page);
    await resetZoomLevelToDefault(page);
    await takeEditorScreenshot(page);
  });

  test('Check that after open monomers structure from a  .mol  file you are able to zoom in and zoom out', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: After open monomers structure from a  .mol  file you are able
    to zoom in and zoom out by hot keys.
    */
    await openFileAndAddToCanvasMacro(
      'Molfiles-V3000/monomers-and-chem.mol',
      page,
    );
    for (let i = 0; i < 10; i++) {
      await ZoomInByKeyboard(page);
    }
    await takeEditorScreenshot(page);
    for (let i = 0; i < 10; i++) {
      await ZoomOutByKeyboard(page);
    }
    await takeEditorScreenshot(page);
  });

  test('Check after zoom in on created long snake chain of peptides you can use scroll with Shift', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: After zoom in on created long snake chain of peptides you can use scroll with Shift
    */
    const wheelYDelta = -400;
    const wheelXDelta = -400;
    await selectSnakeLayoutModeTool(page);
    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-with-bonds.ket',
      page,
    );
    for (let i = 0; i < 10; i++) {
      await ZoomInByKeyboard(page);
    }
    await page.keyboard.down('Shift');
    await page.mouse.wheel(wheelXDelta, 0);
    await page.keyboard.up('Shift');
    await page.mouse.wheel(0, wheelYDelta);
    await takeEditorScreenshot(page);
  });

  test('Check when you zoom in on created structure as much as possible, its elements still remain clear and accurate view', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: When you zoom in on created structure as much as possible,
    its elements still remain clear and accurate view.
    */
    const MOUSE_WHEEL_VALUE_FOR_MAX_ZOOM = -1000;

    await openFileAndAddToCanvasMacro(
      'KET/peptides-connected-through-chem.ket',
      page,
    );
    await clickOnMiddleOfCanvas(page);
    await zoomWithMouseWheel(page, MOUSE_WHEEL_VALUE_FOR_MAX_ZOOM);
    await moveMouseAway(page);
    await takeEditorScreenshot(page);
  });

  test('Check that is possible to zoom in and out on empty canvas and it wont cause any errors', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: Zoom in and out on empty canvas wont cause any errors.
    */
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        test.fail(
          msg.type() === 'error',
          `There is error in console: ${msg.text}`,
        );
      }
    });
    for (let i = 0; i < 30; i++) {
      await ZoomInByKeyboard(page);
    }
    for (let i = 0; i < 30; i++) {
      await ZoomOutByKeyboard(page);
    }
  });

  test('Check if you create a peptide chain, zoom in and add new elements to chain then zoom out and add another elements', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: After create a peptide chain, zoom in and add new elements to chain then zoom out and add
    another elements, then after back to zoom 100% all structure is create properly.
    */
    const x = 800;
    const y = 350;
    const x1 = 650;
    const y1 = 150;
    await page.getByTestId(Peptides.BetaAlanine).click();
    await clickInTheMiddleOfTheScreen(page);
    for (let i = 0; i < 3; i++) {
      await ZoomInByKeyboard(page);
    }
    await page.getByTestId('Edc___S-ethylthiocysteine').click();
    await clickOnCanvas(page, x, y);
    await connectMonomersWithBonds(page, ['bAla', 'Edc']);
    for (let i = 0; i < 5; i++) {
      await ZoomOutByKeyboard(page);
    }
    await page.getByTestId('meD___N-Methyl-Aspartic acid').click();
    await clickOnCanvas(page, x1, y1);
    await connectMonomersWithBonds(page, ['Edc', 'meD']);
    await takeEditorScreenshot(page);
  });

  test('Undo not undoing zoom', async ({ page }) => {
    /*
    Test case: Zoom Tool
    Description: After creating structure on canvas and then
    click zoom in, and then Undo, Redo the structure is the same size as before.
    */
    const x = 800;
    const y = 350;
    await page.getByTestId(Peptides.BetaAlanine).click();
    await clickInTheMiddleOfTheScreen(page);
    await page.getByTestId('Edc___S-ethylthiocysteine').click();
    await clickOnCanvas(page, x, y);
    await connectMonomersWithBonds(page, ['bAla', 'Edc']);
    await takeEditorScreenshot(page);
    for (let i = 0; i < 5; i++) {
      await ZoomInByKeyboard(page);
    }
    await screenshotBetweenUndoRedoInMacro(page);
    await takeEditorScreenshot(page);
  });

  test('After zooming out to maximum canvas zoom level, preview of monomer entities remains same as before zoom out', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: After zooming out to maximum canvas
    zoom level, preview of monomer entities under mouse cursor remains same as before zoom out.
    */
    for (let i = 0; i < 8; i++) {
      await ZoomOutByKeyboard(page);
    }
    await page.getByTestId(Peptides.BetaAlanine).click();
    await moveMouseToTheMiddleOfTheScreen(page);
    await takeEditorScreenshot(page);
    await page.getByTestId('RNA-TAB').click();
    await page.getByTestId('C_C_R_P').click();
    await moveMouseToTheMiddleOfTheScreen(page);
    await takeEditorScreenshot(page);
    await page.getByTestId('CHEM-TAB').click();
    await page.getByTestId(Chems.SMPEG2).click();
    await moveMouseToTheMiddleOfTheScreen(page);
    await takeEditorScreenshot(page);
  });

  test('After zooming in to maximum on monomer, connection points looks undistorted', async ({
    page,
  }) => {
    /*
    Test case: Zoom Tool
    Description: After zooming in to maximum on monomer, connection points looks undistorted.
    */
    await openFileAndAddToCanvasMacro(
      `KET/Peptide-Templates/15 - (R1,R2,R3,R4,R5).ket`,
      page,
    );
    await clickOnMiddleOfCanvas(page);
    await dragMouseTo(100, 100, page);
    for (let i = 0; i < 30; i++) {
      await waitForRender(
        page,
        async () => {
          await ZoomInByKeyboard(page);
        },
        1,
      );
    }
    await selectMacroBond(page, MacroBondTool.SINGLE);
    await page.getByText('(R').locator('..').first().hover();
    await takeEditorScreenshot(page);
  });

  test('When zoomed to 175% and more, buttons in Paste from Clipboard window not change their position and not overlap each other', async ({
    page,
    browser,
  }) => {
    /*
    Test case: Zoom Tool
    Description: When zoomed to 175% and more, buttons in
    Paste from Clipboard window not change their position and not overlap each other.
    After fix bug https://github.com/epam/ketcher/issues/4174 need to update snapshot.
    */
    await page.getByTestId('open-button').click();
    await page.getByTestId('paste-from-clipboard-button').click();
    await browser.newContext({ deviceScaleFactor: 2.5 });
    await page.setViewportSize({ width: 435, height: 291 });
    await takePageScreenshot(page);
  });

  test('Maximum browser zoom out', async ({ page, browser }) => {
    /*
    Test case: Zoom Tool
    Description: When zoomed out to 25%, buttons and toolbars have the correct appearance
    */
    await page.getByTestId('open-button').click();
    await page.getByTestId('paste-from-clipboard-button').click();
    await browser.newContext({ deviceScaleFactor: 0.2 });
    await page.setViewportSize({ width: 4358, height: 2918 });
    await takePageScreenshot(page);
  });

  test('Maximum browser zoom in', async ({ page, browser }) => {
    /*
    Test case: https://github.com/epam/ketcher/issues/4422 - Case 29
    Description: When zoomed to maximum, buttons in Paste from Clipboard window not change their position and not overlap each other
    */
    await openStructurePasteFromClipboard(page);
    await browser.newContext({ deviceScaleFactor: 4 });
    await page.setViewportSize({ width: 435, height: 291 });
    await takePageScreenshot(page);
  });
});
