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
export class MapGenerator {
  private context: Context;
  private resolver: SpinResolver;
  private stream: fs.WriteStream | undefined;

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

    // Create output stream
    this.stream = fs.createWriteStream(mapFilename);

    try {
      // Emit all sections in narrative order
      this.emitHeader();
      this.emitProgramSummary();
      this.emitObjectHierarchy();
      this.emitMemoryLayout();
      this.emitObjectDetails();
      this.emitAddressIndex();
      this.emitSymbolIndex();
    } finally {
      // Close the stream
      this.stream.end();
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

    // Build hierarchy: find root (parentIndex === -1) and children
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
    this.writeLine('  Start   End      Size  Object           Instance         Overrides');
    this.writeLine('  ------  ------  -----  ---------------  ---------------  ---------');

    const instances = this.context.objInstanceStore.getAllInstances();

    for (let i = 0; i < recordCount; i++) {
      const record: DistillerRecord | undefined = records.getRecordAt(i);
      if (record) {
        const startAddr = record.objectOffset;
        const endAddr = startAddr + record.objectSize - 1;

        // Get instance info
        const instance = instances.find((inst) => inst.recordIndex === i);
        const objectName = instance ? instance.sourceFileBaseName : this.getObjectNameByIndex(i);
        const instanceName = instance && instance.parentInstanceId !== -1 ? instance.instanceName : '(entry)';
        const overrides = instance && instance.hasOverrides ? instance.formatOverrides() : '';

        const startStr = '$' + this.hexAddr(startAddr);
        const endStr = '$' + this.hexAddr(endAddr);
        const sizeStr = record.objectSize.toString().padStart(5);
        const objStr = objectName.padEnd(15);
        const instStr = instanceName.padEnd(15);

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
      this.writeLine(`  ${varStartStr}  ${varEndStr}  ${varSizeStr}  ${'VAR SPACE'.padEnd(15)}  ${'(runtime)'.padEnd(15)}`);
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
        instance.parentInstanceId === -1 ? instance.sourceFileBaseName : `${instance.instanceName} : ${instance.sourceFileBaseName}`;

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
          const relativeEntry = this.extractMethodEntry(method.value);
          const absoluteEntry = startAddr + relativeEntry;
          const relativeStr = '$' + relativeEntry.toString(16).toUpperCase().padStart(5, '0');
          const absoluteStr = '$' + this.hexAddr(absoluteEntry);
          const name = this.cleanSymbolName(method.name);
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

  private emitAddressIndex(): void {
    this.writeLine('=== ADDRESS INDEX ===');
    this.writeLine('');

    interface AddressEntry {
      address: number;
      type: string;
      object: string;
      name: string;
    }

    const entries: AddressEntry[] = [];
    const instances = this.context.objInstanceStore.getAllInstances();
    const distiller = this.resolver.distiller;

    // Add object code regions
    for (const instance of instances) {
      const record = distiller.records.getRecordAt(instance.recordIndex);
      if (record) {
        entries.push({
          address: record.objectOffset,
          type: 'CODE',
          object: instance.sourceFileBaseName,
          name: instance.parentInstanceId === -1 ? '(entry)' : instance.instanceName
        });
      }
    }

    // Add method symbols from all objects
    const allSymbols = this.context.objectSymbolStore.getAllSymbols();
    for (const [fileIndex, symbols] of allSymbols) {
      const instance = instances.find((i) => i.sourceFileIndex === fileIndex);
      const objectName = instance ? instance.sourceFileBaseName : `Object_${fileIndex}`;

      for (const symbol of symbols) {
        if (symbol.type === eElementType.type_method) {
          const entry = this.extractMethodEntry(symbol.value);
          entries.push({
            address: entry,
            type: 'METHOD',
            object: objectName,
            name: this.cleanSymbolName(symbol.name)
          });
        }
      }
    }

    if (entries.length === 0) {
      this.writeLine('  No addressable symbols.');
      this.writeLine('');
      return;
    }

    // Sort by address
    entries.sort((a, b) => a.address - b.address);

    // Column widths: Address=7 (right-aligned), Type=8, Object=15, Name=variable
    this.writeLine('  Address  Type      Object           Name');
    this.writeLine('  -------  --------  ---------------  ---------------');

    for (const entry of entries) {
      const addrStr = ('$' + entry.address.toString(16).toUpperCase().padStart(5, '0')).padStart(7);
      const typeStr = entry.type.padEnd(8);
      const objStr = entry.object.padEnd(15);
      this.writeLine(`  ${addrStr}  ${typeStr}  ${objStr}  ${entry.name}`);
    }

    this.writeLine('');
    this.writeLine(`  Entries: ${entries.length}`);
    this.writeLine('');
  }

  // ========================================================================
  // SECTION 7: Symbol Index
  // ========================================================================

  private emitSymbolIndex(): void {
    this.writeLine('=== SYMBOL INDEX ===');
    this.writeLine('');

    interface SymbolIndexEntry {
      name: string;
      object: string;
      type: string;
      location: string;
    }

    const entries: SymbolIndexEntry[] = [];
    const instances = this.context.objInstanceStore.getAllInstances();
    const allSymbols = this.context.objectSymbolStore.getAllSymbols();
    const distiller = this.resolver.distiller;

    for (const [fileIndex, symbols] of allSymbols) {
      const instance = instances.find((i) => i.sourceFileIndex === fileIndex);
      const objectName = instance ? instance.sourceFileBaseName : `Object_${fileIndex}`;

      for (const symbol of symbols) {
        const cleanName = this.cleanSymbolName(symbol.name);
        let type = '';
        let location = '';

        if (symbol.type === eElementType.type_method) {
          type = 'METHOD';
          const entry = this.extractMethodEntry(symbol.value);
          location = '$' + entry.toString(16).toUpperCase().padStart(5, '0');
        } else if (this.isVarSymbolType(symbol.type)) {
          type = 'VAR';
          const offset = this.extractVarOffset(symbol.value);
          const varBase = instance ? this.getVarBaseForInstance(instance.instanceId) : 0;
          const absoluteAddr = varBase + offset;
          location = '$' + this.hexAddr(absoluteAddr);
        } else if (this.isDatSymbolType(symbol.type)) {
          if (typeof symbol.value !== 'string') {
            const upperBits = Number((symbol.value >> 20n) & 0xfffn);
            if (upperBits === 0xfff) {
              type = 'DAT';
              const relativeOffset = this.extractDatOffset(symbol.value);
              // Get code base for this object to calculate absolute address
              const record = instance ? distiller.records.getRecordAt(instance.recordIndex) : undefined;
              const codeBase = record ? record.objectOffset : 0;
              const absoluteAddr = codeBase + relativeOffset;
              location = '$' + this.hexAddr(absoluteAddr);
            } else {
              const cogOrg = Number((symbol.value >> 18n) & 0x3fffn);
              const cogAddr = cogOrg >> 2;
              if (symbol.isInline) {
                // Inline PASM - show as INLINE with relative + hub address
                type = 'INLINE';
                const record = instance ? distiller.records.getRecordAt(instance.recordIndex) : undefined;
                const codeBase = record ? record.objectOffset : 0;
                const hubAddr = codeBase + cogAddr * 4;
                location = '+$' + cogAddr.toString(16).toUpperCase().padStart(3, '0') + '  ($' + this.hexAddr(hubAddr) + ')';
              } else {
                // DAT PASM - show both COG and HUB addresses
                type = 'PASM';
                // Get object start to calculate HUB address
                const record = instance ? distiller.records.getRecordAt(instance.recordIndex) : undefined;
                const codeBase = record ? record.objectOffset : 0;
                const hubAddr = codeBase + cogAddr * 4;
                location = 'COG $' + cogAddr.toString(16).toUpperCase().padStart(3, '0') + '  HUB $' + this.hexAddr(hubAddr);
              }
            }
          }
        }

        if (type) {
          entries.push({ name: cleanName, object: objectName, type, location });
        }
      }
    }

    if (entries.length === 0) {
      this.writeLine('  No symbols.');
      this.writeLine('');
      return;
    }

    // Sort alphabetically by name
    entries.sort((a, b) => a.name.localeCompare(b.name));

    // Column widths: Symbol=20, Object=15, Type=8, Location=variable
    this.writeLine('  Symbol                Object           Type      Location');
    this.writeLine('  --------------------  ---------------  --------  ----------');

    for (const entry of entries) {
      const nameStr = entry.name.padEnd(20);
      const objStr = entry.object.padEnd(15);
      const typeStr = entry.type.padEnd(8);
      this.writeLine(`  ${nameStr}  ${objStr}  ${typeStr}  ${entry.location}`);
    }

    this.writeLine('');
    this.writeLine(`  Symbols: ${entries.length}`);
    this.writeLine('');
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getVarBaseForInstance(instanceIndex: number): number {
    // VAR space layout: objects are allocated sequentially after code/data.
    // Each object gets 4 bytes reserved at offset 0, then its VAR symbols.
    // We compute VAR bases by summing the VAR sizes of all preceding objects.
    const execSize = this.resolver.executableSize;

    if (instanceIndex === 0) {
      return execSize;
    }

    // For direct children of top (parentIndex === 0), read from top's header
    const instance = this.context.objInstanceStore.getInstance(instanceIndex);
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
          if (childId === instanceIndex) {
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

    for (let objIdx = 0; objIdx < instanceIndex; objIdx++) {
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

  private hexAddr(addr: number): string {
    return addr.toString(16).toUpperCase().padStart(5, '0');
  }

  private writeLine(text: string): void {
    if (this.stream) {
      this.stream.write(text + '\n');
    }
  }

  private logMessage(message: string): void {
    if (this.context.logOptions.logCompile) {
      this.context.logger.logMessage(message);
    }
  }
}
