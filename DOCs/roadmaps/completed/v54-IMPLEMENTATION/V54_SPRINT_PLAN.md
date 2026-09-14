# PNut-TS v54 Implementation Sprint Plan

**Status:** COMPLETE — shipped as `1.54.0` (tag `v1.54.0`, 2026-04-23). Regression coverage: `TEST/V52A-tests/v54_test_struct_bitfields.spin2`.

**Start date:** 2026-04-23
**Target version:** `1.54.0`
**Primary references (in this folder):**
- `v54_CHANGES.md` — what changed v53 → v54
- `V54_IMPLEMENTATION_GUIDE.md` — algorithmic detail for porting
- `V54_LANGUAGE_REFERENCE_ADDITIONS.md` — user-facing spec

## Scope summary

v54 is narrow and additive:

- **Spin2 only** — new STRUCT syntax (named bitfields on BWL members, nameless single BWL member)
- **No** new bytecodes, **no** interpreter change (byte-identical), **no** PASM2 change, **no** new constants/functions
- **No** `level54_symbols` table — so **no** `SYMBOLS_V54` enum in `parseUtils.ts`
- `{Spin2_v54}` directive is accepted but **not** a gate — new STRUCT syntax parses unconditionally. Mirror PNut's behavior: add `54` to `legalVersions`; do not gate the new parser on `spin2_level >= 54`.

**Breaking change in struct definition record format:** per-member continuation byte gains value `2 = bitfield follows`, and name-length `0` now means "nameless single BWL member". Any reader or writer of `struct_def` records must be updated even for structs that don't use the new features.

---

## Phases (ordered to minimize rework)

### Phase 0 — Version + error-table housekeeping

Trivial bumps and three new error strings. Foundation that every later phase depends on; ship first.

- `package.json` + `package-lock.json` → `1.54.0`
- `src/pnut-ts.ts` — version string
- `src/classes/spinDocument.ts:138` — add `54` to `legalVersions`
- Error strings added to the compiler's error table:
  - `Bitfields are only allowed for BYTE/WORD/LONG members` (v54 `error_bfaoa`)
  - `Bit number exceeds BYTE/WORD/LONG boundary` (v54 `error_bnebwlb`)
  - `Lower bit number cannot exceed upper bit number` (v54 `error_lbnceubn`)
- `CHANGELOG.md` entry (Unreleased → v54)

### Phase 1 — Struct record format extension

Writer + reader support for continuation byte `2` and name-length `0`. Must land before Phase 2/3 can compile.

**Writer (`src/classes/objectStructures.ts`):**
- `recordStructElementName` must accept empty-string name → writes a single `0` length byte (nameless-member case)
- New: `recordBitfieldEntry(name: string, packedDescriptor: number)` — emits continuation byte `2`, length-prefixed name, 16-bit packed descriptor word (`basebit | ((span-1) << 5)`)
- `endMemberRecord(nbrInstances, objectLimit, flagValue)` — `flagValue` can now be 0, 1, or 2 (existing call sites only pass 0/1)

**Reader (`src/classes/objectStructureRecord.ts`):**
- Expose `nextContinuation(): 0 | 1 | 2` (byte read)
- Expose `readBitfieldEntry(): { name: string, packedDescriptor: number }`
- Expose helper `isFirstMemberNameless(): boolean` that peeks past `size` word + `memsize` long + `offset` long + `type` byte and checks the following name-length byte

**Tests:** Project convention is integration-only — all validation flows through `.spin2` compilations against Windows-PNut `.GOLD` files. A synthetic round-trip unit test would be out of style; Phase 4's v54 regression suite will exercise these APIs end-to-end against GOLDs. Phase 1 verification is just `npm test` still passing (proves no v53 regression since existing corpus has no bitfields / nameless members).

### Phase 2 — Writer: `buildStructureRecord` updates

`src/classes/spinResolver.ts:5286-5362`.

- Add local state for the build loop: `memberType`, `notFirst` (false on first iteration), `singleBWL`
- Rewrite the `@@getname` path: if `getSymbol()` returns no symbol and `notFirst === false` and `memberType !== MT_STRUCT` → this is the nameless case
  - Call `recordStructElementName('')` (emits length=0)
  - Set `singleBWL = true`
  - Skip the optional `[count]` parse entirely
  - After the (optional) bitfield chain, require `)`, then `endRecord()` and return — no comma loop
- Otherwise run the existing v53 path (`notFirst = true` after first iteration)
- After the member has been recorded (instance count included, but **before** `endMemberRecord`), check for `.`:
  - If present and `memberType === MT_STRUCT` → `error_bfaoa`
  - If present (BWL only): bitfield-chain loop. For each `.bitfield_name[bits]`:
    - Parse `bitfield_name` via `getSymbol`
    - `[` → integer value `upper`; enforce `upper < (8 << memberType)` else `error_bnebwlb`; on `..` present, parse `lower`, enforce `lower <= upper` else `error_lbnceubn`; on `..` absent, `lower = upper`
    - Compute `packedDescriptor = lower | ((upper - lower) << 5)`; call `recordBitfieldEntry(name, packedDescriptor)`
    - `]`; loop while next token is `.`

