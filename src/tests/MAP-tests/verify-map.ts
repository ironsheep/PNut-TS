/**
 * Map File Verification Script
 *
 * Cross-references map files against listing files and expected.json
 * to verify symbol counts, offsets, and object hierarchy.
 */

/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';

interface ExpectedMethod {
  name: string;
  visibility: 'PUB' | 'PRI';
  params: number;
  returns: number;
  locals: number;
}

interface ExpectedVar {
  name: string;
  type: 'LONG' | 'WORD' | 'BYTE';
  count: number;
}

interface ExpectedDat {
  name: string;
  type: 'LONG' | 'WORD' | 'BYTE';
  count: number;
}

interface ExpectedPasmLabel {
  name: string;
}

interface ExpectedObject {
  name: string;
  file: string;
  methods: ExpectedMethod[];
  vars: ExpectedVar[];
  dat: ExpectedDat[];
  pasm_labels: ExpectedPasmLabel[];
}

interface ExpectedJson {
  description: string;
  top_file: string;
  language_version?: number;
  objects: ExpectedObject[];
  totals: {
    object_count: number;
    method_count: number;
    var_symbols: number;
    dat_symbols: number;
    pasm_labels: number;
  };
}

interface ListingSymbol {
  type: string;
  value: string;
  name: string;
}

interface ListingSummary {
  symbols: ListingSymbol[];
  objBytes: number;
  varBytes: number;
}

interface MapObjectEntry {
  index: number;
  name: string;
  methods: number;
  subObjs: number;
  size: number;
}

interface MapVarEntry {
  objectName: string;
  offset: string;
  type: string;
  name: string;
}

interface MapMethodEntry {
  /** Offset from the object's own base, as printed after `Entry +$`. */
  entry: string;
  /** Absolute hub address, as printed in parentheses. */
  absolute: string;
  objectName: string;
  name: string;
}

interface MapPasmEntry {
  objectName: string;
  cogAddr: string;
  type: string;
  name: string;
}

interface MapSummary {
  objects: MapObjectEntry[];
  vars: MapVarEntry[];
  methods: MapMethodEntry[];
  pasmLabels: MapPasmEntry[];
  datSymbols: number;
  varSymbols: number;
  executableBytes: number;
  variableBytes: number;
  languageVersion: number;
}

interface VerificationResult {
  testName: string;
  passed: boolean;
  checks: CheckResult[];
}

interface CheckResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  message?: string;
}

export function parseListing(content: string): ListingSummary {
  const lines = content.split('\n');
  const symbols: ListingSymbol[] = [];
  let objBytes = 0;
  let varBytes = 0;

  for (const line of lines) {
    // Parse symbol table lines: TYPE: xxx  VALUE: xxx  NAME: xxx
    const symbolMatch = line.match(/^TYPE:\s+(\S+)\s+VALUE:\s+([0-9A-Fa-f]+)\s+NAME:\s+(.+)$/);
    if (symbolMatch) {
      symbols.push({
        type: symbolMatch[1],
        value: symbolMatch[2],
        name: symbolMatch[3].trim()
      });
    }

    // Parse OBJ bytes
    const objMatch = line.match(/^OBJ bytes:\s+(\d+)/);
    if (objMatch) {
      objBytes = parseInt(objMatch[1], 10);
    }

    // Parse VAR bytes
    const varMatch = line.match(/^VAR bytes:\s+(\d+)/);
    if (varMatch) {
      varBytes = parseInt(varMatch[1], 10);
    }
  }

  return { symbols, objBytes, varBytes };
}

