# String Constants Usage Guide

## Overview

Spin2 provides several mechanisms for working with string data:

- **Inline strings** - `@"text"` creates string constant and returns its address
- **STRING()** - Creates a string constant and returns its address (same as @"")
- **LSTRING()** - Creates a length-prefixed string
- **DAT strings** - Zero-terminated byte sequences in DAT sections
- **@@** operator - Resolves relative offsets to absolute addresses

Strings in Spin2 are stored as sequences of bytes, typically zero-terminated for compatibility with C-style string functions.

## Basic Usage

### Inline Strings with @""

The simplest way to create a string constant:

```spin2
PUB show_message()
  debug(@"Hello, World!")

PUB get_name() : ptr
  ptr := @"Propeller 2"
```

The `@""` syntax:
- Creates a string constant in memory
- Automatically zero-terminates the string
- Returns the hub address of the string

### STRING() Function

Equivalent to `@""` but can span multiple lines:

```spin2
PUB show_multiline()
  debug(string("Line 1", 13, 10, "Line 2"))

PUB build_message() : ptr
  ptr := string("Error: ", "Invalid parameter")
```

STRING() concatenates all arguments into a single zero-terminated string.

### DAT Section Strings

For named, reusable strings:

```spin2
DAT
  app_name    byte  "My Application", 0
  version     byte  "v1.2.3", 0
  copyright   byte  "(c) 2024", 0

PUB show_info()
  print_string(@app_name)
  print_string(@version)
```

## String Storage

### Zero-Terminated Strings

The standard format - a sequence of bytes ending with 0:

```spin2
DAT
  greeting    byte  "Hello", 0           ' 6 bytes total
  message     byte  "Test", 13, 10, 0    ' With CR/LF: 7 bytes
```

Memory layout of "Hello":
```
Offset:  0    1    2    3    4    5
Value:   'H'  'e'  'l'  'l'  'o'  0
Hex:     $48  $65  $6C  $6C  $6F  $00
```

### Characters Outside ASCII

A string literal stores the **bytes your source file holds**, not characters. The
compiler does not re-encode them, and the P2 has no notion of a character set —
so what you save is what the byte array contains.

This matters the moment you type anything outside plain ASCII, because your
editor almost certainly saves it as UTF-8, where one visible character occupies
more than one byte:

```spin2
DAT
  ascii       byte  "180 deg", 0         ' 8 bytes: 7 characters + terminator
  degrees     byte  "180°", 0            ' 6 bytes, not 5 — "°" is two bytes
```

Memory layout of `"180°"`:
```
Offset:  0    1    2    3    4    5
Value:   '1'  '8'  '0'  <-- ° -->  0
Hex:     $31  $38  $30  $C2  $B0  $00
```

Three consequences worth knowing before you rely on them:

- **`strsize()` counts bytes, not characters.** `strsize(@degrees)` returns 5.
- **Fixed-width fields need the byte count.** A label sized for eight characters
  holds fewer than eight if any of them are non-ASCII.
- **A terminal or display driver prints bytes.** Unless it decodes UTF-8 itself,
  `°` arrives as two bytes and may render as two characters.

When a string must be exactly N bytes wide — a fixed-width screen title, a
protocol field — either keep it ASCII, or count the bytes rather than the
characters.

### LSTRING() - Length-Prefixed Strings

Creates strings with a leading length byte:

```spin2
PUB process_data()
  send_lstring(lstring("Data packet"))

PRI send_lstring(ptr) | len, i
  len := byte[ptr]                       ' First byte is length
  repeat i from 1 to len
    tx(byte[ptr][i])
```

LSTRING format:
```
Offset:  0      1    2    3    ...  N
Value:   len    'D'  'a'  't'  ...  'a'
```

Advantages of length-prefixed:
- Known length without scanning
- Can contain zero bytes in content
- Faster length calculation

### Escape Sequences

Within string constants:

| Escape | Character | Value |
|--------|-----------|-------|
| `\n` | Newline (LF) | 10 |
| `\r` | Carriage return (CR) | 13 |
| `\t` | Tab | 9 |
| `\\` | Backslash | 92 |
| `\"` | Double quote | 34 |
| `\0` | Null | 0 |

