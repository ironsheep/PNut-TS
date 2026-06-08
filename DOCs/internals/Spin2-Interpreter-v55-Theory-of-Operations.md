# Spin2 Interpreter — Theory of Operations (v55)

> **Subject:** `src/ext/Spin2_interpreter.spin2`
> **Interpreter version:** **v55**, dated 2026.05.07 (from the file's banner, line 4)
> **Author of source:** Chip Gracey (Parallax, Inc.)
> **Scope of this doc:** A complete, observational walk-through of what the
> Spin2 bytecode interpreter *is*, how it turns a stream of bytecodes into P2
> machine action, how it lays itself across the three tiers of cog memory
> (registers / LUT / hub), how method calls, variables, math, floating point,
> the built-in library, and multitasking are implemented, and — because the
> user asked — an honest accounting of which on-chip resources are **full** and
> what that means for adding features.
>
> This is *not* PNut-TS compiler code. It is the **runtime** the compiler
> emits: PNut-TS compiles a Spin2 program to bytecode, and prepends this
> interpreter image so the P2 can execute that bytecode. Everything below is
> grounded in the v55 source and the listing it produces
> (`TEST/EXT-tests/spin2_interpreter.lst`), cross-checked against the P2
> Knowledge Base for the hardware mechanisms it leans on.
>
> **Version-pinned by design.** The bytecode catalog, the LUT layout, and the
> CON-block `bc_*` values in this document are specific to v55. They re-sort
> between interpreter revisions. Read this as a snapshot of v55, to be
> contrasted against the equivalent documents for other versions.

---

## 1. What this artifact is

A Spin2 program is not run by hardware directly. PNut-TS compiles each method
into a compact **bytecode stream** — a sequence of 1-byte opcodes, some with
inline variable-length operands. The Spin2 interpreter is the program that
*reads* that stream and *performs* it. It is a stack-based virtual machine: a
bytecode either pushes/pops the evaluation stack, manipulates a variable,
performs an operator, calls a method, or invokes a built-in.

Three things make this interpreter unusual, and they organize the whole design:

1. **It is dispatched by hardware, not by a software loop.** The P2's **XBYTE**
   engine fetches the next bytecode, indexes a 256-entry LUT table, and jumps
   to the handler — in 6 clocks, with no interpreter "main loop" instruction
   in sight. The interpreter's job is to *populate the tables* and *write
   handlers that end cleanly* so XBYTE keeps feeding itself.

2. **It is spread across all three cog memory tiers.** The hottest handlers
   live in cog registers (`$120..$1CB`), the dispatch tables and warm handlers
   live in LUT (`$210..$3FF`), and the large/cold routines (the whole built-in
   library, method call/return, floating point) live in hub. The split is
   forced by a hardware constraint (§4), not by taste.

3. **It is dense to the point of being full.** As shipped, v55 fills the LUT
   to the last long and packs the cog register file up against the hardware
   special registers. There is essentially no room left in the fast tiers
   (§15). New features must go to hub or displace something.

---

## 2. The big picture — a three-tier virtual machine

```
        ┌──────────────────────────────────────────────────────────────┐
COG     │ $000..$0FF  free user space (inline PASM, REGEXEC, locals)    │
RAM     │ $100..$11F  taskptr[] task list (top-down); free if unused    │
        │ $120..$1CB  reg_code — HOT handlers (operators, var rd/wr,    │
        │             bitfields, REPEAT-var, task-next stub)            │
        │ $1CC        taskhlt                                           │
        │ $1CD..$1D7  v,pbase,vbase,dbase,mrecv,msend,w,dcall,x,y,z     │
        │ $1D8..$1DF  pr0_..pr7_ (PASM scratch / setup-reg targets)     │
        │ $1E0..$1EF  buff[16] — rd/wr/sz/ad, fd/fb/fm/fx, a..h         │
        │ $1F0..$1FF  hardware special registers (PA,PB,PTRA,PTRB,...)  │
        └──────────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────────┐
COG     │ $200..$20F  reserved (16 streamer imm→LUT→DAC/pin values)     │
LUT     │ $210..$214  addbase, var_ptr                                  │
        │ $215..      altcodes  — variable-operator dispatch table      │
        │  ...        warm handlers (drop, call, setup, const, ...)     │
        │ $300..      maincodes — main bytecode dispatch table          │
        │  ...        warm handlers (op_rel, case, lookup, ...)         │
        │ $3FF        lut_end = $400  ← LUT IS 100% FULL                │
        └──────────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────────┐
HUB     │ orgh: bytecode vector table ($54..$E8), pri_sendb, task_return│
        │ orgh: launch_spin, returnh, aborth, callh, the entire        │
        │       built-in library, floating point, multitasking         │
        │ ...   the user's compiled program (pbase/vbase/dbase)         │
        └──────────────────────────────────────────────────────────────┘
```

Addresses above are taken verbatim from the v55 listing symbol table
(`reg_code=$120`, `reg_end=$1CC`, `buff=$1E0`, `lut_code=$210`,
`maincodes=$300`, `lut_end=$400`). The `fit $1F0` directive (line 491) and the
`org`/`orgf` directives enforce these boundaries at assembly time.

### The four base pointers

Everything the VM does is relative to four hub pointers, kept in cog registers
in a fixed order (`v/pbase/vbase/dbase/...`, line 435 — the order matters
because context is saved/restored as a block, §13):

| Reg | Meaning |
| --- | --- |
| `pbase` | **Program base** — the object's code and constants. Bytecode offsets, method tables, string literals are all `pbase`-relative. Because `pbase`/`vbase`/`dbase` are **long-aligned** (their low two bits are always zero), `pbase[1:0]` are free to carry frame flags: bit 1 doubles as the ABORT **trap flag** and bit 0 as the **push flag** while a frame is live (§8). |
| `vbase` | **Variable base** — the object's VAR space. The first long at `vbase` is reserved to hold the object's `pbase` (used when building method pointers). The method index rides in `vbase[31:20]` at launch. |
| `dbase` | **Data base** — the current method's local-variable + stack frame. `ptra` is set to `dbase` on entry and grows upward as the evaluation stack. |
| `dcall` | **Call linkage** — points one long past where the *next* called method's frame will start; the drop-anchor / call machinery threads frames together through it. |

The hardware register **PTRA** is the live **evaluation-stack pointer** (a
descending-into-hub… actually *ascending* stack: push pre-writes and
post-increments via `PUSHA`/`wrlong x,ptra++`, pop is `POPA`/`rdlong x,--ptra`).
The top-of-stack value is cached in register `x` for speed; `PUSHA x` spills it
to hub, `POPA x` reloads it.

---

## 3. The XBYTE dispatch engine — how a bytecode becomes an action

XBYTE is the heart of the machine, so it is worth being precise. Per the P2KB:
XBYTE is a hardware bytecode executor with **6 clocks of overhead per
bytecode**. It is armed by executing **`_RET_ SETQ {#}D` while the value `$1FF`
is on the cog's hardware call stack**. When that `_ret_`-prefixed `SETQ`
retires and pops `$1FF`, the hardware:

1. does an `RFBYTE` to pull the next opcode from the FIFO (the bytecode stream),
2. writes that opcode into `PA` (`$1F6`) and the current FIFO pointer into `PB`
   (`$1F7`),
3. uses the opcode to index a LUT entry,
4. performs `EXECF` on that LUT entry — which jumps to a **10-bit address in
   bits `[9:0]`** *and* applies a **22-bit `SKIPF` skip-pattern from bits
   `[31:10]`** (the address is in the low bits; the skip pattern is shifted up
   by 10).

So **every LUT table entry is `address | (skip_pattern << 10)`** — exactly the
form seen throughout the source:

```
bc_jmp      long  branch | %01011111110 << 10   '12  jmp  rfvars
```

`branch` is the handler address; the binary literal is the skip pattern that
tailors the shared `branch` routine to *this* opcode. This is the central trick
of the whole interpreter: **one routine serves many opcodes**, and the skip
mask selects which instructions inside it execute. The `op_rel` relational
routine (lines 1149–1159) is the showcase — a single straight-line block of
`cmps`/`cmp`/`mux*` instructions that, under twelve different skip masks,
becomes `<`, `+<`, `<=`, `+<=`, `==`, `<>`, `>=`, `+>=`, `>`, `+>`, and `<=>`.

### The two dispatch tables, and how `setq`/`setq2` select them

A subtlety that is easy to get wrong: XBYTE is **not** re-armed after every
handler. It is armed **once**, and that arming **persists** across bytecodes.
The value loaded by `setq` (or `setq2`) immediately before XBYTE re-triggers is
what establishes the dispatch mode — and the difference between those two
instructions is the whole trick:

- **`setq` sets the *persistent* XBYTE mode** — both the dispatch-table base
  *and* the high-nibble compression threshold (and the flag-write bit) at once.
  Once set, every subsequent bytecode uses it. Ordinary handlers do **not**
  re-issue it; they simply end in `_ret_`, and the engine keeps fetching through
  the last `setq` mode on its own.

- **`setq2` sets a *one-shot* mode for only the *next* bytecode.** After that
  single bytecode executes, the engine automatically reverts to the persistent
  `setq` mode — nothing has to restore it.

This is how the interpreter runs **two dispatch tables** without ever explicitly
switching "back":

- **Main mode (persistent).** Established **once at launch** with `setq #$1A1`
  (the `wrf_wr` slot, line 406, commented "begin xbyte, compress Ax..Fx, write
  flags"). It selects the **`maincodes`** table and stays in force for every
  bytecode by default. You will *not* find a `setq` re-arming ordinary handlers,
  because none is needed.

- **Variable-operator mode (one-shot).** A *setup* bytecode (`reg_im`, `hub_im`,
  `bit_imm`, …) establishes *where* a variable lives (the `rd`/`wr`/`sz`/`ad`
  quartet, §9) and ends in `_ret_ setq2 #$081` (lines 742, 775, 798). That
  `setq2` causes the engine to read the **single next** bytecode from the
  **`altcodes`** table — interpreting it as a *variable operator* (read it,
  write it, `++`, `<<=`, …) acting on the location the setup just defined. The
  bytecode *after* that is back on `maincodes` automatically. This two-bytecode
  "setup then operate" structure is how Spin2 keeps the bytecode compact while
  supporting the full operator set on every addressing mode.

So across the whole interpreter there is exactly one persistent `setq` (the
launch arm) and a one-shot `setq2` at the tail of each setup routine. The
`altcodes` table is never "entered" for a run of bytecodes — it is borrowed for
precisely one opcode at a time.

### What the mode operand encodes

The value loaded by `setq`/`setq2` is **not just a table address** — it packs
three things into one field: the **LUT offset of the dispatch table**, the
**bytecode value at which high-nibble compression begins**, and a **flag-write
bit**. The cleanest way to read the interpreter's two constants is as a sum of
those three parts:

| Operand | table base (LUT offset) | compression starts at | flags |
| --- | --- | --- | --- |
| `#$1A1` | `$100` → `maincodes` (absolute LUT `$300`) | bytecode `$A0` → collapse `Ax..Fx` | write C/Z |
| `#$081` | `$000` → `altcodes` (absolute LUT `$200`) | bytecode `$80` → collapse `8x..Fx` (line 643) | write C/Z |

Read as a sum of its fields, `$1A1 = $100 | $A0 | $1` and `$081 = $000 | $80 | $1`
— *table-base offset*, *compression-start byte*, *flag bit*, respectively. In
words:

- **`#$1A1`** says: dispatch through the table at **LUT offset `$100`**
  (`maincodes`, which lives at absolute LUT `$300`); treat bytecodes `$00..$9F`
  as full one-per-slot entries and **collapse `$A0..$FF`** into the high-nibble
  families (next subsection); and write the opcode's low bits to C/Z.

- **`#$081`** says: dispatch through the table at **LUT offset `$000`**
  (`altcodes`, the variable-operator table, at absolute LUT `$200`); treat
  bytecodes `$00..$7F` as full entries and **collapse `$80..$FF`**; and write
  the opcode's low bits to C/Z. (The variable-operator entries themselves begin
  at bytecode `$15` — absolute LUT `$215` — because the low slots `$200..$214`
  hold the streamer reservation, `addbase`, and `var_ptr`.)

In the silicon-doc field notation this same value is `%ABBBB00xF`: `A` is the
table-base selector (the `$100` bit), `BBBB` is the compression-start nibble
(`$A` vs `$8`), and `F` is the flag-write bit. Either way, the point is that the
table selection, the high-nibble collapse, and the "low bits → C/Z" trick are
**not three separate mechanisms** — they are three fields of the single value
handed to `setq`/`setq2`.

The first arming happens at launch: `launch` does `push #wrf_rd`, and `wrf_rd`
(line 403) executes `push #$1FF` followed by `_ret_ setq #$1A1` (`wrf_wr`),
which pops `$1FF` and starts the very first XBYTE cycle in persistent main mode.

### The high-nibble "collapse"

Bytecodes `$80..$FF` carry a 4-bit operand in their low nibble (e.g.
`bc_read_local_0_15` = `$E0`, so `$E0..$EF` read locals 0..15). Sixteen opcodes
that all do the same thing with a different small index would waste sixteen
table slots. XBYTE's compressed mode instead **collapses each high nibble to a
single table entry** and surfaces the low nibble through the flags / `PA`. The
source documents this directly:

```
'bytecodes Ax/Bx/Cx/Dx/Ex/Fx are collapsed at runtime to LUT entries A0/A1/A2/A3/A4/A5
```

So `bc_read_local_0_15_` (the `Ex` family) occupies *one* `maincodes` entry
(`$A3` region), and the handler recovers the index `0..15` from the opcode.
The same collapse is applied to the `8x..Fx` block of the variable-operator
table (line 643). This is pure table-space economy — and given how full the
LUT is (§15), it is load-bearing economy.

---

## 4. The shared-FIFO constraint — why cog/LUT *and* hub

This is the single most important structural fact about the interpreter, and
it explains a pattern that otherwise looks like noise.

The P2 gives each cog **one FIFO**. The interpreter uses it as the **bytecode
stream**: `rdfast #0,<addr>` points it at a method's bytecode, and `RFBYTE` /
`RFVAR` / `RFWORD` / `RFLONG` pull opcodes and inline operands sequentially.
XBYTE itself reads from this FIFO.

But the P2 also uses that *same* FIFO for **hub-exec instruction prefetch**.
Per P2KB, *"in hub-execute mode the FIFO is dedicated to instruction prefetch
… and RDFAST/RF\*/WF\* are forbidden."* The two uses are mutually exclusive.

The interpreter is launched into hub-exec (`coginit #hubexec,##launch_spin`,
line 41) but the moment XBYTE is running, the *handlers* execute from cog and
LUT, where the FIFO is free to stream bytecode. **The instant a handler needs
to jump to a large routine in hub, entering hub-exec repurposes the FIFO and
destroys the bytecode read pointer.** Therefore every excursion into hub must:

1. **Capture** the bytecode pointer first, with `getptr pb` (PB now holds the
   FIFO read position), and
2. **Rebuild** the bytecode stream on the way back, with `_ret_ rdfast #0,pb`.

You see this pattern *everywhere* a cog/LUT handler delegates to hub:

```
return_   jmp  #returnh          ' cog stub (LUT $...) — 1 long
...
returnh   ...                    ' hub continuation
      _ret_ rdfast #0,w          ' restore the bytecode FIFO, then ret → next XBYTE
```

Routines like `callobj`, `casefi`, `range`, `callgo` even appear *twice* in the
source — once as the real cog/LUT stub and once as a `{ }`-commented mirror
beside their hub continuation (e.g. lines 1505–1515, 1642–1648, 1665–1675).
Those mirrors are **documentation, not dead code**: they let a reader see the
cog-side and hub-side halves of a split routine together.

So the tiering is not an optimization the author *chose* freely; it is the
shape forced by "one FIFO, two uses." Hot paths that must keep streaming
bytecode stay in cog/LUT; anything big enough to be worth a `getptr`/`rdfast`
round-trip goes to hub.

---

## 5. The cog register file — packed to the wall

The interpreter's cog image (loaded at launch by a single block `rdlong`,
§7) occupies a carefully budgeted register map. From the v55 listing:

| Range | Longs | Contents |
| --- | ---: | --- |
| `$000..$0FF` | 256 | **Free user space.** Reserved for inline PASM (`ORG`), `REGEXEC`/`REGLOAD` targets, `CALL` scratch, and the working area. The interpreter deliberately keeps its own code out of here. |
| `$100..$11F` | 32 | `taskptr[]` — the **32-task pointer list**, "builds from top down to maximize free register space" (line 163). Each live task stores its `ptra` here. **The source explicitly marks this range free** (line 161: `org $100 'registers $000..$11F are free`): it is consumed only from `$11F` *downward* as tasks are spawned, so a program using few or no tasks has most or all of it available as user space. |
| `$120..$1CB` | 172 | `reg_code` → `reg_end` — the **hottest handlers**: the operator-modifier tables (`una/sha/mul/add/log_mod`), pre/post modifiers (`mod_iso`), REPEAT-var init/loop, bitfield read/write (`rdf`/`wrf`), the `rd_*`/`wr_*` access primitives, and the `tasknext_` stub. |
| `$1CC` | 1 | `taskhlt` — per-task halt bits. |
| `$1CD..$1D7` | 11 | `v, pbase, vbase, dbase, mrecv, msend, w, dcall, x, y, z` (with `ma` aliasing `x`). **Order is fixed** so context saves/restores as a block. |
| `$1D8..$1DF` | 8 | `pr0_..pr7_` — PASM scratch, and the target of `setup reg[$1D8..$1DF]` bytecodes. |
| `$1E0..$1EF` | 16 | `buff[16]` — the multi-purpose buffer. Overlaid by the variable quartet `rd/wr/sz/ad`, the bitfield quartet `fd/fb/fm/fx`, and the operand registers `a..h` (with float aliases `na/sa/xa/ma`, `nb/sb/xb/mb`). `fit $1F0` (line 491) asserts it ends exactly at `$1EF`. |
| `$1F0..$1FF` | 16 | Hardware special registers (`PA`, `PB`, `PTRA`, `PTRB`, interrupt vectors, etc.). |