export function parseMap(content: string): MapSummary {
  const lines = content.split('\n');
  const objects: MapObjectEntry[] = [];
  const vars: MapVarEntry[] = [];
  const methods: MapMethodEntry[] = [];
  const pasmLabels: MapPasmEntry[] = [];
  let datSymbols = 0;
  let varSymbols = 0;
  let executableBytes = 0;
  let variableBytes = 0;
  let languageVersion = 0;

  let section = '';
  let currentObjectName = '';

  // Parse language version from header (e.g., "Spin2_v45")
  const versionMatch = content.match(/^Spin2_v(\d+)/m);
  if (versionMatch) {
    languageVersion = parseInt(versionMatch[1], 10);
  }

  for (const line of lines) {
    // Detect section headers (new Option A format)
    if (line.startsWith('=== PROGRAM SUMMARY ===')) {
      section = 'summary';
      continue;
    }
    if (line.startsWith('=== OBJECT HIERARCHY ===')) {
      section = 'hierarchy';
      continue;
    }
    if (line.startsWith('=== MEMORY LAYOUT ===')) {
      section = 'memory';
      continue;
    }
    if (line.startsWith('=== OBJECT DETAILS ===')) {
      section = 'details';
      continue;
    }
    if (line.startsWith('=== ADDRESS INDEX ===')) {
      section = 'address';
      continue;
    }
    if (line.startsWith('=== SYMBOL INDEX ===')) {
      section = 'symbol';
      continue;
    }

    // Parse Program Summary section
    if (section === 'summary') {
      // Total Size:    176 bytes (144 code/data + 32 var bytes)
      const totalMatch = line.match(/Total Size:\s+(\d+)\s+bytes\s+\((\d+)\s+code\/data\s+\+\s+(\d+)\s+var bytes\)/);
      if (totalMatch) {
        executableBytes = parseInt(totalMatch[2], 10);
        variableBytes = parseInt(totalMatch[3], 10);
      }
      // Objects:       4
      const objCountMatch = line.match(/Objects:\s+(\d+)/);
      if (objCountMatch) {
        // Will be populated from memory layout
      }
    }

    // Parse Memory Layout section (Start/End/Size/Object/Instance/Overrides)
    if (section === 'memory') {
      // $00000  $00040     65  wide_top         (entry)
      // $00044  $0005F     28  wide_a           CHILDA
      const memMatch = line.match(/^\s*\$([0-9A-Fa-f]+)\s+\$([0-9A-Fa-f]+)\s+(\d+)\s+(\S+)\s+(\S+)/);
      if (memMatch && !line.includes('-----') && !line.includes('Start')) {
        const objectName = memMatch[4];
        // Skip VAR SPACE entry
        if (objectName !== 'VAR') {
          objects.push({
            index: objects.length,
            name: objectName,
            methods: 0, // Will be populated from details
            subObjs: 0,
            size: parseInt(memMatch[3], 10)
          });
        }
      }
      // CODE/DATA TOTAL:      196 bytes
      const codeTotalMatch = line.match(/CODE\/DATA TOTAL:\s+(\d+)\s+bytes/);
      if (codeTotalMatch) {
        executableBytes = parseInt(codeTotalMatch[1], 10);
      }
    }

    // Parse Object Details section
    if (section === 'details') {
      // --- wide_top ---
      // --- CHILDA : wide_a ---
      const objHeaderMatch = line.match(/^---\s+(?:(\S+)\s+:\s+)?(\S+)\s+---$/);
      if (objHeaderMatch) {
        currentObjectName = objHeaderMatch[2] || objHeaderMatch[1] || '';
        continue;
      }

      // Methods: (indent)  NAME  Entry +$XXXXX  ($YYYYY)
      // The relative value is a BYTE offset from the object base, and the
      // parenthesised value is the absolute hub address. Before 1.55.4 this
      // column carried the method's slot index in the object header table,
      // which is not an address at all.
      const methodMatch = line.match(/^\s+(\S+)\s+Entry\s+\+\$([0-9A-Fa-f]+)\s+\(\$([0-9A-Fa-f]+)\)/);
      if (methodMatch && currentObjectName) {
        methods.push({
          entry: methodMatch[2],
          absolute: methodMatch[3],
          objectName: currentObjectName,
          name: methodMatch[1]
        });
      }

      // Variables: (indent)  TYPE  NAME  +$XXXX
      const varMatch = line.match(/^\s+(LONG|WORD|BYTE)\s+(\S+)\s+\+\$([0-9A-Fa-f]+)/);
      if (varMatch && currentObjectName) {
        vars.push({
          objectName: currentObjectName,
          offset: varMatch[3],
          type: varMatch[1],
          name: varMatch[2]
        });
      }

      // PASM Labels: (indent)  NAME  COG $XXX
      const pasmMatch = line.match(/^\s+(\S+)\s+COG\s+\$([0-9A-Fa-f]+)/);
      if (pasmMatch && currentObjectName) {
        pasmLabels.push({
          objectName: currentObjectName,
          cogAddr: pasmMatch[2],
          type: 'PASM',
          name: pasmMatch[1]
        });
      }

      // DAT Data: (indent)  TYPE  NAME  $XXXXX
      const datMatch = line.match(/^\s+(LONG|WORD|BYTE)\s+(\S+)\s+\$([0-9A-Fa-f]+)/);
      if (datMatch && currentObjectName) {
        datSymbols++;
      }
    }

    // Parse Symbol Index for total counts
    if (section === 'symbol') {
      // Symbols: 19
      const symbolCountMatch = line.match(/^\s*Symbols:\s+(\d+)/);
      if (symbolCountMatch) {
        // Total symbol count
      }
    }
  }

  // Set varSymbols count
  varSymbols = vars.length;

  return {
    objects,
    vars,
    methods,
    pasmLabels,
    datSymbols,
    varSymbols,
    executableBytes,
    variableBytes,
    languageVersion
  };
}

