# Test Coverage Improvement Roadmap

## Executive Summary

This roadmap identifies opportunities to improve PNut-TS compiler test coverage based on analysis of both test file coverage (what language features are tested) and code coverage (what compiler code is executed during tests).

**Current Overall Coverage (v1.51.7 - December 2025):**
- Statements: **85.3%** (22,759/26,680)
- Branches: **83.88%** (3,291/3,923)
- Functions: **83.54%** (792/948)
- Lines: **85.3%** (22,759/26,680)

**Note:** Coverage percentages decreased from v1.51.6 due to new code additions (mapGenerator.ts, additional error handling) that haven't yet been fully tested. The absolute number of covered lines increased.

**Key Finding:** While overall coverage is good, there are specific gaps in both test file coverage and code coverage that represent risk areas.

---

## Part 1: Code Coverage Analysis (from Jest/Istanbul)

### Coverage by Class (Sorted by Risk) - Updated December 2025

#### Critical Gaps (< 50% statements or functions)

| File | Statements | Branches | Functions | Risk Assessment |
|------|------------|----------|-----------|-----------------|
| `mapGenerator.ts` | **15.28%** | 66.66% | **8.33%** | **NEW** - Map file generation untested |
| `regression.ts` | 18.38% | 90% | 44.44% | Low risk - test infrastructure only |
| `dumpUtils.ts` | 18.51% | 100% | **0%** | Low risk - debug dump utilities |

#### Function Coverage Concerns (statements ok, functions low)

| File | Statements | Branches | Functions | Concern |
|------|------------|----------|-----------|---------|
| `pnut-ts.ts` | 73.36% | 58.2% | **33.33%** | Entry point - many code paths untested |
| `objInstanceInfo.ts` | 74.52% | 100% | **33.33%** | Object instance tracking |
| `objectSymbolStore.ts` | 88.05% | 100% | **42.85%** | Symbol storage functions unused |
| `textLine.ts` | 90% | 100% | **44.44%** | Text line helper functions |
| `parseUtils.ts` | 95.57% | 94.11% | **59.09%** | Many helper functions unused |

#### Moderate Gaps (60-80% coverage)

| File | Statements | Branches | Functions | Risk Assessment |
|------|------------|----------|-----------|-----------------|
| `files.ts` | 67.81% | **40.62%** | 75% | File location edge cases |
| `debugData.ts` | 76.15% | 88% | 62.5% | Debug output generation |
| `childObjectsImage.ts` | 77% | 77.35% | 86.66% | Child object handling |

#### Branch Coverage Concerns (statements ok, branches low)

| File | Statements | Branches | Functions | Concern |
|------|------------|----------|-----------|---------|
| `pnut-ts.ts` | 73.36% | **58.2%** | 33.33% | Command-line option paths |
| `compiler.ts` | 84.89% | **69.49%** | 81.81% | Edge cases in compilation flow |
| `blockStack.ts` | 88.23% | **70.37%** | 90.47% | Stack edge cases |
| `spin2Parser.ts` | 84.47% | **76.55%** | 90% | Parser branch conditions |
| `objectStructures.ts` | 82.87% | **77.5%** | 78.12% | Structure handling paths |

#### Well-Covered Classes (> 85%)

| File | Statements | Notes |
|------|------------|-------|
| `types.ts` | **100%** | Perfect coverage |
| `objectDistiller.ts` | **95.93%** | Excellent - object deduplication |
| `parseUtils.ts` | 95.57% | Core parsing utilities (but 59% functions) |
| `objectSymbols.ts` | 95.38% | Symbol management |
| `symbolTable.ts` | 94.11% | Symbol table |
| `externalFiles.ts` | 94.61% | External file handling |
| `numberStack.ts` | 94.44% | Numeric operations |
| `spinResolver.ts` | **90.27%** | **Core compiler - well tested!** |
| `spinElement.ts` | 90.72% | Element handling |
| `distillerList.ts` | **81.54%** | ✅ Improved from 56.14% in v1.51.6 |

---

## Part 2: Test File Coverage Analysis

### Test Infrastructure Summary

| Metric | Value |
|--------|-------|
| Total .spin2 test files | 351 |
| Total .GOLD reference files | 959 |
| Test categories | 18 |
| PASM2 instructions in database | 359 |

### Test Category Status

