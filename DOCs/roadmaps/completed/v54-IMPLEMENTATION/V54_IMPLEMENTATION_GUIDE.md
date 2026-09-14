# V54 Implementation Guide for PNut-ts

This document provides the precise implementation details an agent needs to implement v54 changes in PNut-ts. It complements `v54_CHANGES.md` (what changed) and `V54_LANGUAGE_REFERENCE_ADDITIONS.md` (user-facing spec) with the algorithmic and structural detail required for implementation.

**Source reference:** All code excerpts below are from `v54/p2com.asm` unless noted. The interpreter, debug display, and debug host files are byte-identical to v53.

---

## 1. Version Constant

```asm
spin2_version = 54    ; p2com.asm:35 (was 53 in v53)
```

**Action:** Bump PNut-ts's `spin2_version` constant to 54 so that `{Spin2_v54}` is accepted as a directive.

---

## 2. No Level 54 Symbol Table Gate

PNut v54 did **not** add a `level54_symbols` table. The level-ladder injector in `p2com.asm:19947-19959` still stops at `level53_symbols`. The new STRUCT syntax (named bitfields + nameless single BWL member) parses unconditionally regardless of `spin2_level`.

```asm
cmp [spin2_level],51    ; p2com.asm:19947
...
cmp [spin2_level],52    ; :19952
lea esi,[level52_symbols]
...
cmp [spin2_level],53    ; :19957
lea esi,[level53_symbols]
;; (no cmp [spin2_level],54 — no level54_symbols table exists)
```

**Action for PNut-ts:** Accept `{Spin2_v54}` as a legal directive. Do **not** gate the new STRUCT parser on `spin2_level >= 54` — match PNut's behavior of accepting the syntax unconditionally. (If a future PNut release adds `level54_symbols`, revisit this.)

---

## 3. No New Bytecodes

v54 adds no new bytecodes. The dispatch table, `@@debugnop` offset, and interpreter image are unchanged from v53.

**Action:** No interpreter or bytecode-enum changes required.

---

## 4. New Error Strings

Three new errors are added:

```asm
error_bfaoa:    call  set_error           ; p2com.asm:1999
                db    'Bitfields are only allowed for BYTE/WORD/LONG members',0

error_bnebwlb:  call  set_error           ; p2com.asm:2006
                db    'Bit number exceeds BYTE/WORD/LONG boundary',0

error_lbnceubn: call  set_error           ; p2com.asm:2429
                db    'Lower bit number cannot exceed upper bit number',0
```

**Action:** Add all three to PNut-ts's error table.

---

## 5. STRUCT Definition Record Format (UPDATED)

The struct record format gains a new per-member continuation-byte value and an optional trailing bitfield list.

### 5.1 Top-level struct record (unchanged shape, extended member format)

```
word:  size_of_struct_record   (including this word)
long:  size_of_struct_memory
member_entries...
```

### 5.2 Each member entry

```
long:  member_offset                    within the struct
byte:  member_type                      0=BYTE, 1=WORD, 2=LONG, 3=STRUCT+sub_record
  if member_type == 3:
    <sub-struct record>                 recursively, same format
byte:  member_name_length               0 is allowed ONLY for the first and only
                                        nameless BYTE/WORD/LONG member
byte(s): member_name                    zero bytes if length==0
byte:  continuation                     0 = end of struct (no more members)
                                        1 = another member follows
                                        2 = bitfield descriptor follows (NEW in v54)
  if continuation == 2:
    byte:    bitfield_name_length
    byte(s): bitfield_name
    word:    packed_bitfield = (basebit) | ((extrabits) << 5)
    <loop back to read next continuation byte>
  if continuation == 1:
    <another member entry follows>
  if continuation == 0:
    <end>
```

**Key invariants:**
- Continuation value `2` is valid **only** after a member of type BYTE/WORD/LONG.
- A bitfield list can contain any number of descriptors, chained by repeated `2` continuation bytes.
- The packed bitfield word matches the Propeller runtime bitfield descriptor: `basebit` in bits 4..0, `extrabits` (span-1) in bits 14..5.
- A member with `member_name_length == 0` implies "single nameless BYTE/WORD/LONG" — the compiler must not emit any further members and must not consume an instance count.

