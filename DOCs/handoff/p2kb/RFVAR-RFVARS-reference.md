# RFVAR and RFVARS — reference for the P2KB and Spin2-extension help

**Status:** outstanding — drafted 2026-11-04 for the P2KB maintainer agent.
**Audience:** an agent updating (a) the P2KB entries `p2kbPasm2Rfvar` and
`p2kbPasm2Rfvars`, adding an entry for the `FVAR` / `FVARS` DAT directives, and
(b) the hover / built-in help of the Spin2 VSCode extension.

Every claim below carries its source. Three tiers are used:

| Tier | Source | Used for |
|---|---|---|
| **S** — silicon | Parallax P2 instruction table, as carried by the live P2KB entries (fetched 2026-11-04) | encoding, flags, clocks, the hub-exec restriction |
| **C** — compiler | PNut **v52** source `REF-V52A/p2com.asm` (the Windows reference compiler; the newest compiler source available to us). **Confirmed against PNut v55** (2026-11-04): Windows PNut v55's output for `TEST/DAT-PASM-tests/fvar_fvars_encoding.spin2`, every boundary value of both forms, matches the §2 byte table byte for byte, and PNut v55 rejects `FVARS $1000_0000` with `FVAR/FVARS data is too big` | the `FVAR`/`FVARS` directives, their ranges, the exact byte layout emitted |
| **I** — interpreter | Spin2 interpreter v55 source `src/ext/Spin2_interpreter.spin2` | how the format is consumed in practice |

The byte layout is corroborated by C and I together: PNut's encoder emits it and
the interpreter decodes those same bytes with `RFVAR`/`RFVARS` on every Spin2
method call, branch and variable access.

**Hardware-confirmed 2026-11-04** on a P2. The program was
`DOCs/handoff/p2kb/hw-check/rfvar_hw_check.spin2`, built by PNut-TS with the
1.55.10 FVARS fix and run from RAM. It made 105 checks, each printed on its own
line, and all passed. It also ran 9 negative controls, each a plausible wrong
answer, and the hardware disproved every one. Confirmed on silicon:

- RFVAR's and RFVARS's values and their C and Z flags at every length boundary;
- the GETPTR advance;
- RFVARS sign-extending and RFVAR not sign-extending;
- the 4th byte carrying 8 bits;
- the §8.1 and §8.2 examples, and the §8.3 decoders.

---

## 1. What they are, in one paragraph

`RFVAR D` and `RFVARS D` read one **variable-length integer** — 1, 2, 3 or 4
bytes — from the cog's hub **FIFO** (previously pointed at hub memory with
`RDFAST`) and write the decoded value to register `D`. Small values take one
byte; larger values take more. `RFVAR` decodes an **unsigned** value of up to 29
bits and zero-extends it. `RFVARS` decodes a **signed** value and
sign-extends it. The FIFO pointer advances by exactly the number of bytes the
value occupied, so a stream of mixed-length values can be read back-to-back with
no length bookkeeping. The format exists for compact byte streams: the Spin2
interpreter uses it for every inline operand of its bytecode, and in a DAT
section the `FVAR` / `FVARS` directives emit it.

## 2. The encoding (what the bytes look like)

Bytes are **least-significant group first**. In bytes 1–3, **bit 7 is a
continuation flag**: `1` = another byte follows, `0` = this is the last byte.
Bits 6..0 carry 7 value bits. If a fourth byte is reached, it is **always the
last** and carries **all 8 bits** as value (it has no continuation flag). [C, I]

| Bytes | Byte 1 | Byte 2 | Byte 3 | Byte 4 | Value bits |
|---|---|---|---|---|---|
| 1 | `0vvvvvvv` (bits 6..0) | | | | 7 |
| 2 | `1vvvvvvv` (6..0) | `0vvvvvvv` (13..7) | | | 14 |
| 3 | `1vvvvvvv` (6..0) | `1vvvvvvv` (13..7) | `0vvvvvvv` (20..14) | | 21 |
| 4 | `1vvvvvvv` (6..0) | `1vvvvvvv` (13..7) | `1vvvvvvv` (20..14) | `vvvvvvvv` (28..21) | 29 |

Value ranges per length:

| Bytes | `RFVAR` (unsigned) | `RFVARS` (signed) |
|---|---|---|
| 1 | 0 .. 127 | −64 .. 63 |
| 2 | 128 .. 16_383 | −8_192 .. 8_191 |
| 3 | 16_384 .. 2_097_151 | −1_048_576 .. 1_048_575 |
| 4 | 2_097_152 .. 536_870_911 (`$1FFF_FFFF`) | −268_435_456 .. 268_435_455 (`-$1000_0000` .. `$0FFF_FFFF`) |

