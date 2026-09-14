# Coverage 100% Sprint Plan

**Goal:** Achieve 100% test coverage in 5 target areas

> **Status (closed 2026-09-14):** test files were added for all five areas, mostly
> in commit `d10cd2b` (2025-12-25). **Whether any area reached 100% was never
> measured** — no per-area coverage run followed. Coverage is to be picked up as a
> separate, upcoming effort; see also `Test-Suite-Punch-List.md` §19.
>
> Where the shipped files differ from the plan below:
>
> | Planned | Shipped as |
> |---|---|
> | `pasm_instr_stack` + `pasm_instr_lock` | `pasm_instr_stack_lock.spin2` |
> | `pasm_instr_signed` + `pasm_instr_mux` | `pasm_instr_signed_mux.spin2` |
> | `pasm_instr_rotate` | `pasm_instr_rotate_test.spin2` |
> | `pasm_instr_test` | no dedicated file; `TESTBN`/`CMPR`/`CMPM`/`CMPSUB`/`TESTN` appear in `pasm_encoding_wc`/`wz`/`wcz`/`immediate` and `pasm_instr_rotate_test` |
> | `pasm_encoding_ptr_combo` | no dedicated file; `++PTRx[n]`/`--PTRx[n]` appear in `pasm_encoding_ptr_pre.spin2` |
> | `spin_op_unsigned_cmp` + `spin_op_unsigned_math` + `spin_op_threeway` | `spin_op_unsigned.spin2` (includes `<=>`) |
> | `spin_op_swap` + `spin_op_logical_sym` | `spin_op_swap_logical.spin2` |
**Generated:** December 2025
**Estimated Total Effort:** 78-105 hours

---

## Current State vs Targets

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **PASM2 Instructions** | 205/276 (74%) | 100% | 71 instructions |
| **PASM2 Operand Forms** | 16/31 (52%) | 100% | 15 forms |
| **Spin2 Control Flow** | 17/18 (94%) | 100% | 1 construct |
| **Spin2 Operators** | ~65/74 (~88%) | 100% | ~9 operators |
| **Spin2 Built-in Methods** | ~75/90 (~83%) | 100% | ~15 methods |

---

## Sprint 1: PASM2 Instructions (71 missing → 100%)

**Test Category:** `TEST/ENCODING-tests/`
**Effort:** 35-45 hours
**Files:** 12 new test files

### Missing Instruction Groups

| Group | Instructions | Test File |
|-------|--------------|-----------|
| Jump/Wait | `JATN, JCT1-3, JFBW, JINT, JNATN, JNCT1-3, JNFBW, JNINT, JNPAT, JNQMT, JNSE1-4, JNXFI, JNXMT, JNXRL, JNXRO, JPAT, JQMT, JSE1-4, JXFI, JXMT, JXRL, JXRO` | `pasm_instr_jump.spin2` |
| Wait/Poll Streamer | `WAITATN, WAITFBW, WAITINT, WAITPAT, WAITXFI, WAITXMT, WAITXRL, WAITXRO` | `pasm_instr_wait_poll.spin2` |
| Byte/Nibble/Word | `GETBYTE, GETNIB, GETWORD, SETBYTE, SETNIB, SETWORD, ROLBYTE, ROLNIB, ROLWORD` | `pasm_instr_byte_manip.spin2` |
| Stack | `POP, POPA, POPB, PUSH, PUSHA, PUSHB` | `pasm_instr_stack.spin2` |
| Lock | `LOCKNEW, LOCKREL, LOCKRET, LOCKTRY` | `pasm_instr_lock.spin2` |
| Conditional Math | `ADDSX, ADDX, CMPSX, CMPX, SUBSX, SUBX, SUMC, SUMNC, SUMNZ, SUMZ` | `pasm_instr_cond_math.spin2` |
| Signed Ops | `ADDS, SUBS, CMPS, FGE, FGES, FLE, FLES, MULS` | `pasm_instr_signed.spin2` |
| Rotate/Shift | `RCL, RCR, RCZL, RCZR, SAL` | `pasm_instr_rotate.spin2` |
| Mux | `MUXC, MUXNC, MUXNZ, MUXZ, MUXQ, MUXNIBS, MUXNITS` | `pasm_instr_mux.spin2` |
| Test/Compare | `TESTB, TESTBN, TESTN, CMPM, CMPR, CMPSUB` | `pasm_instr_test.spin2` |
| Misc | `ASMCLK, COGBRK, CRC*, DECMOD, INCMOD, GETXACC, GETSCP, SETSCP, MOVBYTS, SETCFRQ, SETCI, SETCMOD, SETDACS, SETPAT, SETPIV, SPLITB, SPLITW, STALLI, WMLONG, WRC, WRNC, WRNZ, WRZ, XORO32` | `pasm_instr_misc.spin2` |
| Interrupt/Return | `RESI0-3, RETI0-3, RETA, RETB` | `pasm_instr_interrupt.spin2` |