**Action:** In PNut-ts, the `struct_def` reader and writer must be updated to understand continuation values 0/1/2. All existing v53 code paths that wrote or read this record must handle the new format, even for structs that don't use bitfields — the continuation-byte semantics are global.

---

## 6. `build_struct_record` Parser Updates

Location: `v54/p2com.asm:6812-7006`.

### 6.1 New Locals

Add three new local variables (declared with `dbx`/`ddx` at the end of the routine):

| Local | Type | Purpose |
|-------|------|---------|
| `@@type` | byte | Type of current member (0/1/2/3), used for boundary checks on bitfield bit numbers |
| `@@notfirst` | byte | 1 after the first member has been parsed; used to reject nameless member after position 0 |
| `@@singlebwl` | byte | 1 if the first (and only) member is a nameless BYTE/WORD/LONG |

Initialize `@@notfirst = 0` and `@@singlebwl = 0` at routine entry (p2com.asm:6833-6834).

### 6.2 Helper Split: `@@enter_byte` → `@@enter_type` + `@@enter_byte`

In v53, one primitive `@@enter_byte` appended a byte to the struct record. In v54:

```asm
@@enter_type:   mov   [@@type],bl    ; p2com.asm:6990 — set @@type to the value being entered
@@enter_byte:   push  eax            ;                 unchanged append-bl-to-record primitive
                ...
```

Call `@@enter_type` when entering the member-type byte (so the type is remembered for later boundary checks); call `@@enter_byte` when entering any other byte.

### 6.3 `@@enter_name` Rewritten

`@@enter_name` in v53 simply wrote the symbol length + characters. In v54 it additionally handles the nameless-member case:

```
@@enter_name:
    call get_symbol              ; try to read a member name
    if no symbol returned:
        if @@notfirst == 1:
            error_eas            ; names are mandatory after the first member
        if @@type == 3:
            error_eas            ; nameless is not allowed for STRUCT-typed member
        call back_element        ; back up, there was no name token
        set @@singlebwl = 1      ; mark this as the nameless-single-bwl case
        enter_byte(0)            ; write name_length = 0
        return
    ; normal case: enter length + name characters
    enter_byte(length)
    enter each character
    return
```

This means **`@@enter_name` now consumes the member name from source itself** — it no longer relies on the caller having already called `get_symbol`. The call site at `@@getname` (p2com.asm:6843) changed from "call `get_symbol`; call `@@enter_name`" to just "call `@@enter_name`".

### 6.4 Suppress Instance Count for Nameless Members

After `@@enter_name` returns, set `@@notfirst = 1`. When parsing the optional `[count]`:

```asm
call check_leftb
if not present, default count=1 as before
if @@singlebwl == 1:
    skip the [count] parse entirely - no count allowed
```

(p2com.asm:6867-6869 implement this skip via `cmp [@@singlebwl],1 / je @@gotcount`.)

### 6.5 Bitfield Chain Parser (NEW)

After processing `[count]` and updating `@@offset`, check for `.bitfield_name[bits]` chains (p2com.asm:6892-6926):

```asm
    call  check_dot                 ; '.' starts a bitfield chain
    if not '.':
        goto @@nobitfield
    if @@type > 2:
        error_bfaoa                 ; STRUCT members cannot have bitfields

@@bitfieldlp:
    enter_byte(2)                   ; continuation = bitfield follows
    call  @@enter_name              ; parse + enter bitfield_name
    call  get_leftb                 ; '['
    call  get_value_int             ; upper (or single) bit number -> ebx
    boundary_limit = 8 << @@type    ; 8, 16, or 32
    if ebx >= boundary_limit:
        error_bnebwlb
    ecx = ebx                       ; remember upper
    call  check_dotdot              ; optional '..'
    if present:
        call  get_value_int         ; lower bit number -> ebx
        if ebx > ecx:
            error_lbnceubn
    ; compute packed bitfield word = basebit | ((span-1) << 5)
    ecx -= ebx                      ; span-1
    ecx <<= 5
    ebx |= ecx
    call  @@enter_word              ; write the 16-bit packed descriptor
    call  get_rightb                ; ']'
    call  check_dot                 ; another bitfield?
    if yes:
        goto @@bitfieldlp

@@nobitfield:
```