**Sign extension (`RFVARS`).** The sign bit is the **top value bit of the last
byte read**: bit 6, 13, 20 or 28 for a 1-, 2-, 3- or 4-byte value. It is copied
into every higher bit of `D`. The bytes are the same for both instructions; only
the extension differs. The same bytes read by `RFVAR` and by `RFVARS` give
different results whenever that top bit is 1: `$40` is 64 to `RFVAR` and −64 to
`RFVARS`.

**Shortest form.** The format does not forbid a longer encoding than needed,
but PNut always emits the shortest one that holds the value, and signed values
are sized by their **signed** range. So +100 needs 2 bytes under `FVARS`
(`$E4 $00`), because the 1-byte signed range ends at 63. [C]

Worked bytes (emitted by the compiler, decoded back, and verified 2026-11-04):

| Source | Bytes (hex, in memory order) |
|---|---|
| `FVAR 127` | `7F` |
| `FVAR 128` | `80 01` |
| `FVAR 300` | `AC 02` |
| `FVAR $1FFF_FFFF` | `FF FF FF FF` |
| `FVARS -1` | `7F` |
| `FVARS 64` | `C0 00` |
| `FVARS 100` | `E4 00` |
| `FVARS -300` | `D4 7D` |
| `FVARS -$1000_0000` | `80 80 80 80` |

## 3. RFVAR

| | |
|---|---|
| Syntax | `RFVAR D {WC/WZ/WCZ}` |
| Encoding | `EEEE 1101011 CZ0 DDDDDDDDD 000010011` [S; the PNut assembler table agrees: `ac_rfvar 000010011b`, `p2com.asm:445`] |
| Operation | Read 1–4 bytes from the FIFO, decode them per §2, zero-extend into `D` |
| Result range | 0 .. `$1FFF_FFFF` |
| C (with `WC`) | cleared to 0. The result never exceeds 29 bits, so its MSB is always 0 [S] |
| Z (with `WZ`) | set if the result is 0 [S] |
| Clocks | 2 [S] |
| Operand | `D` register only. No immediate form [S, C] |

## 4. RFVARS

| | |
|---|---|
| Syntax | `RFVARS D {WC/WZ/WCZ}` |
| Encoding | `EEEE 1101011 CZ0 DDDDDDDDD 000010100` [S; PNut: `ac_rfvars 000010100b`, `p2com.asm:446`] |
| Operation | Read 1–4 bytes from the FIFO, decode them per §2, sign-extend from the top value bit into `D` |
| Result range | −`$1000_0000` .. `$0FFF_FFFF` |
| C (with `WC`) | the MSB of the result, i.e. **C = 1 if the value is negative** [S] |
| Z (with `WZ`) | set if the result is 0 [S] |
| Clocks | 2 [S] |
| Operand | `D` register only |

## 5. Preconditions: the FIFO

Both instructions belong to the **hub FIFO** group (`RDFAST`, `RFBYTE`,
`RFWORD`, `RFLONG`, `RFVAR`, `RFVARS`, `GETPTR`, `FBLOCK`). [S]

1. **Point the FIFO first** with `RDFAST`. Prefer the **waiting form**
   (`RDFAST #0, addr`, where D[31] = 0). It returns only once hub data has begun
   arriving, so the next instruction can read. After the no-wait form
   (D[31] = 1), allow at least 15 clocks before the first read. An earlier read
   returns zeros with no error. The no-wait form also has silicon erratum E7
   (see `p2kbPasm2Rdfast`). [S]
2. **Not usable during hub execution.** In hub-exec the FIFO is busy fetching
   instructions. RF-reads belong to code running from cog or LUT RAM. The P2
   instruction table marks these instructions *FIFO IN USE* for this reason. [S]
3. **Reads are sequential.** Each read consumes its bytes and the FIFO moves
   on. To jump, issue a new `RDFAST`. `GETPTR D` returns the current hub address
   of the FIFO read pointer, which is the address of the next unread byte. [S]
4. **Mixing widths is fine.** `RFBYTE`, `RFWORD`, `RFLONG`, `RFVAR` and `RFVARS`
   all draw from the same byte stream, so a record can be a fixed-width field
   followed by variable-length ones. That is how the Spin2 interpreter reads
   its bytecode (§7). [I]

## 6. Producing the data: the `FVAR` / `FVARS` DAT directives

In a DAT section, `FVAR` and `FVARS` emit a value in exactly the form `RFVAR` and
`RFVARS` read. [C: symbols `p2com.asm:20159-20160`; parsing `p2com.asm:4886-4905`;
encoders `compile_rfvar`/`compile_rfvars`, `p2com.asm:17344-17440`]

