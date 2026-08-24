/** @format */
'use strict';

// src/classes/mapGenerator.ts
// Memory map file generator for PNut-TS
// Option A: Narrative Top-Down Structure

import fs from 'fs';
import { Context } from '../utils/context';
import { SpinResolver } from './spinResolver';
import { DistillerRecord } from './distillerList';
import { eElementType } from './types';
import { ObjInstanceInfo } from './objInstanceInfo';

/**
 * MapGenerator - Generates memory map files (.map) from compilation
 *
 * Option A Narrative Structure:
 * 1. Header - filename, version, timestamp
 * 2. Program Summary - total size, object count, method count
 * 3. Object Hierarchy - tree view with instance names and overrides
 * 4. Memory Layout - tabular format showing sequential memory
 * 5. Object Details - per-object sections with methods, vars, DAT, PASM
 * 6. Address Index - lookup by hub address
 * 7. Symbol Index - alphabetical lookup across all objects
 */
/** Longs injected at the head of the image by compile_final's move_obj_up. */
const IMAGE_HEADER_BYTES = 8;

export class MapGenerator {
  private context: Context;
  private resolver: SpinResolver;
  private lines: string[] = [];

  constructor(context: Context, resolver: SpinResolver) {
    this.context = context;
    this.resolver = resolver;
  }

  /**
   * Generate the memory map file if enabled in compile options
   */
  public generate(): void {
    if (!this.context.compileOptions.writeMapFile) {
      return;
    }

    const mapFilename = this.context.compileOptions.mapFilename;
    this.logMessage(`* MapGenerator.generate() - writing map file to ${mapFilename}`);

    // Built in memory and written in one synchronous call.
    //
    // A stream is closed with end(), which does NOT wait for the bytes to reach
    // disk. Anything reading the map right after a compile — `--cache-verify`,
    // a test harness, a build script — could see a stale or partial file, and
    // an output that is only usually complete is the same class of defect as
    // the zero-byte .flash this release fixed.
    this.lines = [];

    try {
      // Emit all sections in narrative order
      this.emitHeader();
      this.emitProgramSummary();
      this.emitObjectHierarchy();
      this.emitMemoryLayout();
      this.emitObjectDetails();
      this.emitAddressIndex();
      this.emitSymbolIndex();
      fs.writeFileSync(mapFilename, this.lines.join(''));
    } finally {
      this.lines = [];
    }

    this.context.logger.progressMsg(`Wrote ${mapFilename}`);
  }

  // ========================================================================
  // SECTION 1: Header
  // ========================================================================

  private emitHeader(): void {
    const topFile = this.context.sourceFiles.getTopFile();
    const filename = topFile.fileName;
    const timestamp = new Date().toISOString();
    const langVersion = topFile.versionNumber;

    this.writeLine('================================================================================');
    this.writeLine(`PNut-TS Memory Map: ${filename}`);
    this.writeLine(`Spin2_v${langVersion}`);
    this.writeLine(`Generated: ${timestamp}`);
    this.writeLine('================================================================================');
    this.writeLine('');
  }

  // ========================================================================
  // SECTION 2: Program Summary
  // ========================================================================

  private emitProgramSummary(): void {
    this.writeLine('=== PROGRAM SUMMARY ===');
    this.writeLine('');

    const execSize = this.resolver.executableSize;
    const varSize = this.resolver.variableSize;
    const totalSize = execSize + varSize;

    const distiller = this.resolver.distiller;
    const objectCount = distiller.records.recordCount;

    // Count total methods across all objects
    let totalMethods = 0;
    for (let i = 0; i < objectCount; i++) {
      const record = distiller.records.getRecordAt(i);
      if (record) {
        totalMethods += record.methodCount;
      }
    }

    this.writeLine(`  Total Size:    ${totalSize} bytes (${execSize} code/data + ${varSize} var bytes)`);
    this.writeLine(`  Objects:       ${objectCount}`);
    this.writeLine(`  Methods:       ${totalMethods}`);
    this.writeLine('');
  }

  // ========================================================================
  // SECTION 3: Object Hierarchy
  // ========================================================================

  private emitObjectHierarchy(): void {
    this.writeLine('=== OBJECT HIERARCHY ===');
    this.writeLine('');

    const instances = this.context.objInstanceStore.getAllInstances();
    if (instances.length === 0) {
      this.writeLine('  No objects.');
      this.writeLine('');
      return;
    }

    // Build hierarchy: find root (no declaring parent) and children
    const topInstance = instances.find((i) => i.parentInstanceId === -1);
    if (topInstance) {
      this.emitHierarchyNode(topInstance, instances, '  ', true);
    }

    this.writeLine('');
  }

