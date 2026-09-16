# PNut TS Database: Effect Flags - CORRECTED

**Generated:** 2025-12-13
**Corrected:** 2025-12-13
**Re-verified:** 2026-09-16 — see "Re-verification (2026-09-16)" at the end of this document for what was checked and against what.
**Source:** PNut-TS compiler implementation (`spinResolver.ts`, `parseUtils.ts`)

## Status: RESOLVED

The database has been corrected to accurately reflect what the PNut-TS compiler actually supports. Every claim below was re-probed by compiling minimal PASM2 fragments through the current build; the diagnostics quoted are the compiler's exact output.

## Correction Summary

The original analysis compared CSV v35 syntax against the database, but did not account for the compiler's actual implementation. The compiler has specific rules for which effects are valid for each instruction category.

### Key Findings from Compiler Source Code

#### 1. `tryWCZ()` Only Accepts WCZ

```typescript
private tryWCZ() {
  if (this.nextElementType() == eElementType.type_asm_effect && this.nextElementValue() == 0b11) {
    this.getElement();
    this.instructionImage |= 0b11 << 19;
  }
}
```

This function only accepts WCZ (value 0b11), not WC or WZ individually. Probed with `bith $1,#1`: `wcz` compiles clean; `wc` and `wz` each fail with `This effect is not allowed for this instruction` (the fall-through effect-validation check below fires because `tryWCZ()` did not consume the element).

**Affected instructions:** BIT*, DIR*, DRV*, FLT*, OUT* (40 instructions)

#### 2. Effect Validation Logic (`assembleInstructionFromLine`, the `attemptedEffects`/`allowedEffects` check at the end of the operand switch)

```typescript
if ((attemptedEffects & allowedEffects) == 0 || (attemptedEffects == 0b11 && allowedEffects != 0b11)) {
  throw new Error('This effect is not allowed for this instruction');
}
```

- If `allowedEffects = 0b10`: Only WC is valid
- If `allowedEffects = 0b01`: Only WZ is valid
- If `allowedEffects = 0b11`: WC, WZ, and WCZ are all valid

#### 3. `getCorZ()` for Extended Effects

```typescript
if (this.currElement.type == eElementType.type_asm_effect2 ||
    (this.currElement.type == eElementType.type_asm_effect && Number(this.currElement.value) != 0b11)) {
  // ... process effect
} else {
  throw new Error('Expected WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, or XORZ');
}
```

This explicitly rejects WCZ (value 0b11) for TEST* instructions. Probed with `testp $1`: `wc` and `andc` both compile; `wcz` fails with `Expected WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, or XORZ` — the exact text this routine throws.

## Corrected Effect Categories

### WCZ Only (40 instructions)

These instructions use `tryWCZ()` which only accepts WCZ as a unit:

| Category | Instructions |
|----------|--------------|
| BIT* | BITC, BITH, BITL, BITNC, BITNOT, BITNZ, BITRND, BITZ |
| DIR* | DIRC, DIRH, DIRL, DIRNC, DIRNOT, DIRNZ, DIRRND, DIRZ |
| DRV* | DRVC, DRVH, DRVL, DRVNC, DRVNOT, DRVNZ, DRVRND, DRVZ |
| FLT* | FLTC, FLTH, FLTL, FLTNC, FLTNOT, FLTNZ, FLTRND, FLTZ |
| OUT* | OUTC, OUTH, OUTL, OUTNC, OUTNOT, OUTNZ, OUTRND, OUTZ |

**Syntax:** `instruction D,S/# WCZ` — WC or WZ alone is rejected: `This effect is not allowed for this instruction`

### WC Only (9 instructions)

These have `allowedEffects = 0b10` in parseUtils.ts:

| Instruction | Compiler Definition | C Flag Meaning |
|-------------|---------------------|----------------|
| COGID | `setAsmcodeValue(..., 0b10, ...)` | 1 if the checked cog is running |
| COGINIT | `setAsmcodeValue(..., 0b10, ...)` | 1 if no free cog was found (`NEWCOG` launch) |
| GETCT | `setAsmcodeValue(..., 0b10, ...)` | not a flag write: WC selects the upper 32 bits of the 64-bit counter into D (without WC, the lower 32); C is unchanged |
| LOCKNEW | `setAsmcodeValue(..., 0b10, ...)` | 1 if no lock was available to allocate |
| LOCKREL | `setAsmcodeValue(..., 0b10, ...)` | with a register D: 1 if the lock is currently taken (the owner's cog id goes into D) |
| LOCKTRY | `setAsmcodeValue(..., 0b10, ...)` | 1 if the lock was successfully acquired |
| MODC | `setAsmcodeValue(..., 0b10, ...)` | new C = the bit of the 4-bit `cccc` immediate selected by the old {C,Z} pair (a lookup, not a hardware read) |
| RDPIN | `setAsmcodeValue(..., 0b10, ...)` | the addressed smart pin's own C output; its meaning is mode-dependent (e.g. previous pin state for `P_STATE_TICKS`) |
| RQPIN | `setAsmcodeValue(..., 0b10, ...)` | same as RDPIN's C — the smart pin's own C output, mode-dependent |


### WZ Only (5 instructions)

These have `allowedEffects = 0b01` in parseUtils.ts:

| Instruction | Compiler Definition | Z Flag Meaning |
|-------------|---------------------|----------------|
| MODZ | `setAsmcodeValue(..., 0b01, ...)` | new Z = the bit of the 4-bit `zzzz` immediate selected by the old {C,Z} pair (a lookup, not a hardware read — same mechanism as MODC) |
| MUL | `setAsmcodeValue(..., 0b01, ...)` | 1 if D or S is zero |
| MULS | `setAsmcodeValue(..., 0b01, ...)` | 1 if D or S is zero |
| SCA | `setAsmcodeValue(..., 0b01, ...)` | 1 if the product (before scaling) is zero |
| SCAS | `setAsmcodeValue(..., 0b01, ...)` | 1 if the product (before scaling) is zero |


### WC, WZ, WCZ (5 branch instructions in register mode)

These dynamically set `allowedEffects = 0b11` when using register mode:

| Instruction | Mode | Effects Supported |
|-------------|------|-------------------|
| CALL | Register (D) | WC, WZ, WCZ |
| CALLA | Register (D) | WC, WZ, WCZ |
| CALLB | Register (D) | WC, WZ, WCZ |
| CALLD | Register (D,S) | WC, WZ, WCZ |
| JMP | Register (D) | WC, WZ, WCZ |

**Note:** In immediate mode (`CALL #address`), no effects are supported.

### Extended Effects (4 TEST* instructions)

These use `getCorZ()` which supports extended effects but NOT WCZ:

| Instruction | Supported Effects |
|-------------|-------------------|
| TESTP | WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, XORZ |
| TESTPN | WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, XORZ |
| TESTB | WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, XORZ |
| TESTBN | WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, XORZ |

**WCZ is explicitly rejected** for these instructions.

## Database Corrections Applied

The database was corrected using `correct-effects.js` script which:

1. Set BIT*/DIR*/DRV*/FLT*/OUT* to WCZ only
2. Set COGID group to WC only
3. Set MUL group to WZ only
4. Verified CALL/JMP group has WC, WZ, WCZ
5. Set TEST* group to extended effects (no WCZ)

## Verification

The corrections were verified against:
- `src/classes/parseUtils.ts` - instruction definitions with `allowedEffects` field
- `src/classes/spinResolver.ts` - effect handling logic (`tryWCZ()`, `getCorZ()`, validation)

The database now accurately represents what the PNut-TS compiler accepts.

### Re-verification (2026-09-16)

Every category above was re-probed by compiling a minimal PASM2 fragment through the
current build and reading the compiler's exact diagnostic, with both the accepted and
the rejected form probed for each rule:

| Category | Accepted probe | Rejected probe | Rejected diagnostic |
|---|---|---|---|
| WCZ-only (`tryWCZ()`) | `bith $1,#1 wcz` | `bith $1,#1 wc` / `wz` | `This effect is not allowed for this instruction` |
| WC-only | `cogid $1 wc` | `cogid $1 wz` / `wcz` | `This effect is not allowed for this instruction` |
| WZ-only | `mul $1,#2 wz` | `mul $1,#2 wc` / `wcz` | `This effect is not allowed for this instruction` |
| Register-mode branch (WC/WZ/WCZ) | `call $1 wcz` | `call #$1 wcz` / `wc` | `This effect is not allowed for this instruction` |
| Extended effects (`getCorZ()`) | `testp $1 wc` / `testp $1 andc` | `testp $1 wcz` | `Expected WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, or XORZ` |

All five rules hold. The `allowedEffects`/`tryWCZ()`/`getCorZ()` routines named above are current
(checked against `src/classes/parseUtils.ts` and `src/classes/spinResolver.ts` on this
date), so this record remains RESOLVED.

The "C Flag Meaning" and "Z Flag Meaning" columns were checked against the P2 Knowledge
Base instruction entries and, where the Spin2 interpreter uses the instruction with the
effect, against `src/ext/Spin2_interpreter.spin2`: COGID and LOCKTRY (C turned into a
-1/0 result), COGINIT, LOCKNEW, RDPIN and RQPIN (C folded into bit 31 of the result), and
LOCKREL (owner into D, lock status into C, as `LOCKCHK()` uses it). MODC and MODZ write no
hardware flag: the `cccc`/`zzzz` immediate is a 4-bit table indexed by the old {C,Z} pair.
GETCT's `WC` selects the upper half of the 64-bit counter and leaves C unchanged.
