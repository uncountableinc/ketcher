/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { clickOnAtom, waitForPageInit } from '@utils';
import {
  PLAIN_CHAIN_KET,
  setMolecule,
  SRU_CHAIN_KET,
  sgroupCount,
} from './fixtures';

/*
 * Fork commits under test:
 *   d0ec26103            only retarget select if s-group not already selected
 *   e97756d50/327586a7e  fix connectivity label casing
 *   163120938            always use bounding box for brackets
 *   5e1077347            fix implicit hydrogen on edge bond s-group
 */

test.describe('s-group drawing behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('clicking a member of an already-selected s-group keeps the selection', async ({
    page,
  }) => {
    // Clicking an atom inside an s-group retargets the selection onto the whole
    // group, which is wanted for a fresh click. It must not fire when the atom
    // is already selected, or it narrows a wider selection down to that group.
    await setMolecule(page, SRU_CHAIN_KET);
    await page.evaluate(() =>
      window.ketcher.editor.selection({ atoms: [0, 1, 2, 3, 4] }),
    );

    await clickOnAtom(page, 'C', 2);

    const selectedAtoms = await page.evaluate(
      () => window.ketcher.editor.selection()?.atoms ?? [],
    );
    expect(selectedAtoms).toEqual([0, 1, 2, 3, 4]);
  });

  test('clicking an unselected s-group member selects the whole group', async ({
    page,
  }) => {
    // The other half of the same branch: a fresh click must still retarget.
    await setMolecule(page, SRU_CHAIN_KET);

    await clickOnAtom(page, 'C', 2);

    const selectedAtoms = await page.evaluate(
      () => window.ketcher.editor.selection()?.atoms ?? [],
    );
    expect(selectedAtoms).toEqual([1, 2, 3]);
  });

  test('an SRU connectivity label renders in upper case', async ({ page }) => {
    // The label is stored lower case ("hh") and must be drawn upper case.
    await setMolecule(page, SRU_CHAIN_KET);

    const drawnText = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.Ketcher-root text'))
        .map((node) => node.textContent ?? '')
        .join('|'),
    );

    expect(drawnText).toContain('HH');
    expect(drawnText).not.toContain('hh');
  });

  test('the bracket box encloses the whole s-group, not just its crossing bonds', async ({
    page,
  }) => {
    // Bracket geometry comes from the group's bounding box rather than from its
    // crossing bonds, so the box must span every member atom.
    await setMolecule(page, SRU_CHAIN_KET);
    expect(await sgroupCount(page)).toBe(1);

    const measured = await page.evaluate(() => {
      const struct = window.ketcher.editor.struct();
      const sgroup = Array.from(struct.sgroups.values())[0];
      const box = sgroup?.bracketBox;
      if (box == null) {
        return null;
      }
      const memberXs: number[] = [];
      for (const id of sgroup.atoms) {
        const atom = struct.atoms.get(id);
        if (atom != null) {
          memberXs.push(atom.pp.x);
        }
      }
      return {
        boxMinX: box.p0.x,
        boxMaxX: box.p1.x,
        memberMinX: Math.min(...memberXs),
        memberMaxX: Math.max(...memberXs),
        memberCount: sgroup.atoms.length,
      };
    });

    expect(measured).not.toBeNull();
    const box = measured as NonNullable<typeof measured>;
    expect(box.memberCount).toBe(3);
    expect(box.boxMinX).toBeLessThanOrEqual(box.memberMinX);
    expect(box.boxMaxX).toBeGreaterThanOrEqual(box.memberMaxX);
  });

  test('implicit hydrogen counts survive loading a structure with an s-group', async ({
    page,
  }) => {
    // Recomputing implicit hydrogens when an s-group is created used to clone
    // and replace the struct; the counts must match the plain chain either way.
    await setMolecule(page, PLAIN_CHAIN_KET);
    const plainCounts = await page.evaluate(() =>
      Array.from(window.ketcher.editor.struct().atoms.values()).map(
        (atom: { implicitH?: number }) => atom.implicitH ?? 0,
      ),
    );

    await setMolecule(page, SRU_CHAIN_KET);
    const sgroupCounts = await page.evaluate(() =>
      Array.from(window.ketcher.editor.struct().atoms.values()).map(
        (atom: { implicitH?: number }) => atom.implicitH ?? 0,
      ),
    );

    expect(sgroupCounts).toEqual(plainCounts);
  });
});
