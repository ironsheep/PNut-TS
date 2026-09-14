# PNut v54 Language Changes (from v53)

**Release Date:** 2026-04-22 (compiler header `;* Last Updated: 2026/04/22 *`)
**Spin2 Version Constant:** **54** (was 53)
**Header title:** `Spin2 Compiler v54` (was `Spin2 Compiler v53`)
**Interpreter:** **unchanged** from v53 (byte-identical `Spin2_interpreter.spin2`)
**Debug units:** unchanged (byte-identical `DebugDisplayUnit.pas`, `DebugUnit.pas`)
**ReadMe.txt:** unchanged (byte-identical to v53)
**Copyright:** unchanged (2006-2026)

## Release Observations — Version Gating

- `spin2_version` **bumped** from 53 → 54. `{Spin2_v54}` is now a legal directive.
- `level54_symbols` table **not added**. The level ladder in the CON-symbol injector (p2com.asm:19947-19959) still stops at `level53_symbols`.
- The new STRUCT syntax (named bitfields, nameless single BWL member) is **not gated** by `spin2_level`. It parses unconditionally — writing `{Spin2_v54}` is accepted but has no functional effect beyond the existing v51/52/53 symbol loads.
- Consequence: source that uses the new STRUCT syntax will compile on v54 with *any* `{Spin2_vNN}` directive (or none). Authors relying on directive-level portability warnings should still include `{Spin2_v54}` as a *declaration* of intent even though v54 does not enforce it.

Files differing v53 → v54: only `p2com.asm` (+202 lines; 1,234 diff lines), `PNut.dpr` (title string), `crank.bat` (exe name), `AboutUnit.dfm` (version string). All other units identical.

---

## Spin2 Language Changes

### New: Named Bitfields in STRUCT Members

STRUCT definitions can now declare named bitfields attached to a `BYTE`, `WORD`, or `LONG` member. Each bitfield specifies either a single bit or an inclusive bit range. A member may carry multiple bitfields, each introduced by a dot.

```spin2
STRUCT status_t(LONG flags.ready[0].error[1].count[15..8])

VAR
    status_t state

PUB example()
    state.flags.ready := 1          ' set bit 0 of state.flags
    state.flags.count := 123        ' set bits 15..8 of state.flags
    IF state.flags.error
        state.flags.ready := 0
```

**Declaration syntax (inside a STRUCT):**
```
STRUCT struct_name({BYTE|WORD|LONG} member_name{[count]}{.bitfield_name[bit_or_range]}{.bitfield_name[bit_or_range]}... , ...)
```

| Form | Meaning |
|------|---------|
| `.name[N]` | Single-bit bitfield at bit N of the member |
| `.name[upper..lower]` | Multi-bit bitfield spanning bits `upper` down to `lower` |

**Use syntax (accessing a struct value):**
```
struct_var.member_name.bitfield_name
```

**Constraints:**
- Bitfields are allowed **only** on `BYTE`, `WORD`, and `LONG` members. Not on `STRUCT` members.
- Bit numbers must not exceed the member's boundary: 0..7 for BYTE, 0..15 for WORD, 0..31 for LONG.
- For a range `[upper..lower]`, `lower` must be `<= upper`.
- Multiple bitfields may be chained: `LONG flags.a[0].b[1].c[7..4]`.
- Bitfields do **not** have to be disjoint — overlapping bitfield definitions are allowed (the compiler only enforces the boundary and ordering rules).

**New Errors:**
| Error Message | Condition |
|---------------|-----------|
| `Bitfields are only allowed for BYTE/WORD/LONG members` | `.bitfield` applied to a STRUCT-typed member |
| `Bit number exceeds BYTE/WORD/LONG boundary` | Bit number >= 8 / 16 / 32 for BYTE / WORD / LONG |
| `Lower bit number cannot exceed upper bit number` | `lower > upper` in `[upper..lower]` range |

