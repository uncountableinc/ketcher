import { expect, type Page } from '@playwright/test';
import { test } from '@fixtures';
import { waitForPageInit, moveMouseAway } from '@utils';
import { keyboardTypeOnCanvas } from '@utils/keyboard/index';
import { CommonTopRightToolbar } from '@tests/pages/common/CommonTopRightToolbar';
import { MacromoleculesTopToolbar } from '@tests/pages/macromolecules/MacromoleculesTopToolbar';
import { LayoutMode } from '@tests/pages/constants/macromoleculesTopToolbar/Constants';

const ITEMS_PER_SEQUENCE_ROW = 30;
const TWO_ROW_SEQUENCE_ITEM_COUNT = 41;
const DNA_SEQUENCE_ITEM_COUNT = 65;
const RNA_SECOND_ROW_ITEM_COUNT = 11;
const DNA_THIRD_ROW_ITEM_COUNT = 5;
const TWO_SEQUENCE_ROWS = 2;
const THREE_SEQUENCE_ROWS = 3;
const FIRST_SEQUENCE_ROW_INDEX = 0;
const SECOND_SEQUENCE_ROW_INDEX = 1;
const THIRD_SEQUENCE_ROW_INDEX = 2;

type SequenceRowPositions = {
  firstX: number;
  lastX: number;
  itemCount: number;
};

async function enterSequence(page: Page, itemCount: number) {
  await keyboardTypeOnCanvas(page, 'a'.repeat(itemCount));
  await moveMouseAway(page);
}

async function getSequenceRowPositions(page: Page) {
  return page
    .locator('.sequence-item[data-symbol-alias="A"]')
    .evaluateAll((sequenceItems): SequenceRowPositions[] => {
      const rows: Array<SequenceRowPositions & { y: number }> = [];
      let currentRow: (SequenceRowPositions & { y: number }) | undefined;

      for (const sequenceItem of sequenceItems) {
        if (!(sequenceItem instanceof SVGGraphicsElement)) {
          throw new Error('Sequence item is not an SVG graphics element.');
        }
        const matrix = sequenceItem.transform.baseVal.getItem(0).matrix;

        if (currentRow === undefined || currentRow.y !== matrix.f) {
          currentRow = {
            y: matrix.f,
            firstX: matrix.e,
            lastX: matrix.e,
            itemCount: 1,
          };
          rows.push(currentRow);
        } else {
          currentRow.lastX = matrix.e;
          currentRow.itemCount += 1;
        }
      }

      return rows.map(({ firstX, lastX, itemCount }) => ({
        firstX,
        lastX,
        itemCount,
      }));
    });
}

test.describe('Sequence mode snake layout', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
    await CommonTopRightToolbar(page).turnOnMacromoleculesEditor();
    await MacromoleculesTopToolbar(page).selectLayoutModeTool(
      LayoutMode.Sequence,
    );
    await MacromoleculesTopToolbar(page).rna();
  });

  test('RNA sequence rows follow a snake pattern for 41 bases', async ({
    page,
  }) => {
    await enterSequence(page, TWO_ROW_SEQUENCE_ITEM_COUNT);

    const rows = await getSequenceRowPositions(page);
    expect(rows).toHaveLength(TWO_SEQUENCE_ROWS);
    expect(rows.map(({ itemCount }) => itemCount)).toEqual([
      ITEMS_PER_SEQUENCE_ROW,
      RNA_SECOND_ROW_ITEM_COUNT,
    ]);
    expect(rows[FIRST_SEQUENCE_ROW_INDEX].firstX).toBeLessThan(
      rows[FIRST_SEQUENCE_ROW_INDEX].lastX,
    );
    expect(rows[SECOND_SEQUENCE_ROW_INDEX].firstX).toBeGreaterThan(
      rows[SECOND_SEQUENCE_ROW_INDEX].lastX,
    );
    expect(rows[FIRST_SEQUENCE_ROW_INDEX].lastX).toBe(
      rows[SECOND_SEQUENCE_ROW_INDEX].firstX,
    );
  });

  test('DNA sequence rows follow a three-row snake pattern', async ({
    page,
  }) => {
    await MacromoleculesTopToolbar(page).dna();
    await enterSequence(page, DNA_SEQUENCE_ITEM_COUNT);

    const rows = await getSequenceRowPositions(page);
    expect(rows).toHaveLength(THREE_SEQUENCE_ROWS);
    expect(rows.map(({ itemCount }) => itemCount)).toEqual([
      ITEMS_PER_SEQUENCE_ROW,
      ITEMS_PER_SEQUENCE_ROW,
      DNA_THIRD_ROW_ITEM_COUNT,
    ]);
    expect(rows[FIRST_SEQUENCE_ROW_INDEX].firstX).toBeLessThan(
      rows[FIRST_SEQUENCE_ROW_INDEX].lastX,
    );
    expect(rows[SECOND_SEQUENCE_ROW_INDEX].firstX).toBeGreaterThan(
      rows[SECOND_SEQUENCE_ROW_INDEX].lastX,
    );
    expect(rows[THIRD_SEQUENCE_ROW_INDEX].firstX).toBeLessThan(
      rows[THIRD_SEQUENCE_ROW_INDEX].lastX,
    );
    expect(rows[FIRST_SEQUENCE_ROW_INDEX].lastX).toBe(
      rows[SECOND_SEQUENCE_ROW_INDEX].firstX,
    );
    expect(rows[SECOND_SEQUENCE_ROW_INDEX].lastX).toBe(
      rows[THIRD_SEQUENCE_ROW_INDEX].firstX,
    );
  });

  test('Peptide sequence rows remain left-to-right', async ({ page }) => {
    await MacromoleculesTopToolbar(page).peptides();
    await enterSequence(page, TWO_ROW_SEQUENCE_ITEM_COUNT);

    const rows = await getSequenceRowPositions(page);
    expect(rows).toHaveLength(TWO_SEQUENCE_ROWS);
    expect(rows.map(({ itemCount }) => itemCount)).toEqual([
      ITEMS_PER_SEQUENCE_ROW,
      RNA_SECOND_ROW_ITEM_COUNT,
    ]);
    expect(rows[FIRST_SEQUENCE_ROW_INDEX].firstX).toBeLessThan(
      rows[FIRST_SEQUENCE_ROW_INDEX].lastX,
    );
    expect(rows[SECOND_SEQUENCE_ROW_INDEX].firstX).toBeLessThan(
      rows[SECOND_SEQUENCE_ROW_INDEX].lastX,
    );
  });
});
