#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Open the assembly file and read its contents
with open('p2com.LST', 'r') as f:
    lines = f.readlines()

es_code =  ";	************************************************\n"


# bottom part of file
ts_code =  ";	************************************************\n"
ts_code += "; raw lines\n\n"
ts_code += ";	************************************************\n"

# Process each line
lineNbr = 0
for line in lines:
    lineNbr += 1
    # Skip blank lines and lines that start with ";"
    if line.strip() == "" or line.strip().startswith("Turbo Assembler"):
        continue

    lineParts = [part for part in re.split('[, \t\r\n]', line) if part]
    nbrFields = len(lineParts)

    # handle comment lines
    if nbrFields >= 2 and lineParts[1].startswith(';'):
      commentParts = [part for part in re.split('[;\r\n]', line) if part]
      if len(commentParts) == 2:
        es_code +=  f"; {commentParts[1]}\n"
      else:
        es_code +=  f";\n"
      continue

    # now handle report lines
    if nbrFields > 3:
      if  lineParts[3] == "counter":
        # do nothing
        x = 1
      elif  lineParts[2].startswith('='):
          if  lineParts[1] == 'symbol':
            # do nothing
            x = 1
          else:
            es_code +=  f"   {lineParts[1]}   0x{lineParts[2].replace('=','').zfill(8)}  {lineParts[3]}\n"
            continue
    if nbrFields >= 2:
      if nbrFields > 2 and lineParts[2].startswith('@@'):
        # do nothing
        x = 1
      elif  lineParts[1].startswith('=') or  lineParts[1] == 'public':
          es_code +=  f";  {line}"
          #es_code +=  f"   {lineParts[1]}   {lineParts[2].replace('=','0x')}  {lineParts[3]}\n"
          continue

    if nbrFields > 3:
     ts_code +=f" Ln#{lineNbr}({nbrFields}): [0]=[{lineParts[0]}], [1]=[{lineParts[1]}], [2]=[{lineParts[2]}], [3]=[{lineParts[3]}]\n"
    elif nbrFields > 2:
        ts_code +=f" Ln#{lineNbr}({nbrFields}): [0]=[{lineParts[0]}], [1]=[{lineParts[1]}], [2]=[{lineParts[2]}]\n"
    elif nbrFields > 1:
     ts_code +=f" Ln#{lineNbr}({nbrFields}): [0]=[{lineParts[0]}], [1]=[{lineParts[1]}]\n"

es_code +=  ";	************************************************\n"
es_code +=  ";\n"

# Write the TypeScript code to a file
with open('p2com-tables.lst', 'w') as f:
    f.write(es_code)
    #  NOTE: uncomment following line to display which lines are not forwarded to output report
    #f.write(ts_code)