**Notes:**
- Bitfields emit no new bytecode — at the access site the compiler resolves the member bitfield through the struct-definition record and emits the existing `bc_setup_bfield_0_31` or `bc_setup_bfield_rfvar` setup bytecodes (same mechanism as `var.[bit]` / `var.[upper..lower]` on plain variables).
- The entire bitfield word (basebit + (extrabits << 5)) is stored in the struct definition record.
- Not gated by a version directive (see Release Observations above).

---

### New: Single Nameless BYTE/WORD/LONG Struct Member

A STRUCT may now contain exactly one nameless `BYTE`, `WORD`, or `LONG` as its only member. This lets the struct name alone refer to the backing value while still allowing named bitfields.

```spin2
STRUCT io_flags_t(LONG.ready[0].error[1].count[7..2])

VAR
    io_flags_t io

PUB example()
    io.ready := 1             ' accessed directly by struct name
    io.count := 63            ' no intermediate member name
    io := 0                   ' whole-struct assignment still works
```

**Declaration syntax:**
```
STRUCT struct_name({BYTE|WORD|LONG}{.bitfield_name[bit_or_range]}...)
```

**Constraints:**
- Must be the **first and only** member.
- Must be `BYTE`, `WORD`, or `LONG` — cannot be `STRUCT`.
- No instance-count `[N]` permitted.
- Bitfield chains are allowed on the nameless member.

**Internal marker:** The struct definition record encodes this case by storing a zero name-length byte for the first member. Compiler code paths key off the `@@singlebwl` flag to skip instance-count parsing and suppress "another member follows" handling.

---

## PASM2 Language Changes

### No New Instructions

v54 adds no PASM2 instructions. All changes are Spin2-level STRUCT syntax.

---

## DEBUG Display Changes

### No Changes

`DebugDisplayUnit.pas` and `DebugUnit.pas` are byte-identical to v53.

---

## Bytecode Changes

### No New Bytecodes

Struct bitfields reuse the existing bitfield-setup bytecodes (`bc_setup_bfield_0_31`, `bc_setup_bfield_rfvar`) that were already used for plain variable bitfields. The bytecode dispatch table and `@@debugnop` offset are unchanged from v53.

---

## Interpreter Changes (Spin2_interpreter.spin2)

### No Changes

The interpreter file is byte-identical to v53. All v54 changes are compile-time.

---

## Compiler Internal Changes

### STRUCT Record Format Extension

The struct definition record now encodes optional bitfields per member. The per-member continuation byte is extended from a 2-value to a 3-value:

```
; Member entry in struct_def:
;   long:  member_offset
;   byte:  member_type (0=BYTE, 1=WORD, 2=LONG, 3=STRUCT+sub_record)
;   byte:  member_name_length (0 allowed for first and only nameless byte/word/long)
;   byte(s): member_name
;   byte:  continuation
;          0 = end of struct
;          1 = another member follows
;          2 = bitfield follows (only valid after byte/word/long members)
;              byte:    bitfield_name_length
;              byte(s): bitfield_name
;              word:    packed bitfield = basebit + (extrabits << 5)
;              <loops back to read next 0/1/2 byte>
```

The packed bitfield word is a standard Propeller bitfield descriptor: low 5 bits = base bit number, upper bits = number of extra bits (span size minus 1).

### New Error Strings

```asm
error_bfaoa:   call  set_error
               db    'Bitfields are only allowed for BYTE/WORD/LONG members',0

error_bnebwlb: call  set_error
               db    'Bit number exceeds BYTE/WORD/LONG boundary',0

error_lbnceubn: call set_error
                db   'Lower bit number cannot exceed upper bit number',0
```

Locations: p2com.asm:1999, 2006, 2429.

### New Flag: `var_bitfield_struct`

A new variable-flag bit is added to the existing bitfield flag set used in `is_var`:

```asm
; v53:
var_bitfield_con  = 080000h
var_bitfield_flag = 040000h

; v54:
var_bitfield_struct = 100000h   ; NEW — marks "structure bitfield" at use site (p2com.asm:16231)
var_bitfield_con    = 080000h
var_bitfield_flag   = 040000h
```

