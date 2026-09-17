# The Uncountable fork patch set

What this fork changes on top of `epam/ketcher`, what to reapply when moving to a newer
upstream tag, and what to drop.

This replaces an earlier hand-written commit list. That list was a good first pass, but
it was assembled by reading commit subjects, and it missed eleven behaviours — including
the widest-reaching one, which sends every export format to the Indigo server. A commit
list cannot be checked for completeness, because nothing tells you when an entry is
missing. The set of changed files can be, so that is what this document is built from.

## How the buckets were measured

The fork branched from upstream at `f098bdc23` (2025-07-01, upstream's Indigo v1.34.0
migration). Everything below is `f098bdc23..master`.

| bucket | count |
| --- | --- |
| all commits | 284 |
| merge commits | 70 |
| non-merge commits | 214 |
| non-merge commits touching `packages/*/src` | 114 |
| non-merge commits touching no package source | 100 |
| **source files changed, net** | **91** |

The last row is the one that matters. Most of the 114 commits are work-in-progress steps
on a handful of branches — `fix`, `fix lint`, `actual fix`, `remove console logs` — whose
finished state is one entry in the table below. Auditing them one by one measures the
history, not the divergence. The 91 net-changed files measure the divergence.

Of the commits carrying an upstream issue number, 19 are cherry-picks of EPAM fixes the
fork pulled in early, and upstream `v3.18.0` carries the same issue numbers. Those arrive
with the merge.

## Keeping this complete

`scripts/unc-fork-coverage.json` maps every one of the 91 files to a behaviour, and each
behaviour to its test or to a written reason it needs none.

```bash
node scripts/check-unc-fork-coverage.mjs
```

The check fails if the fork changes a source file no behaviour claims, or claims a file
the fork no longer changes. Run it after any commit that touches package source, and
before starting an upstream merge.

## KEEP — reapply these on the new tag

Verdicts marked **measured** were produced by running the test against vanilla `v3.18.0`,
not predicted. See `packages/ketcher-core/__tests__/unc-regression/README.md` for the
oracle protocol and the per-test pass counts.

### Chemistry and serialization

| Behaviour | Test | Verdict |
| --- | --- | --- |
| Accept the RS, M and P CIP descriptors Indigo emits | jest `cip-descriptors` | reapply, measured |
| Read and write COM, MIX and MON formulation S-groups | jest `sgroup-com-mix-mon` | reapply, measured |
| Keep R-group references through a KET round trip | jest `ket-rgroup-refs` | reapply, measured |
| Report S-group atom membership through the struct | jest `sgroup-atom-membership` | reapply, measured |
| Draw a contracted abbreviation at its group centre (MAT-77406) | jest `contracted-abbreviation-anchor` | reapply, measured |
| Lowercase S-group connectivity codes on MOL parse | jest `sgroup-connectivity-case` | reapply |
| Render a polymer `*` end-group cap as a carbon (MAT-75501) | pre-existing `reatom.test.ts` | reapply |

### Indigo server

| Behaviour | Test | Verdict |
| --- | --- | --- |
| Convert every format except KET on the server | jest `server-format-routing` | reapply |
| Default Indigo to terminal-hetero hydrogen labels, not none | jest `indigo-hydrogen-label-default` | reapply, measured |
| Send `render-stereo-style` to Indigo image rendering | jest `indigo-stereo-style` | reapply |
| Persist Indigo transform results on save (MAT-76710) | playwright `indigo-transform-change-event` | reapply |

`server-format-routing` is the one to be most careful with. Vanilla converts to MOL V2000
in the browser; the fork sends it to Indigo. The two disagree on atom ordering, stereo
perception and S-group output, so this decides what every stored molfile looks like. It
is the only fork change that alters chemistry output rather than crashing, so losing it
would be silent.

### Editor behaviour

