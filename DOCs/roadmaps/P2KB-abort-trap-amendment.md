# P2KB `ABORT` / trap entries — proposed amendment

**Status:** drafted 2026-09-14, **hardware-confirmed, ready to apply — not yet
applied**. P2KB is an external corpus, edited by Stephen. Grounded in the Spin2
v55 interpreter source (`src/ext/Spin2_interpreter.spin2`) and PNut-TS 1.55.7
compiler output, and confirmed on a P2: `TEST/HW-probes/abort-trap/` run 2
(`logs/debug_260914-141755.log`) passed 69 of 69 checks, each claim with a
positive arm and a negative arm or control.

Entries affected: `p2kbSpin2Abort` and `p2kbSpin2KwABORT`.

## What is wrong

Both entries were derived from the PNut-TS Error-Handling usage guide, which
carried the same errors (corrected in the same change as this draft).

1. **A trapped call does not return the method's normal result.** The entries
   say `x := \method()` gives "the method's normal return value (if no ABORT)".
   The interpreter's return path, for a frame flagged both *trap* and *push*,
   discards the results and supplies 0. A value trap therefore yields the abort
   value, 0 for a bare `ABORT`, and 0 on normal completion. The compiler agrees:
   it accepts `x := \m()` for a method with no results, which would be
   meaningless if the method's result came through.
2. **An untrapped `ABORT` does not terminate the program.** Every cog and task
   starts its top method with the trap flag set and a return into the
   task-return bytecodes. An untrapped `ABORT` ends that task, or the cog when no
   other task remains; other cogs continue.
3. **Patterns built on (1) do not work** — `error_code_pattern`
   (`safe_operation`), `try_finally_pattern` (`result := error`),
   `retry_pattern` (`if err >= 0 return err`), `graceful_degradation`
   (`value := \read_primary_sensor()`), `resource_cleanup` (`result := err`),
   and the `trap_operator.expression_context` example.
4. **`ABORT 0` / bare `ABORT` cannot be distinguished from success** by the
   value alone; the entries do not say so.

## Replacement text — `p2kbSpin2Abort`

Replace `trap_operator.expression_context`:

```yaml
  expression_context:
    syntax: "result := \\method_call()"
    description: |
      Calls the method with a trap and produces exactly ONE value:
        - 0                   if the method completes normally
        - the ABORT value     if the method executes ABORT expression
        - 0                   if the method executes a bare ABORT
      The method's own results NEVER come back through a trap, whatever its
      result count. For that reason a method with no results may be trapped as
      a value, and a trapped call cannot feed a multiple assignment.
      Use non-zero abort codes: a trap cannot tell ABORT 0 from success.
    example: |
      PUB main() | level, err
        err := \read_channel(3, @level)   ' data comes back through the pointer
        if err
          debug("read failed: ", sdec(err))
        else
          debug("pin 3 reads ", sdec(level))

      PRI read_channel(channel, pLevel)
        if channel < 0 or channel > 7
          abort -1
        long[pLevel] := pinread(channel)
```

Replace `propagation_behavior.description`:

```yaml
  description: |
    When ABORT executes:
    1. The current method stops; nothing after the ABORT runs.
    2. Each untrapped caller is abandoned in turn; nothing after the call runs
       in any of them, including the rest of an expression the call was in.
    3. At the first call made with \, execution resumes in that caller with its
       locals and partly evaluated expression intact.
    4. If no call on the way up was trapped, the task stops - or the cog, if it
       was the only task in it. Other cogs keep running. The abort value is lost.
    A top-level cog or task method cannot trap its own ABORT; wrap the work in a
    method and trap that call.
```

Replace `return_vs_abort.comparison.ABORT`:

```yaml
    ABORT:
      purpose: "Error signaling"
      stack_behavior: "Unwinds to the nearest trapped call"
      without_trap: "Stops the task, or the cog if no other task runs in it"
      return_value: "The abort value (or 0) - the method's results never pass a trap"
```

Replace `patterns` with patterns that do not read results through a trap:

```yaml
patterns:
  error_code_out_data_through_pointer:
    description: "The trap carries the error code; results travel by pointer or VAR"
    code: |
      PUB main() | level, err
        err := \read_channel(3, @level)
        if err
          debug("read failed: ", sdec(err))

      PRI read_channel(channel, pLevel)
        if channel < 0 or channel > 7
          abort -1
        long[pLevel] := pinread(channel)

  detect_any_abort_with_flag:
    description: "Detects bare ABORT / ABORT 0, which read as 0 like success"
    code: |
      VAR long done
      PUB main() | err
        done := false
        err := \calibrate()
        if not done
          debug("calibration aborted, code ", sdec(err))

      PRI calibrate()
        if pinread(12) == 0
          abort
        done := true

  cleanup_then_rethrow:
    description: "Release a resource on every path, then pass the error on"
    code: |
      PRI transmit() | err
        pinhigh(20)
        err := \send_frame()
        pinlow(20)
        if err
          abort err

  retry:
    description: "Retry; success is err == 0, data returned by pointer"
    code: |
      PRI read_with_retry(pValue) | attempt, err
        repeat attempt from 1 to 3
          err := \read_device(pValue)
          if err == 0
            return
          waitms(100)
        abort err

  supervise_a_cog:
    description: "A cog's top method cannot trap its own ABORT - trap one level down"
    code: |
      VAR long workerError, workerStack[64]
      PUB main()
        cogspin(NEWCOG, worker(), @workerStack)
      PRI worker()
        workerError := \worker_body()
        repeat
```

Replace `anti_patterns.uncaught_abort.description` and add
`reading_result_through_trap`:

```yaml
  uncaught_abort:
    description: "An untrapped ABORT silently stops the task or cog it runs in"

  reading_result_through_trap:
    description: "A value trap gives 0 whenever the method completes normally"
    wrong: |
      PUB main() | level
        level := \read_level()      ' always 0 on success
    correct: |
      PUB main() | level, err
        err := \read_level(@level)
```

Replace `error_handling_strategy.top_level`:

```yaml
  top_level: "Trap one level below the cog/task top method, record the code, decide whether to continue"
```

## Replacement text — `p2kbSpin2KwABORT`

```yaml
behavior:
  - "Unwinds the call stack to the nearest call made with the \\ trap operator"
  - "A value trap receives the ABORT value; bare ABORT gives 0"
  - "A trapped call that completes normally also gives 0 - its results never pass a trap"
  - "If nothing traps it, the task stops (or the cog, if no other task runs in it); other cogs continue"

trap_operator:
  description: "Use backslash (\\) to catch ABORT"
  syntax: "err := \\method_call()"
  example: |
    err := \risky_operation()     ' 0 on success, abort code on failure
    if err
      handle_error(err)

notes:
  - "Use ABORT for error signaling, not normal flow"
  - "Use non-zero abort codes - a trap cannot tell ABORT 0 from success"
  - "Return data by pointer or VAR; a trap replaces the method's results with 0"
  - "Trap below each cog/task top method - an untrapped ABORT stops it silently"
```