  private emitHierarchyNode(instance: ObjInstanceInfo, allInstances: ObjInstanceInfo[], indent: string, isLast: boolean): void {
    const prefix = indent.length > 2 ? (isLast ? '\\-- ' : '+-- ') : '';
    const instanceDisplay =
      instance.parentInstanceId === -1 ? instance.sourceFileBaseName : `${instance.instanceName} : ${instance.sourceFileBaseName}`;

    // Build info string
    const infoParts: string[] = [];

    // Get method count for this object
    const distiller = this.resolver.distiller;
    const record = distiller.records.getRecordAt(instance.recordIndex);
    if (record) {
      infoParts.push(`${record.methodCount} methods`);
    }

    // Add overrides if present
    if (instance.hasOverrides) {
      infoParts.push(instance.formatOverrides());
    }

    const infoStr = infoParts.length > 0 ? `  (${infoParts.join(', ')})` : '';

    this.writeLine(`${indent}${prefix}${instanceDisplay}${infoStr}`);

    // Find children of this instance
    const children = allInstances.filter((i) => i.parentInstanceId === instance.instanceId);
    const childIndent = indent + (indent.length > 2 ? (isLast ? '    ' : '|   ') : '    ');

    children.forEach((child, idx) => {
      const isLastChild = idx === children.length - 1;
      this.emitHierarchyNode(child, allInstances, childIndent, isLastChild);
    });
  }

  // ========================================================================
  // SECTION 4: Memory Layout
  // ========================================================================

  private emitMemoryLayout(): void {
    this.writeLine('=== MEMORY LAYOUT ===');
    this.writeLine('');

    const distiller = this.resolver.distiller;
    const records = distiller.records;
    const recordCount = records.recordCount;

    if (recordCount === 0) {
      this.writeLine('  No objects compiled.');
      this.writeLine('');
      return;
    }

    // Column widths: Start=6, End=6, Size=5(right), Object=16, Instance=16, Overrides=variable
    // Headers align: left-aligned text at left edge, right-aligned numbers at right edge
    const instances = this.context.objInstanceStore.getAllInstances();

    // Measure before emitting: the widest object and instance names decide the
    // columns, so nothing gets shunted sideways.
    const objectNames: string[] = ['VAR SPACE'];
    const instanceNames: string[] = ['(runtime)'];
    for (let i = 0; i < recordCount; i++) {
      if (!records.getRecordAt(i)) continue;
      const inst = instances.find((candidate) => candidate.recordIndex === i);
      objectNames.push(inst ? inst.sourceFileBaseName : this.getObjectNameByIndex(i));
      instanceNames.push(this.instancePathsForRecord(i) || '(entry)');
    }
    const objWidth = this.columnWidth(objectNames, 15);
    const instWidth = this.columnWidth(instanceNames, 15);

    this.writeLine(`  Start   End      Size  ${'Object'.padEnd(objWidth)}  ${'Instance'.padEnd(instWidth)}  Overrides`);
    this.writeLine(`  ------  ------  -----  ${'-'.repeat(objWidth)}  ${'-'.repeat(instWidth)}  ---------`);

    for (let i = 0; i < recordCount; i++) {
      const record: DistillerRecord | undefined = records.getRecordAt(i);
      if (record) {
        const startAddr = record.objectOffset;
        const endAddr = startAddr + record.objectSize - 1;

        // Get instance info
        const instance = instances.find((inst) => inst.recordIndex === i);
        const objectName = instance ? instance.sourceFileBaseName : this.getObjectNameByIndex(i);
        // Instances sharing this region all carry the same overrides — a
        // difference in overrides produces different bytes, which is exactly
        // what stops them being merged into one region.
        const instanceName = this.instancePathsForRecord(i) || '(entry)';
        const overrides = instance && instance.hasOverrides ? instance.formatOverrides() : '';

        const startStr = '$' + this.hexAddr(startAddr);
        const endStr = '$' + this.hexAddr(endAddr);
        const sizeStr = record.objectSize.toString().padStart(5);
        const objStr = objectName.padEnd(objWidth);
        const instStr = instanceName.padEnd(instWidth);

        this.writeLine(`  ${startStr}  ${endStr}  ${sizeStr}  ${objStr}  ${instStr}  ${overrides}`);
      }
    }

    // Show end of executable
    const execSize = this.resolver.executableSize;
    const varSize = this.resolver.variableSize;

    // Blank line before total, indent total by 2 extra spaces
    this.writeLine('');
    this.writeLine(`    CODE/DATA TOTAL:  ${execSize.toString().padStart(6)} bytes`);
    this.writeLine('');

    // VAR section
    if (varSize > 0) {
      const varStart = execSize;
      const varEnd = execSize + varSize - 1;
      const varStartStr = '$' + this.hexAddr(varStart);
      const varEndStr = '$' + this.hexAddr(varEnd);
      const varSizeStr = varSize.toString().padStart(5);
      this.writeLine(`  ${varStartStr}  ${varEndStr}  ${varSizeStr}  ${'VAR SPACE'.padEnd(objWidth)}  ${'(runtime)'.padEnd(instWidth)}`);
      // Blank line before total, indent total by 2 extra spaces
      this.writeLine('');
      this.writeLine(`    PROGRAM TOTAL:    ${(execSize + varSize).toString().padStart(6)} bytes`);
    }

    this.writeLine('');
  }