| Category | Files | Status | Notes |
|----------|-------|--------|-------|
| DBG-tests | 27 | Comprehensive | Debug features well tested |
| OBJ-tests | 27 | Comprehensive | Object hierarchy well tested |
| **ENCODING-tests** | **29** | **Comprehensive** | ✅ PASM2 encoding coverage (was 15) |
| COV-tests | 24 | Good | Coverage-specific tests |
| **SPIN-tests** | **15** | **Improved** | ✅ Core Spin features (was 6) |
| LANG-VER-tests | 15 | Good | ✅ Language version features (was 13) |
| PREPROC-tests | 10 | Good | Preprocessor directives |
| DAT-PASM-tests | 9 | Basic only | ~17% instruction coverage |
| CON-tests | 9 | Good | Constants and expressions |
| EXCEPT-tests | 6 active | **11 on HOLD** | Error handling gaps |
| EXT-tests | 5 | Limited | External file tests |
| LOADER-tests | 4 | Minimal | Loader integration |
| **VAR-tests** | **2** | **CRITICAL GAP** | Variable declarations |
| LARGE-tests | exists | Not systematically run | Timeout issues |
| ALLCODE-tests | 0 | Empty | Infrastructure only |

### Test Infrastructure Improvements (v1.51.7)

#### 1 ULP Filter for Floating-Point Tolerance

Added a **1 ULP (Unit in Last Place) filter** to `testUtils.ts` that handles floating-point differences between PNut-TS and the reference PNut compiler:

- **Problem:** Floating-point values can differ by 1 ULP between compilers (e.g., 100.0 vs 99.99999237)
- **Cascade Effect:** 1 ULP byte differences affect checksums by a predictable amount
- **Solution:** The filter identifies 1 ULP differences and allows the corresponding checksum delta

This allows tests with floating-point operations to pass without requiring exact byte-matching, while still catching real bugs (differences > 1 ULP fail).

#### Debug/Non-Debug Test Separation

Updated `pnut-ts-langVer.test.ts` to automatically detect whether a test file contains `debug()` statements:
- Files with `debug()` → compiled with `-d` flag
- Files without `debug()` → compiled without `-d` flag

This allows the LANG-VER test suite to contain both types of tests.

---

## Part 3: Prioritized Improvement Opportunities

### CRITICAL Priority (Immediate Action)

#### 1. Symbol Name Length Validation
- **Status:** ✅ **COMPLETED in v1.51.7**
- **Risk:** Code compiles in PNut-TS but fails in original PNut
- **Fix:** Added 30-char limit validation with exception reporting
- **Test file:** `TEST/CON-tests/symbol_length_test.spin2`
- **Effort:** 2-4 hours
- **Code impact:** `spinElementizer.ts` (currently 89.29% coverage)

#### 2. VAR Section Tests
- **Current:** Only 2 test files
- **Risk:** Variable declarations used in EVERY Spin2 program
- **Missing coverage:**
  - BYTE/WORD/LONG arrays
  - Multi-dimensional arrays
  - Structures in VAR section
  - Variable memory alignment
- **Effort:** 8-12 hours to add 15-20 test files
- **Code impact:** Would improve `spinResolver.ts` branch coverage

#### 3. Exception Tests on HOLD
- **Status:** 11 tests disabled in `EXCEPT-tests/HOLD/`
  - `exception_test_001` through `007`
  - `debug_exception_test_004`, `005`
  - Tests with child objects (`002`, `003`)
- **Risk:** Error handling paths untested
- **Effort:** 4-8 hours to review and enable
- **Code impact:** Would improve branch coverage in multiple files

#### 4. distillerList.ts Coverage
- **Status:** ✅ **COMPLETED in v1.51.7**
- **Previous:** 56.14% statements, 13.33% functions
- **Fix:** Added distiller-focused tests to improve coverage
- **Effort:** 4-6 hours
- **Impact:** Critical for multi-object compilation correctness

---

### HIGH Priority (Before Major Changes)

#### 5. PASM2 Instruction Coverage
- **Status:** ✅ **COMPLETED in v1.51.7**
- **Test files created:** 8 files in `TEST/ENCODING-tests/`
  - `pasm_instr_alt.spin2` - ALT* family (11 instructions)
  - `pasm_instr_counter.spin2` - Counter operations (GETCT, ADDCT1/2/3, POLLCT1/2/3, WAITCT1/2/3)
  - `pasm_instr_cordic.spin2` - CORDIC operations (QMUL, QDIV, QFRAC, QSQRT, QROTATE, QVECTOR, QLOG, QEXP, GETQX, GETQY)
  - `pasm_instr_pixel.spin2` - Pixel operations (ADDPIX, MULPIX, BLNPIX, MIXPIX, SETPIX, MOVBYTS, MERGEB, SPLITB, MERGEW, SPLITW, SEUSSF, SEUSSR, RGBSQZ, RGBEXP)
  - `pasm_instr_lut.spin2` - LUT operations (WRLUT, RDLUT, SETLUTS)
  - `pasm_instr_event.spin2` - Event/polling operations (POLL*/WAIT*, ALLOWI, STALLI, TRGINT1/2/3, NIXINT1/2/3, SETINT1/2/3, SETQ, SETQ2)
  - `pasm_instr_pin.spin2` - Smart pin operations (WRPIN, WXPIN, WYPIN, RDPIN, RQPIN, AKPIN, FLT*, DRV*, OUT*, DIR*, TESTP, TESTPN)
  - `pasm_instr_streamer.spin2` - Streamer operations (XINIT, XZERO, XCONT, XSTOP, SETXFRQ, RDFAST, WRFAST, FBLOCK, RF*, WF*, GETPTR, GETBRK, BRK)
