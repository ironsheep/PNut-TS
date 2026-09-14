# Error Handling Usage Guide

## Overview

Spin2 signals errors with `ABORT` and catches them with the backslash trap
operator, `\`. An `ABORT` stops the current method and unwinds through its
callers until it reaches a call that was made with `\`. Execution continues
there.

Three facts govern everything else in this guide:

- **A trapped call produces one value: the abort value, or 0.** If the call
  aborts, the trap gives the abort value (0 for a bare `ABORT`). If the call
  completes normally, the trap gives **0**. The method's own results never come
  back through a trap.
- **An `ABORT` travels to the nearest trap and stops there.** It passes through
  any number of untrapped calls, skipping the rest of each. To send it further,
  the handler must `ABORT` again.
- **An `ABORT` that nothing traps stops the task or cog it is running in.**
  Other cogs, and other tasks in the same cog, keep running. The abort value is
  lost.

> **Correction.** Earlier revisions of this guide said that a trapped call
> returns the method's normal result when no `ABORT` occurs, and that an
> untrapped `ABORT` terminates the program. Both were wrong, and several
> patterns built on the first claim did not work. This revision is checked
> against the Spin2 v55 interpreter source and this compiler's output, and every
> behavior it describes was confirmed on P2 hardware: trap values, normal
> completion under a trap, propagation, stack integrity across 10,000 aborts, and
> an untrapped `ABORT` stopping only its own cog or task.

## Basic Usage

Because a trap gives 0 on success, a method that can abort returns its data
some other way — here through a pointer — and the trap's value is the error
code:

```spin2
CON
  ERR_BAD_CHANNEL = -1

PUB main() | level, err
  err := \read_channel(3, @level)
  if err
    debug("read failed: ", sdec(err))
  else
    debug("pin 3 reads ", sdec(level))

PRI read_channel(channel, pLevel)
  if channel < 0 or channel > 7
    abort ERR_BAD_CHANNEL
  long[pLevel] := pinread(channel)
```

`err` is 0 when `read_channel` completes, and `ERR_BAD_CHANNEL` when it aborts.
Use non-zero abort codes: a trap cannot tell `ABORT 0` from success.

## Syntax / Forms

### `ABORT`

```spin2
ABORT
```

Stops the method and unwinds to the nearest trap. A trap that wants a value
receives 0.

### `ABORT expression`

```spin2
ABORT expression
```

Stops the method and unwinds to the nearest trap. A trap that wants a value
receives the expression's value — any 32-bit value, including `NEGX` and
`POSX`. `ABORT` carries exactly one value:

```spin2
PUB main()
  abort 1, 2
```

```
error:Expected end of line (m281)
```

### Statement trap: `\method()`

```spin2
\method()
```

Calls the method with a trap and discards the outcome. An `ABORT` inside the
call stops here, its value is thrown away, and execution continues with the next
statement. If the method completes normally, its results are thrown away too.

### Value trap: `x := \method()`

```spin2
x := \method()
```

The trap produces a single value:

| What the called method does | Value of `\method()` |
|---|---|
| Completes normally | `0` |
| `ABORT expression` | the expression's value |
| `ABORT` | `0` |

This holds however many results the method declares — none, one, or several.
It is why a method with no results may be trapped as a value, although calling
it untrapped as a value is an error:

```spin2
PUB main() | x
  x := \log_event()     ' accepted: the trap supplies the value
  x := log_event()      ' rejected

PRI log_event()
  debug("event")
```

```
error:This method returns no results
```

For the same reason a trapped call cannot feed a multiple assignment. For a
method `PRI two() : a, b`:

```spin2
x, y := \two()
```

```
error:Expected ","
```

A value trap is an ordinary term and can appear anywhere in an expression. The
rest of the expression is evaluated normally:

```spin2
total := 1000 + \step()     ' 1000 + abort value, or 1000 if step() completes
```

### Trapping object methods and method pointers

```spin2
err := \sensor.read()
err := \sensors[i].read()
err := \pHandler(arg):1
```

The trap rules are the same for every call form. For a method pointer, the
`:results` count describes the target method; a trapped pointer call still
produces one value.

## Propagation

When an `ABORT` executes:

1. The current method stops. Nothing after the `ABORT` runs.
2. Each untrapped caller is abandoned in turn. Nothing after the call runs in
   any of them, including the rest of an expression the call was part of.
3. At the first call made with `\`, execution resumes in that caller. Its local
   variables, and the part of the expression it had already evaluated, are
   intact.
4. If no call on the way up was trapped, the task stops. If it was the only
   task in its cog, the cog stops.

```spin2
PUB main() | err
  err := \level_1()
  debug("level_1 gave ", sdec(err))   ' prints -99

PRI level_1() : val
  val := level_2() + 10               ' abandoned: the + 10 never happens

PRI level_2() : val
  val := level_3() + 5                ' abandoned

PRI level_3() : val
  abort -99
```

### A trap stops propagation

```spin2
PUB main() | err
  err := \outer()
  debug("outer gave ", sdec(err))     ' prints 0 - outer() completed

PRI outer() : r
  \helper()                           ' catches helper's ABORT and discards it
  r := 1

PRI helper()
  abort -1
```

To pass an error further up, catch it and `ABORT` again:

```spin2
PUB main() | err
  err := \outer()
  debug("outer gave ", sdec(err))     ' prints -2

PRI outer() : r | err
  err := \helper()
  if err
    abort err * 2

PRI helper()
  abort -1
