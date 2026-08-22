# SPIN2/PASM2 IDE Integration Package

This directory contains comprehensive language support files for Parallax Propeller 2 SPIN2 and PASM2 development, extracted directly from the PNut-TS compiler.

## 📦 Package Contents

### Language Specifications

These live one directory up, in `../databases/` — this directory holds only the
IDE integration files listed below.

- **`../databases/SPIN2-Language-Specification.json`** - Complete SPIN2 language definition with keywords, operators, control flow constructs, and built-in functions
- **`../databases/PASM2-Instruction-Database.json`** - Complete PASM2 assembly instruction set with mnemonics, syntax, effects, and encodings
- **`../databases/PASM2-Condition-Codes.json`** - Condition codes and effect flags

### IDE Integration Files
- **spin2.tmGrammar.json** - TextMate grammar for VS Code syntax highlighting
- **spin2-language-server.json** - Language Server Protocol definitions
- **spin2-completion.json** - Code completion definitions
- **vscode-extension-package.json** - VS Code extension configuration template

## 🎯 Supported Features

### Syntax Highlighting
- **Keywords**: Block structures (CON, VAR, DAT, OBJ, PUB, PRI), control flow (IF, CASE, REPEAT), data types
- **Operators**: Arithmetic, logical, bitwise, comparison, assignment operators with proper precedence
- **Assembly**: PASM2 instruction mnemonics, condition codes, effect flags
- **Literals**: Binary (%1010), hex ($FF), decimal, and floating-point numbers
- **Comments**: Line comments ('), block comments ({...}), documentation blocks ({{...}})
- **Strings**: Quoted strings with escape sequences

### Code Completion
- **SPIN2 Keywords**: 36 keywords with descriptions and examples
- **Operators**: 72 operators with precedence and usage examples
- **Built-in Functions**: 55 functions with parameter types and return values
- **Assembly Directives**: 8 directives for code organization
- **Registers**: 25 hardware registers and control registers
- **Debug Commands**: 23 debug output commands
- **PASM2 Instructions**: 359 assembly instructions with syntax, effects and encodings
- **Condition Codes**: 16 condition codes with all aliases
- **Effect Flags**: WC, WZ, WCZ modifiers

### Language Server Protocol Support
- **Document Formatting**: Bracket matching, auto-closing pairs
- **Symbol Recognition**: Function calls, variable references
- **Context-Aware Completion**: Based on current scope and syntax
- **Hover Information**: Detailed descriptions for keywords and functions

## 🛠️ Integration Instructions

### VS Code Extension

1. Create a new VS Code extension:
```bash
yo code
# Select "New Language Support"
```

2. Replace the generated files:
- Copy `spin2.tmGrammar.json` to `syntaxes/`
- Use `vscode-extension-package.json` as template for `package.json`

3. Add language configuration:
```json
{
  "comments": {
    "lineComment": "'",
    "blockComment": ["{", "}"]
  },
  "brackets": [
    ["(", ")"], ["[", "]"], ["{", "}"]
  ],
  "autoClosingPairs": [
    {"open": "(", "close": ")"},
    {"open": "[", "close": "]"},
    {"open": "{", "close": "}"},
    {"open": "\"", "close": "\""}
  ]
}
```

### Language Server Implementation

Use `spin2-language-server.json` as the foundation for LSP server implementation:

```typescript
import { completionItems } from './spin2-language-server.json';

// Provide completions based on context
function provideCompletions(document: TextDocument, position: Position) {
  return completionItems.filter(item =>
    item.label.startsWith(getCurrentWord(document, position))
  );
}
```

### Other Editors

#### Sublime Text
Convert TextMate grammar to Sublime syntax:
```bash
# Use Package Control: Convert TextMate Bundle
```

#### Atom
Use `spin2.tmGrammar.json` directly - Atom supports TextMate grammars natively.

#### Vim/Neovim
Create syntax file from keyword definitions:
```vim
" Extract keywords from spin2-completion.json
syn keyword spin2Keyword CON VAR DAT OBJ PUB PRI
syn keyword spin2Control IF ELSE CASE REPEAT WHILE UNTIL
" ... etc
```

#### Emacs
Use completion definitions for company-mode:
```elisp
(defun spin2-completion-at-point ()
  ;; Load from spin2-completion.json
  ;; Provide context-aware completions
)
```

## 📊 Statistics

- **SPIN2 Language Elements**: 36 keywords, 72 operators, 55 built-in functions, 6 block types, 3 data types
- **PASM2 Assembly**: 359 instructions, 16 condition codes, 4 effect-flag records (`none`, `wz`, `wc`, `wcz`)
- **Additional Elements**: 8 assembly directives, 25 registers, 23 debug commands, 3 system variables, 12 special symbols
- **IDE Support**: TextMate grammar (173 lines), LSP definitions (3779 lines), completion database (5685 lines, 526 items)
- **Total SPIN2 Language Elements**: 246 across all categories (36 keywords + 72 operators + 55 built-in functions + 8 directives + 25 registers + 23 debug commands + 12 special symbols + 6 block types + 3 data types + 3 control-flow forms + 3 system variables)
- **Coverage**: 100% of PNut-TS compiler language features

## 🔄 Updates

These files are automatically generated from the PNut-TS compiler source code. To update:

1. Run the extraction scripts. They are run directly, not through npm — there
   are no `npm run extract-*` scripts in `package.json`:

```bash
cd DOCs/language-specification/extraction-scripts
npx tsx extract-pasm2-database.ts
npx tsx extract-condition-codes.ts
npx tsx extract-spin2-language.ts
npx tsx generate-ide-formats.ts
```

2. Test the generated files in your IDE
3. Submit improvements back to the PNut-TS project

## 📝 Example Usage

### SPIN2 Code Sample
Compiles as-is with `pnut-ts` — verified against 1.55.4.

```spin2
CON
  LED_PIN   = 56
  BAUD_RATE = 115_200

VAR
  LONG  counter, status
  BYTE  buffer[256]

PUB start()                            ' parentheses are REQUIRED in Spin2
  repeat
    if counter > 100
      toggle_led()
      counter := 0
    else
      counter++

PRI toggle_led()
  pintoggle(LED_PIN)                   ' P2 pin toggle
```

### PASM2 Assembly Sample
```pasm2
DAT
              ORG     0

start         MOV     dira, led_mask

loop          XOR     outa, led_mask  WZ
              WAITX   freq_hz
              JMP     #loop

led_mask      LONG    1 << LED_PIN
freq_hz       LONG    80_000_000
```

## 🤝 Contributing

To improve language support:

1. **Report Issues**: Missing keywords, incorrect highlighting, completion gaps
2. **Submit Enhancements**: Better syntax patterns, additional snippets
3. **Test Integration**: Verify compatibility with different IDEs
4. **Documentation**: Improve integration guides and examples

## 📄 License

Generated from PNut-TS compiler source code. See main project license for terms.

---

*This language support package provides comprehensive IDE integration for Parallax Propeller 2 development, enabling modern development environments for embedded systems programming.*