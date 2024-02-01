#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Open the assembly file and read its contents
with open('assembly_code.asm', 'r') as f:
    lines = f.readlines()

# top part of file
ts_enum = "// generated opcode table load\n\n"
ts_enum += "export enum eAsmcodes {\n"

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
    if line.startswith('asmcode'):

      comment = ''
      lineWithComment = line.split(';')
      if(len(lineWithComment)> 1):
        comment = f"   // {lineWithComment[1]}"


      lineParts = [part for part in re.split('[, \t\r\n]', lineWithComment[0]) if part]
      v1Bits = f"0b{lineParts[2].rstrip('b')}" if lineParts[2].endswith('b') and not lineParts[2].startswith('pp_') else lineParts[2]
      v2Bits = f"0b{lineParts[3].rstrip('b')}" if lineParts[3].endswith('b') else lineParts[3]
      v1Bits = f"eValueType.{v1Bits}" if v1Bits.startswith('pp_') else v1Bits
      if(len(lineParts) != 5 or  len(v1Bits) == 0 or len(v2Bits) == 0):
        print(f"ERROR match: Ln#{lineNbr}: [{lineWithComment[0]}] - found {len(lineParts)}")
      else:
        ts_code += f"  this.asmcodeValues.set(eAsmcode.{lineParts[1]}, asmcodeValue({v1Bits}, {v2Bits}, eOperands.{lineParts[4]})){comment}"
        ts_enum += f"  {lineParts[1]},\n"

ts_enum += "}\n\n"

# Write the TypeScript code to a file
with open('asmodeConversion.ts', 'w') as f:
    f.write(ts_enum)
    f.write(ts_code)