When `is_var` detects that a struct byte/word/long member access is followed by `.name` (not `.[bit]`), it sets both `var_bitfield_flag` and `var_bitfield_struct`, then later `@@enterbit` uses the precomputed `compiled_struct_bitfield` value instead of compiling a bitfield expression.

### `build_struct_record` Refactor

The STRUCT-declaration parser (`build_struct_record`, p2com.asm:6812-7006) gained three new locals and substantial new logic:

| New local | Purpose |
|-----------|---------|
| `@@type` | Stores the current member's type (0/1/2/3) for later boundary checks |
| `@@notfirst` | 1 once the first member has been parsed; used to detect nameless-member eligibility |
| `@@singlebwl` | 1 if the first (and only) member is a nameless BYTE/WORD/LONG |

The old `@@enter_byte` helper was split:
- `@@enter_type` — records `bl` into `@@type`, then falls through to enter the byte (p2com.asm:6990)
- `@@enter_byte` — unchanged enter-a-byte primitive

A new `@@bitfieldlp` loop (p2com.asm:6892-6918) parses `.bitfield_name[bits]` chains after a member, emits the continuation byte `2`, the bitfield name, and the packed bitfield word, then loops while another `.` is seen.

### `skip_struct_setup` Refactor

Struct use-site compilation (`skip_struct_setup`, p2com.asm:16960-17320) now:

1. Detects the single-nameless-member case and short-circuits: the member is consumed from the struct record without requiring a `.name` in source.
2. After any matching byte/word/long member, reads the continuation byte; if `2`, matches the next source `.name` against stored bitfield names, sets `@@bitfield = 80000000h | bitfield_word` on match, and falls through to compile a setup with the structure bitfield.
3. Calls `back_element` twice before falling through to the regular bitfield-setup path (new `@@compileback2` entry point) so the `.bitfield_name` tokens get re-read by the common setup compiler.
4. Stores the precomputed bitfield descriptor in the new `compiled_struct_bitfield` global.

New helper subroutines extracted:
- `@@getname` — get a source symbol into `symbol`, error if absent (p2com.asm:17294)
- `@@checkname` — compare `symbol` against the next name in the struct record (p2com.asm:17300)

### Promoted State Size: Byte → Dword

Several `compiled_struct_*` globals were widened from byte to dword (changed from `dbx` to `ddx`), and the corresponding loads/stores from `mov al,[...]` / `mov [...],al` to `mov eax,[...]` / `mov [...],eax`:

| Variable | v53 | v54 |
|----------|-----|-----|
| `compiled_struct_flags` | byte | dword |
| `compiled_struct_word_size` | byte | dword |
| `compiled_struct_index_mode` | byte | dword |
| `compiled_struct_bitfield` | (did not exist) | dword (NEW) |

### New Routine: `preserve_compiled_struct`

A new helper (p2com.asm:17425-17445) that saves and restores all `compiled_struct_*` globals around a nested call. Used when `is_var` needs to parse a bitfield expression (which itself can recursively compile struct accesses) without clobbering the outer struct's in-progress compile state:

```asm
preserve_compiled_struct:     ; call eax while preserving compiled_struct_* data
        push  [compiled_struct_flags]
        push  [compiled_struct_size]
        push  [compiled_struct_address]
        push  [compiled_struct_word_size]
        push  [compiled_struct_source_ptr]
        push  [compiled_struct_obj_ptr]
        push  [compiled_struct_index_mode]
        push  [compiled_struct_bitfield]
        call  eax
        pop   [compiled_struct_bitfield]
        pop   [compiled_struct_index_mode]
        pop   [compiled_struct_obj_ptr]
        pop   [compiled_struct_source_ptr]
        pop   [compiled_struct_word_size]
        pop   [compiled_struct_address]
        pop   [compiled_struct_size]
        pop   [compiled_struct_flags]
        ret
```