  // ========================================================================
  // SECTION 5: Object Details
  // ========================================================================

  private emitObjectDetails(): void {
    this.writeLine('=== OBJECT DETAILS ===');
    this.writeLine('');

    const instances = this.context.objInstanceStore.getAllInstances();
    const distiller = this.resolver.distiller;

    for (const instance of instances) {
      const record = distiller.records.getRecordAt(instance.recordIndex);
      if (!record) continue;

      // Object header
      const startAddr = record.objectOffset;
      const endAddr = startAddr + record.objectSize - 1;
      const displayName =
        instance.parentInstanceId === -1 ? instance.sourceFileBaseName : `${this.instancePath(instance)} : ${instance.sourceFileBaseName}`;

      // Get VAR base for this object instance from the object image
      // Each object instance has 2 longs: [code_offset, var_base] at index * 8
      const varBase = this.getVarBaseForInstance(instance.instanceId);

      this.writeLine(`--- ${displayName} ---`);
      this.writeLine(`    Location: $${this.hexAddr(startAddr)}-$${this.hexAddr(endAddr)} (${record.objectSize} bytes)`);
      this.writeLine(`    VAR Base: $${this.hexAddr(varBase)}`);
      this.writeLine(`    Source:   ${instance.sourceFileName}`);

      // Show overrides if present
      if (instance.hasOverrides) {
        this.writeLine(`    Overrides: ${instance.formatOverrides()}`);
      }

      // Symbols are stored per source file, not per instance — so read them
      // with the source-file index directly. The previous code said the same
      // thing in a comment while passing a value from another index space and
      // memoizing it by filename to paper over the mismatch.
      const symbols = this.context.objectSymbolStore.getSymbols(instance.sourceFileIndex);

      // Methods - format: Name (20 chars) Relative Entry  Absolute Entry
      // For override instances, show absolute address = code base + relative entry
      const methodSymbols = symbols.filter((s) => s.type === eElementType.type_method);
      if (methodSymbols.length > 0) {
        this.writeLine('');
        this.writeLine('    Methods:');
        for (const method of methodSymbols) {
          const absoluteEntry = this.methodAddress(startAddr, method.value);
          const name = this.cleanSymbolName(method.name);
          if (absoluteEntry === undefined) {
            this.writeLine(`      ${name.padEnd(20)}  Entry (unresolved)`);
            continue;
          }
          const relativeEntry = absoluteEntry - startAddr;
          const relativeStr = '+$' + relativeEntry.toString(16).toUpperCase().padStart(5, '0');
          const absoluteStr = '$' + this.hexAddr(absoluteEntry);
          this.writeLine(`      ${name.padEnd(20)}  Entry ${relativeStr}  (${absoluteStr})`);
        }
      }

      // DAT symbols (hub mode only) - format: Type (8 chars) Name (20 chars) Relative  Absolute
      // Shown before VAR since DAT is part of static code/data section
      const datSymbols = symbols.filter((s) => {
        if (!this.isDatSymbolType(s.type)) return false;
        if (typeof s.value === 'string') return false;
        const upperBits = Number((s.value >> 20n) & 0xfffn);
        return upperBits === 0xfff; // Hub mode
      });
      if (datSymbols.length > 0) {
        this.writeLine('');
        this.writeLine('    DAT:');
        for (const datSym of datSymbols) {
          const relativeOffset = this.extractDatOffset(datSym.value);
          const absoluteAddr = startAddr + relativeOffset;
          // Use '+' prefix for relative offset like VAR section
          const relativeStr = '+$' + relativeOffset.toString(16).toUpperCase().padStart(5, '0');
          const absoluteStr = '$' + this.hexAddr(absoluteAddr);
          const typeStr = this.getDatTypeString(datSym.type);
          const name = this.cleanSymbolName(datSym.name);
          this.writeLine(`      ${typeStr.padEnd(8)}  ${name.padEnd(20)}  ${relativeStr}  (${absoluteStr})`);
        }
      }

      // PASM labels (cog mode DAT symbols) - format: Name (20 chars) COG address  HUB address
      // Separate inline PASM from DAT PASM
      const pasmSymbols = symbols.filter((s) => {
        if (!this.isDatSymbolType(s.type)) return false;
        if (typeof s.value === 'string') return false;
        const upperBits = Number((s.value >> 20n) & 0xfffn);
        return upperBits !== 0xfff; // Cog mode
      });

      // DAT PASM labels (non-inline) - show both COG and HUB addresses
      const datPasmSymbols = pasmSymbols.filter((s) => !s.isInline);
      if (datPasmSymbols.length > 0) {
        this.writeLine('');
        this.writeLine('    PASM Labels:');
        for (const pasmSym of datPasmSymbols) {
          const value = pasmSym.value as bigint;
          const cogOrg = Number((value >> 18n) & 0x3fffn);
          const cogAddr = cogOrg >> 2;
          // HUB address = object start + (cog address * 4 bytes per long)
          const hubAddr = startAddr + cogAddr * 4;
          const cogAddrStr = 'COG $' + cogAddr.toString(16).toUpperCase().padStart(3, '0');
          const hubAddrStr = 'HUB $' + this.hexAddr(hubAddr);
          const name = this.cleanSymbolName(pasmSym.name);
          this.writeLine(`      ${name.padEnd(20)}  ${cogAddrStr}  ${hubAddrStr}`);
        }
      }

      // VAR symbols - format: Type (8 chars) Name (20 chars) Relative (Absolute)
      // Shown after DAT since VAR is runtime-allocated after all code/data
      const varSymbols = symbols.filter((s) => this.isVarSymbolType(s.type));
      if (varSymbols.length > 0) {
        this.writeLine('');
        this.writeLine('    VAR:');
        for (const varSym of varSymbols) {
          const offset = this.extractVarOffset(varSym.value);
          const absoluteAddr = varBase + offset;
          const offsetStr = '+$' + offset.toString(16).toUpperCase().padStart(4, '0');
          const absoluteStr = '($' + this.hexAddr(absoluteAddr) + ')';
          const typeStr = this.getVarTypeString(varSym.type);
          const name = this.cleanSymbolName(varSym.name);
          this.writeLine(`      ${typeStr.padEnd(8)}  ${name.padEnd(20)}  ${offsetStr}  ${absoluteStr}`);
        }
      }

      // Inline PASM labels - show with '+' prefix and hub address (like variables)
      const inlinePasmSymbols = pasmSymbols.filter((s) => s.isInline === true);
      if (inlinePasmSymbols.length > 0) {
        this.writeLine('');
        this.writeLine('    Inline PASM:');
        for (const pasmSym of inlinePasmSymbols) {
          const value = pasmSym.value as bigint;
          const cogOrg = Number((value >> 18n) & 0x3fffn);
          const cogAddr = cogOrg >> 2;
          // Hub address = object start + (cog address * 4 bytes per long)
          const hubAddr = startAddr + cogAddr * 4;
          const relativeStr = '+$' + cogAddr.toString(16).toUpperCase().padStart(3, '0');
          const absoluteStr = '($' + this.hexAddr(hubAddr) + ')';
          const name = this.cleanSymbolName(pasmSym.name);
          this.writeLine(`      ${name.padEnd(20)}  ${relativeStr}  ${absoluteStr}`);
        }
      }

      // Child objects
      const childInstances = this.context.objInstanceStore.getChildInstances(instance.instanceId);
      if (childInstances.length > 0) {
        this.writeLine('');
        this.writeLine('    Child Objects:');
        for (const child of childInstances) {
          const childRecord = distiller.records.getRecordAt(child.recordIndex);
          const sizeInfo = childRecord ? ` (${childRecord.objectSize} bytes)` : '';
          const overrideInfo = child.hasOverrides ? ` | ${child.formatOverrides()}` : '';
          this.writeLine(`      ${child.instanceName} : ${child.sourceFileBaseName}${sizeInfo}${overrideInfo}`);
        }
      }

      this.writeLine('');
    }
  }

