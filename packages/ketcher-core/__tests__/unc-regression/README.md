# Uncountable regression suite

These tests pin the behaviour of the Uncountable patches carried on top of
`epam/ketcher`. They exist to answer one question per patch, mechanically:

> Does vanilla upstream already behave this way, or must we reapply our patch?

## How to use this as the upgrade oracle

1. Run the suite on the current fork.
   Everything must pass.
   A failure here means the test is wrong, not the code.
2. Check out the vanilla upstream tag you are moving to, copy this directory in, and run
   it again.
3. Read the result per test:
   - **Passes on vanilla** — upstream fixed it.
     Drop our commit.
   - **Fails on vanilla** — upstream did not fix it.
     Reapply our commit, then this test guards it forever.

```bash
cd packages/ketcher-core
npm run ajv          # generates compiledSchema.js, required by the KET tests
npx jest __tests__/unc-regression
```

`npm run ajv` is the existing `prebuild` step.
`compiledSchema.js` is generated from `schema.json` and is gitignored, so a fresh
checkout has no schema until it runs.

Run it after switching branches too. A `compiledSchema.js` left behind by a vanilla
checkout makes the KET tests fail exactly as if the fork patches were missing, which
reads as a regression rather than a stale build artifact.

## Coverage and measured verdicts

Both columns below were run, not predicted.
`fork` is `master` at `v3.6.0-unc52`; `vanilla` is upstream `v3.18.0` with this
directory copied in.

| Test file | Fork commits | Ticket | fork | vanilla 3.18 | verdict |
| --- | --- | --- | --- | --- | --- |
| `cip-descriptors.test.ts` | `cda0f264a`, `b674564bc`, `1d6c9ac5b` | MAT-75502, MAT-75503 | 13/13 | 7/13 | **reapply** |
| `contracted-abbreviation-anchor.test.ts` | `9f488c2d0` | MAT-77406 | 4/4 | 2/4 | **reapply** |
| `sgroup-atom-membership.test.ts` | `43ebbcc69` | none | 4/4 | 0/4 | **reapply** |
| `sgroup-com-mix-mon.test.ts` | `843206bc0` | none | 9/9 | 3/9 | **reapply** |
| `ket-rgroup-refs.test.ts` | `270480fe0` | none | 3/3 | 1/3 | **reapply** |
| `indigo-hydrogen-label-default.test.ts` | `446e1cf11` | none | 3/3 | 0/3 | **reapply** |
| `data-sgroup-bracket-pos.test.ts` | `a4394409c` | MAT-73031 | 2/2 | 2/2 | **drop** |
| `css-export.test.ts` | `2e0098185` | none | 2/2 | 2/2 | **drop** |

Totals for the tests above: fork 40/40, vanilla `v3.18.0` 17/40.

### Added after the completeness audit

The suite was first built from a hand-written list of interesting commits. That list
missed eleven fork behaviours, found by comparing the fork's net source diff against the
files the listed commits touch. `scripts/check-unc-fork-coverage.mjs` now enforces the
comparison, and `scripts/unc-fork-coverage.json` carries the per-behaviour verdicts.

| Test file | Fork commits | fork | vanilla 3.18 | verdict |
| --- | --- | --- | --- | --- |
| `server-format-routing.test.ts` | `6576cd745`, `52fc7376a`, `b53ffb290` | 9/9 | 0/9 | **reapply** |
| `external-zoom-scale.test.ts` | `1ea33be22`, `33a078c8b` | 3/3 | 2/3 | **reapply** |
| `canvas-load-not-undoable.test.ts` | `c0fde0b1e` | 4/4 | did not load | **reapply** |
| `indigo-stereo-style.test.ts` | `f2e76d0ce` | 4/4 | 0/4 | **reapply** |
| `sgroup-connectivity-case.test.ts` | `783bc6497`, `493fcc1bd`, `3aecd5500` | 9/9 | 9/9 | **drop** |
| `logger-without-ketcher.test.ts` | `81d4c7d75` | 3/3 | 3/3 | **drop** |
| `keynorm-unmapped-key.test.ts` | `905baf429` | 4/4 | 3/4 | **drop** |