| Behaviour | Test | Verdict |
| --- | --- | --- |
| Account for the embedding container's CSS scale in pointer maths | jest `external-zoom-scale` | reapply |
| Keep a canvas load off the undo stack | jest `canvas-load-not-undoable` | reapply |
| Let the logger read settings before the ketcher global exists | jest `logger-without-ketcher` | reapply |
| Survive a keycode the key-name table does not cover | jest `keynorm-unmapped-key` | reapply |
| Coerce a stored render offset back to a `Vec2` | playwright `render-offset-restore` | reapply |
| S-group select retarget, bracket bounding box, connectivity label case | playwright `sgroup-behaviour` | reapply |
| Copy, paste and undo of brackets and s-groups | playwright `clipboard-and-undo` | reapply |
| Right-click capture and context-menu placement | playwright `context-menu` | reapply |
| Do not override user-set SRU values | playwright `sru-user-values` | reapply |
| Fix the undo crash after creating an SRU polymer S-group | pre-existing `sru-polymer-tool.spec.ts` | reapply |

### Embedding and chrome

| Behaviour | Test | Verdict |
| --- | --- | --- |
| Tag the editor root with its instance id, and fix fullscreen | playwright `editor-instance` | reapply, measured |
| Portal dropdowns into the element the user can see | playwright `fullscreen-dropdown-container` | reapply |
| Options state initialisation and the settings dialog | playwright `settings-state` | reapply |
| Replace ajv with jsonschema, and give the validator a base URL | playwright `settings-state` | reapply |

## DROP — do not reapply

| Behaviour | Why |
| --- | --- |
| Thread the render through Data S-group draw (MAT-73031) | Passes on vanilla. Upstream reached the same outcome another way: `drawGroupDat` no longer calls `SGroup.bracketPos`, so the fallback the patch avoided is unreachable. **Measured.** |
| Export the stylesheet under the `default` condition | Passes on vanilla. `v3.18.0` already declares it. **Measured.** |
| Position the macro drag ghost at the preset corner | An upstream cherry-pick (#7371). `v3.18.0` carries it. |
| Hide the macromolecule editor | The change and its revert cancel out. |
| `miew-react` 0.11.0, Node 24, GitHub runners, release plumbing | Stale or CI-only. |

## Carried, but with no test — and why

These are in the manifest with a written reason, not omitted from it.

- **Stop suppressing the browser context menu in the core editor.** The demo page is
  entirely the editor, so the suppressed and unsuppressed cases cannot be told apart
  there. This belongs in the host application's end-to-end tests.
- **The raphael typing cluster.** These add `@ts-ignore` comments and move the
  `@types/raphael` dependency. TypeScript erases both, so the emitted JavaScript is
  identical with or without them. `tsc --noEmit` is the check, and it already runs in the
  pre-push hook and in CI.
- **Per-function `lodash/fp` entrypoints.** A bundle-shape change with no runtime surface.

## Known rename conflicts for the merge

Upstream moved or renamed files the fork changed. Each is a conflict a merge cannot
resolve on its own:

| Fork path | Upstream `v3.18.0` |
| --- | --- |
| `packages/ketcher-core/src/application/editor/operations/base.ts` | moved |
| `packages/ketcher-core/src/domain/serializers/mol/parseSGroup.js` | `parseSGroup.ts` |
| `packages/ketcher-core/src/domain/serializers/mol/common.js` | `common.ts` |
| `packages/ketcher-react/src/script/ui/data/schema/struct-schema.js` | `struct-schema.ts` |

Upstream also removed the `w3c-keyname` dependency from `keynorm.ts`, which the fork
still imports and which no `package.json` declares — it resolves transitively today.

## Two build traps

Both cost time during this work, and both look like test failures rather than build
problems:

- `packages/ketcher-core/src/domain/serializers/ket/compiledSchema.js` is generated from
  `schema.json` and is gitignored. A stale copy makes the KET tests fail as if the fork
  patches were missing. Run `npm run ajv` in `packages/ketcher-core` first.
- `npm run build:packages` builds `ketcher-react` before `ketcher-macromolecules`, so a
  stale macromolecules bundle gets inlined into the react bundle. If the example build
  then fails on a missing `ketcher-core` export, run `build:packages` a second time.