  // ========================================================================
  // SECTION 6: Address Index
  // ========================================================================

  /**
   * Reverse lookup: the reader arrives holding a hub address — from a crash, a
   * debugger, a disassembly — and asks "what is here?".
   *
   * Two rules follow from that question, and both were broken before 1.55.4:
   *
   *   1. Every number in this section is an ABSOLUTE hub address. Method
   *      symbols carry an entry INDEX, not an address; emitting that index in
   *      a column headed "Address" put two number spaces in one column and
   *      told the reader a method lived at $00001.
   *   2. Every IMAGE appears. Symbols are stored per source file, so walking
   *      the symbol store emitted one row per file — an object used three
   *      times contributed one row, and two of its three real entry points
   *      were unreachable from this index.
   *
   * Both are fixed by iterating INSTANCES and reading each one's symbols
   * through its own source-file index, exactly as Object Details does.
   */
  private emitAddressIndex(): void {
    this.writeLine('=== ADDRESS INDEX ===');
    this.writeLine('');

    interface AddressEntry {
      address: number;
      type: string;
      instance: string;
      object: string;
      name: string;
    }

    let entries: AddressEntry[] = [];
    const instances = this.context.objInstanceStore.getAllInstances();
    const distiller = this.resolver.distiller;

    for (const instance of instances) {
      const record = distiller.records.getRecordAt(instance.recordIndex);
      if (!record) continue;
      const base = record.objectOffset;
      const isTop = instance.parentInstanceId === -1;
      const pathName = this.instancePath(instance);
      const objectName = instance.sourceFileBaseName;

      entries.push({
        address: base,
        type: 'CODE',
        instance: pathName,
        object: objectName,
        name: isTop ? '(entry)' : '(object)'
      });

      for (const symbol of this.context.objectSymbolStore.getSymbols(instance.sourceFileIndex)) {
        if (symbol.type === eElementType.type_method) {
          const address = this.methodAddress(base, symbol.value);
          if (address !== undefined) {
            entries.push({
              address,
              type: 'METHOD',
              instance: pathName,
              object: objectName,
              name: this.cleanSymbolName(symbol.name)
            });
          }
        }
      }
    }

    // Instances that share an image share every address in it — that is dedup
    // working. Emitting a row each would repeat one address five times and
    // suggest five distinct things, so identical rows collapse to one that
    // names its occupants.
    const grouped = new Map<string, AddressEntry & { instances: string[] }>();
    for (const entry of entries) {
      const key = `${entry.address}\u0000${entry.type}\u0000${entry.object}\u0000${entry.name}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.instances.push(entry.instance);
      } else {
        grouped.set(key, { ...entry, instances: [entry.instance] });
      }
    }
    entries = [...grouped.values()].map((g) => ({ ...g, instance: this.summarizeInstances(g.instances) }));

    if (entries.length === 0) {
      this.writeLine('  No addressable symbols.');
      this.writeLine('');
      return;
    }

    // Address ascending is the reader's access path. Ties break to a stable,
    // predictable order so two runs of the same source produce the same file.
    entries.sort(
      (a, b) => a.address - b.address || a.type.localeCompare(b.type) || a.instance.localeCompare(b.instance) || a.name.localeCompare(b.name)
    );

    const instWidth = this.columnWidth(
      entries.map((e) => e.instance),
      15
    );
    const objWidth = this.columnWidth(
      entries.map((e) => e.object),
      15
    );

    this.writeLine(`  Address  Type      ${'Instance'.padEnd(instWidth)}  ${'Object'.padEnd(objWidth)}  Name`);
    this.writeLine(`  -------  --------  ${'-'.repeat(instWidth)}  ${'-'.repeat(objWidth)}  ---------------`);

    for (const entry of entries) {
      const addrStr = ('$' + entry.address.toString(16).toUpperCase().padStart(5, '0')).padStart(7);
      this.writeLine(`  ${addrStr}  ${entry.type.padEnd(8)}  ${entry.instance.padEnd(instWidth)}  ${entry.object.padEnd(objWidth)}  ${entry.name}`);
    }

    this.writeLine('');
    this.writeLine(`  Entries: ${entries.length}`);
    this.writeLine('');
  }

  // ========================================================================
  // SECTION 7: Symbol Index
  // ========================================================================

  /**
   * Forward lookup: the reader holds a NAME and asks "where is it?".
   *
   * When one object is used more than once, a name legitimately has several
   * addresses — one per image. The honest answer is all of them, each labelled
   * with the instance it belongs to, so this emits one row per
   * (symbol, instance). Sorted by name then address, the duplicates land
   * adjacent: "this exists three times, here are all three" is absorbed in a
   * glance, with no counting and no cross-reference to another section.
   *
   * Before 1.55.4 this walked the symbol store, which is keyed by SOURCE FILE,
   * and resolved each file to `instances.find(...)` — the FIRST instance. Every
   * address in the section was therefore computed from the first image's base,
   * and the other images appeared nowhere.
   */
  private emitSymbolIndex(): void {
    this.writeLine('=== SYMBOL INDEX ===');
    this.writeLine('');

    interface SymbolIndexEntry {
      name: string;
      object: string;
      instance: string;
      type: string;
      location: string;
      /** Hub address used only for ordering; `location` is what is printed. */
      sortAddress: number;
    }

    let entries: SymbolIndexEntry[] = [];
    const instances = this.context.objInstanceStore.getAllInstances();
    const distiller = this.resolver.distiller;

    for (const instance of instances) {
      const record = distiller.records.getRecordAt(instance.recordIndex);
      const codeBase = record ? record.objectOffset : 0;
      const varBase = this.getVarBaseForInstance(instance.instanceId);
      const pathName = this.instancePath(instance);
      const objectName = instance.sourceFileBaseName;

      for (const symbol of this.context.objectSymbolStore.getSymbols(instance.sourceFileIndex)) {
        const cleanName = this.cleanSymbolName(symbol.name);
        let type = '';
        let location = '';
        let sortAddress = 0;

        if (symbol.type === eElementType.type_method) {
          type = 'METHOD';
          const address = this.methodAddress(codeBase, symbol.value);
          sortAddress = address ?? codeBase;
          location = address !== undefined ? '$' + this.hexAddr(address) : '(unresolved)';
        } else if (this.isVarSymbolType(symbol.type)) {
          type = 'VAR';
          sortAddress = varBase + this.extractVarOffset(symbol.value);
          location = '$' + this.hexAddr(sortAddress);
        } else if (this.isDatSymbolType(symbol.type) && typeof symbol.value !== 'string') {
          const upperBits = Number((symbol.value >> 20n) & 0xfffn);
          if (upperBits === 0xfff) {
            type = 'DAT';
            sortAddress = codeBase + this.extractDatOffset(symbol.value);
            location = '$' + this.hexAddr(sortAddress);
          } else {
            const cogAddr = Number((symbol.value >> 18n) & 0x3fffn) >> 2;
            sortAddress = codeBase + cogAddr * 4;
            const cogStr = '$' + cogAddr.toString(16).toUpperCase().padStart(3, '0');
            if (symbol.isInline) {
              type = 'INLINE';
              location = '+' + cogStr + '  ($' + this.hexAddr(sortAddress) + ')';
            } else {
              type = 'PASM';
              location = 'COG ' + cogStr + '  HUB $' + this.hexAddr(sortAddress);
            }
          }
        }

        if (type) {
          entries.push({ name: cleanName, object: objectName, instance: pathName, type, location, sortAddress });
        }
      }
    }

    // Same collapse as the address index: a DAT singleton reached from five
    // places is ONE datum at ONE address, and five identical rows would say
    // otherwise.
    const grouped = new Map<string, SymbolIndexEntry & { instances: string[] }>();
    for (const entry of entries) {
      const key = `${entry.name}\u0000${entry.object}\u0000${entry.type}\u0000${entry.location}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.instances.push(entry.instance);
      } else {
        grouped.set(key, { ...entry, instances: [entry.instance] });
      }
    }
    entries = [...grouped.values()].map((g) => ({ ...g, instance: this.summarizeInstances(g.instances) }));