Suite totals: fork 76/76, vanilla `v3.18.0` 51/76.

Reading these:

- `server-format-routing` fails every test on vanilla, which is the point: vanilla
  converts MOL in the browser and the fork sends it to Indigo.
  This is the one fork change that alters chemistry output rather than crashing.
- `external-zoom-scale` passes the neutral-option test on vanilla by design — an
  embedder that sets no external scale must see no change either way.
- `canvas-load-not-undoable` cannot run on vanilla at all: upstream moved
  `application/editor/operations/base.ts`, so the imports do not resolve.
  Its verdict comes from source inspection instead — `isInvertible` appears nowhere in
  `v3.18.0`, so the fork's predicate has to be reapplied.
  Expect the file move as a merge conflict.
- `sgroup-connectivity-case` **drops**, and the s-group type is what makes the test say
  anything. Upstream lowercases connectivity in per-type post-load hooks, so the type
  decides whether it happens; at the fork's base only SRU had one. An SRU-only fixture
  therefore passes at the base, on the fork and upstream alike, and proves nothing — the
  first version of this test made exactly that mistake.
  Varying the type fixes it: upstream's own `v2000.test.ts` expected `'EU'` for a GEN
  group at the fork's base and expects `'eu'` in `v3.18.0`, so upstream reached the
  fork's behaviour independently.
- `logger-without-ketcher` **drops**. Upstream replaced the throw with a `console.warn`
  and the same `?? {}` fallback.
- `keynorm-unmapped-key` **drops**, with a caveat. The three guard tests pass on vanilla
  because upstream rewrote `keynorm` around `event.key` with string defaults, so it can
  no longer throw on an unmapped keycode.
  The fourth test fails there only because that rewrite dropped the `keyCode` lookup the
  test drives; that is a difference in upstream's API, not a missing guard.

### Reading the partial failures

The partial columns matter more than the totals.
Each suite deliberately also asserts the behaviour vanilla already has, so a suite that
half-passes proves the test is precise rather than broadly broken:

- `cip-descriptors` — vanilla accepts R/S/r/s and Z/E and rejects RS, M and P. Upstream
  `v3.18.0` still ships the narrow enums.
- `contracted-abbreviation-anchor` — vanilla still anchors correctly through an
  attachment point and through a crossing bond.
  Only the standalone-abbreviation case differs, which is exactly the scope of
  MAT-77406.
- `sgroup-com-mix-mon` — vanilla declares MON, MIX and COM in `SGroup.TYPES` but has no
  predicates and no serializer support for them.

### The one patch to drop

`a4394409c` (MAT-73031) passes on vanilla.
Upstream reached the same outcome by a different route: `drawGroupDat` in `v3.18.0` no
longer calls `SGroup.bracketPos` at all, so the `window.ketcher` fallback it used to hit
is unreachable. Our patch threaded a render through that call instead.
Both satisfy the requirement, so on `v3.18.0` the patch is redundant — keep the test,
drop the commit.

## Upstream behaviour changes we inherited

Not every test here guards a fork patch. `sgroup-partial-selection-transform.test.ts`
pins a change that arrived *with* upstream at v3.7.0, so the reapply/drop reading above
does not apply to it — there is no fork commit to reapply.

`getRelSGroupsBySelection` decides which S-groups a flip, rotate or drag carries along
with the selected atoms. At v3.6.0 a group came along only when every one of its member
atoms was selected. From v3.7.0 any selected member atom drags the whole group's data
label. Four call sites share the helper: flip and rotate in `actions/rotate.ts`, drag in
`actions/fragment.ts`, and the rotate tool.

| Test file | Fork commits | fork (v3.7.0-unc55) | upstream v3.6.0 | verdict |
| --- | --- | --- | --- | --- |
| `sgroup-partial-selection-transform.test.ts` | none — upstream change | 10/10 | 7/10 | **decide** |