export function verifyMapAgainstExpected(testDir: string): VerificationResult {
  const testName = path.basename(testDir);
  const checks: CheckResult[] = [];

  // Load expected.json
  const expectedPath = path.join(testDir, 'expected.json');
  if (!fs.existsSync(expectedPath)) {
    return {
      testName,
      passed: false,
      checks: [
        {
          name: 'Load expected.json',
          passed: false,
          expected: 'File exists',
          actual: 'File not found'
        }
      ]
    };
  }

  const expected: ExpectedJson = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  checks.push({
    name: 'Load expected.json',
    passed: true,
    expected: `${expected.totals.object_count} objects`,
    actual: `${expected.totals.object_count} objects`
  });

  // Find and load the listing file
  const topFile = expected.top_file;
  const lstPath = path.join(testDir, topFile.replace('.spin2', '.lst'));
  const mapPath = path.join(testDir, topFile.replace('.spin2', '.map'));

  if (!fs.existsSync(lstPath)) {
    checks.push({
      name: 'Load listing file',
      passed: false,
      expected: 'File exists',
      actual: `${lstPath} not found - compile with -l flag first`
    });
    return { testName, passed: false, checks };
  }

  if (!fs.existsSync(mapPath)) {
    checks.push({
      name: 'Load map file',
      passed: false,
      expected: 'File exists',
      actual: `${mapPath} not found - compile with -m flag first`
    });
    return { testName, passed: false, checks };
  }

  const listing = parseListing(fs.readFileSync(lstPath, 'utf8'));
  const map = parseMap(fs.readFileSync(mapPath, 'utf8'));

  checks.push({
    name: 'Parse listing file',
    passed: true,
    expected: 'Parsed',
    actual: `${listing.symbols.length} symbols, ${listing.objBytes} OBJ bytes`
  });

  checks.push({
    name: 'Parse map file',
    passed: true,
    expected: 'Parsed',
    actual: `${map.objects.length} objects, ${map.methods.length} methods`
  });

  // Verify language version if specified in expected.json
  if (expected.language_version !== undefined) {
    const versionMatch = map.languageVersion === expected.language_version;
    checks.push({
      name: 'Language version',
      passed: versionMatch,
      expected: `Spin2_v${expected.language_version}`,
      actual: `Spin2_v${map.languageVersion}`
    });
  }

  // Verify object count
  const objectCountMatch = map.objects.length === expected.totals.object_count;
  checks.push({
    name: 'Object count',
    passed: objectCountMatch,
    expected: String(expected.totals.object_count),
    actual: String(map.objects.length)
  });

  // Verify VAR symbol count (from top object only in listing)
  const lstVarSymbols = listing.symbols.filter((s) => s.type.startsWith('VAR_')).length;
  const topObjVarCount = expected.objects[0].vars.length;
  const varCountMatch = lstVarSymbols === topObjVarCount;
  checks.push({
    name: 'VAR symbol count (top object)',
    passed: varCountMatch,
    expected: String(topObjVarCount),
    actual: `lst=${lstVarSymbols}, map=${map.varSymbols}`
  });

  // Verify method count (from top object in listing)
  const lstMethods = listing.symbols.filter((s) => s.type === 'METHOD').length;
  const topObjMethodCount = expected.objects[0].methods.length;
  const methodCountMatch = lstMethods === topObjMethodCount;
  checks.push({
    name: 'Method count (top object)',
    passed: methodCountMatch,
    expected: String(topObjMethodCount),
    actual: `lst=${lstMethods}, map=${map.methods.length}`
  });

  // Verify specific VAR symbols exist and have correct offsets
  for (const expectedVar of expected.objects[0].vars) {
    const lstVar = listing.symbols.find((s) => s.type.startsWith('VAR_') && s.name.toUpperCase() === expectedVar.name.toUpperCase());
    const mapVar = map.vars.find((v) => v.name.toUpperCase() === expectedVar.name.toUpperCase());

    if (!lstVar) {
      checks.push({
        name: `VAR '${expectedVar.name}' in listing`,
        passed: false,
        expected: 'Present',
        actual: 'Not found'
      });
    } else if (!mapVar) {
      checks.push({
        name: `VAR '${expectedVar.name}' in map`,
        passed: false,
        expected: 'Present',
        actual: 'Not found'
      });
    } else {
      // Check offset matches
      const lstOffset = parseInt(lstVar.value, 16);
      const mapOffset = parseInt(mapVar.offset, 16);
      const offsetMatch = lstOffset === mapOffset;
      checks.push({
        name: `VAR '${expectedVar.name}' offset`,
        passed: offsetMatch,
        expected: `$${lstVar.value}`,
        actual: `$${mapVar.offset}`
      });

      // Check type matches
      const lstType = lstVar.type.replace('VAR_', '');
      const typeMatch = lstType === mapVar.type;
      checks.push({
        name: `VAR '${expectedVar.name}' type`,
        passed: typeMatch,
        expected: lstType,
        actual: mapVar.type
      });
    }
  }

  // Verify methods exist and have correct entry points
  for (const expectedMethod of expected.objects[0].methods) {
    const lstMethod = listing.symbols.find((s) => s.type === 'METHOD' && s.name.toUpperCase() === expectedMethod.name.toUpperCase());
    const mapMethod = map.methods.find((m) => m.name.toUpperCase() === expectedMethod.name.toUpperCase());

    if (!lstMethod) {
      checks.push({
        name: `Method '${expectedMethod.name}' in listing`,
        passed: false,
        expected: 'Present',
        actual: 'Not found'
      });
    } else if (!mapMethod) {
      checks.push({
        name: `Method '${expectedMethod.name}' in map`,
        passed: false,
        expected: 'Present',
        actual: 'Not found'
      });
    } else {
      // The listing's method value carries the SLOT INDEX in the object header
      // table, not an address — comparing the map's entry against it is what
      // this check used to do, and it is precisely the defect fixed in 1.55.4:
      // it passed only while the map printed that index in an address column.
      //
      // The invariant that actually holds: a method's bytecode begins AFTER the
      // object's header table, and that table holds one long per method plus an
      // end marker (children add two longs each, so this is a lower bound).
      const methodsInObject = map.methods.filter((m) => m.objectName === mapMethod.objectName).length;
      const minimumEntry = 4 * (methodsInObject + 1);
      const mapEntry = parseInt(mapMethod.entry, 16);
      checks.push({
        name: `Method '${expectedMethod.name}' entry is past the header table`,
        passed: mapEntry >= minimumEntry,
        expected: `>= $${minimumEntry.toString(16).padStart(5, '0')}`,
        actual: `$${mapEntry.toString(16).padStart(5, '0')}`
      });
    }
  }

  // Verify size totals match
  const objBytesMatch = listing.objBytes === map.executableBytes;
  checks.push({
    name: 'OBJ bytes match',
    passed: objBytesMatch,
    expected: String(listing.objBytes),
    actual: String(map.executableBytes)
  });

  const varBytesMatch = listing.varBytes === map.variableBytes;
  checks.push({
    name: 'VAR bytes match',
    passed: varBytesMatch,
    expected: String(listing.varBytes),
    actual: String(map.variableBytes)
  });

  // Check if all passed
  const passed = checks.every((c) => c.passed);

  return { testName, passed, checks };
}

export function formatResults(result: VerificationResult): string {
  const lines: string[] = [];
  lines.push(`=== Map Verification: ${result.testName} ===`);
  lines.push('');

  for (const check of result.checks) {
    const status = check.passed ? '[PASS]' : '[FAIL]';
    lines.push(`  ${status} ${check.name}`);
    if (!check.passed) {
      lines.push(`         Expected: ${check.expected}`);
      lines.push(`         Actual:   ${check.actual}`);
    }
  }

  lines.push('');
  lines.push(result.passed ? 'All checks passed!' : 'Some checks FAILED');
  return lines.join('\n');
}

// Main entry for running standalone
if (require.main === module) {
  const testDirs = [
    path.join(__dirname, 'test1-simple'),
    path.join(__dirname, 'test2-deep'),
    path.join(__dirname, 'test3-wide'),
    path.join(__dirname, 'test4-override')
  ];

  let allPassed = true;
  for (const testDir of testDirs) {
    if (fs.existsSync(testDir)) {
      const result = verifyMapAgainstExpected(testDir);
      console.log(formatResults(result));
      console.log('');
      if (!result.passed) {
        allPassed = false;
      }
    }
  }

  process.exit(allPassed ? 0 : 1);
}