    if (entries.length === 0) {
      this.writeLine('  No symbols.');
      this.writeLine('');
      return;
    }

    // Name first so a search lands in one place; address second so an object
    // used more than once reads down its images in memory order.
    entries.sort((a, b) => a.name.localeCompare(b.name) || a.sortAddress - b.sortAddress || a.instance.localeCompare(b.instance));

    const nameWidth = this.columnWidth(
      entries.map((e) => e.name),
      20
    );
    const objWidth = this.columnWidth(
      entries.map((e) => e.object),
      15
    );
    const instWidth = this.columnWidth(
      entries.map((e) => e.instance),
      15
    );

    this.writeLine(`  ${'Symbol'.padEnd(nameWidth)}  ${'Object'.padEnd(objWidth)}  ${'Instance'.padEnd(instWidth)}  Type      Location`);
    this.writeLine(`  ${'-'.repeat(nameWidth)}  ${'-'.repeat(objWidth)}  ${'-'.repeat(instWidth)}  --------  ----------`);

    for (const entry of entries) {
      this.writeLine(
        `  ${entry.name.padEnd(nameWidth)}  ${entry.object.padEnd(objWidth)}  ${entry.instance.padEnd(instWidth)}  ${entry.type.padEnd(8)}  ${entry.location}`
      );
    }

