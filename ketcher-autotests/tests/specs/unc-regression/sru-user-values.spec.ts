/* eslint-disable no-magic-numbers */
import { test, expect } from '@playwright/test';
import { waitForPageInit } from '@utils';
import { getKet } from '@utils/formats';
import { setMolecule } from './fixtures';

/*
 * Fork commit under test:
 *   37c0a4b53  dont override user set values
 *
 * The SRU defaults — an "n" subscript and head-to-tail connectivity — were
 * applied whenever the s-group type was SRU, including when the chemist had
 * already chosen their own. Whatever they set was silently replaced on the
 * next conversion. The defaults must apply only when both fields are unset.
 */

const USER_SUBSCRIPT = 'A';
const USER_CONNECTIVITY = 'hh';
// Connectivity is stored lower case and written back upper case.
const USER_CONNECTIVITY_WRITTEN = 'HH';
const DEFAULT_SUBSCRIPT = 'n';
const DEFAULT_CONNECTIVITY = 'ht';

function sruKet(sgroup: Record<string, unknown>): string {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }], connections: [], templates: [] },
    mol0: {
      type: 'molecule',
      atoms: [
        { label: 'C', location: [0, 0, 0] },
        { label: 'C', location: [1, 0.5, 0] },
        { label: 'C', location: [2, 0, 0] },
        { label: 'C', location: [3, 0.5, 0] },
      ],
      bonds: [
        { type: 1, atoms: [0, 1] },
        { type: 1, atoms: [1, 2] },
        { type: 1, atoms: [2, 3] },
      ],
      sgroups: [{ type: 'SRU', atoms: [1, 2], ...sgroup }],
    },
  });
}

async function roundTrippedSgroup(
  page: import('@playwright/test').Page,
  ket: string,
): Promise<Record<string, unknown>> {
  await setMolecule(page, ket);
  const written = JSON.parse(await getKet(page));
  const molecule = Object.values(written).find(
    (node) =>
      typeof node === 'object' &&
      node !== null &&
      (node as { type?: string }).type === 'molecule',
  ) as { sgroups?: Array<Record<string, unknown>> };
  expect(molecule?.sgroups).toHaveLength(1);
  return (molecule.sgroups ?? [])[0];
}

test.describe('SRU polymer keeps user-set values', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('keeps a user-set subscript instead of the default', async ({
    page,
  }) => {
    const sgroup = await roundTrippedSgroup(
      page,
      sruKet({ subscript: USER_SUBSCRIPT, connectivity: USER_CONNECTIVITY }),
    );

    expect(sgroup.subscript).toBe(USER_SUBSCRIPT);
    expect(sgroup.subscript).not.toBe(DEFAULT_SUBSCRIPT);
  });

  test('keeps a user-set repeat pattern instead of head-to-tail', async ({
    page,
  }) => {
    const sgroup = await roundTrippedSgroup(
      page,
      sruKet({ subscript: USER_SUBSCRIPT, connectivity: USER_CONNECTIVITY }),
    );

    expect(sgroup.connectivity).toBe(USER_CONNECTIVITY_WRITTEN);
    expect(String(sgroup.connectivity).toLowerCase()).not.toBe(
      DEFAULT_CONNECTIVITY,
    );
  });
});