```spin2
PUB format_output()
  debug(@"Line 1\nLine 2")               ' Two lines
  debug(@"Column1\tColumn2")             ' Tab-separated
  debug(@"She said \"Hello\"")           ' Embedded quotes
```

Alternatively, use numeric values directly:

```spin2
DAT
  newline     byte  "Line 1", 13, 10, "Line 2", 0
  path        byte  "C:\\Users\\Name", 0
```

## String Tables

### Array of String Pointers

Create a table of string addresses:

```spin2
DAT
  ' String data
  str_sun     byte  "Sunday", 0
  str_mon     byte  "Monday", 0
  str_tue     byte  "Tuesday", 0
  str_wed     byte  "Wednesday", 0
  str_thu     byte  "Thursday", 0
  str_fri     byte  "Friday", 0
  str_sat     byte  "Saturday", 0

  ' Pointer table (word-sized for space efficiency)
  day_names   word  @str_sun, @str_mon, @str_tue, @str_wed
              word  @str_thu, @str_fri, @str_sat

PUB get_day_name(day) : ptr
  '' Return pointer to day name (0=Sunday, 6=Saturday)

  if day >= 0 AND day <= 6
    ptr := @@day_names[day]              ' @@ resolves relative to absolute
  else
    ptr := @"Invalid"
```

### The @@ Operator

In DAT sections, `@symbol` produces a relative offset, not an absolute address. The `@@` operator converts this relative offset to an absolute hub address at runtime.

```spin2
DAT
  ' These @ values are relative offsets within the object
  string_table  word  @str1, @str2, @str3
  str1          byte  "First", 0
  str2          byte  "Second", 0
  str3          byte  "Third", 0

PUB get_string(index) : ptr
  ' @@ converts relative offset to absolute address
  ptr := @@string_table[index]
```

Why two operators?
- `@` in DAT creates position-independent code (relative offsets)
- `@@` resolves at runtime when actual addresses are known

### Compact String Table Pattern

For memory efficiency, pack strings consecutively:

```spin2
DAT
  error_strings
    byte  "OK", 0
    byte  "Timeout", 0
    byte  "Overflow", 0
    byte  "Invalid", 0
    byte  "Not found", 0
  error_strings_end

  error_offsets   byte  0, 3, 11, 20, 28    ' Cumulative offsets

PUB get_error_string(code) : ptr
  if code >= 0 AND code < 5
    ptr := @error_strings + error_offsets[code]
  else
    ptr := @"Unknown"
```

## Patterns

### Message Formatting

```spin2
PUB print_status(name_ptr, value)
  '' Print "name = value" format

  print_string(name_ptr)
  print_string(@" = ")
  print_dec(value)
  print_string(@"\r\n")
```

### Menu System

```spin2
CON
  MENU_ITEM_COUNT = 5

DAT
  menu_items
    word  @menu_0, @menu_1, @menu_2, @menu_3, @menu_4
  menu_0    byte  "1. Start System", 0
  menu_1    byte  "2. Stop System", 0
  menu_2    byte  "3. Configure", 0
  menu_3    byte  "4. Status", 0
  menu_4    byte  "5. Exit", 0

PUB show_menu() | i
  print_string(@"=== Main Menu ===\r\n")
  repeat i from 0 to MENU_ITEM_COUNT - 1
    print_string(@@menu_items[i])
    print_string(@"\r\n")
```

### Debug Output

```spin2
PUB debug_value(label_ptr, value)
  debug(label_ptr, ": ", udec(value))

PUB show_state()
  debug_value(@"Count", count)
  debug_value(@"Status", status)
  debug_value(@"Error", error_code)
```

### Configuration Messages

```spin2
DAT
  cfg_msgs
    word  @cfg_ok, @cfg_warn, @cfg_err
  cfg_ok    byte  "[OK] ", 0
  cfg_warn  byte  "[WARN] ", 0
  cfg_err   byte  "[ERROR] ", 0

PUB config_message(level, msg_ptr)
  '' Print configuration message with prefix

  level := level #> 0 <# 2
  print_string(@@cfg_msgs[level])
  print_string(msg_ptr)
  print_string(@"\r\n")
```

