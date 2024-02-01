#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

def asm_to_ts_enum(asm_file_path, ts_file_path):
    with open(asm_file_path, 'r') as asm_file:
        lines = asm_file.readlines()

    enum_lines = []
    counter = 0  # start counter from 0
    in_macro = False
    lineNbr = 0
    for line in lines:
        lineNbr += 1
        if line.strip().startswith('macro'):  # start of macro definition
            in_macro = True
            continue
        if line.strip().startswith('endm'):  # end of macro definition
            in_macro = False
            continue
        if in_macro:  # skip lines inside macro definition
            continue
        match = re.search(r'(count[0-2]?n?i?)\s+(\w+)(?:\s*,?\s*(\w+))?(?:\s*;\s*(.*))?', line)
        if match:
            overrideValue = int(match.group(3).rstrip('h'), 16) if match.group(3) and match.group(3).endswith('h') else int(match.group(3), 0) if match.group(3) and match.group(3).isdigit() else 0
            if match.group(3) and overrideValue == 0:
              print(f'ERROR failed to interpret override number Ln#{lineNbr} line=[{line}]')
            if match.group(1).endswith('n') and match.group(3):
                # countn overrides count with specific value and increments by 1
                counter = overrideValue
                increment = 1
            elif match.group(1).endswith('2n') and match.group(3):
                # count2n overrides count with specific value and increments by 2
                increment = 2
                counter = overrideValue
            elif match.group(1).endswith('i') and match.group(3):
                # counti uses current count and increments by specific value
                increment = overrideValue
            elif match.group(1).endswith('0'):
                # count0 sets counter to zero and increments by 1
                counter = 0
                increment = 1
            elif match.group(1).endswith('2'):
                # count uses current count and increments by 2
                increment = 2
            elif match.group(1) == 'count':
                # count uses current count and increments by 1
                increment = 1
            else:
              print(f'ERROR failed to interpret macro Ln#{lineNbr} line=[{line}]')
            hex_counter = hex(counter)[2:].zfill(2)  # convert counter to hex and pad with 0s
            enum_lines.append(f'    {match.group(2)} = {counter},  // 0x{hex_counter} {match.group(4) or ""}')
            counter += increment

    ts_enum = 'export enum Operands {\n' + '\n'.join(enum_lines) + '\n}'

    with open(ts_file_path, 'w') as ts_file:
        ts_file.write(ts_enum)

# Usage:
asm_to_ts_enum('operands.asm', 'operands.ts')
