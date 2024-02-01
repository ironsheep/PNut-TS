#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
from datetime import datetime

# Get the current date
current_date = datetime.now()

formatted_date = current_date.strftime('%m/%d/%Y')

# Open the assembly file and read its contents
with open('OperatorTests.txt', 'r') as f:
    lines = f.readlines()


# for Golden file
gr_code = "' Report for resolver testing\n"
gr_code += f"' Run: {formatted_date}\n"
gr_code += f"'\n"
gr_code += f"' ---------------------------------------\n"

# bottom part of file
ts_code = "// generated resolver tests\n\n"

# Process each line
lineNbr = 0
goldCtr = 1
skipCtr = 1
for line in lines:
    lineNbr += 1
    # Skip blank lines and lines that start with ";"
    if line.strip() == "":
        continue
    if line.strip().startswith(";"):
      commentText = line.strip().lstrip(";")
      ts_code += f"//	{commentText}\n"
      continue

    comment = ''
    lineWithComment = line.split(';')
    if(len(lineWithComment)> 1):
      comment = f"   // {lineWithComment[1]}"


    lineParts = [part for part in re.split('[, \t]', lineWithComment[0]) if part]
    if(len(lineParts) != 6):
      print(f"ERROR match: Ln#{lineNbr}: [{lineWithComment[0]}] - found {len(lineParts)}")
    else:
      if lineParts[1] != lineParts[2] or lineParts[2] != lineParts[3]:
        isThrow = True if lineParts[5] == 'throw' else False
        if isThrow:
          print(f"SKIP #{skipCtr}: THROW match: Ln#{lineNbr}: [{lineWithComment[0]}] - found {len(lineParts)}")
          skipCtr += 1
        else:
          parmAhex = lineParts[1].replace('$','0x')
          parmAhex = lineParts[1].replace('$','0x')
          parmBhex = lineParts[2].replace('$','0x')
          operationStr = f"eOperationType.{lineParts[0]}"
          isFloatStr = 'true' if lineParts[4] == 'isFloat' else 'false'
          ts_code += f"    reportResult = this.executeTest(testResolver, {parmAhex}, {parmBhex}, {operationStr}, {isFloatStr}){comment}"
          ts_code += f"    resultStrings.push(reportResult)\n"

          testNbr = format(goldCtr, '03d')
          goldOpStr = lineParts[0].ljust(13)
          goldFloat = ' flt ' if lineParts[4] == 'isFloat' else '     '
          parmAhex = lineParts[1].upper().replace('$','0x')
          parmBhex = lineParts[2].upper().replace('$','0x')
          resulthex = lineParts[3].upper().replace('$','0x')
          gr_code += f"[{testNbr}] {parmAhex}, {parmBhex}, {goldOpStr}{goldFloat} = {resulthex}\n"
          goldCtr += 1

#    const reportResult: string = this.executeTest(testResolver, parmA, parmB, operation, isFloatInConstExpression);
#    resultStrings.push(reportResult);
gr_code += f"' ---------------------------------------\n"

# Write the TypeScript code to a file
with open('OperatorTests.ts', 'w') as f:
    f.write(ts_code)

with open('dumpTables.resolv.GOLD', 'w') as f:
    f.write(gr_code)