---

## Sprint 2: PASM2 Operand Forms (15 missing → 100%)

**Test Category:** `TEST/ENCODING-tests/`
**Effort:** 15-20 hours
**Files:** 8 new test files

### Missing Operand Forms

| Form | Description | Test File |
|------|-------------|-----------|
| `++PTRA` | Pre-increment | `pasm_encoding_ptr_pre.spin2` |
| `--PTRA` | Pre-decrement | `pasm_encoding_ptr_pre.spin2` |
| `PTRA[S]` | Indexed by register | `pasm_encoding_ptr_indexed.spin2` |
| `++PTRA[n]` | Pre-increment with offset | `pasm_encoding_ptr_combo.spin2` |
| `--PTRA[n]` | Pre-decrement with offset | `pasm_encoding_ptr_combo.spin2` |
| `D\S` | D-field/S-field divide | `pasm_encoding_special.spin2` |
| `#\S` | Immediate/S-field | `pasm_encoding_special.spin2` |
| `D\#n` | D-field/Immediate | `pasm_encoding_special.spin2` |
| Extended relative | Hub-relative jumps | `pasm_encoding_relative.spin2` |
| Register expressions | `D+1, S-4` forms | `pasm_encoding_regexpr.spin2` |
| PA/PB addressing | Call target registers | `pasm_encoding_pa_pb.spin2` |
| REP block forms | Various REP encodings | `pasm_encoding_rep.spin2` |
| AUGS chains | Multiple AUGS | `pasm_encoding_augs_chain.spin2` |

---

## Sprint 3: Spin2 Control Flow (1 missing → 100%)

**Test Category:** `TEST/SPIN-tests/`
**Effort:** 3-5 hours
**Files:** 1-2 new test files

### Missing Control Flow

| Construct | Description | Test File |
|-----------|-------------|-----------|
| `WITH` | `REPEAT n WITH i` form | `spin_control_with.spin2` |

**Example Test:**
```spin2
' spin_control_with.spin2 - Tests REPEAT WITH construct
PUB main() | i, sum
  sum := 0
  REPEAT 10 WITH i
    sum += i          ' i gets 0..9
```

---

## Sprint 4: Spin2 Operators (~9 missing → 100%)

**Test Category:** `TEST/SPIN-tests/`
**Effort:** 10-15 hours
**Files:** 6 new test files

### Missing Operators

| Category | Operators | Test File |
|----------|-----------|-----------|
| Unsigned comparisons | `+<`, `+<=`, `+>`, `+>=` | `spin_op_unsigned_cmp.spin2` |
| Three-way compare | `<=>` | `spin_op_threeway.spin2` |
| Unsigned div/mod | `+/`, `+//` | `spin_op_unsigned_math.spin2` |
| Swap operator | `:=:` | `spin_op_swap.spin2` |
| Logical (symbol form) | `&&`, `\|\|`, `^^`, `!!` | `spin_op_logical_sym.spin2` |
| Float comparisons | `<.`, `<=.`, `>.`, `>=.`, `==.`, `<>.` | `spin_op_float_cmp.spin2` |

---

## Sprint 5: Spin2 Built-in Methods (~15 missing → 100%)

**Test Category:** `TEST/SPIN-tests/` and `TEST/LANG-VER-tests/`
**Effort:** 15-20 hours
**Files:** 5 new test files

### Missing Methods

| Category | Methods | Added In | Test File |
|----------|---------|----------|-----------|
| Data Manipulation | `BYTECOMP`, `BYTESWAP`, `WORDCOMP`, `WORDSWAP`, `LONGCOMP`, `LONGSWAP` | v44 | `spin_builtin_swap.spin2` |
| Task Management | `TASKID`, `TASKNEXT`, `TASKCHK`, `TASKHALT`, `TASKCONT`, `TASKSTOP` | v47 | `spin_builtin_task.spin2` |
| Math (v51) | `POW`, `LOG2`, `EXP2`, `LOG10`, `EXP10`, `LOG`, `EXP` | v51 | `spin_builtin_math_v51.spin2` |
| Register Access | `GETREGS`, `SETREGS` | Various | `spin_builtin_regs.spin2` |
| CORDIC | `POLXY`, `XYPOL`, `ROTXY` | Various | `spin_builtin_cordic.spin2` |

