#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Open the assembly file and read its contents
with open('disop_enum.asm', 'r') as f:
    lines = f.readlines()

# top part of file
ts_enum = "// generated opcode table load\n\n"
ts_enum += "export enum eDisopValues {\n"

# Process each line
lineNbr = 0
counter = 0
in_macro = False
for line in lines:
    lineNbr += 1
    # Skip blank lines and lines that start with ";"
    if line.strip().startswith('macro'):  # start of macro definition
        in_macro = True
        continue
    if line.strip().startswith('endm'):  # end of macro definition
        in_macro = False
        continue
    if in_macro:  # skip lines inside macro definition
        continue
    if line.strip() == "" or line.strip().startswith(";"):
        ts_enum += line.replace(';','// ').replace('\t','    ')
        continue
    if line.strip().startswith('count'):

      comment = '\n'
      lineWithComment = line.split(';')
      if(len(lineWithComment) > 1):
        comment = f"   {lineWithComment[1]}"


      lineParts = [part for part in re.split('[, \t\r\n]', lineWithComment[0]) if part]
      if(len(lineParts)) < 2:
        print(f"ERROR match: Ln#{lineNbr}: [{lineWithComment[0]}] - found {len(lineParts)}")
      else:
        ts_enum += f"  {lineParts[1]} = {counter}, // (0x{format(counter, '02x')}){comment}"

      counter += 1

ts_enum += "}\n\n"

# Write the TypeScript code to a file
with open('disopEnumConversion.ts', 'w') as f:
    f.write(ts_enum)