    this.writeLine('');
    this.writeLine(`  Symbols: ${entries.length}`);
    this.writeLine('');
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * An instance's access path from the top object — `CHILD1`, or `A.LEAF` for
   * a leaf reached through `A`.
   *
   * This is the name the reader already holds: it is what they wrote in their
   * own source (`a.leaf.val()`), so no translation is needed to connect the map
   * back to the code. The hierarchy can disambiguate two instances by
   * indentation; the flat sections cannot, which is why two children both named
   * `leaf` were indistinguishable there — and why Object Details emitted two
   * blocks under one identical heading.
   */
  private instancePath(instance: ObjInstanceInfo): string {
    if (instance.parentInstanceId === -1) {
      return '(entry)';
    }
    const names: string[] = [];
    let cursor: ObjInstanceInfo | undefined = instance;
    // Bounded walk: the store is a tree, but a malformed parent link must not
    // hang map generation — the map is a diagnostic, and a diagnostic that
    // spins is worse than one that is slightly wrong.
    for (let guard = 0; cursor !== undefined && cursor.parentInstanceId !== -1 && guard < 64; guard++) {
      names.unshift(cursor.instanceName);
      cursor = this.context.objInstanceStore.getInstance(cursor.parentInstanceId);
    }
    return names.join('.');
  }

