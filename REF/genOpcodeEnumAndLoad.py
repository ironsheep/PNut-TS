#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Open the assembly file and read its contents
with open('opcode.asm', 'r') as f:
    lines = f.readlines()

# top part of file
ts_enum = "// generated opcode table load\n\n"
ts_enum += "export enum eOpcode {\n"

# bottom part of file
ts_code = "// generated opcode table load\n\n"
ts_code += "//		oc		op		prec	bytecode	ternary	binary	unary	assign	float	alias	hubcode\n"

# Process each line
lineNbr = 0
for line in lines:
    lineNbr += 1
    # Skip blank lines and lines that start with ";"
    if line.strip() == "" or line.strip().startswith(";"):
        continue

    comment = ''
    lineWithComment = line.split(';')
    if(len(lineWithComment)> 1):
      comment = f"   // {lineWithComment[1]}"


    lineParts = [part for part in re.split('[, \t]', lineWithComment[0]) if part]
    if(len(lineParts) != 12):
      print(f"ERROR match: Ln#{lineNbr}: [{lineWithComment[0]}] - found {len(lineParts)}")
    else:
      byteValue = f"eByteCode.{lineParts[4]}" if lineParts[4].startswith("bc_") else lineParts[4]
      ts_code += f"  this.opcodeValues.set(eOpcode.{lineParts[1]}, opcodeValue(eValueType.{lineParts[2]}, {lineParts[3]}, {byteValue}, {lineParts[5]}, {lineParts[6]}, {lineParts[7]}, {lineParts[8]}, {lineParts[9]}, {lineParts[10]}, {lineParts[11]})){comment}"
      ts_enum += f"  {lineParts[1]},\n"

ts_enum += "}\n\n"
# Write the TypeScript code to a file
with open('opcodeConversion.ts', 'w') as f:
    f.write(ts_enum)
    f.write(ts_code)