**There is no slack between `$120` and `$1EF`.** The register file is full up
to the hardware wall. Free cog RAM exists only *below* `reg_code`: the
`$000..$0FF` user region (intentionally reserved for user inline code), **plus
whatever of `$100..$11F` multitasking has not claimed** — the `taskptr` list
grows down from `$11F`, so the bottom of that range is user space until tasks
fill it. Neither region is available for the *interpreter* to grow into:
`$000..$0FF` must stay free for inline PASM, and `$100..$11F` belongs to the
task list whenever tasks are in use.

The `buff` overlay deserves a note: the same 16 longs are, depending on
context, a CRC work area, a string-op micro-program (loaded from hub and run
in place, §12), a structure staging area, a 16-long block-move buffer, or the
named operator registers `a..h`. This aggressive aliasing is how a 16-long
window does the work of dozens of registers.

---

## 6. The evaluation stack and the `x` cache

Spin2 is a stack machine; the stack lives in hub at `dbase` and upward, indexed
by `PTRA`. Two conventions run throughout:

- **TOS is cached in `x`.** Most handlers read their first operand from `x` and
  leave their result in `x`. `PUSHA x` (`wrlong x,--ptra`… here `ptra++`) spills
  the cache to make room; `POPA x` reloads it. A binary operator typically does
  `POPA w` (second operand) then operates `x` ⊕ `w`.