### Localization-Ready Structure

```spin2
CON
  LANG_EN = 0
  LANG_ES = 1
  LANG_DE = 2

DAT
  ' English strings
  en_hello    byte  "Hello", 0
  en_goodbye  byte  "Goodbye", 0
  en_error    byte  "Error", 0

  ' Spanish strings
  es_hello    byte  "Hola", 0
  es_goodbye  byte  "Adios", 0
  es_error    byte  "Error", 0

  ' German strings
  de_hello    byte  "Hallo", 0
  de_goodbye  byte  "Auf Wiedersehen", 0
  de_error    byte  "Fehler", 0

  ' String tables per language
  strings_en  word  @en_hello, @en_goodbye, @en_error
  strings_es  word  @es_hello, @es_goodbye, @es_error
  strings_de  word  @de_hello, @de_goodbye, @de_error

  ' Language table
  lang_tables word  @strings_en, @strings_es, @strings_de

VAR
  long current_lang

PUB set_language(lang)
  current_lang := lang #> 0 <# 2

PUB get_string(string_id) : ptr | table_ptr
  table_ptr := @@lang_tables[current_lang]
  ptr := @@word[table_ptr][string_id]
```

### String Building

For dynamic string construction:

```spin2
VAR
  byte buffer[100]
  long buf_pos

PUB clear_buffer()
  buf_pos := 0
  buffer[0] := 0

PUB append_string(str_ptr) | char
  repeat
    char := byte[str_ptr++]
    if char == 0
      quit
    if buf_pos < 99
      buffer[buf_pos++] := char
  buffer[buf_pos] := 0

PUB append_char(char)
  if buf_pos < 99
    buffer[buf_pos++] := char
    buffer[buf_pos] := 0

PUB get_buffer() : ptr
  ptr := @buffer
```

## String Utility Functions

### String Length

```spin2
PUB strlen(str_ptr) : length
  '' Return length of zero-terminated string

  length := 0
  repeat while byte[str_ptr][length]
    length++
```

### String Copy

```spin2
PUB strcpy(dest_ptr, src_ptr) | char
  '' Copy source string to destination

  repeat
    char := byte[src_ptr++]
    byte[dest_ptr++] := char
  until char == 0
```

### String Compare

```spin2
PUB strcmp(str1_ptr, str2_ptr) : result
  '' Compare two strings
  '' Returns: 0 if equal, <0 if str1 < str2, >0 if str1 > str2

  repeat
    result := byte[str1_ptr] - byte[str2_ptr]
    if result OR byte[str1_ptr] == 0
      return
    str1_ptr++
    str2_ptr++
```

### String Concatenate

```spin2
PUB strcat(dest_ptr, src_ptr) | dest_end
  '' Append source string to destination

  dest_end := dest_ptr + strlen(dest_ptr)
  strcpy(dest_end, src_ptr)
```

## Memory Considerations

### String Memory Location

| Syntax | Location | Lifetime |
|--------|----------|----------|
| `@"text"` | Object code (read-only) | Program duration |
| `string("text")` | Object code (read-only) | Program duration |
| `DAT byte "text", 0` | DAT section (read-only) | Program duration |
| `VAR byte str[N]` | VAR section | Instance duration |

### Avoiding String Duplication

```spin2
' WRONG: Creates duplicate strings
PUB method1()
  debug(@"Status: OK")

PUB method2()
  debug(@"Status: OK")                   ' Same string stored twice!

' CORRECT: Share common strings
DAT
  status_ok   byte  "Status: OK", 0

PUB method1()
  debug(@status_ok)

PUB method2()
  debug(@status_ok)                      ' Same string, single storage
```

### String Alignment

For efficient access, align strings on long boundaries when used frequently:

```spin2
DAT
              alignl                     ' Align to long boundary
  freq_string byte  "Frequency", 0
              alignl
  rate_string byte  "Rate", 0
```

## Anti-Patterns

### Sizing a Fixed-Width Field by Eye

