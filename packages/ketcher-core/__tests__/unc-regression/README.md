# Uncountable regression suite

These tests pin the behaviour of the Uncountable patches carried on top of
`epam/ketcher`. They exist to answer one question per patch, mechanically:

> Does vanilla upstream already behave this way, or must we reapply our patch?

## How to use this as the upgrade oracle

1. Run the suite on the current fork. Everything must pass. A failure here means
   the test is wrong, not the code.
2. Check out the vanilla upstream tag you are moving to, copy this directory in,
   and run it again.
3. Read the result per test:
   - **Passes on vanilla** — upstream fixed it. Drop our commit.
   - **Fails on vanilla** — upstream did not fix it. Reapply our commit, then this
     test guards it forever.

```bash
cd packages/ketcher-core
npm run ajv          # generates compiledSchema.js, required by the KET tests
npx jest __tests__/unc-regression
```

`npm run ajv` is the existing `prebuild` step. `compiledSchema.js` is generated
from `schema.json` and is gitignored, so a fresh checkout has no schema until it
runs.

## Coverage and measured verdicts

Both columns below were run, not predicted. `fork` is `master` at `v3.6.0-unc52`;
`vanilla` is upstream `v3.18.0` with this directory copied in.

| Test file | Fork commits | Ticket | fork | vanilla 3.18 | verdict |
| --- | --- | --- | --- | --- | --- |
| `cip-descriptors.test.ts` | `cda0f264a`, `b674564bc`, `1d6c9ac5b` | MAT-75502, MAT-75503 | 13/13 | 7/13 | **reapply** |
| `contracted-abbreviation-anchor.test.ts` | `9f488c2d0` | MAT-77406 | 4/4 | 2/4 | **reapply** |
| `sgroup-atom-membership.test.ts` | `43ebbcc69` | none | 4/4 | 0/4 | **reapply** |
| `sgroup-com-mix-mon.test.ts` | `843206bc0` | none | 9/9 | 3/9 | **reapply** |
| `ket-rgroup-refs.test.ts` | `270480fe0` | none | 3/3 | 1/3 | **reapply** |
| `indigo-hydrogen-label-default.test.ts` | `446e1cf11` | none | 3/3 | 0/3 | **reapply** |
| `data-sgroup-bracket-pos.test.ts` | `a4394409c` | MAT-73031 | 2/2 | 2/2 | **drop** |

Totals: fork 38/38, vanilla `v3.18.0` 15/38.

### Reading the partial failures

The partial columns matter more than the totals. Each suite deliberately also
asserts the behaviour vanilla already has, so a suite that half-passes proves the
test is precise rather than broadly broken:

- `cip-descriptors` — vanilla accepts R/S/r/s and Z/E and rejects RS, M and P.
  Upstream `v3.18.0` still ships the narrow enums.
- `contracted-abbreviation-anchor` — vanilla still anchors correctly through an
  attachment point and through a crossing bond. Only the standalone-abbreviation
  case differs, which is exactly the scope of MAT-77406.
- `sgroup-com-mix-mon` — vanilla declares MON, MIX and COM in `SGroup.TYPES` but
  has no predicates and no serializer support for them.

### The one patch to drop

`a4394409c` (MAT-73031) passes on vanilla. Upstream reached the same outcome by a
different route: `drawGroupDat` in `v3.18.0` no longer calls `SGroup.bracketPos`
at all, so the `window.ketcher` fallback it used to hit is unreachable. Our patch
threaded a render through that call instead. Both satisfy the requirement, so on
`v3.18.0` the patch is redundant — keep the test, drop the commit.

## Already covered elsewhere, do not duplicate

- `da4fa3016` (MAT-75501, polymer `*` end-group cap) —
  `__tests__/application/render/restruct/reatom.test.ts`
- `cb5b18637` (SRU undo crash, MAT-68021 / MAT-75711) —
  `ketcher-autotests/.../SRU-Polymer/sru-polymer-tool.spec.ts`

## Browser-only, in `ketcher-autotests/tests/specs/unc-regression/`

These need a running editor, so they are Playwright rather than jest, and they
have NOT been executed — they need the demo app and a browser run to confirm.

- `indigo-transform-change-event.spec.ts` — `f22519419` (MAT-76710)
- `sru-user-values.spec.ts` — `37c0a4b53`