### 6.6 Nameless-Member Finalization

If `@@singlebwl == 1`, the parser skips the comma/right-paren loop and terminates the struct (p2com.asm:6920-6925):

```asm
@@nobitfield:
    if @@singlebwl == 1:
        call  get_right            ; ')'
        enter_byte(0)              ; end of record
        goto @@patch               ; (renamed from the plain "patch size fields" block)
    else:
        (existing v53 path: comma or ')', emit 1/0 continuation, loop back)
```

---

## 7. `is_var` and `skip_struct_setup` Updates

Location: `is_var` changes around p2com.asm:16054-16870, `skip_struct_setup` changes around p2com.asm:16960-17320.

### 7.1 New Flag

```asm
; v53:
var_bitfield_con    = 080000h
var_bitfield_flag   = 040000h

; v54:
var_bitfield_struct = 100000h   ; NEW — p2com.asm:16231
var_bitfield_con    = 080000h
var_bitfield_flag   = 040000h
```

`var_bitfield_struct` marks that the bitfield descriptor is a **structure bitfield** — its value has already been computed during struct-access compilation and is stored in `compiled_struct_bitfield`, so no runtime expression is emitted at the bitfield-setup site.

### 7.2 Widened `compiled_struct_*` Globals

Promote four globals from byte to dword:

```asm
ddx  compiled_struct_flags        ; was dbx
ddx  compiled_struct_word_size    ; was dbx
ddx  compiled_struct_index_mode   ; was dbx
ddx  compiled_struct_bitfield     ; NEW
```

Update every `mov al,[compiled_struct_flags]` etc. to `mov eax,[...]`, and `mov [...],al` to `mov [...],eax`. (The values held are still small, but the storage is now dword-aligned.)

### 7.3 `is_var`: Detect Structure Bitfield

In the struct-member branch (after `skip_struct_setup` returns, p2com.asm:16312-16320):

```asm
if compiled_struct_flags == 3:            ; byte/word/long struct reference
    if compiled_struct_bitfield != 0:     ; and a bitfield was resolved
        call  get_dot                     ; consume '.'
        call  get_element                 ; consume bitfield_name
        or    ecx, var_bitfield_flag | var_bitfield_struct
        goto  @@isvar
    else:
        goto  @@checkbf                   ; fall through to the old ".[bit]" check
```

### 7.4 `is_var`: Preserve State Across Bitfield Expression Compilation

The regular (non-struct) bitfield expression compiler path used to call `skip_exp_check_con` / `compile_exp_check_con` directly. These sub-expressions can themselves trigger struct compilation (e.g. if the bit index is itself a struct access), which would overwrite the outer `compiled_struct_*` globals. To prevent that, v54 wraps the calls:

```asm
; v53:
        call  skip_exp_check_con

; v54:
        lea   eax,[skip_exp_check_con]
        call  preserve_compiled_struct
```

The new local helper `@@compile_index_check_con` (p2com.asm:16850) does the same wrap for `compile_exp_check_con` in the index-compilation path.

### 7.5 `@@enterbit` Three Branches

```
@@enterbit:                              ; p2com.asm:16786
    test  ecx, var_bitfield_flag
    jz    @@nobit                        ; no bitfield at all

    test  ecx, var_bitfield_struct       ; NEW branch
    jz    @@bfnotstruct2
        ; ─── structure bitfield path ──────────────────────────
        call get_dot                     ; consume '.'
        call get_element                 ; consume bitfield_name
        eax = [compiled_struct_bitfield] ; pre-resolved descriptor
        call @@compile_bitfield          ; emits bc_setup_bfield_0_31+N or bc_setup_bfield_rfvar+rfvar(N)
        jmp  @@nobit

@@bfnotstruct2:
    test  ecx, var_bitfield_con          ; constant vs variable bitfield
    jz    @@bfnotcon
        ; ─── constant bitfield path ─────────────────────────
        call get_dot
        call get_leftb
        call skip_exp_check_con          ; re-evaluate constant expression
        eax = con_value & 0x3FF
        call check_dotdot
        if present:
            call skip_exp_check_con
            eax -= con_value              ; span-1 fused into high bits
            eax <<= 5
            eax |= (previous basebit)
        ; eax = packed descriptor
        call @@compile_bitfield
        call get_rightb
        jmp  @@nobit

@@bfnotcon:
        ; ─── variable bitfield path ─────────────────────────
        call get_dot
        call get_leftb
        call skip_exp                    ; consume already-compiled expression
        if '..' present: call skip_exp
        enter_obj(bc_setup_bfield_pop)
        call get_rightb

@@nobit:
```

