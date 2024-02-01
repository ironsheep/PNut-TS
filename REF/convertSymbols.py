#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Open the assembly file and read its contents
with open('auto_symbols.asm', 'r') as f:
    lines = f.readlines()

# Prepare the TypeScript code
ts_code = "import { eElementType, eValueType } from './types';\n\n"
ts_code += "enum SYMBOLS {\n"

# Regular expression to match a line of assembly code
regexSym = r"\s*sym\s+([a-z_0-9]+),\s+([a-zA-F0-9_\+]+),*\s+'([A-Z_0-9]+)'\s*;*(.*)"
regexSymL = r"\s*syml\s+([a-z_]+),\s+([01b|0-9A-Zh]+),\s*([0-9]+),\s+'([A-Z_0-9]+)'\s*;*(.*)"
# Flag to indicate whether we've found the "automatic_symbols:" label
found_label = False

# Process each line
for line in lines:
    # Skip blank lines and lines that start with ";"
    if line.strip() == "" or line.strip().startswith(";"):
        continue

    # If we haven't found the label yet, check if this line contains it
    if not found_label:
        if "automatic_symbols:" in line:
            found_label = True
        continue

    # If this line starts with "db", stop processing
    if line.strip().startswith("db"):
        break

    # If we've found the label, process this line
    if line.strip().startswith("syml"):
      match = re.match(regexSymL, line)
      if match:
          type_op, oc_value, oc_value2, symbol, comment = match.groups()
          ts_code += f"  {symbol} = '{symbol}',\n"
    else:
      match = re.match(regexSym, line)
      if match:
          type_op, oc_value, symbol, comment = match.groups()
          ts_code += f"  {symbol} = '{symbol}',\n"

# Finish the TypeScript code for SYMBOLS enum
ts_code += "}\n\n"

# Start the TypeScript code for MyClass
ts_code += "class MyClass {\n"
ts_code += "  private automatic_symbols = new Map<string, [eElementType, eValueType, SYMBOLS]>();\n\n"
ts_code += "  constructor() {\n"

# Reset the flag and process each line again to generate the MyClass code
found_label = False
lineNbr = 0
error_count = 0
lastEmittedWasBlank = False
for line in lines:
    lineNbr += 1

    # If we haven't found the label yet, check if this line contains it
    if not found_label:
        if "automatic_symbols:" in line:
            found_label = True
        continue

    # and write any blank lines to file
    if line.strip() == "":
        if lastEmittedWasBlank == False:
          lastEmittedWasBlank == True
          ts_code += f"\n"
          continue

    lastEmittedWasBlank == False

# If line starts with ";", include it as a TypeScript comment
    if line.strip().startswith(";"):
        ts_code += f"    // {line.strip()[1:]}\n"
        continue

    # If this line starts with "db", stop processing
    if line.strip().startswith("db"):
        break

    # If we've found the label, process this line
    if line.strip().startswith("syml"):
      match = re.match(regexSymL, line)
      if match:
          type_op, oc_value, shift_value, symbol, comment = match.groups()
          if oc_value[0] in '01' and oc_value.endswith('b'):
              oc_value = '0b' + oc_value[:-1]
              oc_value += '0' * int(shift_value)
          else:
            if re.fullmatch(r'[0-9A-Fa-f]+h', oc_value) is not None:
                oc_value = '0x' + oc_value[:-1]
                oc_value += '0' * int((int(shift_value) / 4))
            else:
              oc_value = oc_value << shift_value
          commentStr = f" // {comment}"
          if len(comment) == 0:
            commentStr = ""
          if oc_value.startswith('ac_'):
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, this.asmcodeValue(eAsmcode.{oc_value})]);{commentStr}\n"
          elif oc_value.startswith('oc_'):
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, this.opcodeValue(eOpcode.{oc_value})]);{commentStr}\n"
          elif oc_value.startswith('fc_'):
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, this.flexValue(eFlexcode.{oc_value})]);{commentStr}\n"
          elif oc_value[0].isdigit():
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, {oc_value}]);{commentStr}\n"
          else:
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, eValueType.{oc_value}]);{commentStr}\n"
      else:
        if len(line) > 0:
          lineNoEOL = line.strip()
          print(f"ERROR syml match: Ln#{lineNbr}: [{lineNoEOL}]")
          error_count += 1
          if error_count >= 10:
              print("Too many errors. Aborting.")
              break
    else:
      match = re.match(regexSym, line)
      if match:
          type_op, oc_value, symbol, comment = match.groups()
          if oc_value[0] in '01' and oc_value.endswith('b'):
              oc_value = '0b' + oc_value[:-1]
          else:
            if re.fullmatch(r'[0-9A-Fa-f]+h', oc_value) is not None:
                oc_value = '0x' + oc_value[:-1]
          commentStr = f" // {comment}"
          if len(comment) == 0:
            commentStr = ""
          if oc_value.startswith('ac_'):
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, this.asmcodeValue(eAsmcode.{oc_value})]);{commentStr}\n"
          elif oc_value.startswith('oc_'):
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, this.opcodeValue(eOpcode.{oc_value})]);{commentStr}\n"
          elif oc_value.startswith('fc_'):
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, this.flexValue(eFlexcode.{oc_value})]);{commentStr}\n"
          elif oc_value[0].isdigit():
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, {oc_value}]);{commentStr}\n"
          else:
              ts_code += f"    this.automatic_symbols.set(SYMBOLS.{symbol}, [eElementType.{type_op}, eValueType.{oc_value}]);{commentStr}\n"
      else:
        if len(line) > 0:
          lineNoEOL = line.strip()
          print(f"ERROR match: Ln#{lineNbr}: [{lineNoEOL}]")
          error_count += 1
          if error_count >= 10:
              print("Too many errors. Aborting.")
              break

# Finish the TypeScript code for MyClass
ts_code += "  }\n"
ts_code += "}\n"

# Write the TypeScript code to a file
with open('MyConversion.ts', 'w') as f:
    f.write(ts_code)