The three that fail on v3.6.0 are the partial-selection cases, and only those. The other
seven assert behaviour both versions share, which is what makes the pair informative
rather than broadly broken.

Verdict **decide** rather than reapply or drop: the test records what v3.7.0 does so a
later upgrade cannot change it silently, but whether that is the behaviour we want for
formulation brackets is a product question, not an upgrade one. If we decide v3.6.0 was
right, invert the partial-selection expectations there rather than deleting them.

Two traps when editing this fixture, both of which make it prove nothing:

- the S-group label must sit off the flip axis, or flipping it is a no-op and the
  assertion passes on every version;
- the helper returns a Pool on v3.6.0 and a `Set` from v3.7.0, so read it with `forEach`
  the way the production callers do, not by spreading it.

## Already covered elsewhere, do not duplicate

- `da4fa3016` (MAT-75501, polymer `*` end-group cap) —
  `__tests__/application/render/restruct/reatom.test.ts`
- `cb5b18637` (SRU undo crash, MAT-68021 / MAT-75711) —
  `ketcher-autotests/.../SRU-Polymer/sru-polymer-tool.spec.ts`

## Browser-only, in `ketcher-autotests/tests/specs/unc-regression/`

Twenty-five Playwright tests, all run against the standalone demo build and passing.
Start the demo first, then run them:

```bash
cd example && npm run build:standalone && npm run serve:standalone   # port 4002
cd ketcher-autotests                                                 # KETCHER_URL=http://localhost:4002, MODE=standalone
npx playwright test tests/specs/unc-regression/ --project=chromium
```

| Spec | Fork commits |
| --- | --- |
| `sgroup-behaviour.spec.ts` | `d0ec26103`, `e97756d50` / `327586a7e`, `163120938`, `5e1077347` |
| `clipboard-and-undo.spec.ts` | `96513d3d6`, `f6362eda8`, `243b653df` |
| `context-menu.spec.ts` | `bf79b6f0c` / `259898396` / `b70744dde` |
| `indigo-transform-change-event.spec.ts` | `f22519419` (MAT-76710) — the change-event assertion is the guard; reading the saved KET would pass either way, so no such test is kept |
| `sru-user-values.spec.ts` | `37c0a4b53` |
| `settings-state.spec.ts` | `4e21564a4`, `8b92271fc`, `8799f4afc` |
| `editor-instance.spec.ts` | `c32453d96` / `36c00e15a`, `6a59f2ba2` |
| `fullscreen-dropdown-container.spec.ts` | `3d3b76a6c`, `83730d640` |
| `render-offset-restore.spec.ts` | `aefcd0a14` |
| `platform-structure-tools.spec.ts` | none — pins the ketcher APIs the platform's Bodie structure tools call |

`fixtures.ts` holds the shared KET fixtures.
The specs build their structures through `ketcher.setMolecule` rather than reading
committed test data, so they do not break when the shared test-data set is reorganised.

## The two halves are not equally portable

The jest suite **is** the upgrade oracle.
It imports only from `ketcher-core`, so the directory can be copied onto a vanilla
checkout and run as-is.
That is how the verdict table above was produced.

Most of the Playwright suite **is not**, and cannot be made so cheaply.
Upstream restructured the shared test helpers between 3.6 and 3.18: `clickOnAtom`,
`getAtomByIndex` and `selectUndoByKeyboard` no longer exist in `v3.18.0`, so the specs
fail to resolve their imports on a vanilla checkout.
Rewriting them to drive the editor through `window.ketcher` alone was tried and
abandoned — the interaction plumbing those helpers provide (canvas focus, tool
selection, paste placement) is what makes them reliable, and a hand-rolled replacement
was markedly less so.

So treat the two halves differently:

- **jest** — run it against each upstream tag; the pass/fail is the reapply/drop
  verdict.
- **Playwright** — a regression guard on the fork for most specs.
  They prove the interaction patches still work *here* and will catch a future fork
  change that breaks them, but cannot say whether upstream has fixed them.
