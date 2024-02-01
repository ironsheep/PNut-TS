#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Open the assembly file and read its contents
with open('flexcodes.asm', 'r') as f:
    lines = f.readlines()

# top part of file
ts_enum = "// generated opcode table load\n\n"
ts_enum += "export enum eFlexcodes {\n"

# bottom part of file
ts_code = "// generated flexcode table load\n\n"
ts_code += "//		flexcode	bytecode	params	results	pinfld	hubcode\n"
ts_code += "//		---------------------------------------------------------------------------------------\n"

# Process each line
lineNbr = 0
for line in lines:
    lineNbr += 1
    # Skip blank lines and lines that start with ";"
    if line.strip() == "" or line.strip().startswith(";"):
        continue
    if line.startswith('flexcode'):

      comment = ''
      lineWithComment = line.split(';')
      if(len(lineWithComment)> 1):
        comment = f"   // {lineWithComment[1]}"


      lineParts = [part for part in re.split('[, \t\r\n]', lineWithComment[0]) if part]
      if(len(lineParts) != 7):
        print(f"ERROR match: Ln#{lineNbr}: [{lineWithComment[0]}] - found {len(lineParts)}")
      else:
        ts_code += f"  this.flexcodeValues.set(eFlexcodes.{lineParts[1]}, flexcodeValue(eByteCodes.{lineParts[2]}, {lineParts[3]}, {lineParts[4]}, {lineParts[5]}, {lineParts[6]})){comment}\n"
        ts_enum += f"  {lineParts[1]},\n"

ts_enum += "}\n\n"

# Write the TypeScript code to a file
with open('flexcodeConversion.ts', 'w') as f:
    f.write(ts_enum)
    f.write(ts_code)
