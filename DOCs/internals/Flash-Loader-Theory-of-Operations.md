# Flash Loader Theory of Operations

> **Subject:** `src/ext/flash_loader.spin2`
> **Author of source:** Chip Gracey (Parallax, Inc.)
> **Scope of this doc:** A complete walk-through of what the flash loader does,
> how it uses the P2's streamer + smart-pin hardware to talk to an SPI flash,
> how the boot-time hand-off works, and what we can learn about the P2 from
> studying it.
>
> This is *not* PNut-TS compiler code — it is an artifact the compiler **emits**.
> When the user passes `-FLASH`, PNut-TS prepends this image (compiled from
> `flash_loader.spin2`) to the user program; the resulting binary is what
> actually programs an SPI flash and survives a power-cycle.

---

## 1. Purpose

`flash_loader.spin2` is two completely separate programs that share one
cog image:

| When it runs | Code that runs | Job |
| --- | --- | --- |
| Once, at end of a serial download | the **Programmer** (lines 33–202) | Take the just-downloaded application, write it (and a self-copy of the loader) into SPI flash, then jump to the application. |
| Every power-up after that | the **Loader** (lines 205–293) | Pull the application back from SPI flash into hub RAM, verify it, and jump to it. |

The genius — and the constraint — is that **both halves must fit in the
first 256 cog registers** (`$000..$0FF`), because that is all the P2's boot
ROM will load from flash on a cold boot. The application is appended *after*
the loader inside the same 1 KB region; if it doesn't fit, the loader pulls
the overflow from flash itself.

## 2. Hardware context — the W25Q128 SPI flash

```
CON   spi_cs = 61
      spi_ck = 60
      spi_di = 59          ' P2 → flash data (flash's "SI")
      spi_do = 58          ' P2 ← flash data (flash's "SO")
```

These four pin numbers are **hard-coded by the P2 silicon's boot ROM**. The
flash chip lives at those pins on every P2-EVAL / P2-EDGE board. The ROM
booter expects an 8-pin SPI device but uses only the 4 single-bit lines for
this loader; an 8-bit-wide quad/octal mode is not used here — the loader is
deliberately single-bit so it works with any compatible serial flash and
keeps the boot-state assumptions simple.

Performance achieved (Winbond W25Q128, RCFAST cog clock):

| Size | Program | Boot |
| ---: | ---: | ---: |
| 4 KB | 60 ms | 11 ms |
| 64 KB | 300 ms | 52 ms |
| 256 KB | 1.1 s | 184 ms |
| 512 KB | 2.2 s | 358 ms |

Boot time scales linearly with image size — about **1.4 MB/s** in the read
path, paced by `sysclk/2` and the SPI flash's 100+ MHz tolerance.

## 3. The ROM boot contract

What flash_loader assumes the P2 silicon's ROM does for us at power-up:

1. The ROM probes pin 61 (`spi_cs`) and finds an SPI flash.
2. The ROM **reads bytes `$000000..$0003FF` of the flash into cog $000..$0FF**
   (256 longs = 1 KB), with `JMP #0` as the entry sequence.
3. The ROM verifies a "Prop" checksum: the sum of all 256 longs must equal
   the four ASCII bytes `'P','r','o','p'` (little-endian). On mismatch, no
   jump occurs and the chip stalls.
4. **On entry to our code**: `spi_cs` and `spi_ck` are low outputs, and the
   flash is already streaming bit 7 of the byte at flash address `$400` on
   `spi_do`. This is critical — the loader can pick up reading from `$400`
   without re-issuing an SPI READ command, just by cycling `spi_ck`.
5. **The cog is running RCFAST** (~20 MHz nominal, ranging to roughly 30 MHz
   across process/voltage/temperature; the silicon spec gives a guaranteed
   minimum of 20 MHz). The ROM does not switch clocks; the user's
   `_clkfreq` only takes effect after the loader's final `coginit` hands
   off to the user application. The loader therefore executes its entire
   SPI dance in RCFAST, regardless of what crystal/PLL the user program
   ultimately uses — see §7.9 for why this matters.

The point about the mid-stream SPI read is what makes the loader so compact.
The "Read Data" command to the flash was issued by the ROM, the flash is
mid-stream, and the loader simply *continues* the read.

## 4. The cog image, end-to-end

The flash loader's compiled image (after the programmer has patched it) has
this final layout, which is what gets written to flash addresses `$000..$3FF`:

```
$000 ┌─────────────────────────────────────────────────────────┐
     │ Programmer code (skipped on boot — see §6)              │
     │ ~ instructions $000..app_start-1 in the source file     │
$0?? ├─────────────────────────────────────────────────────────┤
     │ Loader code (lines 232..278 in source)                  │
     │ followed by data: clk2, wmode, app_longs, app_longs2,   │
     │ app_sum, loader_sum                                     │
app_start ───── (= the label "app_start" at the end of source) ──┤
     │ First (256 - app_start) longs of the application        │
$100 ├─────────────────────────────────────────────────────────┤
     │ Remainder of the application                            │
     │ (flash address $400 onward; loaded by the loader at     │
     │  boot, *not* by the ROM)                                │
     │ Padded out to a multiple of 256 bytes with zeros.       │
$??? └─────────────────────────────────────────────────────────┘
```