- **Test runner:** `npm run test-encoding`

#### 6. PASM2 Instruction Encoding Coverage
- **Status:** ✅ **COMPLETED in v1.51.7**
- **Test files created:** 7 files in `TEST/ENCODING-tests/`
- **Test runner:** `npm run test-encoding`

**Key Insight:** Instruction mnemonic coverage ≠ encoding coverage. Each PASM instruction can have multiple operand forms, and each form produces a different binary encoding. Testing one form per instruction leaves other encodings untested.

**Encoding Dimensions:**

| Dimension | Variants | Example |
|-----------|----------|---------|
| Operand Type | Register vs Immediate | `MOV D,S` vs `MOV D,#imm` |
| Flag Effects | None, WC, WZ, WCZ | `ADD D,S` vs `ADD D,S WCZ` |
| Address Mode | Direct, PTRx, ++/-- | `RDLONG D,S` vs `RDLONG D,PTRA++` |
| Operand Count | 0, 1, 2 operands | `NOP` vs `NOT D` vs `ADD D,S` |
| Branch/Call | Relative, Absolute | `JMP #addr` vs `JMP D` |

**Example: MOV Instruction Encodings**

```
MOV D, S        ; Register-to-register (D field, S field, no immediate)
MOV D, #imm     ; Immediate-to-register (I bit set, S field = 9-bit immediate)
MOV D, S WC     ; With carry effect (C bit set)
MOV D, S WZ     ; With zero effect (Z bit set)
MOV D, S WCZ    ; With both effects (C and Z bits set)
```

Each of these is a different encoding even though they're all "MOV". The compiler must correctly:
1. Select the right opcode format
2. Set the I (immediate) bit correctly
3. Encode the S field as register or immediate
4. Set WC/WZ/WCZ effect bits
5. Handle special cases (PTRx addressing, modifiers)

**Coverage Gap Analysis:**

| Encoding Type | Estimated Forms | Likely Tested | Gap |
|---------------|-----------------|---------------|-----|
| Register-Register | ~300 | ~50 | 250 |
| Register-Immediate | ~250 | ~30 | 220 |
| With WC only | ~200 | ~10 | 190 |
| With WZ only | ~200 | ~10 | 190 |
| With WCZ | ~200 | ~5 | 195 |
| PTRx addressing | ~40 | ~5 | 35 |
| Branch variants | ~30 | ~10 | 20 |

**Testing Strategy:** ✅ IMPLEMENTED

1. **Systematic Encoding Test Files**: Created in `TEST/ENCODING-tests/`
   - ✅ `pasm_encoding_immediate.spin2` - Register vs #immediate forms (~60 instructions)
   - ✅ `pasm_encoding_wc.spin2` - WC effect variants
   - ✅ `pasm_encoding_wz.spin2` - WZ effect variants (including WZ-only: MUL, MULS, SCA, SCAS)
   - ✅ `pasm_encoding_wcz.spin2` - WCZ combined effects + 40 WCZ-only instructions (BIT*, DIR*, DRV*, FLT*, OUT*)
   - ✅ `pasm_encoding_ptr.spin2` - PTRx addressing modes (PTRA/PTRB with ++/--, indexing)
   - ✅ `pasm_encoding_branch.spin2` - Jump/call variants (JMP, CALL, CALLA, CALLB, CALLD, DJ*, TJ*, REP, LOC, SKIP, MODCZ)
   - ✅ `pasm_encoding_conditional.spin2` - All 16 IF_* condition prefixes

2. **Golden File Validation**: Each test has `.lst.GOLD`, `.obj.GOLD`, and `.bin.GOLD`

3. **Binary Comparison**: Jest test runner validates all outputs match GOLD files

**Priority Encodings to Test:**

