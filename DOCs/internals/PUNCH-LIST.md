# PNut-TS Release Punch List

This document tracks remaining items for the current release.

## Map File Feature

- [ ] Add structures to MAP test cases to verify how structures and their fields display in map output

## Preprocessor Diagnostics

- [ ] `-D SYM=value` should diagnose rather than silently drop the definition.
      `-D` takes presence-only symbols, but the `=value` form is accepted without
      complaint: the whole argument is uppercased and registered as a symbol
      literally named `SYM=VALUE`, so the intended `#ifdef SYM` never matches and
      the user gets no clue why. Emit a diagnostic naming the unsupported form.
      (`src/pnut-ts.ts`, the `this.options.Define` loop.)
- [ ] `#if` / `#elseif` should be caught at the directive itself, not surface as a
      stray-`#endif` error. Only `#ifdef`/`#ifndef`/`#elseifdef`/`#elseifndef` are
      recognized; a C-style `#if` falls through as an unrecognized line, and the
      first error the user sees is the now-unbalanced `#endif` — pointing at the
      wrong line and the wrong problem. Diagnose at the `#if`/`#elseif` line,
      ideally naming the supported spelling. (`src/classes/spinDocument.ts`.)

## Build and Packaging

- [x] Audit all packaging and build scripts ✅
- [x] Transition repository to GitHub workflows (signing is already configured there) ✅
- [x] macOS: Convert to standard Mac installer (DMG with drag-to-Applications pattern) ✅

## Notes

Items will be checked off as they are completed. Add new items as needed during development.