Why is `app_start` *not* at exactly `$100`? Because the loader code itself
takes some number of longs. `app_start` is wherever the source `app_start`
label lands; everything from `app_start` up to `$100` is the **first
slice** of the user's application, riding along inside the 1 KB ROM load.
Anything beyond `$100` is read in by the loader from flash itself.

**The "Prop" checksum trick.** The label `loader_sum` is initialized in source
to `long -%"Prop"`, then the programmer overwrites it to
`"Prop" - sum_of_first_256_longs` (line 84-85). This makes the sum of all
256 longs equal `"Prop"`, which is exactly what the ROM checks.

---

## 5. Programmer phase walkthrough (`org 0` at line 37 → `coginit #0,#$00000`
   at line 158)

The programmer is executed *exactly once*, by the user's PC tool: the tool
appends the application bytes to the loader image, writes a negative checksum
into long `$004`, downloads the whole blob to the P2 over serial, and the
P2 boots cog 0 from `$0` with our code in place.

### 5.1 Download protocol — what the PC tool must do

Source comment block at top of file:

```
1) Append application bytes at app_start, pad to long alignment.
2) Write negative sum of all longs to long @004.
3) Download all longs to execute flash programmer.
```

The `v` long at `$004` is reserved for this checksum. Once the negative sum
of the entire download (including itself, as zero before patching) sits in
`v`, the sum of all longs in the download is exactly zero. The programmer
verifies that as its first act of work (line 60).

### 5.2 Self-padding the download

```pasm
            getptr  s                   ' size of download in bytes (FIFO pointer)
            setq    #$400/4-1           ' = 255
            wrlong  #0,s                ' write 256 longs of zero at end-of-download
```