  /**
   * Every instance served by one distiller record, as access paths.
   *
   * Identical images are merged by content, so one region can back several
   * instances — that is dedup working, and it is the diamond case. A memory map
   * row describes a REGION, so it stays one row and names all of its occupants
   * rather than silently crediting the first.
   */
  /**
   * Column width that fits every value, never narrower than the header.
   *
   * Fixed widths misalign the moment a name is longer than the guess — a
   * 16-character object name shunted its whole row one column to the right,
   * which is exactly the kind of small friction that makes a table hard to
   * scan.
   */
  private columnWidth(values: string[], minimum: number): number {
    return values.reduce((widest, value) => (value.length > widest ? value.length : widest), minimum);
  }

  /**
   * Collapse several instance paths into one legible label — `SHARED +4`.
   *
   * Printing all of them is honest but unreadable once a singleton is reached
   * from five places, and it is more than the question needs: when instances
   * share an image they share the address, so the count IS the whole remaining
   * fact. The canonical name is the shortest path, which is the one nearest the
   * top object and the one a reader is most likely to recognise.
   *
   * No space before the `+`: every column value stays one whitespace-delimited
   * token, so a script can still split a row on whitespace.
   */
  private summarizeInstances(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return paths[0];
    const canonical = [...paths].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    return `${canonical}+${paths.length - 1}`;
  }

  private instancePathsForRecord(recordIndex: number): string {
    const sharers = this.context.objInstanceStore
      .getAllInstances()
      .filter((inst) => inst.recordIndex === recordIndex)
      .map((inst) => this.instancePath(inst));
    return this.summarizeInstances(sharers);
  }

  private getVarBaseForInstance(instanceId: number): number {
    // VAR space layout: objects are allocated sequentially after code/data.
    // Each object gets 4 bytes reserved at offset 0, then its VAR symbols.
    // We compute VAR bases by summing the VAR sizes of all preceding objects.
    const execSize = this.resolver.executableSize;

    if (instanceId === 0) {
      return execSize;
    }

    // For direct children of top, read from top's object header
    const instance = this.context.objInstanceStore.getInstance(instanceId);
    if (!instance) {
      return execSize;
    }

    if (instance.parentInstanceId === 0) {
      // Direct child of top - read VAR offset from top's object header
      const distiller = this.resolver.distiller;
      const parentRecord = distiller.records.getRecordAt(0);
      if (parentRecord) {
        const parentSubObjects = parentRecord.subObjectIds;
        for (let i = 0; i < parentSubObjects.length; i++) {
          const childId = parentSubObjects[i] & 0x7fffffff;
          if (childId === instanceId) {
            const objImage = this.resolver.objectImage;
            // Object image has 8-byte header: [varSize(4), codeSize(4)], then object data
            // Child entries start at offset 8 (after header), each entry is 8 bytes: [codeOffset(4), varOffset(4)]
            const headerOffset = 8;
            const varOffsetLocation = headerOffset + i * 8 + 4;
            const relativeOffset = objImage.readLong(varOffsetLocation);
            return execSize + relativeOffset;
          }
        }
      }
    }

    // For nested children or fallback: compute from VAR symbol sizes
    // Sum up VAR sizes for all objects before this one
    const allSymbols = this.context.objectSymbolStore.getAllSymbols();
    let cumulativeVarSize = 0;

    for (let objIdx = 0; objIdx < instanceId; objIdx++) {
      const symbols = allSymbols.get(objIdx);
      if (symbols) {
        // Each object has 4 bytes reserved, plus its VAR symbols
        let objVarSize = 4;
        for (const sym of symbols) {
          if (this.isVarSymbolType(sym.type)) {
            const offset = this.extractVarOffset(sym.value);
            const size = this.getVarSymbolSize(sym.type);
            const endOffset = offset + size;
            if (endOffset > objVarSize) {
              objVarSize = endOffset;
            }
          }
        }
        // Round up to 4-byte alignment
        objVarSize = (objVarSize + 3) & ~3;
        cumulativeVarSize += objVarSize;
      } else {
        // No symbols found, assume minimum 4 bytes
        cumulativeVarSize += 4;
      }
    }

    return execSize + cumulativeVarSize;
  }

  private getVarSymbolSize(type: eElementType): number {
    switch (type) {
      case eElementType.type_var_byte:
        return 1;
      case eElementType.type_var_word:
        return 2;
      case eElementType.type_var_long:
        return 4;
      default:
        return 4; // Default to LONG
    }
  }

