# PNut-TS - Porting Guide

PNut-TS compiles everything PNut compiles and produces the same output. It also accepts some source that PNut rejects. This page lists every such case we know of, so you can keep your code buildable under both compilers if you need to.

**A source that builds under PNut-TS is not guaranteed to build under PNut.** If you share code with PNut users, check it against this page, or build it with PNut as well.

## Limits PNut has and PNut-TS does not

Source past one of these limits compiles under PNut-TS. PNut stops with the message shown.

| What | PNut's limit | PNut's message |
| --- | --- | --- |
| Nested blocks (`IF`, `CASE`, `CASE_FAST`, `REPEAT`, `LOOKUP`, `LOOKDOWN`; the method body is not counted) | 16 levels | `Limit of 16 nested blocks exceeded` |
| Block stack (each `IF` uses 272 entries, so this stops most `IF` nesting before the limit above) | 4,096 entries | `Blocknest stack overflow` |
| Pending values in a constant expression | 16 | `Expression is too complex` |
| Unique files named by `FILE` in `DAT` | 255 | `Limit of 32 unique DAT files exceeded` (the message says 32; the limit is 255) |
| Symbols in the main symbol table | about 15,400 short names; long names use it up sooner | `Symbol table is full` |
| Preprocessor conditional nesting | 8 levels | `Limit of 8 nested #IFDEF/#IFNDEFs exceeded` |

### How far PNut-TS goes

PNut-TS sets no number for these, but extremely deep source can still run out of the compiler's own call stack. It then stops with `Maximum call stack size exceeded`, on the line it reached. Expect that at a few hundred nested parentheses in an expression, and at a thousand or more nested blocks. Very deep block nesting also compiles slowly: 500 levels took under 30 seconds in our tests, and 700 took over a minute.

## Language differences

| What | PNut | PNut-TS |
| --- | --- | --- |
| A `.spin2` extension in an `OBJ` file name, such as `"child.spin2"` | Always adds `.spin2`, so it looks for `child.spin2.spin2` and fails | Accepts it |
| Preprocessor directives | `#define`, `#undef`, `#ifdef`, `#ifndef`, `#elseifdef`, `#elseifndef`, `#else`, `#endif` | Those, plus `#error`, `#warn`, `#include` and `#pragma`. See [Preprocessor](Preprocessor.md) |

To keep a source buildable under both compilers, write `OBJ` names without the extension, and use only the directives PNut has.

## Limits that are the same in both

PNut-TS stops at the same point as PNut for these, so they need no special care when porting:

| What | Limit |
| --- | --- |
| `PUB` and `PRI` methods in one object | 1,024 |
| Object nesting, counting the top file | 16 levels |
| `OBJ` file name | 32 characters are used, in both compilers; anything longer is ignored, so `"a_very_long_name…"` looks for the file named by its first 32 characters |
| `DEBUG` data, after the compiler packs it | 10,752 bytes |
| `OBJ` instances | 1,024 |
| Unique files named in `OBJ` | 255 (the message says 32) |
| `PUB` and `CON` names exported by one object | 64 KB of list space; a source with many `CON` symbols reaches this first, so the symbol table limit above applies mainly to other symbols |
| `STRUCT` definitions | 4,096, and 128 KB of definition data |
| `DAT` symbols | 10,000 |
| Symbol name | 30 characters |

## Diagnostics

For a few errors raised outside its compile pass, PNut's command-line tool writes no message text: the build fails, but it doesn't say why. PNut-TS reports a message and a line for the same failures, including `Object nesting exceeds 16 levels - illegal circular reference may exist` and `Cannot find <name>.spin2`.