Call sites in `is_var` that previously invoked `skip_exp_check_con` / `compile_exp_check_con` directly now go through `preserve_compiled_struct` with the target routine address loaded in `eax`. A new local helper `@@compile_index_check_con` (p2com.asm:16850) wraps `compile_exp_check_con` with the preservation.

### `@@enterbit` Three-Branch Restructuring

The bitfield-emit block `@@enterbit` (p2com.asm:16786-16829) now has three branches:

1. **Structure bitfield** (`var_bitfield_struct` set) — reads the precomputed `compiled_struct_bitfield`, skips the `.name` in source, and calls a new `@@compile_bitfield` helper to emit the appropriate setup bytecode.
2. **Constant bitfield** (`var_bitfield_con` set) — existing v53 path, evaluates the `.[const]` or `.[const..const]` expression at compile time.
3. **Variable bitfield** (neither set) — emits `bc_setup_bfield_pop` after the runtime-evaluated expression was compiled earlier.

A new helper `@@compile_bitfield` (p2com.asm:16862) centralizes the "0..31 → `bc_setup_bfield_0_31 + N`, else `bc_setup_bfield_rfvar` + rfvar(N)" emission logic.

### Struct "Hub byte/word/long" Path Reordered

In `is_var`'s setup-bytecode emission section, the `type_hub_byte` case was moved **before** the var-16 / loc-16 / dat / pbase / vbase / dbase fall-through (from v53:16662-16679 to v54:16697-16711) — functionally equivalent, control-flow simplification.

### Whitespace / Cosmetic

A large number of lines in `@@ptr*` and related sections were retabbed to widen the comment column (aligning comments one tab stop further right). These changes are visual only and do not affect behavior.

---

## Summary of New Language Features

| Category | Feature | Description |
|----------|---------|-------------|
| Spin2 STRUCT | `BYTE/WORD/LONG member.bitfield[N]` | Named single-bit bitfield attached to a byte/word/long member |
| Spin2 STRUCT | `BYTE/WORD/LONG member.bitfield[upper..lower]` | Named multi-bit bitfield attached to a byte/word/long member |
| Spin2 STRUCT | `STRUCT name(BYTE/WORD/LONG ...)` (nameless) | Single nameless byte/word/long member, accessed by struct name |

---

## Bug Fixes

None identified. All v53 fixes (NEXT/QUIT default branch, CASE colon parsing) remain in place.

---

## Bytecode Compatibility

v54 bytecodes are **fully compatible** with v53. No new bytecodes were added; no bytecode values were renumbered. An object file produced by v54 that doesn't declare struct bitfields will be byte-identical to the v53 equivalent. Object files that *do* use struct bitfields emit the same bitfield-setup bytecodes (`bc_setup_bfield_0_31`, `bc_setup_bfield_rfvar`) that v53 already supported for ordinary variable bitfields — the interpreter runs both identically.

---

## Upgrade Notes

### Breaking Changes

None. All v54 changes are additive STRUCT-syntax extensions.

### Migration Considerations

1. **Struct bitfields** enable C-style "bit-field structs" with named bitfields, eliminating the need for separate `.[bit]` indexing at call sites.
2. **Nameless single-member structs** provide a clean way to attach named bitfields to a plain byte/word/long without an outer wrapping member name.
3. **Version directive is not enforced.** `{Spin2_v54}` is accepted by the directive parser (since `spin2_version = 54`), but the new STRUCT syntax compiles under any Spin2 level. Authors should still declare `{Spin2_v54}` for future-proofing and reader intent — other tooling may enforce it even though PNut does not.
4. **Struct definition record format** has changed (extended continuation byte values). Any tool that parses `struct_def` (debuggers, introspection utilities, alternate compilers like PNut-ts) must be updated before it can read v54-produced struct records, **even for structs that don't use bitfields** — because the per-member continuation-byte semantics changed.

### New Reserved Words (v54+)

None. Bitfield names are user-defined identifiers scoped to the struct definition.