### Phase 3 — Access site: `compile_struct_setup` + `compVar` emit path

Two touchpoints:

**`src/classes/spinResolver.ts:compile_struct_setup` (~10169+):**
- At entry, after loading the top-level record, check `isFirstMemberNameless()`. If yes: short-circuit into the BWL-match branch — consume the member's type/size/name-length without expecting a `.name` in source. Proceed directly into the "check for bitfield-chain continuation" flow below.
- After any BWL member match, read the continuation byte:
  - `0` → member was last, no bitfield → done
  - `1` → another member follows → existing path
  - `2` → bitfield chain. If next source token is not `.` → skip the entire chain and finish normally. If `.[` follows → back up twice (`.` and `[`), do **not** consume bitfield name from record — let existing runtime/constant bitfield path handle. Else: read bitfield name from source, walk stored bitfields comparing names; on match, store the packed descriptor in new state `compiledStructBitfield` (sentinel: e.g. `0x80000000 | descriptor`) and set a new result flag `bitfieldResolvedFromStruct`. On exhaustion → member-name-not-in-struct error.
- Extend `iStructureReturn` with `compiledBitfield: number` (0 = none, non-zero = resolved).
- State-preservation: when this routine recurses via sub-expression compiles (index/bitfield expressions), save and restore all `compiled_struct_*` fields. Model this as a TS helper `preserveStructState(fn)` that snapshots/restores the resolver's struct-compile state across `fn()`.

**`src/classes/spinResolver.ts:compVar` bitfield emit (~9596-9631):**
- Add a new first branch before the existing constant/runtime branches: if `iVariableReturn` carries the new `bitfieldStructFlag`, consume `.name` tokens from source (pointer was left before the `.` by the access site), then emit either `bc_setup_bfield_0_31 + basebit` (when `span == 1` and `basebit ≤ 31`) or `bc_setup_bfield_rfvar` + rfvar-encoded descriptor.
- Extract helper `compileBitfieldFromDescriptor(descriptor: number)` that centralizes the single-byte-vs-rfvar decision so the new branch and the existing constant-bitfield branch share it.
- Wire the new flag through `iVariableReturn` and the `is_var` equivalent that constructs it.

### Phase 4 — Tests + GOLDs

Stephen is producing the `.spin2` sources and GOLDs on Windows (PNut v54); I'll:

- Add a `TEST/v54/` (or existing v-series) directory once sources arrive
- Wire into `jest-config/` (new `*_v54.json` if the existing config doesn't auto-glob)
- Add `npm run test-v54` script hook
- Post-implementation sanity: run full regression (`npm test`) — existing v41-v53 GOLDs must still pass byte-identically since v54 is bytecode-compatible and the record format change only affects structs-with-bitfields or nameless members (neither exists in the v53 regression corpus)

---

## File impact summary

| File | Phase | Change type |
|------|-------|-------------|
| `package.json`, `package-lock.json` | 0 | version bump |
| `src/pnut-ts.ts` | 0 | version string |
| `src/classes/spinDocument.ts` | 0 | `legalVersions` append |
| error constants (location TBD — check `spinResolver.ts` or a dedicated error file) | 0 | add 3 strings |
| `CHANGELOG.md` | 0, final | entry |
| `src/classes/objectStructures.ts` | 1 | writer API |
| `src/classes/objectStructureRecord.ts` | 1 | reader API |
| `src/classes/spinResolver.ts` — `buildStructureRecord` | 2 | parser extension |
| `src/classes/spinResolver.ts` — `compile_struct_setup` | 3 | access-site resolution |
| `src/classes/spinResolver.ts` — `compVar` bitfield emit | 3 | new codegen branch |
| `TEST/v54/*.spin2` + GOLDs | 4 | new test suite |
| `jest-config/*_v54.json` | 4 | test wiring |

---

## Decisions locked in

1. **`{Spin2_v54}` is not a gate** — new STRUCT syntax parses unconditionally, matching PNut v54.
2. **No `SYMBOLS_V54`** — `parseUtils.ts` symbol tables unchanged.
3. **`legalVersions` semantics** — confirmed: any version in the list is accepted as a directive. Appending `54` is the only change needed.
4. **Sprint sequencing** — phases ordered so each one's output is consumed by the next; Stephen produces test content + GOLDs in parallel on Windows.

## Open questions

- ~~Where do the error strings live?~~ **Resolved:** PNut-TS uses inline `throw new Error(msg)` at the throw site. No dedicated error-constants module. The 3 new v54 errors will be added inline in Phase 2 at the point each is detected.
- ~~Does `iStructureReturn` need a new field for the resolved bitfield, or can it piggyback on an existing channel?~~ **Resolved:** a new field, `compiledBitfield` (`src/classes/spinResolver.ts`, `iStructureReturn`).
