import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * Fork commit under test:
 *   2e0098185  Export default css
 *
 * ketcher-react's stylesheet is reached through the package's exports map. Node
 * and bundlers fall back to the "default" condition when neither "import" nor
 * "require" matches, and without it a consumer that resolves the stylesheet
 * that way gets an unresolved-export error rather than the css. The platform
 * pulls this stylesheet in, so the condition has to stay.
 */

const REACT_PACKAGE_JSON = join(
  __dirname,
  '..',
  '..',
  '..',
  'ketcher-react',
  'package.json',
);

const CSS_SUBPATH = './dist/index.css';

interface ExportsMap {
  [subpath: string]: Record<string, string> | string | undefined;
}

function reactExports(): ExportsMap {
  const manifest = JSON.parse(readFileSync(REACT_PACKAGE_JSON, 'utf-8'));
  return manifest.exports ?? {};
}

describe("ketcher-react's stylesheet export", () => {
  it('is declared in the exports map', () => {
    expect(reactExports()[CSS_SUBPATH]).toBeDefined();
  });

  it('carries a default condition, not only import and require', () => {
    const cssExport = reactExports()[CSS_SUBPATH] as Record<string, string>;

    expect(Object.keys(cssExport).sort()).toEqual([
      'default',
      'import',
      'require',
    ]);
    expect(cssExport.default).toBe(CSS_SUBPATH);
  });
});