  /**
   * Fallback label for a distiller record no instance claims.
   *
   * Deliberately does NOT try to name a source file. It used to look the
   * record index up in Context.sourceFiles, which is a different index space —
   * so when the two happened to diverge it confidently printed another
   * object's name. A record with no instance genuinely has no known source
   * file, and saying so is better than guessing.
   */
  private getObjectNameByIndex(recordIndex: number): string {
    return `Object_${recordIndex}`;
  }

  private isDatSymbolType(type: eElementType): boolean {
    return (
      type === eElementType.type_dat_byte ||
      type === eElementType.type_dat_word ||
      type === eElementType.type_dat_long ||
      type === eElementType.type_dat_struct ||
      type === eElementType.type_dat_long_res
    );
  }

  private extractDatOffset(value: bigint | string): number {
    if (typeof value === 'string') return 0;
    return Number(value & 0xfffffn);
  }

  private getDatTypeString(type: eElementType): string {
    switch (type) {
      case eElementType.type_dat_byte:
        return 'BYTE';
      case eElementType.type_dat_word:
        return 'WORD';
      case eElementType.type_dat_long:
        return 'LONG';
      case eElementType.type_dat_struct:
        return 'STRUCT';
      case eElementType.type_dat_long_res:
        return 'LONG_RES';
      default:
        return 'UNKNOWN';
    }
  }

  private cleanSymbolName(name: string): string {
    const parts = name.split('_$_');
    let baseName = parts[0];
    if (baseName.endsWith('_')) {
      baseName = baseName.slice(0, -1);
    }
    return baseName;
  }

  private isVarSymbolType(type: eElementType): boolean {
    return (
      type === eElementType.type_var_byte ||
      type === eElementType.type_var_word ||
      type === eElementType.type_var_long ||
      type === eElementType.type_var_struct ||
      type === eElementType.type_var_byte_ptr ||
      type === eElementType.type_var_word_ptr ||
      type === eElementType.type_var_long_ptr ||
      type === eElementType.type_var_struct_ptr
    );
  }

  private extractVarOffset(value: bigint | string): number {
    if (typeof value === 'string') return 0;
    return Number(value & 0xffffn);
  }

  private getVarTypeString(type: eElementType): string {
    switch (type) {
      case eElementType.type_var_byte:
        return 'BYTE';
      case eElementType.type_var_word:
        return 'WORD';
      case eElementType.type_var_long:
        return 'LONG';
      case eElementType.type_var_struct:
        return 'STRUCT';
      case eElementType.type_var_byte_ptr:
        return 'BYTE_PTR';
      case eElementType.type_var_word_ptr:
        return 'WORD_PTR';
      case eElementType.type_var_long_ptr:
        return 'LONG_PTR';
      case eElementType.type_var_struct_ptr:
        return 'STRUCT_PTR';
      default:
        return 'UNKNOWN';
    }
  }

  private extractMethodEntry(value: bigint | string): number {
    if (typeof value === 'string') return 0;
    return Number(value & 0xffffn);
  }

  /**
   * The hub address where a method's bytecode actually begins.
   *
   * A PUB/PRI symbol does NOT carry an address. Its low bits hold the method's
   * slot INDEX in the object's header table (`objImage.offset >> 2` at the
   * moment the slot was appended), and a child object occupies TWO slots there
   * while a method occupies one — which is why a top object with three
   * children numbers its first method 6, not 3.
   *
   * Only the slot itself holds the bytecode location, in bits 19:0, as a LONG
   * offset from the object's base (`(entry & 0xfffff) << 2`, the same decode
   * the resolver uses for method pointers). Treating the index as a byte offset
   * — which this map did until 1.55.4 — printed methods one byte apart and put
   * a method-table index in a column headed "Address".
   */
  private methodAddress(objectBase: number, value: bigint | string): number | undefined {
    const slotIndex = this.extractMethodEntry(value);
    const slotAddr = objectBase + IMAGE_HEADER_BYTES + slotIndex * 4;
    const entry = this.resolver.objectImage.readLong(slotAddr);
    // Bit 31 set is what marks a slot as a METHOD entry; a child-object entry
    // and the end marker both leave it clear. If it is clear we are not looking
    // at a method slot, and printing a plausible-looking wrong address is worse
    // than admitting we could not resolve one.
    if ((entry & 0x80000000) === 0) {
      return undefined;
    }
    return objectBase + (entry & 0xfffff);
  }

  private hexAddr(addr: number): string {
    return addr.toString(16).toUpperCase().padStart(5, '0');
  }

  private writeLine(text: string): void {
    this.lines.push(text + '\n');
  }

  private logMessage(message: string): void {
    if (this.context.logOptions.logCompile) {
      this.context.logger.logMessage(message);
    }
  }
}