### 7.6 New Helper: `@@compile_bitfield`

A small helper (p2com.asm:16862) that decides between the single-byte and rfvar encodings:

```asm
@@compile_bitfield:
    if eax <= 31:
        enter_obj(bc_setup_bfield_0_31 + eax)   ; single byte
        return
    ; multi-bit
    push eax
    enter_obj(bc_setup_bfield_rfvar)
    pop  eax
    jmp  compile_rfvar                          ; tail call
```

### 7.7 `skip_struct_setup` Updates

The struct-access traversal now:

1. **Detects single nameless member** (p2com.asm:17048-17059). Right after locating the struct definition, check `[byte esi+4+1]`. If zero (name length = 0), short-circuit: load the nameless member's offset, type, and name-skip without requiring a `.name` in source. Jump to the byte/word/long member-matched branch (`@@singlebwl` label).

2. **After a matching byte/word/long member, reads the continuation byte** (`lodsb`, p2com.asm:17116-17151). If it's 2, a bitfield list follows:
    ```
    if next source char is not '.':
        continue to regular compile (no bitfield selected)
    if '.[' follows:
        backtrack twice and fall through to regular @@compileback2 path (runtime bitfield)
    otherwise:
        read source symbol as bitfield_name
        loop over stored bitfield entries comparing names:
            if match: read 2-byte bitfield descriptor, set @@bitfield = 80000000h | descriptor, goto @@compileback2
            else: skip 2 bytes (descriptor), read continuation, loop if 2
        if exhausted: error_sdnctn
    ```

3. **Skips intermediate bitfield entries on mismatch.** When a member name didn't match and the next continuation byte is 2, skip the bitfield chain (name + 2-byte descriptor), read the continuation, loop (p2com.asm:17141-17148). This is the new `@@mismatch` path.

4. **Records the bitfield descriptor** in `@@bitfield` local and copies to `compiled_struct_bitfield` global at exit (p2com.asm:17247-17249).

5. **Extracts helpers** `@@getname` (read source symbol with error) and `@@checkname` (compare source symbol against next stored name) — p2com.asm:17294-17318. These are reused by both the member-name match loop and the new bitfield-name match loop.

### 7.8 `preserve_compiled_struct` Routine (NEW)

Save and restore all `compiled_struct_*` globals across a call (p2com.asm:17425-17445). Used to wrap sub-expression evaluators that might themselves compile struct accesses.

```asm
preserve_compiled_struct:
    push [compiled_struct_flags]
    push [compiled_struct_size]
    push [compiled_struct_address]
    push [compiled_struct_word_size]
    push [compiled_struct_source_ptr]
    push [compiled_struct_obj_ptr]
    push [compiled_struct_index_mode]
    push [compiled_struct_bitfield]
    call eax                          ; caller loaded target in eax
    pop  [compiled_struct_bitfield]
    pop  [compiled_struct_index_mode]
    pop  [compiled_struct_obj_ptr]
    pop  [compiled_struct_source_ptr]
    pop  [compiled_struct_word_size]
    pop  [compiled_struct_address]
    pop  [compiled_struct_size]
    pop  [compiled_struct_flags]
    ret
```

**Action:** In PNut-ts, any time compile_exp_check_con / skip_exp_check_con is called from within a struct-access compile, wrap it in save/restore logic for the equivalent compiled_struct_* state.

---

## 8. Struct "Hub byte/word/long" Path Reordered

In the `is_var` setup-bytecode emission section, the `type_hub_byte` case is now evaluated **before** the var-16 / loc-16 / pbase-vbase-dbase paths (moved from v53:16662-16679 to v54:16697-16711).