| Priority | Encoding Type | Reason |
|----------|---------------|--------|
| CRITICAL | Immediate forms (#) | Different bit layout than register forms |
| CRITICAL | WC/WZ/WCZ combinations | Flag bits affect execution |
| HIGH | PTRx with ++/-- | Complex address calculation |
| HIGH | Conditional execution (IF_*) | Condition encoding in instruction |
| MEDIUM | AUGS/AUGD prefixes | 32-bit immediate handling |
| MEDIUM | REP/REPS loops | Special encoding requirements |

**Effort Estimate:** 30-40 hours for systematic encoding coverage → ✅ COMPLETED
**Impact:** Catches encoding bugs that mnemonic-only testing misses

---

#### 7. Spin2 Structure & Pointer Feature Coverage (NEW)

**Key Insight:** Structures in Spin2 have multiple usage contexts and variant forms. Each context may exercise different code paths in the compiler.

**Structure Usage Contexts:**

| Context | Description | Example |
|---------|-------------|---------|
| CON declaration | Define structure type | `MYSTRUCT: LONG x, WORD y, BYTE z` |
| DAT initialization | Initialize structure data | `mydata MYSTRUCT (1, 2, 3)` |
| VAR usage | Variable of structure type | `MYSTRUCT instance` |
| Parameter passing | Structures as parameters | `PUB foo(s MYSTRUCT)` |
| Return values | Structures as return type | Complex scenarios |
| **Child object export** | Struct defined in child, used in parent | `child.MYSTRUCT instance` |

**Variant Forms to Test:**

| Feature | Variants | Risk if Untested |
|---------|----------|------------------|
| **Basic structures** | Simple, nested, with padding | Layout/alignment bugs |
| **Arrays in structures** | BYTE[], WORD[], LONG[] members | Offset calculation errors |
| **Arrays of structures** | `MYSTRUCT[10]` | Stride calculation bugs |
| **Pointer types** | `@structure`, `^LONG`, pointer arithmetic | Address computation errors |
| **SIZEOF operator** | `SIZEOF(MYSTRUCT)`, `SIZEOF(array)` | Size calculation bugs |
| **FIELD operation** | Field access, nested fields | Offset/mask errors |
| **Structure alignment** | ALIGNW, ALIGNL within structures | Padding bugs |
| **Exported structures** | Struct in child obj, allocated/used in parent | Cross-object symbol resolution bugs |

**Testing Strategy:**

1. **Context-based test files:**
   - `struct_con_declaration.spin2` - All declaration variants
   - `struct_dat_init.spin2` - Initialization forms
   - `struct_var_usage.spin2` - Variable declarations
   - `struct_arrays.spin2` - Arrays within and of structures
   - `struct_pointers.spin2` - Pointer operations on structures
   - `struct_sizeof.spin2` - Size calculations
   - `struct_field.spin2` - FIELD operator usage
   - `struct_exported.spin2` + `struct_exported_child.spin2` - Structures exported from child objects

2. **Validation approach:**
   - Compare `.obj.GOLD` for byte-accurate layout
   - Compare `.lst.GOLD` for correct offsets in listings
   - Runtime tests where practical

**Priority:**

| Priority | Feature | Reason |
|----------|---------|--------|
| CRITICAL | Basic structure layout | Foundation for all struct usage |
| CRITICAL | SIZEOF operator | Used in memory allocation |
| HIGH | Arrays of structures | Complex stride calculations |
| HIGH | Pointer operations | Address arithmetic correctness |
| HIGH | **Exported structures** | Cross-object symbol resolution |
| MEDIUM | Nested structures | Layout complexity |
| MEDIUM | FIELD operator | Bit-field operations |

**Effort Estimate:** 25-35 hours for comprehensive structure coverage
**Impact:** Ensures complex data structures compile correctly

---

#### 8. Compiler Built-in Constants Coverage
- **Status:** ✅ **COMPLETED in v1.51.7**
- **Test files created:** 6 files in `TEST/CON-tests/`
  - `const_smartpin.spin2` - 87 SmartPin P_* constants (drive modes, input selection, logic ops, ADC/DAC, serial modes)
  - `const_streamer.spin2` - 65 Streamer X_* constants (LUT modes, DAC outputs, RFBYTE/RFWORD/RFLONG, color modes, DDS)
  - `const_clock.spin2` - Clock configuration constants (CLK_*, PLL multipliers)
  - `const_event.spin2` - Event constants (EVENT_*, COGEXEC, HUBEXEC, NEWCOG, INT_OFF)
  - `const_modcz.spin2` - 16 MODCZ operator constants (_CLR, _SET, _C, _Z, _NC_AND_NZ, etc.)
  - `const_debug.spin2` - Debug display constants (DEBUG_*)
- **Test runner:** `npm run test-con`
- **Validation approach:** Each constant assigned to DAT location, binary comparison validates values match PNut reference

---

#### 9. Language Feature Release Audit (NEW)

**Key Insight:** The Spin2 language has evolved through multiple compiler releases. Each release adds new features that should have comprehensive test coverage. Auditing the Spin2 language reference (v51a) identifies when features were released and their current test coverage status.

**Purpose:**
- Establish feature-to-release mapping for documentation
- Identify gaps where features were added but not fully tested
- Create a practice of adding comprehensive tests with each new feature

**Approach:**

1. **Extract feature release history from Spin2_Language_v51a.pdf**
   - Document which version added each feature
   - Note syntax variants and edge cases for each

2. **Map to existing test coverage**
   - Cross-reference features with existing test files
   - Identify coverage gaps per feature

3. **Prioritize by release recency**
   - Newer features are more likely to have gaps
   - Older features have had more time for organic test coverage

**Feature Categories to Audit:**

| Category | Examples | Release Pattern |
|----------|----------|-----------------|
| Operators | REV, ZEROX, SIGNX, ENCOD, DECOD | Various releases |
| Statements | CASE_FAST, DEBUG, SEND | Feature additions |
| Built-ins | GETREGS/SETREGS, POLXY/XYPOL | Math extensions |
| Preprocessor | #include, #define, #ifdef | Preprocessor evolution |
| Object system | OBJ arrays, method pointers | Object enhancements |
| Debug features | DEBUG(), DEBUG_* modes | Debug evolution |

**Deliverables:**

1. **Feature Release Matrix** - Table mapping features to compiler versions
2. **Coverage Gap Report** - Features with incomplete test coverage
3. **Test Backlog** - Prioritized list of tests to add per feature

**Effort Estimate:** 10-15 hours for audit, then ongoing as features are added
**Impact:** Ensures systematic test coverage for language evolution

---

#### 10. compiler.ts Branch Coverage
- **Current:** 60.71% branch coverage (87.2% statements)
- **Risk:** Edge cases in compilation flow untested
- **Specific gaps:** Multi-pass compilation paths, error recovery
- **Effort:** 6-8 hours

#### 11. Memory Alignment Tests (ALIGNW, ALIGNL)
- **Current:** ~3 scattered references in tests
- **Missing:** Dedicated alignment test suite
- **Risk:** Subtle memory layout bugs
- **Effort:** 4-6 hours

#### 12. spin2Parser.ts Branch Coverage
- **Current:** 76.08% branch coverage
- **Risk:** Parser decision points undertested
- **Note:** This is where `P2List()` listing generation lives
- **Effort:** 4-6 hours

---

### MEDIUM Priority (During Normal Development)

#### 13. Pointer Operations
- **Documentation exists:** `Pointer-Usage-Guide.md`
- **Current:** Indirect coverage only
- **Missing:** Dedicated pointer test suite
- **Effort:** 6-10 hours

#### 14. Flash/Loader Integration
- **Current:** 4 loader tests, 0 dedicated flash tests
- **Missing:** Multi-object flash deployment scenarios
- **Effort:** 4-6 hours

#### 15. Advanced Operators (FIELD, BYTEFIT, WORDFIT)
- **Current:** FIELD in coverage_001.spin2 only
- **Documentation exists:** Usage guides present
- **Note:** FIELD also addressed in section 7 (Structure Coverage)
- **Effort:** 4-6 hours

#### 16. Complex Inline PASM
- **Documentation exists:** `Inline-PASM-Usage-Guide.md`
- **Current:** 6 files with inline PASM
- **Missing:** Complex Spin/PASM mixing scenarios
- **Effort:** 6-8 hours

---

### LOW Priority (Nice to Have)

#### 17. DITTO Directive
- **Documentation exists:** `DITTO-Usage-Guide.md`
- **Current:** 0 dedicated tests
- **Effort:** 2-3 hours

#### 18. WC/WZ/WCZ Effect Coverage
- **Note:** Now addressed in section 6 (Encoding Coverage)
- **Status:** Folded into systematic encoding tests
- **See:** Section 6 for WC/WZ/WCZ testing strategy

#### 19. RES/FIT/END Directive Edge Cases
- **Current:** Used throughout but no edge case tests
- **Missing:** Boundary condition tests
- **Effort:** 4-6 hours

---

## Part 4: Quick Wins (High Impact, Low Effort)

| Item | Effort | Impact | Files Affected | Status |
|------|--------|--------|----------------|--------|
| Fix symbol length validation | 2-4 hrs | Compatibility | `spinElementizer.ts` | ✅ Done (v1.51.7) |
| Enable HOLD exception tests | 4-8 hrs | Error handling | Multiple | Pending |
| Add distiller tests | 4-6 hrs | Object dedup | `distillerList.ts` | ✅ Done (v1.51.7) |
| Add compiler branch tests | 6-8 hrs | Edge cases | `compiler.ts` | Pending |

**Total Quick Wins Effort:** 16-26 hours (6-10 hrs remaining)
**Expected Coverage Improvement:** +3-5% overall

---

## Part 5: Strategic Test Expansion

### Phase 1: Foundation (20-30 hours)

| Task | Effort | Coverage Target |
|------|--------|-----------------|
| Symbol length validation | 2-4 hrs | Compatibility |
| VAR-tests expansion | 8-12 hrs | Variable handling |
| Enable exception tests | 4-8 hrs | Error paths |
| Distiller tests | 4-6 hrs | Object dedup |

### Phase 2: Instruction & Encoding Coverage (50-70 hours)

| Task | Effort | Coverage Target | Status |
|------|--------|-----------------|--------|
| **Encoding Coverage** | | | |
| Immediate (#) form tests | 8-10 hrs | All #immediate encodings | ✅ Done |
| WC/WZ/WCZ effect tests | 6-8 hrs | Flag effect variants | ✅ Done |
| PTRx addressing tests | 4-6 hrs | Pointer mode encodings | ✅ Done |
| Conditional (IF_*) tests | 4-6 hrs | Condition field encodings | ✅ Done |
| Branch/call variant tests | 4-6 hrs | Jump/call encodings | ✅ Done |
| AUGS/AUGD prefix tests | 4-6 hrs | 32-bit immediate handling | ✅ Done |
| **Mnemonic Coverage** | | | |
| ALT* family tests | 6-8 hrs | 12 instructions | ✅ Done |
| Counter operation tests | 4-6 hrs | ADDCT1-3 | ✅ Done |
| Pattern operation tests | 4-6 hrs | BMASK, BLNPIX, etc. | ✅ Done |
| Specialized instruction tests | 6-10 hrs | Remaining gaps | ✅ Done |

### Phase 3: Edge Cases (15-20 hours)

| Task | Effort | Coverage Target |
|------|--------|-----------------|
| Compiler branch coverage | 6-8 hrs | `compiler.ts` → 80%+ |
| Parser branch coverage | 4-6 hrs | `spin2Parser.ts` → 85%+ |
| Memory alignment tests | 4-6 hrs | ALIGNW/ALIGNL |

**Total Strategic Effort:** 85-120 hours
**Expected Final Coverage:** 92-95%
**Note:** Phase 2 expanded to include systematic encoding coverage

---

## Part 5B: Optimized Execution Order (Maximum Coverage, Minimum Time)

This section provides a wave-based approach to achieve the broadest coverage in the shortest time.

### Wave 1: Instant Payoff (4-8 hours) → +11 tests immediately

| Task | Effort | Payoff |
|------|--------|--------|
| **Enable HOLD exception tests** | 4-8 hrs | 11+ existing tests restored to active |

**Rationale:** These tests already exist with GOLD files. Review and enable them. Zero test creation work, maximum immediate coverage gain.

### Wave 2: Simple Pattern, High Breadth → ✅ COMPLETED (v1.51.7)

| Task | Effort | Payoff | Status |
|------|--------|--------|--------|
| **Built-in Constants Coverage** | 15-20 hrs | All Streamer, SmartPin, MODCZ, Clock, etc. | ✅ Done |

**Result:** 6 test files created in `TEST/CON-tests/`, all passing. Run with `npm run test-con`.

### Wave 3: Foundation Gaps (12-18 hours) → Core language constructs

| Task | Effort | Payoff |
|------|--------|--------|
| **VAR Section Tests** | 8-12 hrs | Variable declarations (used everywhere) |
| **Memory Alignment** | 4-6 hrs | ALIGNW/ALIGNL edge cases |

**Rationale:** VAR sections appear in virtually every Spin2 program. Fixing this gap catches bugs users will hit.

### Wave 4: Systematic Discovery (10-15 hours) → Identifies all remaining gaps

| Task | Effort | Payoff |
|------|--------|--------|
| **Language Feature Audit** | 10-15 hrs | Feature-to-release mapping, gap report |

**Rationale:** This produces a prioritized backlog for everything else. Spend time here to avoid wasted effort on already-covered features.

### Wave 5: Targeted Encoding → ✅ COMPLETED (v1.51.7)

| Task | Effort | Payoff | Status |
|------|--------|--------|--------|
| **Immediate (#) form tests** | 8-10 hrs | All #immediate encodings | ✅ Done |
| **WC/WZ/WCZ effect tests** | 6-8 hrs | Flag effect variants | ✅ Done |
| **PTRx addressing tests** | 4-6 hrs | Pointer mode encodings | ✅ Done |
| **Conditional (IF_*) tests** | 4-6 hrs | Condition field encodings | ✅ Done |
| **Branch/call variants** | 4-6 hrs | Jump/call encodings | ✅ Done |

**Result:** 7 test files created in `TEST/ENCODING-tests/`, all passing. Run with `npm run test-encoding`.

### Wave Summary

| Wave | Effort | Cumulative | Coverage Gain | Status |
|------|--------|------------|---------------|--------|
| 1. Enable HOLD tests | 4-8 hrs | 4-8 hrs | +11 tests | Pending |
| 2. Built-in constants | 15-20 hrs | 19-28 hrs | +250 constants | ✅ Done |
| 3. VAR + Alignment | 12-18 hrs | 31-46 hrs | Core language | Pending |
| 4. Feature audit | 10-15 hrs | 41-61 hrs | Gap discovery | Pending |
| 5. Encoding coverage | 30-40 hrs | 71-101 hrs | All encoding dims | ✅ Done |
| 5b. Mnemonic coverage | 20-30 hrs | 91-131 hrs | Instruction families | ✅ Done |
| **6. 100% Coverage Audit** | 15-25 hrs | 106-156 hrs | Verify & fill gaps | **Pending** |

**After these 5 waves:** Critical gaps addressed, systematic backlog for remaining work (structures, mnemonic coverage, etc.).

### Wave 6: 100% Coverage Audit (PENDING)

**Key Insight:** The v1.51.7 sprint created test files organized by *category* (instruction families, operator types, built-in method groups), but did NOT systematically verify every item against a complete reference list. The coverage percentages (80%, 90%, 95%) are estimates, not verified counts.

**What's Missing:**

| Category | Current Estimate | Gap |
|----------|------------------|-----|
| PASM2 Instructions | ~80% (220/276) | Need to identify missing ~56 instructions |
| PASM2 Operand Forms | ~90% (28/31) | Need to identify missing ~3 forms |
| Spin2 Operators | ~95% (~70/74) | Need to identify missing ~4 operators |
| Spin2 Built-in Methods | ~89% (~80/90) | Need to identify missing ~10 methods |

**Required Work:**

1. **Extract complete reference lists** from Spin2_Language_v51a.pdf:
   - All 276 PASM2 instruction mnemonics
   - All 31 operand forms
   - All 74 Spin2 operators
   - All 90 built-in methods

2. **Create verification checklists** mapping each item to test file(s) that cover it

3. **Identify gaps** - items with no test coverage

4. **Create targeted test files** to fill each gap

5. **Update coverage report** with verified 100% counts

**Effort:** 15-25 hours (audit 5-8 hrs, gap-filling 10-17 hrs)
**Impact:** Verified 100% coverage for core language features

---

## Part 6: Coverage Metrics Goals

### Current State (v1.51.7 - December 2025)

| Metric | Current | Goal |
|--------|---------|------|
| Overall Statements | 85.3% | 90%+ |
| Overall Branches | 83.88% | 88%+ |
| Overall Functions | 83.54% | 88%+ |
| `spinResolver.ts` | 90.27% | Maintain |
| `distillerList.ts` | 81.54% ✅ | Achieved! (was 56.14%) |
| `mapGenerator.ts` | 15.28% | 70%+ |
| `pnut-ts.ts` | 73.36% | 80%+ |
| `compiler.ts` branches | 69.49% | 80%+ |
| Test files | 351 | 380+ |

### Success Criteria

- [ ] All HOLD exception tests reviewed and either enabled or documented as intentional
- [ ] VAR-tests expanded to 15+ files
- [x] Symbol name length validation implemented and tested ✅ (v1.51.7)
- [x] `distillerList.ts` coverage improved ✅ (v1.51.7)
- [ ] `compiler.ts` branch coverage > 75%
- [x] At least 50% of PASM2 instructions have dedicated tests ✅ (v1.51.7)
- [x] Immediate (#) encoding forms tested for major instruction families ✅ (v1.51.7)
- [x] WC/WZ/WCZ effect combinations tested systematically ✅ (v1.51.7)
- [x] PTRx addressing modes have dedicated test coverage ✅ (v1.51.7)
- [x] Encoding test files organized by dimension (immediate, effects, addressing) ✅ (v1.51.7)
- [x] Built-in constants (SmartPin, Streamer, Clock, Event, MODCZ, Debug) validated ✅ (v1.51.7)
- [ ] **100% Coverage Audit** - Verify all items against reference lists:
  - [ ] All 276 PASM2 instructions verified with test coverage
  - [ ] All 31 PASM2 operand forms verified with test coverage
  - [ ] All 74 Spin2 operators verified with test coverage
  - [ ] All 90 Spin2 built-in methods verified with test coverage

---

## Appendix: Test File Inventory

### Files in EXCEPT-tests/HOLD/ (Disabled)

```
debug_exception_test_004.spin2
debug_exception_test_005.spin2
exception_test_001.spin2
exception_test_002.spin2 (with child)
exception_test_003.spin2 (with child)
exception_test_007.spin2
```

### VAR-tests (Current - Only 2 Files)

```
var_test.spin2
var_empty_test.spin2
```

### Coverage Test Files (COV-tests - 24 files)

```
coverage_001.spin2 - coverage_004.spin2
coverage_clock_001.spin2 - coverage_clock_014.spin2
coverage_pasmonly_001.spin2
debug_test_002_c1.spin2
... (and more)
```

---

## Part 7: v1.51.8 Coverage Improvement Wishlist

Based on the December 2025 coverage analysis, these are priority items for the next release:

### HIGH Priority - New Feature Coverage

#### 1. Map Generator Testing (`mapGenerator.ts`)
- **Current:** 15.28% statements, 8.33% functions (2/24 functions)
- **Problem:** The new `-m/--map` feature has almost no test coverage
- **Action:** Create dedicated tests exercising map file generation
- **Test files needed:**
  - `map_single_object.spin2` - Simple single-object map
  - `map_multi_object.spin2` - Multi-object hierarchy map
  - `map_with_debug.spin2` - Map with debug sections
- **Effort:** 6-8 hours
- **Impact:** Ensure new feature works correctly before users rely on it

#### 2. Entry Point Coverage (`pnut-ts.ts`)
- **Current:** 73.36% statements, 58.2% branches, 33.33% functions (3/9)
- **Problem:** Many command-line option combinations untested
- **Action:** Create tests that exercise different CLI paths
- **Focus areas:**
  - Flash file generation (-F option)
  - Object-only output (-O option)
  - Quiet/verbose modes (-q/-v)
  - Error handling paths
- **Effort:** 4-6 hours
- **Impact:** Catch CLI bugs before users hit them

### MEDIUM Priority - Function Coverage Gaps

#### 3. Object Symbol Store (`objectSymbolStore.ts`)
- **Current:** 88.05% statements, 42.85% functions (3/7 functions)
- **Problem:** 4 functions never called during tests
- **Action:** Identify which functions are unused and either:
  - Add tests that exercise them, OR
  - Remove dead code if truly unused
- **Effort:** 2-3 hours

#### 4. Child Objects Image (`childObjectsImage.ts`)
- **Current:** 77% statements, 77.35% branches
- **Problem:** Multi-object scenarios not fully tested
- **Action:** Add tests with deeper object hierarchies
- **Effort:** 4-6 hours

#### 5. Files.ts Branch Coverage
- **Current:** 67.81% statements, 40.62% branches (13/32)
- **Problem:** File location fallback paths untested
- **Action:** Test include path resolution edge cases:
  - Absolute paths
  - Relative paths from different directories
  - Missing file scenarios
  - Library path fallbacks
- **Effort:** 3-4 hours

### LOW Priority - Infrastructure/Debug Code

#### 6. Regression.ts
- **Current:** 18.38% statements
- **Assessment:** This is test infrastructure, not production code
- **Action:** Document as intentionally low coverage (test code testing itself is circular)

#### 7. DumpUtils.ts
- **Current:** 18.51% statements, 0% functions
- **Assessment:** Debug dump utilities, rarely used
- **Action:** Either remove if unused, or document as debug-only code

### Coverage Improvement Goals for v1.51.8

| Metric | Current (v1.51.7) | Target (v1.51.8) |
|--------|-------------------|------------------|
| Overall Statements | 85.3% | 87%+ |
| Overall Branches | 83.88% | 85%+ |
| Overall Functions | 83.54% | 86%+ |
| `mapGenerator.ts` | 15.28% | 70%+ |
| `pnut-ts.ts` | 73.36% | 80%+ |
| `files.ts` branches | 40.62% | 65%+ |

### Quick Wins for v1.51.8

| Task | Effort | Impact |
|------|--------|--------|
| Add map generator tests | 6-8 hrs | Major - new feature coverage |
| Add CLI option tests | 4-6 hrs | Medium - entry point coverage |
| Review objectSymbolStore unused functions | 2-3 hrs | Small - code cleanup |
| Add file resolution edge case tests | 3-4 hrs | Medium - files.ts branches |

**Total Quick Wins Effort:** 15-21 hours
**Expected Coverage Improvement:** +2-3% overall, specific files improved significantly

---

## References

- Coverage report: `PROCESS/coverage/Regression-Coverage-Baseline.md` (local to the maintainers)
- Coverage methodology: `Coverage.md`
- Test runner: `npm run coverage`
- PASM2 instruction database: `DOCs/language-specification/databases/PASM2-Instruction-Database.json`
- Technical debt: `TECHNICAL-DEBT.md`