```spin2
DAT
table   byte    FVAR 300, FVAR 70_000          ' AC 02  F0 A2 04
deltas  byte    FVARS 1000, FVARS -3, FVARS 0  ' E8 07  7D  00
mixed   byte    1, FVAR 300, 2, FVARS -300, 3  ' 01  AC 02  02  D4 7D  03
```

Rules, all from PNut's source:

- **They are per-item size overrides**, like `BYTE`/`WORD`/`LONG` inside a data
  line. They appear after a `BYTE`, `WORD` or `LONG` and **apply only to the one
  value that follows**. The next comma-separated item reverts to the line's
  declared size, so every variable-length item needs its own `FVAR`/`FVARS`
  (see `mixed` above).
- **The emitted length is 1–4 bytes regardless of the line's `BYTE`/`WORD`/`LONG`.**
  There is no padding or alignment. A label on the line has the line's declared
  type, `byte` in the examples.
- **No `[count]` repeat**: the value is read as a single integer expression.
  Floats are not accepted.
- **Range checks** (error text `FVAR/FVARS data is too big`):
  - `FVAR`: the value's top three bits (31..29) must be 0, giving 0 .. `$1FFF_FFFF`.
  - `FVARS`: the value's top four bits (31..28) must all be equal, giving
    −`$1000_0000` .. `$0FFF_FFFF`.
- **Shortest encoding** is always chosen (§2).

> **Compiler note.** PNut-TS 1.55.9 and earlier rejected every non-negative
> `FVARS` value with the error above. PNut and PNut-TS 1.55.10 onward accept
> them.

## 7. What they are used for

### The canonical user: the Spin2 interpreter [I]

The Spin2 interpreter streams bytecode through the FIFO (`RDFAST #0,pb` restarts
it, `Spin2_interpreter.spin2:845`). Every inline operand whose size varies is
compiled in this format and read with `RFVAR`/`RFVARS`:

| Operand | Instruction | Where |
|---|---|---|
| hub-variable offsets: `byte/word/long[pbase\|vbase\|dbase + offset]` | `RFVAR` | `hub_ap`, line 748 |
| object and method indices for calls | `RFVAR` | `callobj`/`callsub`, lines 703-704 |
| number of local longs on method entry | `RFVAR` | `callgo`, line 714 |
| branch displacement for `jmp`/`jz`/`jnz`/`tjz`/`djnz` | `RFVARS` | `branch`, line 835 |
| cog-register index for `reg[...]` | `RFVARS` | `reg_ap`, line 725 |
| `++`/`--` step size, bitfield spec, stack pops, struct offsets | `RFVAR` | lines 737, 783, 822, 180 |

The effect is density. Most offsets, indices and branch distances are small and
cost one byte, yet a long-range operand still fits in the same instruction with
no separate wide form. The signed form is used where a value can be negative:
backward branches and register indices relative to a base.

### In user code

Use it wherever a table of integers is **mostly small with occasional large
values**, and the code reading it runs in a cog:

- **Delta-encoded tables**: waveforms, motion profiles, timestamps,
  calibration curves. Successive differences are small, so most entries take one
  byte. `RFVARS` handles the negative steps. This is a good fit for
  `FVARS` + `RFVARS`.
- **Run-length and sparse data**: run lengths, gap counts and skip counts in
  compressed fonts, bitmaps or sequencer scripts.
- **Your own bytecode or command streams**: a cog-resident interpreter or
  display-list engine, for opcodes followed by operands of any size, exactly as
  Spin2 does it.
- **Index or offset lists** into larger structures, where most offsets are
  near.

The trade is size for random access. Variable-length entries cannot be indexed
directly, so the table is read sequentially from a known start.

## 8. Examples

All three compile without warnings under PNut-TS (2026-11-04), and all three were
run on a P2 with the results checked (see the hardware note at the top).

### 8.1 Cog PASM: sum a delta-encoded table

```spin2
CON
  _clkfreq = 200_000_000

PUB main()
  coginit(COGEXEC_NEW, @sum_deltas, @deltas)

DAT
deltas          byte    FVARS 1000, FVARS -3, FVARS 250, FVARS -70_000, FVARS 0

DAT             org
sum_deltas      rdfast  #0, ptra                ' FIFO -> table (PTRA = @deltas from COGINIT)
                mov     acc, #0
                mov     n, #5
.loop           rfvars  d                       ' next signed delta, 1..4 bytes
                add     acc, d
                djnz    n, #.loop
                cogid   n
                cogstop n

acc             res     1
n               res     1
d               res     1
```

### 8.2 Inline PASM inside a Spin2 method

```spin2
PUB read_lengths() : first, second | p
  p := @lengths                         ' Spin2 @ gives the absolute hub address
  org
                rdfast  #0, p           ' point FIFO at the table (waiting form)
                rfvar   first           ' 300
                rfvar   second          ' 70_000
  end

DAT
lengths         byte    FVAR 300, FVAR 70_000
```