```

### Where an untrapped `ABORT` ends

Every cog and every task starts its top-level method as if it had been called
with a trap. An `ABORT` that reaches that level ends the top-level method, which
stops the task — or the cog, if no other task is running in it. A top-level
method therefore cannot catch its own `ABORT`; wrap the work in a method and
trap the call.

From outside, `COGCHK(cog)` reads -1 while a cog runs and 0 once it has
stopped, and `TASKCHK(task)` reads 0 for a stopped task. Neither tells you
*why* it stopped, and the abort value is gone.

## Patterns

### Error code out, data through a pointer

The Basic Usage example is the general shape: the trap carries the error, and
results travel through a pointer or a `VAR` variable.

### Detecting any abort, including `ABORT 0`

A value trap reads 0 both for success and for a bare `ABORT`. When a method may
abort without a code, have it set a flag as its last action:

```spin2
VAR
  long done

PUB main() | err
  done := false
  err := \calibrate()
  if not done
    debug("calibration aborted, code ", sdec(err))

PRI calibrate()
  if pinread(12) == 0
    abort                             ' no code - only the flag reveals it
  done := true
```

### Clean up, then pass the error on

```spin2
PUB main() | err
  err := \transmit()
  if err
    debug("transmit failed: ", sdec(err))

PRI transmit() | err
  pinhigh(20)                         ' claim the bus
  err := \send_frame()
  pinlow(20)                          ' release it on every path
  if err
    abort err

PRI send_frame()
  if pinread(21)
    abort -5                          ' bus busy
  pintoggle(22)
```

### Retry

```spin2
CON
  ERR_TIMEOUT = -2

PUB main() | err, value
  err := \read_with_retry(@value)
  if err
    debug("gave up: ", sdec(err))
  else
    debug("value ", sdec(value))

PRI read_with_retry(pValue) | attempt, err
  repeat attempt from 1 to 3
    err := \read_device(pValue)
    if err == 0
      return
    waitms(100)
  abort err

PRI read_device(pValue)
  if pinread(16) == 0
    abort ERR_TIMEOUT
  long[pValue] := pinread(17)
```

### Supervising a cog

A cog's top-level method cannot catch its own `ABORT`, so trap its work one
level down and record the result where the starting cog can read it:

```spin2
VAR
  long workerError
  long workerStack[64]

PUB main() | cog
  cog := cogspin(NEWCOG, worker(), @workerStack)
  waitms(500)
  if workerError
    debug("worker failed: ", sdec(workerError))

PRI worker()
  workerError := \worker_body()
  repeat                              ' stay alive so the error can be read

PRI worker_body()
  if pinread(8) == 0
    abort -7
  pinhigh(9)
```

## Anti-patterns

### Reading a result through a trap

```spin2
' WRONG: the trap gives 0 whenever read_level() completes
PUB main() | level
  level := \read_level()
  debug("level ", sdec(level))        ' always 0 on success

PRI read_level() : level
  if pinread(4) == 0
    abort -1
  level := pinread(5)
```

The trap replaces every normal result with 0, so this prints 0 for every
successful read. Return data through a pointer or `VAR` variable, as in Basic
Usage, and use the trap only for the error code.

### Treating 0 as "no abort"

```spin2
' WRONG (snippet): ABORT with no value is indistinguishable from success
PRI check_sensor()
  if pinread(6) == 0
    abort                             ' caller's trap reads 0 - same as success
```

Give every abort a non-zero code, or use a completion flag as shown in Patterns.

### An untrapped `ABORT` in a cog

```spin2
' WRONG (snippet): an ABORT anywhere below monitor() stops this cog silently
PRI monitor()
  repeat
    sample()                          ' if sample() aborts, the cog stops
    waitms(10)
```

Nothing reports the stop. Trap the call inside the loop (`err := \sample()`) and
decide what to do with the code.

### Swallowing errors with a statement trap

```spin2
' WRONG (snippet): the error code is discarded
\save_settings()
start_motor()                         ' runs even if save_settings() aborted
```

A statement trap is right only when the outcome really does not matter. When it
does, trap as a value and check it.

### Leaving a resource claimed

```spin2
' WRONG (snippet): if send_frame() aborts, transmit() is abandoned with the bus claimed
PRI transmit()
  pinhigh(20)
  send_frame()
  pinlow(20)
```

An untrapped call is abandoned mid-way when it aborts. Trap it, release the
resource, then abort again — see *Clean up, then pass the error on*.

### Using `ABORT` for normal results

```spin2
' WRONG (snippet): ABORT used to deliver a found index
PRI find(target) : index | i
  repeat i from 0 to 9
    if table[i] == target
      abort i                         ' i = 0 cannot be told from "not found"
  index := -1
```

Use `RETURN` for results. Beyond the ambiguity, every caller would need a trap.

## Summary Table

### What a trap produces

| Form | Method completes | Method `ABORT x` | Method `ABORT` |
|---|---|---|---|
| `\method()` | nothing | nothing (value discarded) | nothing |
| `x := \method()` | `0` | `x` | `0` |
| `method()` untrapped | its results | unwinds further | unwinds further |

### `RETURN` versus `ABORT`

| | `RETURN` | `ABORT` |
|---|---|---|
| Goes to | the immediate caller | the nearest trapped call |
| Value delivered | the method's results | the abort value, or 0 |
| With no trap anywhere | returns normally | stops the task or cog |

## Related Documentation

- [Control-Flow-Usage-Guide.md](Control-Flow-Usage-Guide.md) - IF and CASE for checking error codes
- [Spin2-Object-Patterns-Guide.md](Spin2-Object-Patterns-Guide.md) - error handling in objects
- [Method-Pointer-Usage-Guide.md](../usage-guides/Method-Pointer-Usage-Guide.md) - calling through method pointers