`GETPTR` returns the hub address one past the last long the PNut downloader
wrote (the loader's PNut-mode entry leaves the FIFO pointer at end-of-image).
The `SETQ + WRLONG #0,s` then drops $400 zero bytes after the download. This
ensures two things:

* The loader has zero padding after the application — required because the
  loader's last SPI read will round up to a full block.
* The flash gets clean trailing zeros even if the user's application doesn't
  fill the last 256-byte flash page.

### 5.3 Verifying the download checksum

```pasm
            shr     s,#2                ' bytes → longs
            rdfast  #0,#0               ' FIFO from hub $0
            rep     #2,s                ' repeat 2 instructions, s times
            rflong  v
            add     @zeroa/4,v   wz     ' Z=1 iff sum landed at zero
    if_nz   jmp     #@stop/4            ' fail: float pins, stop clock
```

A few P2 patterns worth marking:

* **`REP #2,s`** is a *zero-overhead hardware loop* — no branch penalty. It
  re-issues the next two instructions `s` times. Total: 2*s cycles for the
  whole sum.
* **`@zeroa/4`** is the cog-register address of the symbol `zeroa` (which is
  the loader's `app_longs` field, currently still zero). The `/4` is the
  source-file idiom to convert a hub byte-address — the assembler's view of
  cog labels in this `ORG` block — into a cog long-address. After this `ADD`,
  `zeroa` holds the running sum, and it must equal zero. (`zeroa` will be
  *re-overwritten* with its proper value later, so this scratch use is free.)
* **Failure path goes to `@stop/4`** — the same fault handler the loader
  uses. See §7.5.

### 5.4 Patching the loader's data words

The loader needs four pieces of information that aren't known until the
application is in hand:

```pasm
            loc     ptra,#\@app_longs   ' point at first patch slot
            sub     s,#@app_start/4
            mov     t,s                 ' save # of app longs for relaunch
            wrlong  s,ptra++            ' patch app_longs
            wrlong  s,ptra++            ' patch app_longs2
            rdfast  #0,#@app_start      ' compute app_sum
            rep     #2,s
            rflong  v
            sub     @zerob/4,v
            wrlong  @zerob/4,ptra++     ' patch app_sum (-sum of app longs)
            rdfast  #0,#@loader         ' compute loader_sum
            rep     #2,#$100
            rflong  v
            sub     @zeroc/4,v
            wrlong  @zeroc/4,ptra++     ' patch loader_sum ("Prop"-sum)
```

**Why two copies of `app_longs`?** The loader's reception loop *consumes*
`app_longs` (subtracts blocks from it as it goes). For the post-read
verification, the loader needs the original value, hence `app_longs2`.

**The `zeroa` / `zerob` / `zeroc` overlay trick.** Look at the data declarations
at lines 286–293:

```
zeroa
app_longs       long 0
zerob
app_longs2      long 0
zeroc
app_sum         long 0
x
loader_sum      long -%"Prop"
```

Each "zero" label aliases the next data long. Before the programmer patches
them, they read as zero — perfect scratch storage. They're used as the
checksum accumulators (`@zeroa/4`, `@zerob/4`, `@zeroc/4`) during phase A
and then *immediately overwritten* with the real values. This is a beautiful
example of a P2 idiom: **dead-on-arrival storage doubles as scratch**.

### 5.5 Sizing the flash write

```pasm
            add     s,#app_start        ' total longs to write to flash
            add     s,#$3F              ' round up
            shr     s,#6                ' to 256-byte pages
            fge     s,#4                ' min 4 pages (1 KB) for loader+Prop
```

Always at least 4 pages because the 1 KB loader region must be programmed
in full — even a trivial application gets 1 KB written.

### 5.6 Smart-pin & streamer setup for writes

```pasm
            drvh    #spi_cs                          ' deselect (and pre-set)
            fltl    #spi_ck                          ' float spi_ck (reset smart pin)
            wrpin   #%01_00101_0,#spi_ck             ' transition output, OE
            wxpin   #1,#spi_ck                       ' base period = 1 clock per edge
            drvl    #spi_ck                          ' enable smart pin, drives low
            drvl    #spi_di                          ' pre-set data low
            setxfrq @clk2/4                          ' streamer NCO = sysclk/2
            rdfast  #0,#@loader                      ' FIFO sourced at @loader
```

What's happening at the hardware level:

* **`wrpin #%01_00101_0`** = `P_OE | P_TRANSITION` written to `spi_ck`'s
  smart pin config. Mode `%00101` (transition output) toggles the pin every
  `WXPIN` clocks.
* **`wxpin #1`** = 1 system clock per transition. With WYPIN giving an
  *edge* count, this means the SCK frequency is `sysclk/2`.
* **`setxfrq @clk2/4`** writes `$4000_0000` to the streamer NCO. Output
  frequency = `(D × sysclk) / 2^32` = `sysclk/2`. So the streamer outputs one
  data bit every two system clocks — *one bit per SCK transition*. This is
  the synchronization key: SCK toggles each clock-pair and the streamer
  presents one bit each clock-pair. They never have to talk to each other.
* **`rdfast #0,#@loader`** starts the hub FIFO at the loader's hub address.
  Subsequent streamer commands of type `X_RFBYTE_*` (i.e. `rmode`) pull from
  this FIFO.

### 5.7 The block/erase/page loop

```pasm
.block      cmp     s,#$40      wcz   ' ≤64 pages? then 4KB erase
    if_be   setd    .cmd,#$20         ' patch the erase opcode...
    if_be   sets    .tst,#$0F         ' ...and the boundary mask

            callpa  #$06,#spi_cmd1    ' write-enable
.cmd        callpa  #$D8,#spi_cmd4    ' erase block ($D8=64KB, $20=4KB)
            call    #spi_wait         ' poll status until !busy
.page       callpa  #$06,#spi_cmd1    ' write-enable
            callpa  #$02,#spi_cmd4    ' page-program command + address
            xinit   rmode,pa          ' streamer: 256 bytes from hub → spi_di
            wypin   tranp,#spi_ck     ' 256*8*2 = 4096 SCK edges
            waitxfi                   ' streamer done (about 4 kclocks)
            call    #spi_wait         ' wait for flash to finish writing
            djz     s,#.done          ' last page?
            add     @zeroa/4,#$0001   ' bump page number
.tst        test    @zeroa/4,#$00FF  wz
    if_nz   jmp     #.page            ' still inside current erase block
            jmp     #.block           ' new erase block needed
```

Things to notice:

* **Self-modifying erase strategy.** The instruction at label `.cmd` is the
  erase opcode — `SETD` overwrites its D field to switch between $D8 (64KB
  erase, ~140 ms) and $20 (4KB erase, ~25 ms) based on how much we have to
  write. The boundary mask at `.tst` is similarly patched: $0F means
  "rolled over a 16-page = 4KB boundary," $FF means "rolled over a 256-page
  = 64KB boundary." A *single* compare drives a *whole* policy change in
  the loop.
* **`@zeroa/4` is the page counter.** Yes — the same long that held the
  download-checksum accumulator and *will* hold `app_longs` after the next
  store, is right now being used as the running page address. Three lives,
  same long.
* **Streamer + smart pin in parallel.** This is the hot loop. The streamer
  is configured (`rmode` = `$8081_0800 + spi_di<<17` — 1-pin output, MSB-first,
  256 bytes from hub) to shift bits out on `spi_di`, paced by its own NCO.
  The smart pin on `spi_ck` is told to make 4096 edges. The cog issues both
  starts back-to-back (two `XINIT`/`WYPIN`-style instructions) and then
  blocks on `WAITXFI` while ~4 k cycles of zero-CPU-cost SPI clocking and
  shifting happens in hardware.

### 5.8 Move application down to $00000 and relaunch

```pasm
            mov     ptra,#@app_start
            mov     ptrb,#0
            shr     t,#9                ' t = app longs / 512
.move       setq2   #$200-1
            rdlong  0,ptra++            ' hub → LUT
            setq2   #$200-1
            wrlong  0,ptrb++            ' LUT → hub
            djnf    t,#.move
            coginit #0,#$00000          ' restart cog 0 from $0
```

After programming the flash, the cog still has the original download in
hub RAM starting at `@app_start`. The user expects the application to run
*now* (no power-cycle needed). So we shuffle it down to hub address 0.

* **`SETQ2` + `RDLONG 0, ptra++`** is the LUT block-load form — 512 longs
  from hub into LUT $0 in one shot.
* **`SETQ2` + `WRLONG 0, ptrb++`** dumps LUT $0 back to hub. With 512
  longs = 2 KB per pass, this is a hub-bandwidth-limited memcpy.
* **`djnf t,#.move`** = "decrement, jump if not full" — *post-decrement*
  variant that continues until `t` underflows. Note: `djnf` jumps when the
  result is **not** $FFFFFFFF, then falls through on underflow. This subtle
  choice — versus `djnz` — handles the case where `t` was zero on entry
  (small app that already fits in the first 512 longs).

The `coginit #0,#$00000` restarts cog 0 reading code from hub $0. The
programmer's job is done; the user's application is running.

---

## 6. Loader phase walkthrough (`org` at line 227 → `coginit` at line 278)

The loader is what the boot ROM jumps to on every power-up. On entry, it
*is* the entire cog image: code at $0..$0FF.

### 6.1 First move — the bootstrapped application slice

```pasm
loader      setq    #$100-app_start-1   ' count: longs from app_start to $0FF
            wrlong  app_start,#0        ' bulk-write to hub $0
            sub     app_longs,#$100-app_start  wcz
    if_be   coginit #0,#$00000          ' tiny app — already complete
```

The slice of the application that rode along inside the 1 KB cog image
(cog `app_start..$0FF`) is moved to hub `$0..` via `SETQ` block write. If the
whole application fit in that slice (`app_longs <= $100-app_start`), we're
done — the ROM's "Prop" checksum already covered the entire app. Restart
cog 0 and go.

### 6.2 Continued SPI read for the remainder

```pasm
            wrpin   #%01_00101_0,#spi_ck    ' transition output
            fltl    #spi_ck
            wxpin   #1,#spi_ck
            drvl    #spi_ck                 ' enable
            setxfrq clk2                    ' sysclk/2 NCO
            wrfast  #0,##$400-app_start*4   ' FIFO writes hub at end of slice
```

Same SCK setup as the programmer. **But this time the streamer reads bits
*in*, and the FIFO writes them to hub.** `WRFAST` configures the hub FIFO
for sequential writes starting where the bootstrapped slice ended (`$400 -
app_start*4` bytes into hub).

### 6.3 The block-by-block read loop — what's the max block?

```pasm
.block      bmask   x,#10               ' x = $7FF (2047 longs)
            fle     x,app_longs         ' clamp to remaining
            sub     app_longs,x
            shl     x,#5                ' #bits in this block
            setword wmode,x,#0          ' patch streamer count into wmode
            shl     x,#1                ' #edges = 2 * #bits
            wypin   x,#spi_ck           ' start SCK edges
            waitx   #3                  ' align SCK edge with sample
            xinit   wmode,#0            ' streamer starts inputting bits
            waitxfi
            tjnz    app_longs,#.block
            wrpin   #0,#spi_ck          ' shut down spi_ck smart pin
```

**Block size choice.** `bmask x,#10` puts $7FF in `x`. Why 2047 longs?
Because the streamer's transfer-count field accepts up to 16 bits, and
`x << 5` (= ×32 bits per long) must fit. With 2047 longs we get 65504
bits, comfortably under 65536. This is the **largest single XINIT** that
will work in long-count terms.

**The `WAITX #3` alignment.** This is the single most under-documented line
in the whole file:

```pasm
            wypin   x,#spi_ck           ' Cmd: start N SCK transitions
            waitx   #3                  ' (2+3=5 cycles align edge w/ sample)
            xinit   wmode,#0            ' streamer begins sampling spi_do
            waitxfi
```

Why 3 cycles? The smart pin takes 2 clocks to act on `WYPIN`; the streamer
takes 2 clocks to honor `XINIT`. We have to ensure that the first sample
the streamer takes is *after* the flash has presented a fresh bit (which
happens on a falling SCK edge for this flash mode). The `WAITX #3` pads
out the pipeline so the streamer's first read aligns with the *middle* of
a `spi_do` bit cell. This is fragile timing — change SCK rate or NCO and
you have to rebalance.

**Self-patching the streamer mode.** `setword wmode,x,#0` jams the new
bit-count into the low word of the streamer mode word stored at `wmode`.
`wmode = $C081_0000 + spi_do<<17`. The `$C081_0000` upper nibble
%1100 selects "1-pin input → WFBYTE (FIFO write byte)"; the `0001_0000`
adds X_ALT_ON (MSB-first); the `0000_0080_0000` (`8` bit in nibble at $2x000)
adds X_PINS_ON (or X_WRITE_ON in input form — same bit, meaning depends on
direction). Result: a fully-formed streamer command, freshly sized for
this iteration.

### 6.4 Verify checksum

```pasm
            rdfast  #0,#0
            rep     #2,app_longs2
            rflong  x
            add     app_sum,x   wz      ' Z=1 on success
stop  if_nz fltl    #spi_di addpins 2   ' float spi_di, spi_ck, spi_cs
      if_nz hubset  #%0010              ' stop clock
            coginit #0,#$00000          ' verified — run app
```

On success: restart cog 0 from hub $0 — the application runs.

On failure: §7.5.

---

## 7. P2 architectural notes worth extracting

These are things the flash loader teaches us about the P2 — patterns, gotchas,
and idioms that aren't always obvious from reading instruction reference docs.

### 7.1 Streamer + smart-pin as a 2-channel DMA

The strongest pattern in this file. SPI is fundamentally one data stream and
one clock stream that must stay in lockstep. The loader gives:

* **Smart pin in P_TRANSITION mode** = "I will toggle this output exactly N
  times at base rate X." Fire-and-forget edge generation.
* **Streamer with NCO at sysclk/2** = "I will move bits between hub and a
  pin at rate sysclk/2." Fire-and-forget data movement.

Once both are kicked off, the cog is free for the duration. The only
synchronization is the `WAITX #3` calibration; after that, both channels
run to completion in parallel and meet at `WAITXFI`. This is essentially a
zero-CPU SPI engine.

### 7.2 The streamer's input direction uses WRFAST, not RDFAST

Easy to get backwards: when the streamer pulls bytes *from* pins, those
bytes go to hub via the FIFO — and the FIFO must be in **write** mode.
Hence `WRFAST` before the input phase. Symmetrically, the programmer used
`RDFAST` before output. This is documented in the silicon doc but rarely
spelled out as "input streamer = WRFAST".

### 7.3 `HUBSET #%0010` is a fail-safe halt

Source bits `%10` mean "use XI pin (crystal/external)." On a board with no
external crystal driving XI, this *stops the clock* — the cog stalls and
the chip is effectively dead until a hardware reset. The flash loader uses
this as its "checksum failed, stop everything" response. It's not
documented as "halt" anywhere; it's a *behavioral consequence* of switching
to a clock source that isn't running. This deserves to be called out
explicitly in any P2 reference.

### 7.4 `FLTL D ADDPINS N` floats a pin range

The `ADDPINS` operator (Spin2 syntax that becomes `D + N<<6` at assembly
time) packs a pin-range count into bits [10:6] of the destination operand.
`fltl #spi_di addpins 2` floats *three* contiguous pins (base + 2 more),
not just two. Combined with the pin assignments here:

```
spi_di = 59
spi_ck = 60
spi_cs = 61
```

…this single instruction floats pins 59, 60, 61 in one cycle — all three
SPI outputs the P2 was driving. `spi_do` (pin 58) is already an input,
so it's untouched.

### 7.5 The dual-purpose data slots (`zeroa` / `zerob` / `zeroc`)

A long that is *guaranteed* to be zero on entry and *will be overwritten
later* is free scratch storage. The loader needs `app_longs`, `app_longs2`,
`app_sum`, `loader_sum` to be patched-in values at runtime — but during
the programmer's run, those longs are still zero and aren't used as code,
so they make perfect accumulators for checksum work. This is a deeper
form of register-allocation thrift than most code uses.

### 7.6 Self-modifying erase-strategy switch

The instructions at labels `.cmd` (the erase opcode) and `.tst` (the
boundary mask) are patched once per outer loop iteration via `SETD` and
`SETS`. This avoids two branches and two duplicate code paths for 64 KB
vs. 4 KB erasing. On the P2, where any cog register can be both code and
data, this is idiomatic; on most CPUs it would be a red flag.

### 7.7 The "Prop" magic number

The boot ROM's checksum target — the four ASCII bytes for "Prop" — is
expressed in source as `-%"Prop"` (a four-char string literal as an
integer, negated). The loader stores
`loader_sum = "Prop" - sum_of_first_256_longs`, and the ROM verifies that
the sum of all 256 longs equals `%"Prop"`. This is the *only* integrity
check that the ROM performs; everything more sophisticated happens in our
loader.

### 7.8 The "FIFO pointer is a download size" trick

`GETPTR` returns the FIFO pointer. PNut's serial download mode leaves the
FIFO pointing at the end of the just-written hub area. Using this as the
download size (line 50) is a tight, idiomatic way to discover "how much
data just got loaded" without any explicit handshake. Worth knowing
whenever you write code that runs as a one-shot loader.

### 7.9 Why sysclk/2 in RCFAST — clock-mode-agnostic by design

The loader executes entirely in **RCFAST** (see §3, item 5). This is a
deliberate architectural choice, not an incidental fact: the ROM hands off
in RCFAST, the loader never issues a `HUBSET` to change clock source, and
the user's `_clkfreq` only takes effect after the final `coginit` to the
user application.

Running the loader in RCFAST makes it **clock-mode-agnostic**: the same
code, with the same fixed timing, works regardless of what final
crystal/PLL configuration the user's program ultimately selects. No
retiming, no PLL-stable wait, no upper-bound check on sysclk is required.
The loader simply doesn't need to know.

The SCK rate falls out of this naturally. At RCFAST, sysclk is in the
20–30 MHz range, so SCK = sysclk/2 is roughly 10–15 MHz — comfortably
below the W25Q128's 100+ MHz tolerance. **The flash is always faster than
the loader can talk; the loader is always slow enough to never overrun
the flash.** That comfort margin is what lets the loader avoid any
runtime decision about clock rate or sample retiming.

**The lockstep math.** `SETXFRQ` with `$4000_0000` makes the streamer
present one bit per two sysclks. The smart pin in transition mode with
`WXPIN #1` toggles SCK once per sysclk — i.e. one full SCK cycle per two
sysclks. Result: exactly one SCK cycle per streamer bit, which is what
SPI demands. Crank the SCK rate (e.g., `WXPIN #2` for sysclk/4) and you
*must* halve the streamer NCO (`$2000_0000`) to keep them in lockstep.
Otherwise bits drop or duplicate. Within the RCFAST range, these
constants need no adjustment.

### 7.10 Block-size ceiling of $7FF longs

`bmask x,#10` → $7FF reflects the streamer's transfer-count maximum:
2047 longs × 32 bits/long = 65504 bits, just under the 16-bit field's
65536 cap. Anyone writing a large-transfer streamer driver needs to chunk
above this threshold.

---

## 8. P2KB gaps surfaced by this study

While studying the loader against the P2 Knowledge Base, the following
gaps and improvements emerged. Each is something an LLM (or a human
reader) consulting P2KB on a flash-related question would currently fail
to find.

### 8.1 No "Boot ROM / SPI Flash Boot" entry exists

P2KB has zero hits for `flash`, `boot`, `boot ROM`, or `prop checksum`.
A new entry should cover:

* The ROM's autoprobe of SPI flash at pins 58–61.
* The fixed 256-long load from flash `$000..$3FF` into cog `$000..$0FF`.
* The "Prop" checksum requirement (sum of 256 longs = ASCII "Prop").
* The post-load state: `spi_cs` and `spi_ck` low outputs, flash streaming
  bit 7 of byte at `$400` on `spi_do`, ready to continue.
* The `JMP #0` entry point.

This is the foundational fact-set for anyone writing a flash-resident P2
application; its absence is the largest gap.

**Proposed key:** `p2kbArchBootRomSpiFlash` (or `p2kbHwBootProtocolSpiFlash`).

### 8.2 HUBSET clock-source bits should explicitly document "halt"

`p2kbPasm2Hubset` lists clock-source bits `00=RCFAST, 01=RCSLOW, 10=XI,
11=PLL` and explains PLL switching cleanly. It does **not** mention that
switching to XI on a board with no crystal *halts the chip* — and that
this is a deliberate fail-safe technique. Add a note:

> **Halt technique:** Writing `HUBSET #%0010` (XI source) on a board
> without an active external clock signal stops the system clock until
> the next reset. Used by `flash_loader.spin2` as a fault response when a
> checksum fails — guarantees no errant code can run.

### 8.3 Streamer/smart-pin synchronization recipe needs a concrete SPI worked example

`p2kbPasm2StreamerSmartpinControl` correctly emphasizes "Smart Pins MUST
start (DIRH) before XINIT" — but the *timing* relationship between the
streamer's NCO frequency and the smart pin's `WXPIN` base period is not
explicit. Add a section like:

> **Bit/edge lockstep:** For 1-pin synchronous serial output via streamer
> paced by a `P_TRANSITION` clock pin:
>
> * Smart pin: `WXPIN #N` → toggles every N sysclks.
> * Streamer: `SETXFRQ ##(2^32 / (2N))` → one bit per 2N sysclks.
>
> The factor of 2 is because `WYPIN`'s count is *edges*, not full cycles.
> One full SCK cycle = two edges = one streamer bit. Mismatched rates
> cause silent bit-drop or duplication.

### 8.4 The streamer's input direction uses WRFAST — call this out

`p2kbPasm2Wrfast` and the streamer pages describe what each does
independently, but no entry makes the cross-link: **streamer pin → hub
mode requires WRFAST setup beforehand, streamer hub → pin mode requires
RDFAST.** This is exactly the kind of thing that bites newcomers. A
short note in both `Rdfast` and `Wrfast` entries cross-referencing the
streamer-input/output direction would help.

### 8.5 Streamer maximum block size per XINIT not documented

The 2047-long ceiling per single `XINIT` for FIFO-sourced/-sunk bit
streams isn't called out. A note in `p2kbPasm2Xinit` and the streamer
modes doc would prevent the same head-scratching the next reader will do.

### 8.6 `ADDPINS` encoding for pin-range operations under-explained

`p2kbSpin2OpOpADDPINS` is a one-line stub. The 5-bit count field in
Dest[10:6] and its effect on `FLTL` / `DRVH` / `DRVL` / `DIRH` / `DIRL` —
"affects N+1 contiguous pins" — deserves at least a sentence with the
encoding shown. The flash loader uses this to float three pins in one
instruction; that's a non-obvious power tool.

### 8.7 `getptr` as a "size of just-downloaded data" idiom

`p2kbPasm2Getptr` documents the mechanism (returns FIFO pointer) but
not the most common application: at end-of-download in a serial-loaded
PNut program, `GETPTR` reveals how many bytes were just received.
A one-line "**Common use:**" note would be enough.

### 8.8 The `zero`-aliased-scratch pattern is unique enough to deserve a P2-idioms page

P2KB doesn't currently have a "P2 PASM2 idioms" page. The flash loader
demonstrates several:

* Dead-on-arrival data longs as checksum accumulators.
* SETD/SETS self-modification of inner-loop instructions.
* `DJNF` vs `DJNZ` for "process at least one and handle zero".
* `REP` for tight zero-overhead accumulation.

A consolidated "p2kbPasm2Idioms" entry pointing at concrete examples
would help LLMs recognize and emit these patterns.

---

## 9. Optimization opportunities — an honest pass

> **Context.** This loader is authored by Chip Gracey, the P2's designer.
> The bar for "improvement" is extremely high. This section reports what
> a serious instruction-by-instruction review actually turned up — short
> answer: **very little**, and what little exists comes with caveats. The
> section is included for completeness; treat it as "things to consider
> *if* you ever need a few more bytes of user-app space," not as a punch
> list.

### 9.1 What's worth optimizing — and what isn't

Only the **loader** matters for user-app space. The 1 KB ROM-loaded
region holds: loader code + loader data + first slice of the user
application. Every long saved in the loader becomes one more long of
application that can fit in the bootstrapped slice (and therefore in
even a flash-less serial-download deployment).

The **programmer** lives only at flash-write time. Its code is *not*
written to flash and does not survive a power-cycle, so cutting bytes
from it only marginally reduces serial-download size and has no impact
on flash-resident application size. Out of scope for this section.

Loader total cost today: ~29 instructions + 6 data longs ≈ 35 longs
(of 256 available). Note this excludes the bootstrapped app slice —
the user app gets `256 - app_start` longs of "free" space, where
`app_start` lands wherever the loader's code+data ends.

### 9.2 Candidate savings (each ≤ 1 long)

| # | Change | Saves | Risk | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Drop `wxpin #1,#spi_ck` line 243 | 1 long | **High** — depends on what X=0 means for transition mode. The smart-pin doc says "each edge occurs after X[15:0] clocks." If X=0 means "every clock" (== period 1), the line is redundant. If X=0 means "65536 clocks" (full-field), removal breaks SPI timing silently. | **Do not apply without silicon-spec verification on real hardware.** |
| 2 | Drop `wrpin #0,#spi_ck` cleanup at line 265 | 1 long | Medium — the next code to run is the user application via `coginit #0,#$00000`. If the user app uses pin 60 for any non-SPI purpose, it inherits a configured smart pin in transition mode. Most apps don't touch pin 60; defensive cleanup is cheap insurance. | Probably keep. |
| 3 | Drop `if_nz fltl #spi_di addpins 2` at line 275 (the float-pins-on-fault line) | 1 long | Low/medium — after the SUB succeeds, `if_nz hubset #%0010` halts the cog. The three SPI output pins remain driven LOW (their state when the smart pin last drove them). Functionally fine; the flash chip stays in idle-with-CS-asserted, which it tolerates indefinitely. Minor extra power, very minor risk if another circuit on the board pulls these pins. | Defensible either way. Removing it weakens the "no errant pin state on fault" guarantee. |

**Maximum realistic savings: ~3 longs / 12 bytes** of additional user-app
space, only if #1 turns out to be safe.

### 9.3 Things checked and *not* worth doing

These were considered and rejected on careful examination:

* **Inline `clk2` via AUGS.** Replace `setxfrq clk2` + `clk2 long
  $4000_0000` (2 longs total) with `setxfrq ##$4000_0000` (AUGS + SETXFRQ,
  also 2 longs). Same cost; no saving. Slight readability trade-off
  either way.
* **REP the `.block` read loop.** `REP` requires a fixed block size and
  a count that doesn't change inside the body. The loop body needs
  per-iteration `bmask/fle/sub` to clamp the last (possibly short)
  chunk. Restructuring to "always max chunk + separate remainder
  handler" produces *more* code, not less.
* **SETD on the XINIT instruction instead of SETWORD on `wmode`.** The
  streamer mode word packs bit-count *inside* the 32-bit mode value, so
  the patch target is one word inside one long; SETWORD on a data long
  is exactly as cheap as SETD on the instruction. Same cost.
* **Eliminate `app_longs2` by stashing `app_longs` to LUT, hub, or a
  spare register.** Every recovery path costs at least one extra
  instruction to read it back, exactly offsetting the saved data long.
  Net zero, with added complexity.
* **Replace `wrfast #0,##$400-app_start*4` with a register-built
  pointer.** Currently 2 longs (AUGS + WRFAST). A `mov ptra,##expr` +
  `wrfast #0,ptra` is 3 longs. Worse.
* **Merge `fltl + drvl`.** Different ops with different effects (DIR=0
  with reset vs. DIR=1 with low output). Cannot combine.
* **Use `jmp #\0` instead of `coginit #0,#$00000` at the final exit.**
  `jmp #\0` would start hub-exec at hub $0 — but the user's application
  may be cog-exec code. `coginit #0,#$00000` correctly reloads the cog
  from hub $0..$3FF and starts cog-exec at $0. This is the right
  instruction; no substitute saves bytes safely.

### 9.4 Stylistic observation (no space change)

The programmer and loader perform the **same SPI-CK smart-pin init dance
in different orders**:

| Where | Order |
| --- | --- |
| Programmer, lines 100-103 | `FLTL → WRPIN → WXPIN → DRVL` |
| Loader, lines 241-244 | `WRPIN → FLTL → WXPIN → DRVL` |

Both work, because FLTL eventually drives DIR=0 (the gate for latching
new WRPIN config when DRVL re-asserts DIR=1). The asymmetry is a
readability papercut, not a correctness issue, and unifying them costs
zero bytes. Worth fixing if the file is ever revised, just to remove
"is this difference meaningful?" doubt for future readers.

### 9.5 Why the loader is hard to beat

Every single byte in the loader earns its keep. Examples already in §7
that double as "why this code is small":

* `zeroa/zerob/zeroc` aliasing (§7.5) — three data longs do double duty
  as scratch accumulators during the programmer's run, then are
  overwritten with their permanent values. No separate scratch space
  is needed.
* `x` aliased to `loader_sum` (line 292) — a fourth instance of the
  same trick. Loader scratch register `x` IS the `loader_sum` data
  long; the loader is never in scope when `loader_sum` matters
  (loader_sum matters only to the ROM checksum, computed once and
  forever fixed).
* The `.block` loop is a hardware-DMA pattern — the cog mostly waits at
  `WAITXFI` while the streamer and smart pin do the actual work. Adding
  more cog-side compute wouldn't make it faster.
* `app_longs` is reused as the read-loop's countdown variable *and* the
  small-app early-exit condition's source (the same SUB does both).
* The "Prop" checksum is a single XOR-style correction long, not a
  block of integrity metadata.

### 9.6 Bottom line

If you must squeeze, candidates #2 and #3 above are the only ones I'd
seriously consider (saving ~2 longs, ~8 bytes, with acceptable risk).
Candidate #1 needs silicon-spec or hardware-test confirmation first.
Everything else either breaks correctness, breaks readability without
saving bytes, or both.

For context: 12 bytes additional app space in the bootstrapped slice
matters only for *very* small applications that are right at the
`256-app_start` long boundary. For any application larger than the
boot slice anyway, the loader pulls the rest from flash and the slice
size doesn't constrain total app size. So these optimizations help only
a narrow class of "almost-fits-in-bootstrap-but-not-quite" apps.

---

## 10. Checklist for "is the loader still correct?" reviewers

If you ever touch this file, verify *every* one of these still holds:

- [ ] Both halves still fit in 256 cog registers (`app_start` ≤ $100).
- [ ] `loader_sum`'s patched value really makes the 256-long sum equal
      `%"Prop"`.
- [ ] `app_longs`, `app_longs2`, `app_sum` are written **before** any code
      that reads them (loader's first read is `app_longs` on line 235).
- [ ] The four "zero" labels still alias the four data longs in declaration
      order — moving one without adjusting both will silently corrupt
      checksums.
- [ ] The streamer NCO (`clk2` = `$4000_0000`) and SCK base period
      (`WXPIN #1`) still match — see §7.9.
- [ ] The loader is never reclocked mid-execution. The `WAITX #3`
      SPI-read alignment is calibrated for RCFAST (the loader's only
      operating regime — see §7.9); inserting any `HUBSET` that changes
      clock source inside the loader will silently break this alignment.
      The loader exits to user code via `coginit` *before* any user
      clock-mode change can occur.
- [ ] The block-size cap (`bmask x,#10` = $7FF longs) is still ≤ 2047 if
      you change the streamer width.

---

## 11. Source pointers

| Subject | Source file |
| --- | --- |
| The loader code (this doc) | `src/ext/flash_loader.spin2` |
| Compiler invocation that uses it | `src/classes/compiler.ts` (search for `flash_loader`) |
| PNut-TS `-FLASH` CLI flag | `src/pnut-ts.ts` |
| P2 Knowledge Base entries cited | `p2kbArchSpiImplementationGuide`, `p2kbPasm2StreamerSmartpinControl`, `p2kbPasm2Xinit`, `p2kbPasm2Setxfrq`, `p2kbPasm2Rdfast`, `p2kbPasm2Wrfast`, `p2kbPasm2Hubset`, `p2kbPasm2RepInstruction`, `p2kbArchSmartPin00101TransitionOutput`, `p2kbSpin2StreamerSymbols`, `p2kbPasm2ExecutionModes` |