Take the table's address in Spin2 and pass it in a local, as above. Inside
`org … end`, `##@lengths` assembles to the label's offset within the object,
not its hub address, so `RDFAST` would point at the wrong memory.

Inline `ORG` code may use the FIFO even though the interpreter's own bytecode
stream also runs through it: the interpreter re-issues `RDFAST #0,pb` after the
inline code returns (`Spin2_interpreter.spin2`, `hub_str` path `h` → `resume`,
lines 829-845). **Inline `ORGH` code runs in hub-exec and cannot use
`RFVAR`/`RFVARS`** (§5.2). [I, S]

### 8.3 Decoding in Spin2, without the FIFO

These methods read the same bytes from hub memory. They are useful when the
reader is Spin2, or in host-side tools that need a reference algorithm.

```spin2
PUB decode_fvar(p_bytes) : value | b, shift
'' Decode one FVAR (RFVAR-form) value from hub bytes at p_bytes
  repeat 3
    b := byte[p_bytes++]
    value |= (b & $7F) << shift
    if b & $80 == 0
      return
    shift += 7
  value |= byte[p_bytes] << 21                  ' 4th byte: all 8 bits

PUB decode_fvars(p_bytes) : value | b, shift
'' Decode one FVARS (RFVARS-form) value: same bytes, then sign-extend
  repeat 3
    b := byte[p_bytes++]
    value |= (b & $7F) << shift
    shift += 7
    if b & $80 == 0
      return value signx (shift - 1)            ' sign bit is bit 6, 13 or 20
  value |= byte[p_bytes] << 21
  return value signx 28                         ' sign bit is bit 28
```

## 9. Pitfalls

- **Reading a signed stream with `RFVAR`, or the reverse.** Nothing marks the
  stream as signed or unsigned. Values whose top value bit is 1 decode wrongly,
  with no error. Pair `FVAR` with `RFVAR` and `FVARS` with `RFVARS`.
- **Forgetting the per-item override.** `byte FVAR 300, 400` emits `300` as
  `AC 02`, then `400` as a plain **byte** (`$90`, truncated). Write
  `byte FVAR 300, FVAR 400`.
- **Expecting alignment.** An `FVAR` item in a `long` line still emits 1–4 bytes.
  Following longs are not realigned.
- **Hub-exec.** No FIFO reads from code running in hub (§5.2).
- **No-wait `RDFAST` followed too soon by a read.** The read returns zeros
  silently (§5.1).
- **Values above 29 bits.** These cannot be represented. The directives reject
  them at compile time. A hand-built stream cannot express them.

## 10. What to change in P2KB

1. **`p2kbPasm2Rfvar` and `p2kbPasm2Rfvars`**: the current entries are correct
   in encoding, flags and clocks (checked against the PNut assembler table), but
   they never describe the **format**. Add §2 (byte layout, both range tables,
   the sign-extension point and the shortest-form rule). Also add the
   preconditions from §5, a link to the new directive entry, and §8.1 as the
   example. Add the interpreter usage from §7 as context.
2. **New entry for the `FVAR` / `FVARS` DAT directives** (category alongside
   `p2kbPasm2Bytefit` / `p2kbPasm2Wordfit`). At present `p2kb_find "fvar"`
   returns only the two instruction keys. Content: §6, with the pitfalls from §9
   that concern directives.
3. **Cross-links:** from `p2kbPasm2Rdfast` and `p2kbPasm2Getptr` to the two
   instruction entries. Optionally link the decoders in §8.3 from a Spin2
   memory/data topic.

## 11. Suggested hover text for the Spin2 extension

**RFVAR D {WC/WZ/WCZ}**: Read a variable-length unsigned value (1–4 bytes,
up to 29 bits) from the hub FIFO into D, zero-extended. Each byte carries 7 bits,
LSB first; bit 7 = more bytes follow; a 4th byte carries 8 bits. Use after
`RDFAST`; not in hub-exec. C = 0, Z = (result == 0). 2 clocks. Data is produced by
the DAT directive `FVAR`.

**RFVARS D {WC/WZ/WCZ}**: As `RFVAR`, but the value is signed: the top bit of
the last byte read (bit 6/13/20/28) is sign-extended into D. Range
−`$1000_0000`..`$0FFF_FFFF`. C = sign of result, Z = (result == 0). 2 clocks.
Data is produced by the DAT directive `FVARS`.

**FVAR / FVARS** (DAT data, after `BYTE`/`WORD`/`LONG`): Emit the next value as a
1–4-byte variable-length integer readable by `RFVAR` / `RFVARS`. It applies to
one item only and ignores the line's size. `FVAR`: 0..`$1FFF_FFFF`. `FVARS`:
−`$1000_0000`..`$0FFF_FFFF`.