---

## File Organization

```
TEST/
├── ENCODING-tests/           # PASM2 instruction encoding
│   ├── pasm_instr_jump.spin2         # Sprint 1
│   ├── pasm_instr_wait_poll.spin2    # Sprint 1
│   ├── pasm_instr_byte_manip.spin2   # Sprint 1
│   ├── pasm_instr_stack.spin2        # Sprint 1
│   ├── pasm_instr_lock.spin2         # Sprint 1
│   ├── pasm_instr_cond_math.spin2    # Sprint 1
│   ├── pasm_instr_signed.spin2       # Sprint 1
│   ├── pasm_instr_rotate.spin2       # Sprint 1
│   ├── pasm_instr_mux.spin2          # Sprint 1
│   ├── pasm_instr_test.spin2         # Sprint 1
│   ├── pasm_instr_misc.spin2         # Sprint 1
│   ├── pasm_instr_interrupt.spin2    # Sprint 1
│   ├── pasm_encoding_ptr_pre.spin2   # Sprint 2
│   ├── pasm_encoding_ptr_combo.spin2 # Sprint 2
│   ├── pasm_encoding_special.spin2   # Sprint 2
│   ├── pasm_encoding_relative.spin2  # Sprint 2
│   ├── pasm_encoding_regexpr.spin2   # Sprint 2
│   ├── pasm_encoding_pa_pb.spin2     # Sprint 2
│   ├── pasm_encoding_rep.spin2       # Sprint 2
│   └── pasm_encoding_augs_chain.spin2# Sprint 2
│
├── SPIN-tests/               # Spin2 language features
│   ├── spin_control_with.spin2       # Sprint 3
│   ├── spin_op_unsigned_cmp.spin2    # Sprint 4
│   ├── spin_op_threeway.spin2        # Sprint 4
│   ├── spin_op_unsigned_math.spin2   # Sprint 4
│   ├── spin_op_swap.spin2            # Sprint 4
│   ├── spin_op_logical_sym.spin2     # Sprint 4
│   ├── spin_op_float_cmp.spin2       # Sprint 4
│   ├── spin_builtin_swap.spin2       # Sprint 5
│   ├── spin_builtin_task.spin2       # Sprint 5
│   ├── spin_builtin_cordic.spin2     # Sprint 5
│   └── spin_builtin_regs.spin2       # Sprint 5
│
└── LANG-VER-tests/           # Version-specific features
    └── spin_builtin_math_v51.spin2   # Sprint 5 (v51 math)
```

---

## Execution Workflow

For each test file:

1. **Create** the `.spin2` test file with targeted feature tests
2. **Compile** with original PNut to generate `.GOLD` reference files:
   ```bash
   pnut filename.spin2 -l -o
   mv filename.lst filename.lst.GOLD
   mv filename.obj filename.obj.GOLD
   mv filename.bin filename.bin.GOLD
   ```
3. **Verify** PNut-TS produces identical output:
   ```bash
   npm run build && npm run test-encoding  # or appropriate test runner
   ```
4. **Commit** with descriptive message about coverage improvement

---

## Summary

| Sprint | Focus Area | Files | Effort | Coverage Gain |
|--------|------------|-------|--------|---------------|
| 1 | PASM2 Instructions | 12 | 35-45 hrs | 74% → 100% |
| 2 | PASM2 Operand Forms | 8 | 15-20 hrs | 52% → 100% |
| 3 | Spin2 Control Flow | 2 | 3-5 hrs | 94% → 100% |
| 4 | Spin2 Operators | 6 | 10-15 hrs | 88% → 100% |
| 5 | Spin2 Built-in Methods | 5 | 15-20 hrs | 83% → 100% |

**Total: 33 new test files, 78-105 hours effort**

---

## Priority Recommendations

1. **Start with Sprint 3** (Spin2 Control Flow) - Quick win, only 1 missing item
2. **Then Sprint 4** (Spin2 Operators) - Medium effort, high value
3. **Then Sprint 5** (Spin2 Built-in Methods) - Version-specific features
4. **Then Sprint 2** (PASM2 Operand Forms) - Important encoding coverage
5. **Finally Sprint 1** (PASM2 Instructions) - Largest effort, most comprehensive

This order maximizes early wins while building toward comprehensive PASM2 coverage.