- **Push vs. isolated.** Nearly every operator and variable bytecode has two
  forms: an **isolated** form used when the result is a statement (the value is
  written back or discarded, TOS unchanged) and a **push** form used inside an
  expression (the result is left on the stack). The dispatch tables encode the
  difference in the skip mask. For example `bc_var_inc` (isolated `++var`) and
  `bc_var_preinc_push` (`++var` as an expression) both vector to the `mod_*`
  modifier routine with different masks (lines 535, 537).

### Drop anchor — preparing a call

Before a method call, the VM "drops an anchor": it pushes the current frame's
six context longs and re-points `dcall`. The `drop`/`drophot` routine (lines
681–693) writes `v/pbase|flags/vbase/dbase/mrecv/msend` as a 6-long block
(`setq #6-1; wrlong v,ptra++`), stashes the prior `dcall` as the new TOS, and
advances `dcall`. The two low bits folded into the pushed `pbase` are the
**trap flag** (bit 1) and **push flag** (bit 0) that `RETURN`/`ABORT` later
consult.

---

## 7. Boot and launch — from `coginit` to the first bytecode

The image begins (line 25, `DAT org`) with a tiny **bootstrap** that the
compiler fills in. It is throwaway code that runs once in cog 0:

1. Set the clock mode/frequency the program requested (`clkset_init`).
2. Clear the first 16 hub longs (this code space) and the VAR space
   (`setq`-block `wrlong #0`).