```spin2
' WRONG: the field is declared 8 wide, but "180°" is 5 bytes plus the
' terminator, so the string overruns the space reserved for it
DAT
  reading     byte  "180°", 0            ' 6 bytes, not 5
  next_field  byte  "OK", 0

' CORRECT: keep fixed-width fields ASCII
DAT
  reading     byte  "180 deg", 0         ' 8 bytes, one per character
  next_field  byte  "OK", 0
```

Counting characters instead of bytes is what goes wrong here. The `°` is stored
as the two bytes your editor saved it as (`$C2 $B0` in a UTF-8 file), so a
literal that *looks* four characters wide occupies five. Everything the compiler
places after it moves accordingly. When a field has to be an exact width, count
bytes — or stay in ASCII, where the two counts agree.

### Forgetting Zero Terminator

```spin2
' WRONG: Missing zero terminator
DAT
  my_string   byte  "Hello"              ' Not terminated!
  other_data  long  12345

' CORRECT: Always terminate
DAT
  my_string   byte  "Hello", 0
  other_data  long  12345
```

### String Modification Attempt

```spin2
' WRONG: Trying to modify string constant
PUB bad_idea()
  ptr := @"Hello"
  byte[ptr][0] := "J"                    ' Undefined behavior!

' CORRECT: Use VAR buffer for modifiable strings
VAR
  byte buffer[10]

PUB good_idea()
  strcpy(@buffer, @"Hello")
  buffer[0] := "J"                       ' OK - buffer is writable
```

### Confusing @ and @@

```spin2
DAT
  str_table   word  @str1, @str2
  str1        byte  "First", 0
  str2        byte  "Second", 0

' WRONG: Using @ instead of @@
PUB bad_get(index) : ptr
  ptr := @str_table[index]               ' Returns address of table entry, not string!

' CORRECT: Use @@ to resolve
PUB good_get(index) : ptr
  ptr := @@str_table[index]              ' Returns address of string
```

### Buffer Overflow

```spin2
' WRONG: No bounds checking
VAR
  byte buffer[20]

PUB copy_name(src)
  strcpy(@buffer, src)                   ' Overflow if src > 19 chars!

' CORRECT: Check bounds
PUB safe_copy_name(src) | len
  len := strlen(src)
  if len < 20
    strcpy(@buffer, src)
  else
    strncpy(@buffer, src, 19)
    buffer[19] := 0
```

### Duplicate String Data

```spin2
' WRONG: Same strings in multiple places
PUB show_status()
  if status == OK
    debug(@"Operation completed successfully")

PUB log_result()
  if status == OK
    debug(@"Operation completed successfully")  ' Duplicate storage!

' CORRECT: Centralize strings
DAT
  msg_success   byte  "Operation completed successfully", 0

PUB show_status()
  if status == OK
    debug(@msg_success)

PUB log_result()
  if status == OK
    debug(@msg_success)
```

## Summary Tables

### String Creation Methods

| Method | Syntax | Result |
|--------|--------|--------|
| Inline | `@"text"` | Address of "text\0" |
| STRING | `string("text")` | Address of "text\0" |
| LSTRING | `lstring("text")` | Address of length + "text" |
| DAT | `byte "text", 0` | Named string in DAT |

### Address Operators

| Operator | Context | Returns |
|----------|---------|---------|
| `@` | In code | Absolute hub address |
| `@` | In DAT | Relative offset |
| `@@` | Any | Absolute from relative |

### Common Escape Sequences

| Sequence | Character | Decimal |
|----------|-----------|---------|
| `\n` or `,10,` | Newline | 10 |
| `\r` or `,13,` | Carriage Return | 13 |
| `\t` or `,9,` | Tab | 9 |
| `\0` or `,0` | Null | 0 |
| `\\` | Backslash | 92 |
| `\"` | Quote | 34 |

## Related Documentation

- [Operators-Usage-Guide.md](Operators-Usage-Guide.md) - @ and @@ operators
- [Lookup-Table-Usage-Guide.md](Lookup-Table-Usage-Guide.md) - String table patterns
- [Spin2-Object-Patterns-Guide.md](Spin2-Object-Patterns-Guide.md) - DAT section usage