**Behavior is unchanged** — this is a control-flow simplification. PNut-ts's equivalent code doesn't need to match the ordering exactly as long as the semantics are preserved.

---

## 9. Whitespace / Cosmetic Changes

A large portion of the diff is comment-column retabbing in the `@@ptr*` and `@@isvar` regions. These do not affect behavior and should be ignored when porting.

---

## 10. Implementation Checklist

| # | Change | Category | Complexity |
|---|--------|----------|------------|
| 1 | Bump PNut-ts `spin2_version` to 54 | Constant | Trivial |
| 2 | Add error strings `error_bfaoa`, `error_bnebwlb`, `error_lbnceubn` | Error table | Simple |
| 3 | Add `var_bitfield_struct = 100000h` flag constant | Constant | Trivial |
| 4 | Widen `compiled_struct_flags`, `compiled_struct_word_size`, `compiled_struct_index_mode` to dword | State | Simple |
| 5 | Add `compiled_struct_bitfield` dword | State | Trivial |
| 6 | Extend STRUCT record format: continuation byte 0/1/**2** semantics | Data format | **Complex** (affects both writer and reader) |
| 7 | `build_struct_record`: add `@@type` / `@@notfirst` / `@@singlebwl` locals | State | Simple |
| 8 | `build_struct_record`: split `@@enter_byte` into `@@enter_type` + `@@enter_byte` | Refactor | Trivial |
| 9 | `build_struct_record`: rewrite `@@enter_name` to consume the source symbol and handle nameless-first-member case | Parser | Medium |
| 10 | `build_struct_record`: suppress `[count]` parse when `@@singlebwl==1` | Parser | Simple |
| 11 | `build_struct_record`: add bitfield-chain parser loop (`.name[bits]` possibly chained) | Parser | Medium |
| 12 | `build_struct_record`: nameless-member finalization (skip comma/right-paren loop) | Parser | Simple |
| 13 | `is_var`: detect struct byte/word/long with resolved bitfield, consume `.name`, set `var_bitfield_struct` | Compiler | Medium |
| 14 | `is_var`: add `preserve_compiled_struct` wrap around `skip_exp_check_con` / `compile_exp_check_con` in bitfield/index paths | Compiler | Medium |
| 15 | `is_var`: restructure `@@enterbit` into three branches (struct / constant / variable) | Compiler | Medium |
| 16 | `is_var`: add `@@compile_bitfield` helper (single-byte vs rfvar) | Compiler | Simple |
| 17 | `skip_struct_setup`: detect single-nameless-member struct, short-circuit | Compiler | Medium |
| 18 | `skip_struct_setup`: after byte/word/long member match, parse optional `.bitfield_name` against stored bitfield list | Compiler | **Complex** |
| 19 | `skip_struct_setup`: on member mismatch, skip bitfield entries correctly | Compiler | Medium |
| 20 | `skip_struct_setup`: extract `@@getname` / `@@checkname` helpers | Refactor | Simple |
| 21 | Add `preserve_compiled_struct` routine | Compiler | Simple |

**Recommended implementation order:**

1. Infrastructure first: **1 → 2 → 3 → 4 → 5 → 21**
2. Struct-record writer: **6 → 7 → 8 → 9 → 10 → 11 → 12** (now you can declare but not access struct bitfields)
3. Struct-record reader: **17 → 18 → 19 → 20** (now `skip_struct_setup` understands the new format)
4. Access-site compilation: **13 → 15 → 16 → 14** (now bitfield access compiles correctly)

This order lets you test incrementally — after step (2) you can compile STRUCT declarations and inspect the emitted struct records; after step (3) you can read them back in `skip_struct_setup`; after step (4) full Spin2 code compiles.

---

## 11. Key Implementation Notes

### 11.1 Packed Bitfield Descriptor

The 16-bit packed descriptor stored in the struct record is:
```
bits 4..0 :  base_bit (the lower/single bit number)
bits 14..5:  extra_bits (span_size - 1, i.e. 0 for single bit)
```

This matches the runtime bitfield descriptor expected by `bc_setup_bfield_rfvar`'s rfvar payload, so no translation is required at access time — the stored word is written directly (OR'd with `80000000h` in `compiled_struct_bitfield` as a "bitfield-resolved" sentinel, but only the low 16 bits matter for codegen).

### 11.2 Sentinel `80000000h`

`compiled_struct_bitfield == 0` means "no bitfield was found during struct access". A resolved bitfield stores `80000000h | packed_descriptor`. Testing with `!= 0` (or `test eax,eax; jnz`) distinguishes the cases. Implementers can use any equivalent (e.g. a boolean flag + separate descriptor field).

### 11.3 Nameless Member Is a Single BWL

The `@@singlebwl` guard exists because the nameless case is intentionally restricted:
- Only the first member.
- Only BYTE/WORD/LONG (no STRUCT type).
- No instance count.
- No other members after it.

If any of these are violated the existing `error_eas` path fires ("Expected an asterisk/symbol"), which is sufficient — no new error strings were added for this case.

### 11.4 `back_element` Twice Before Regular Compile

Several paths in `skip_struct_setup` call `back_element` twice before jumping to `@@compileback2`. This is because the regular bitfield-setup compiler expects the source pointer to be **before** the `.` and `.name`/`.[exp]` sequence — so after reading `.name` here, we need to back up past the `.` and the token that preceded it.

### 11.5 Continuation Byte 2 Only After BWL

The invariant that continuation `2` (bitfield follows) only appears after a BYTE/WORD/LONG member type is enforced by `build_struct_record`'s `error_bfaoa` check — it never writes a `2` after a STRUCT member. Readers can rely on this and don't need to re-check.

### 11.6 Version Directive Is Not a Gate

Unlike v52 (added `level52_symbols`) and v53 (added `level53_symbols`), v54 did **not** add a `level54_symbols` table. `{Spin2_v54}` is accepted but has no effect beyond loading the same v51/52/53 symbol batches that any higher-numbered directive would. PNut-ts should mirror this — accept the directive, do not gate the new STRUCT parser on it.

---

## 12. Regression Test Considerations

Key test scenarios for v54:

| Test Case | Expected Behavior |
|-----------|-------------------|
| `STRUCT s(LONG m.bit[0])` then `v.m.bit := 1` | Single-bit bitfield write via struct access |
| `STRUCT s(LONG m.field[7..4])` then `x := v.m.field` | Multi-bit bitfield read via struct access |
| Chained bitfields on one member (`.a[0].b[1].c[7..2]`) | All three accessible by name |
| Overlapping bitfields (`.a[3..0].b[0]`) | Accepted; both accessible |
| BYTE member with `.bit[7]` | Allowed (at boundary) |
| BYTE member with `.bit[8]` | Error: `Bit number exceeds BYTE/WORD/LONG boundary` |
| WORD member with `.bit[16]` | Error |
| LONG member with `.bit[32]` | Error |
| `.field[3..5]` (lower > upper) | Error: `Lower bit number cannot exceed upper bit number` |
| STRUCT member with `.bit[0]` | Error: `Bitfields are only allowed for BYTE/WORD/LONG members` |
| Nameless single LONG struct: `STRUCT s(LONG.bit[0])` then `v.bit := 1` | Direct bitfield access, no intermediate member name |
| Nameless BYTE/WORD variants | Same behavior |
| Whole-struct assignment on nameless-member struct (`v := 0`) | Works as before |
| Whole-member assignment on named-member struct (`v.m := 0`) then bitfield read | Bitfield read returns expected slice |
| Runtime-variable bitfield index `v.m.[i]` | Still compiles (existing v53 behavior; should not regress) |
| Constant bitfield expression `v.m.[3+1]` | Still compiles |
| SIZEOF on a bitfield-carrying struct | Returns size of the base long, unchanged |
| OFFSETOF of a named bitfield | Not defined for bitfields (compiler's OFFSETOF stops at the member level — verify behavior) |
| Source with `{Spin2_v54}` directive | Compiles (directive now legal; no new gate) |
| Source with `{Spin2_v53}` directive using bitfield syntax | Also compiles (ungated — matches PNut v54) |