- **`editor-instance.spec.ts` is the exception.** It imports only `waitForPageInit`,
  which upstream kept, so it does run on a vanilla checkout.
  Against `v3.18.0` it reports the ketcher-id class **absent**, so `c32453d96` /
  `36c00e15a` must be reapplied, and fullscreen **working**, so that half needs no
  patch.

## Commit map

Every commit in the KEEP set, and where it is covered.

| Commit | Covered by |
| --- | --- |
| `cda0f264a`, `b674564bc`, `1d6c9ac5b` | jest `cip-descriptors` |
| `9f488c2d0` | jest `contracted-abbreviation-anchor` |
| `43ebbcc69` | jest `sgroup-atom-membership` |
| `843206bc0` | jest `sgroup-com-mix-mon` |
| `270480fe0` | jest `ket-rgroup-refs` |
| `446e1cf11` | jest `indigo-hydrogen-label-default` |
| `a4394409c` | jest `data-sgroup-bracket-pos` — verdict **drop** |
| `d0ec26103`, `e97756d50`, `327586a7e`, `163120938`, `5e1077347` | Playwright `sgroup-behaviour` |
| `96513d3d6`, `f6362eda8`, `243b653df` | Playwright `clipboard-and-undo` |
| `bf79b6f0c`, `259898396`, `b70744dde` | Playwright `context-menu` |
| `f22519419` | Playwright `indigo-transform-change-event` |
| `37c0a4b53` | Playwright `sru-user-values` |
| `4e21564a4`, `8b92271fc`, `8799f4afc` | Playwright `settings-state` |
| `c32453d96`, `36c00e15a`, `6a59f2ba2` | Playwright `editor-instance` |
| `2e0098185` | jest `css-export` |
| `6576cd745`, `52fc7376a`, `b53ffb290` | jest `server-format-routing` |
| `1ea33be22`, `33a078c8b` | jest `external-zoom-scale` |
| `c0fde0b1e` | jest `canvas-load-not-undoable` |
| `783bc6497`, `493fcc1bd`, `3aecd5500` | jest `sgroup-connectivity-case` |
| `81d4c7d75` | jest `logger-without-ketcher` |
| `905baf429` | jest `keynorm-unmapped-key` |
| `f2e76d0ce` | jest `indigo-stereo-style` |
| `3d3b76a6c`, `83730d640` | Playwright `fullscreen-dropdown-container` |
| `aefcd0a14` | Playwright `render-offset-restore` |
| `da4fa3016` | pre-existing `__tests__/application/render/restruct/reatom.test.ts` |
| `cb5b18637`, `9f256ceb8` | pre-existing `ketcher-autotests/.../SRU-Polymer/sru-polymer-tool.spec.ts` |

## Still uncovered

Each of these is recorded in `scripts/unc-fork-coverage.json` with the reason, so the
completeness check passes while they stay untested.

- `e9873f88a` stops the core editor suppressing the browser context menu.
  The demo page is entirely the editor, so the suppressed and unsuppressed cases cannot
  be told apart there.
  This belongs in the host application's end-to-end tests.
- The other half of the context-menu behaviour: that the editor does **not** suppress
  right-click outside its own bounds.
  The demo page is entirely the editor, so there is no outside to click.
  That half belongs in the host application’s end-to-end tests.
- The raphael typing cluster (`e03418d54`, `5bb80c666`, `7d1c6b9b6`, `1256b6f2f`,
  `641fe3664`, `54064df25`). These add `@ts-ignore: raphael typing issues` comments and
  move the `@types/raphael` dependency.
  TypeScript erases both at compile time, so the emitted JavaScript is identical with or
  without them and there is no behaviour to assert.
  `tsc --noEmit` is the check, and it already runs in the pre-push hook and in CI. A
  runtime test here would assert nothing.
- `67f7921aa` (removes a dead ajv reference) and `c62eccb62` (per-function lodash/fp
  entrypoints). Neither has a runtime surface; the second only changes bundle shape.
