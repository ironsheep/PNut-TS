#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
from datetime import datetime

# Get the current date
current_date = datetime.now()

# Format the date as MM/DD/YYYY
formatted_date = current_date.strftime("%m/%d/%Y")

# Open the assembly file and read its contents
with open('p2com-tables.lst', 'r') as f:
    lines = f.readlines()

# out file body
ts_code = f"; Generated: {formatted_date}\n"

# Process each line
namesDict = {}

lineNbr = 0
for line in lines:
    lineNbr += 1
    # forward lines that start with ";"
    if line.strip().startswith(";"):
        ts_code +=  line
        continue

    lineParts = [part for part in re.split('[, \t\r\n]', line) if part]
    nbrFields = len(lineParts)

    # handle comment lines
    if nbrFields == 3:
      if lineParts[0].startswith('count'):
        continue
      else:
        name = lineParts[2]
        value = lineParts[1]
        #ts_code += f"{lineParts[2]}  {lineParts[1]}\n"
        namesDict[name] = value

currPrefix = ''
if len(namesDict) > 0:
    for key in sorted(namesDict.keys()):
      keyParts = key.split('_')
      newPrefix = keyParts[0]
      if currPrefix != newPrefix:
        # put out comment line
        ts_code +=  f";\n"
        # save new prefix
        currPrefix = newPrefix
      # put out key value pair
      value = namesDict[key]
      ts_code +=  f"{key}  {value}\n"

# Write the TypeScript code to a file
with open('dumpTables.tabl.GOLD', 'w') as f:
    f.write(ts_code)