3. Seed the stack with `pbase`/`vbase`.
4. **Restart cog 0 in hub-exec** at `launch_spin`, passing `dbase` via
   `setq … coginit` (the `SETQ`-before-`COGINIT` mechanism delivers one long
   into the new cog's `PTRA`).

The six patch words at `$30..$44` (`pbase_init`, `vbase_init`, `dbase_init`,
`var_longs`, `clkmode_hub`, `clkfreq_hub`) are placeholders PNut-TS overwrites
with the compiled program's real base pointers, VAR size, and clock settings.
The `_pbase + 8` / `<< 20` arithmetic on those lines is the *no-compiler*
fallback used when assembling the file standalone for test.

### `launch_spin` — building the runtime cog

`launch_spin` (line 2036) is what actually constructs the interpreter:

1. `loc ptrb,#\$80000` — point at a guaranteed-zero hub region for clears.
2. **Clear cog regs `0..ptra-1`** (cancels any stale `mrecv`/`msend`).
3. **Load `reg_code`** into cog: `setq #reg_end-reg_code-1; rdlong reg_code,#@reg_code`
   — one block transfer pulls all 172 register-resident handlers into place.
4. **Clear LUT `0..lut_code-1`**, then **load `lut_code..lut_end`** into LUT via
   `setq2` block transfers (`rdlong lut_code & $1FF, rdf`).
5. `push #wrf_rd` — arrange for the first `ret` to land in `wrf_rd`, which arms
   XBYTE (§3).
6. Fall into `launch_method`.

`launch_method` (line 2052) sets up the *first* stack frame: reads
`pbase`/`vbase`, sets the `pbase` trap flag, points `dbase` past the 6-long
frame header, writes the frame, sets `dcall`, points the return at the
`task_return` bytecodes in hub, and jumps to `callinit` — which begins
executing the program's top method (its index is in `vbase[31:20]`). From here
on, XBYTE drives everything.

This same `launch_method` path is reused by `COGSPIN` and `TASKSPIN` to start a
Spin2 method in a fresh cog or task (§12, §13) — it is the universal "start a
Spin2 method" entry point.

---

## 8. Method call, return, and ABORT

### Calling (`callobj` / `callsub` / `callptr` / `callrecv` / `callsend`)

A call bytecode (`bc_call_*`, `$08..$0E`) vectors to the cog stub `callobj`
(line 703), which reads the object/sub indices with `rfvar`, captures the
bytecode pointer with `getptr pb`, and jumps to the hub continuation `callh`.
`callh` (line 1554):

1. Resolves the target method's `pbase`/`vbase` offsets from the object's
   method table.
2. Reads the method header long: a packed **parameter count / result count /
   bytecode offset** (`and v,##$7FF00000` isolates params/results, line 1577).
3. `callhot` sets `dbase = dcall`, writes the prior `dcall` and the
   params/results/return into the new frame, advances `ptra` past the
   parameters, **clears the result slots**, and jumps to `callgo`.
4. `callgo` (line 713) does `rdfast #0,x` to start streaming the callee's
   bytecode, reads the local-variable count, and **clears the locals** with a
   block `wrlong #0,ptra++`.

`@sub` / `@obj.sub` "make method pointer" bytecodes share the same front-end
but branch to `makeptr` (line 1604), which packs `method_index<<20 | vbase`
into a 32-bit **method pointer** value rather than calling.

`SEND`/`RECV` are first-class: `mrecv`/`msend` hold inheritable method pointers,
and `callsend`/`callrecv` invoke them — or `resume` if unset (lines 1528–1543).
`SEND(bytes…)` is implemented by an *actual bytecode subroutine*, `pri_sendb`,
hand-assembled in hub at line 59 — a Spin2 method written directly in bytecode
that the interpreter calls.

### Returning (`returnh`)

`RETURN` (line 1408) reverses a frame: it pops the 7-long frame header
(`v/pbase/vbase/dbase/mrecv/msend/w`), then dispatches on
`{trap_flag, push_flag}`:

| `{trap,push}` | Action |
| --- | --- |
| `%00` / `%10` | Restore the caller's stack top. |
| `%01` | Return results (or `Z`-selected args). |
| `%11` | Return `0`. |

Multiple return values are copied from the callee frame back into the caller's
stack with a `setq`-block read into `buff` then a block write — up to 15 values
(`getnib z,w,#5`). `RETURN x,y,z…` (the `Z=1` arg form) leaves explicit values
instead of declared results.

### ABORT (`aborth`)

`ABORT` (line 1471) **unwinds frames in a loop** until it finds one whose
`pbase` trap flag (bit 1) is set — i.e. the nearest enclosing `\`-trapped call.
That is the entire reason `pbase`'s low bits carry flags: it lets ABORT walk
the call chain cheaply, popping 7-long headers until it hits a trap, then
delivering either `0` or the abort argument per the push flag. This is the
exception mechanism Spin2 exposes as `\method()` and `abort`.

---

## 9. The variable-access model — setup, then operate

Variable access is the interpreter's richest subsystem, and it is built on the
**"setup bytecode arms XBYTE for a variable-operator bytecode"** pattern (§3).
The setup bytecode loads four registers that fully describe a storage location:

| Reg | Role |
| --- | --- |
| `rd` | the **read** primitive (`rd_byte`/`rd_word`/`rd_long`/`rd_reg`, or `rd_field` for bitfields) |
| `wr` | the **write** primitive (`wr_byte`/…/`wr_reg`, or `wr_field`) |
| `sz` | the size in bits for sign/zero extension (`#7`/`#15`/`#31`) |
| `ad` | the effective hub address (or, for registers, the cog address patched into `rd`/`wr`) |

The `rd_*`/`wr_*` primitives (lines 412–420) are eight one-instruction
register-resident routines; `alti rd` / `alti wr` (the ALTI alter-instruction
mechanism) lets a generic handler *execute whichever primitive `rd`/`wr` names*
without branching. This is how one operator routine handles bytes, words,
longs, registers, and bitfields uniformly.

The addressing modes the setup routines cover are extensive — every
combination of base (`pbase`/`vbase`/`dbase`/popped), size (byte/word/long),
and indexing (none / inline `rfvar` / popped index) has a `bc_setup_*` entry
(`maincodes $4F..$66`). The `hub_im`/`hub_ap`/`hub_pp` routine (lines 747–775)
is a single 22-long block whose skip masks produce all 26 of those modes
(labeled `a..z` in the source's column comments — a remarkable density).

### Bitfields, fields, structures

- **Bitfields** (`.[bits]`) are handled by `bit_imm`/`bit_rfvar`/`bit_pop`
  (line 780): they compute a base offset `fb` and width `sz`, then swap in the
  `rd_field`/`wr_field` primitives (`rdf`/`wrf`, lines 386–407) which read,
  LSB-justify, trim, and (for writes) mask-merge the field. `wrf` uses a
  `REP`-protected read-modify-write so an interrupt can't tear the field.

- **Fields** (the `^@` field-pointer abstraction, `bc_setup_field_*`) pack
  type/width/bit-offset/address into a single 32-bit value (the encoding table
  at lines 1706–1713) so a field can be passed around as a value and later
  re-expanded by `fieldh` (line 1809).

- **Structures** (`bc_setup_struct_*`, `$67..$6A`) are handled by `hub_sv`
  (line 180): it computes a struct member address from a base + `rfvar`
  offset + optional `pop × element_size` index, and can push or pop an entire
  structure to/from the stack (`structpush`/`structpop`, lines 1837–1886) using
  block transfers with byte-granular tail handling. This is the v55 STRUCT
  support surfaced at runtime.

---

## 10. The operator engine

Spin2's operators are implemented as a small family of **modifier routines**,
each a straight-line block specialized by skip mask:

| Routine | Operators served |
| --- | --- |
| `una_iso`/`una_psh`/`op_*` | unary: `!!`, `!`, `-`, `ABS`, `ENCOD`, `DECOD`, `BMASK`, `ONES`, `SQRT`, `QLOG`, `QEXP` |
| `sha_mod` | shifts and add/sub: `>>`, `<<`, `SAR`, `ROR`, `ROL`, `+`, `-` |
| `rev_mod` | `REV`, `ZEROX`, `SIGNX` |
| `mul_mod`/`muu_mod` | CORDIC-backed: `*`, `/`, `+/`, `//`, `+//`, `SCA`, `SCAS`, `FRAC` |
| `add_mod`/`log_mod` | logic and field-builders: `&&`, `^^`, `||`, `&`, `^`, `|`, `#>`, `<#`, `ADDBITS`, `ADDPINS` |
| `mod_iso`/`mod_psh` | pre/post modifiers: `++var`, `var++`, `var!!`, `var!`, `var\new`, `??var` |
| `op_rel` | the eleven relational comparisons |
| `ternary` | `? :` |

Two implementation notes stand out:

- **CORDIC operators are `REP`-protected.** `mul_mod` and the unary
  `op_quna` wrap their `qmul`/`qdiv`/`qsqrt`/`qlog`/`qexp` … `getqx` sequences in
  `rep #99,#1` (lines 219, 266). Per P2KB, `REP` stalls interrupts for the whole
  block, making the queue→retrieve window atomic so an interrupt can't corrupt
  the shared CORDIC pipeline. The "`use REP to protect cordic operation until
  ret/_ret_`" comments mark every such site.

- **`SCAS` needs a 64-bit fix-up.** Signed scale (`SCAS`) reads both CORDIC
  result halves and recombines a `{x,w}[61:30]` slice (`.scas`, lines 281–287)
  — the one operator that can't be expressed as a single skip-masked line.

The `??var` random operator uses `xoro32` (line 319); `??`-style pseudo-random
is therefore a hardware PRNG step, not a library call.

---

## 11. CORDIC math and IEEE-754 floating point

The interpreter implements a full single-precision float library in hub
(`float_` … `fsqrt_`, lines 2550–2872), all built on the CORDIC solver:

- **Format.** Standard IEEE-754 binary32. `unpackf`/`unpackf2` (lines 2809–2840)
  split a float into NaN flag `na`, sign `sa`, exponent `xa`, and a
  bit-29-justified mantissa `ma` (the `a`/`b` operand registers alias the float
  registers — `ma`≡`x`, `mb`≡`d`, etc., which is why the float code reads so
  cleanly). `packf` (line 2845) re-normalizes, rounds (`+$100` half-up),
  re-biases, clamps the exponent to `-23..255`, and re-inserts the sign.

- **CORDIC usage.** `fmul`→`qmul`, `fdiv`→`qfrac`, `fsqrt`→`qsqrt`,
  `flog`→`qlog`, `fexp`→`qexp`. `POW` is composed: `flog_u` then `fmul_u` then
  `fexp_` (line 2740) — log, multiply, antilog, all skipping redundant
  unpacking. Each CORDIC sequence is `REP`-guarded.

- **Transcendental scaling.** `LOG2`/`LOG10`/`LOG` and `EXP2`/`EXP10`/`EXP`
  share routines and differ only by a CORDIC multiply against a magic constant
  (`$4D104D42` for log10(2), `$B17217F8` for ln(2), etc.) selected by the
  bytecode's low bits via flags (lines 2726–2732, 2747–2752).

- **`QSIN`/`QCOS`/`ROTXY`/`POLXY`/`XYPOL`** (lines 2421–2462) are thin wrappers
  over `qrotate`/`qvector`, sharing one routine with flag-selected behavior.

A standing TODO is recorded in the source (line 2537): **`FROUND`/`FTRUNC`,
`#>.`/`<#.`, and `SIN/ASIN`, `COS/ACOS`, `TAN/ATAN` are not yet implemented.**
This matters for §15 — those additions land in an already-full address space.

---

## 12. The built-in library — hub bytecodes

The bulk of Spin2's built-in methods are **hub bytecodes**: a `bc_hub_bytecode`
opcode (`$19`) followed by a selector byte that indexes the **word vector
table** at hub `$54` (lines 75–153). The handler runs in hub and ends with
`rdfast #0,pb` to resume the stream. The catalog:

| Group | Methods |
| --- | --- |
| System | `HUBSET`, `CLKSET`, `COGSPIN`, `COGCHK`, `REGEXEC`, `REGLOAD`, `CALL`, `GETREGS`, `SETREGS` |
| Memory | `BYTEFILL/MOVE/SWAP/COMP` and `WORD…`/`LONG…` (12 ops, one engine) |
| Strings | `STRSIZE`, `STRCOMP`, `STRCOPY` |
| Math/util | `GETCRC`, `MULDIV64`, `MOVBYTS`, `ENDIANL`, `ENDIANW`, `QSIN/QCOS`, `ROTXY/POLXY/XYPOL` |
| Timing | `WAITUS`, `WAITMS`, `GETMS`, `GETSEC` |
| Pins | `PINREAD/WRITE/START/CLEAR`, `PINLOW/HIGH/TOGGLE/FLOAT`, `WRPIN/WXPIN/WYPIN/RDPIN/RQPIN/AKPIN` |
| Cogs/locks | `COGINIT/STOP/ID/ATN`, `LOCKNEW/RET/TRY/REL/CHK`, `POLLATN/WAITATN`, `GETRND/GETCT/POLLCT/WAITCT` |
| Float | the entire FP library (§11) |
| Tasks | `TASKSPIN/STOP/HALT/CONT/CHK/ID/NEXT` (§13) |

A recurring technique: several built-ins **load a tiny PASM micro-program from
hub into `buff` and `jmp #buff`** (`load_buff`, line 2291). `STRSIZE`,
`STRCOMP`, `STRCOPY`, `GETCRC`, the SWAP/COMP/FILL variants, all run as 14-long
programs executed *in the register file*, because executing from cog is faster
than hub-exec and frees the author from the FIFO constraint mid-routine. It is
a self-overlaying code cache.

The block-move engine (`bytefill_`/`move_fwd`/`move_rev`, lines 2166–2266)
auto-selects forward vs. reverse to handle overlapping `MOVE`, fabricates fill
patterns with `movbyts`, and moves 16 longs per `setq` block — the same
`move_fwd_loop` is reused by `build_stack` (§13) to copy call parameters.

---

## 13. Multitasking

v55 carries a cooperative-plus-preemptive **multitasking** layer entirely
inside one cog. The bookkeeping is three registers:

- `tasknum` — the current task (0..31).
- `taskena` — per-task enable bits.
- `taskhlt` — per-task halt bits.
- `taskptr[]` — the 32-long pointer list at `$100`, one saved `ptra` per task.

`TASKSPIN` (line 2921) builds a remote stack (`build_stack`), allocates a task
slot (`encod` of the free `taskena` bits), saves the current task's 8-long
context (`pbase/vbase/dbase/mrecv/msend/w/dcall/x`), stashes its `ptra` in
`taskptr[]`, and launches the new method via the shared `launch_method`.
`TASKNEXT` (`tasknexth`, line 3004) and the task-control ops drive a
**round-robin scheduler**: save context, find the next enabled-and-unhalted
task (`ror`/`encod` over `taskena & !taskhlt`), restore its 8-long context, and
`rdfast #0,w` to resume its bytecode. If no task is runnable, it spins waiting
for an interrupt to unhalt one (line 3014). When the last task stops, the cog
stops itself (`cogid`/`cogstop`, line 2989).

The fixed 8-long context block and the in-order register layout (§5) are what
make a task switch a pair of `setq`-block transfers rather than dozens of moves
— the scheduler is only a handful of instructions.

---

## 14. Inline PASM and register execution

Spin2 can drop into raw PASM, and the interpreter supports five flavors through
one routine (`inline`/`regexec_`/`regload_`/`call_`, lines 2087–2129):

- **`ORG` inline** — save the first 16 locals to hub, run cog-resident inline
  code, restore the locals.
- **`ORGH` inline** — run hub-resident inline code via `call`.
- **`REGEXEC(hubadr)`** — load a register image from hub (start/count header)
  and execute it.
- **`REGLOAD(hubadr)`** — load registers without executing.
- **`CALL(anyadr)`** — call arbitrary PASM, preserving `pb`/`ptra`.

The routine uses `skip` patterns (`loc pa,#\%…`) to share one body across all
five. `GETREGS`/`SETREGS` (line 2135) block-transfer between cog and hub. This
is the bridge that lets Spin2 and PASM2 coexist in the same method, and it is
exactly why the `$000..$0FF` cog region is held free (§5): inline code needs
somewhere to land.

---

## 15. Resource budget — what is full, and what that means

The user asked specifically to flag resources that are filling up. Here is the
honest, listing-grounded accounting for v55.

### 🔴 LUT — 100% full

```
LUT physical:  $200..$3FF              512 longs
  reserved:    $200..$20F   16 longs   (streamer imm→LUT→DAC/pin values)
  lut_code:    $210..$3FF  496 longs   (dispatch tables + warm handlers)
  lut_end   =  $400                     ← exactly the top of LUT
```

**The LUT has zero free longs.** `lut_end` resolves to `$400`, which is one past
the last usable LUT address — every long from `$210` to `$3FF` is occupied by
the two dispatch tables (`altcodes`, `maincodes`) and the warm handlers between
and after them. This is the binding constraint on the interpreter. **Any new
bytecode handler that needs to be in LUT requires evicting an existing one to
hub** (paying it the `getptr pb` / `rdfast #0,pb` round-trip), or finding a few
longs by collapsing more handlers. The 16-long streamer reservation at `$200`
is the only nominally "spare" LUT, and it is spoken for by the DAC/pin
streaming feature.

### 🟠 Hub bytecode vector table — ~87% full

```
vectors:  $54..$E8   (word each)   75 of 86 slots used
ceiling:  $FE (per the "up to $FE possible" comment, line 71)
free:     11 word-slots ($EA..$FE)
```

The built-in dispatch table has **11 slots left**. The pending float additions
(`FROUND`, `FTRUNC`, `#>.`, `<#.`, `SIN`, `ASIN`, `COS`, `ACOS`, `TAN`, `ATAN`
— ten entries, line 2537) would nearly exhaust it. If the built-in library
keeps growing, this table is the next ceiling after the LUT, and there is no
obvious way to raise `$FE` without changing the hub-bytecode encoding.

### 🟠 Cog register file — packed to the special-register wall

```
$000..$0FF   free user space (inline PASM landing zone)
$100..$11F   taskptr[] task list — free from the bottom up when tasks are unused
$120..$1EF   used solid (handlers + registers + buff)
$1F0..$1FF   hardware special registers (immovable)
```

No free longs exist between `reg_code` (`$120`) and the end of `buff` (`$1EF`);
`fit $1F0` enforces it. Free cog RAM is confined to the regions *below*
`reg_code`: the `$000..$0FF` user space (reserved for inline PASM) and the part
of `$100..$11F` not yet claimed by the `taskptr` list (line 161 marks the whole
`$000..$11F` range free; tasks consume it downward from `$11F`). Both are
user/task space, not interpreter space — **a new register-resident handler still
has nowhere to go** without displacing existing register code to LUT (itself
full) or hub.

### 🟢 Main-bytecode opcode space — one free slot

`bc_unused` sits at main bytecode `$40` (line 952) — a single unused primary
opcode. Beyond it the `$Ax..$Fx` ranges are fully consumed by the collapsed
high-nibble families.

### 🟢 Hub code and the eval stack — plentiful

Hub is large; the hub-resident interpreter occupies roughly `$B54..$1828`
(≈ 820 longs) and the user program follows. Neither hub code space nor the
evaluation stack is a near-term constraint.

**Bottom line for "making room":** the fast tiers (cog regs + LUT) are
*exhausted*, and the hub-bytecode table is the next wall at ~13% headroom. The
realistic levers are (a) collapse more handler families behind skip masks to
recover LUT longs, (b) push warm-but-not-hot LUT handlers to hub and accept the
FIFO round-trip, and (c) reserve the remaining 11 hub-vector slots
deliberately rather than first-come. None of these is free; all are the kind of
trade the author has clearly already been making (the high-nibble collapse, the
`buff` overlay, the shared modifier routines are all this same economy).

---

## 16. Efficiency observations — an honest pass

The interpreter is already near the floor of what is achievable on this
hardware. XBYTE dispatch is 6 clocks; the minimum handler is a single
`_ret_`-prefixed instruction; CORDIC math is hardware; block moves run at one
long per clock. There are no fat loops to trim. With that said, a few honest
observations:

- **Stray scaffolding comment.** Line 1 is a development note —
  `'TESTT add registers stack_start (on launch) and stack_max … to track stack
  size for allocation need`. It reads as an unfinished idea (instrument the
  stack high-water mark to size allocations), not shipped behavior. Worth either
  implementing or moving to the issue tracker so the source banner isn't the
  second line of the file.

- **The `{ }` mirror blocks are intentional, not waste.** `callobj`, `casefi`,
  `range`, `cased`, `lookd`, `callgo` appear a second time wrapped in Spin block
  comments beside their hub continuations. They cost zero bytes and aid
  readability of split routines. Leave them; just know they are mirrors.

- **`_debugnop1_/2_/3_` in `clkset_init`** (lines 1968–1970) are three
  instructions the compiler NOPs out unless DEBUG is active. This is a clean
  pattern, not dead code — noting it so a future reader doesn't "optimize" the
  NOPs away.

- **The real efficiency story is spatial, not temporal.** The pressure on this
  codebase is address space (§15), not cycles. The most valuable "efficiency"
  work here is finding LUT longs, not shaving clocks — e.g. any two warm
  handlers that could share a skip-masked body would buy back LUT room that is
  currently impossible to find.

In short: there is nothing to micro-optimize for speed, and the one thing worth
optimizing — LUT occupancy — is the hardest because the easy collapses have
already been done.

---

## 17. P2 mechanisms worth extracting (KB notes)

Studying this interpreter surfaces several P2 idioms that are documented in the
KB but whose *interpreter-grade* usage is worth calling out, in the spirit of
the flash-loader study:

1. **XBYTE as a complete VM dispatcher.** The `address | (skip << 10)` LUT-entry
   convention, the `$1FF` + `_ret_ setq` arming, and the re-arm-to-switch-tables
   trick (`setq #$1A1` vs `setq2 #$081`) together form a reusable recipe for
   *any* bytecode VM on P2, not just Spin2. The KB documents XBYTE mechanically;
   a worked "build a bytecode VM" example anchored on this file would be
   valuable.

2. **The shared-FIFO / hub-exec exclusion is a design driver, not a footnote.**
   The KB notes RDFAST/RF\* are forbidden in hub-exec. This interpreter shows
   the *consequence*: the entire cog/LUT-vs-hub partition and the pervasive
   `getptr pb … rdfast #0,pb` handshake exist solely to cope with it. Worth a
   KB idioms note: "saving and restoring the bytecode FIFO across a hub-exec
   excursion."

3. **`REP` as CORDIC interrupt armor.** Every CORDIC sequence here is wrapped in
   `REP` to make queue→`GETQX` atomic. The KB states REP stalls interrupts; this
   file is the canonical example of *why you'd want that*.

4. **`buff` self-overlaying micro-programs.** Loading a ≤14-long PASM routine
   from hub into a register window and `jmp`-ing into it (`load_buff`) is a
   general "code cache in registers" pattern that deserves its own KB entry.

5. **`SETQ`/`SETQ2` block transfers as the universal primitive.** Context
   switches, frame setup, structure push/pop, parameter copy, and image load are
   *all* `setq`-block transfers. The interpreter is a sustained demonstration
   that the egg-beater block move is the right tool for almost every bulk move.

---

## 18. "Is the interpreter still correct?" — reviewer checklist

When modifying this file, verify:

- [ ] **`fit $1F0` still passes** — the register file hasn't overrun into the
      hardware special registers.
- [ ] **`lut_end` ≤ `$400`** — the LUT still fits. (At v55 it is *exactly*
      `$400`; any addition must displace something.)
- [ ] **Every cog/LUT handler that enters hub does `getptr pb` first and
      `rdfast #0,pb` (or `,w`) before returning** — or the bytecode stream is
      corrupted on return.
- [ ] **Every CORDIC sequence is `REP`-guarded** from queue to `GETQX`/`GETQY`.
- [ ] **The `v/pbase/…/x/y/z` register order is unchanged** — context save/
      restore and the float aliases depend on it (lines 435, 475–489).
- [ ] **The persistent XBYTE arm is still `setq #$1A1`, set once at launch, and
      setup bytecodes still end in the one-shot `_ret_ setq2 #$081`** — the
      `*`-marked entries in the tables note this requirement (lines 657, 1075).
      Ordinary handlers must *not* re-issue `setq`; the main-table mode persists
      on its own, and `setq2` reverts after exactly one bytecode (§3).
- [ ] **The hub vector table and `maincodes`/`altcodes` indices line up** with
      the PNut-TS code generator's `bc_*` values — these are a contract between
      compiler and interpreter and must move together across versions.
- [ ] **Regression:** rebuild and run `npm run test-ext` (the interpreter has
      dedicated fixtures under `TEST/EXT-tests/`), and confirm the `.lst`/`.obj`
      still match their `.GOLD` references.

---

## 19. Source map — label → role

| Label / range | Role |
| --- | --- |
| `DAT org` (l.25) | One-shot bootstrap; clock + clear + `coginit` hub-exec. |
| `task_return`, `pri_sendb` (l.56) | Hand-assembled bytecode snippets in hub. |
| `bc_hubset`…`bc_endianw` (l.75) | Hub-bytecode word vector table (`$54..$E8`). |
| `taskptr` (l.163) | 32-task `ptra` list. |
| `reg_code`…`reg_end` (l.165–428) | Register-resident hot handlers. |
| `una_iso`/`sha_mod`/`mul_mod`/`add_mod`/`log_mod` | Operator-modifier routines (skip-masked). |
| `mod_iso`/`repvar*` | Pre/post modifiers and `REPEAT`-var control. |
| `rdf`/`wrf` | Bitfield read / masked write. |
| `rd_*`/`wr_*` (l.412) | Byte/word/long/reg access primitives. |
| `v`…`z`, `pr0_`…, `buff` (l.435–489) | The register file. |
| `lut_code` (l.499) | LUT image start. |
| `altcodes` (l.518) | Variable-operator dispatch table. |
| `reg_im`/`hub_im`/`bit_imm`/`var_rd`/`const` | Setup + read/write + constant handlers. |
| `maincodes` (l.867) | Main bytecode dispatch table. |
| `op_rel`/`ternary`/`pwct`/`pushv` | Relational, ternary, timing, push-value. |
| `casefi`/`casev`/`range`/`lookv` | CASE / CASE_FAST / LOOKUP / LOOKDOWN. |
| `lut_end` (l.1379) | LUT image end (`$400`). |
| `orgh` (l.1386) | Start of hub-resident interpreter. |
| `returnh`/`aborth` | Method return / ABORT unwinding. |
| `callh`/`callhot`/`callgo`/`makeptr` | Method call / pointer construction. |
| `mfieldh`/`fieldih`/`fieldh` | Field-pointer expansion. |
| `structpush`/`structpop` | STRUCT stack transfer. |
| `build_stack` | Remote-stack parameter copy (COGSPIN/TASKSPIN). |
| `hubset_`…`endianl_` | The built-in library. |
| `float_`…`packf` | Floating-point library. |
| `launch_spin`/`launch_method` | Cog construction + method start. |
| `taskspin_`…`tasknexth` | Multitasking + scheduler. |
| `test_pbase`/`test_vbase`/`test_dbase` (l.3038) | Standalone-assembly placeholders the compiler replaces. |

---

*Document generated from a fresh reading of `Spin2_interpreter.spin2` (v55,
2026.05.07). Hardware-mechanism descriptions cross-checked against the P2
Knowledge Base. Addresses verified against
`TEST/EXT-tests/spin2_interpreter.lst`. Peer to
`Flash-Loader-Theory-of-Operations.md` and
`SingleStep-Debugger-Theory-of-Operations.md` in this directory.*
