import { test } from '@playwright/test';
import {
  TopPanelButton,
  selectTopPanelButton,
  takeEditorScreenshot,
  waitForPageInit,
  openFileAndAddToCanvas,
  clickOnFileFormatDropdown,
} from '@utils';

test.describe('Saving in .png files', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });
  const testData1 = [
    {
      filename: 'KET/unsplit-nucleotides-connected-with-nucleotides.ket',
      description: 'unsplit-nucleotides-connected-with-nucleotides',
    },
    {
      filename: 'KET/unsplit-nucleotides-connected-with-chems.ket',
      description: 'connection nucleotides with chems',
    },
    {
      filename: 'KET/unsplit-nucleotides-connected-with-bases.ket',
      description: 'unsplit-nucleotides-connected-with-bases',
    },
    {
      filename: 'KET/unsplit-nucleotides-connected-with-sugars.ket',
      description: 'unsplit-nucleotides-connected-with-sugars',
    },
    {
      filename: 'KET/unsplit-nucleotides-connected-with-phosphates.ket',
      description: 'unsplit-nucleotides-connected-with-phosphates',
    },
    {
      filename: 'KET/unsplit-nucleotides-connected-with-peptides.ket',
      description: 'unsplit-nucleotides-connected-with-peptides',
    },
  ];

  for (const { filename, description } of testData1) {
    test(`Export to PNG: Verify it is possible to export ${description} to PNG`, async ({
      page,
    }) => {
      await openFileAndAddToCanvas(filename, page);
      await takeEditorScreenshot(page);
      await selectTopPanelButton(TopPanelButton.Save, page);
      await clickOnFileFormatDropdown(page);
      await page.getByRole('option', { name: 'PNG Image' }).click();
      await takeEditorScreenshot(page);
    });
  }
});
