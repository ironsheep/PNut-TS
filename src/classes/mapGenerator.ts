/** @format */
'use strict';

// src/classes/mapGenerator.ts
// Writes the `.map` memory map file from the compiler's ObjectLayout.
//
// Every fact printed here comes from `context.objectLayout`
// (`src/classes/objectLayout.ts`), which is built from the final compiled
// image. This generator does not read the symbol table, the distiller or any
// source-file-keyed store: the format is specified, byte for byte, in
// `DOCs/internals/MAP-File-Format.md`, and that document is this file's
// contract.

import fs from 'fs';
import { Context } from '../utils/context';
import { LayoutImage, LayoutOverride, ObjectLayout } from './objectLayout';

// ============================================================================
// Small formatting helpers
// ============================================================================

function hex5(value: number): string {
  return '$' + (value >>> 0).toString(16).toUpperCase().padStart(5, '0');
}

function offset5(value: number): string {
  return '+$' + (value >>> 0).toString(16).toUpperCase().padStart(5, '0');
}

function cog3(value: number): string {
  return '$' + (value >>> 0).toString(16).toUpperCase().padStart(3, '0');
}

function ordinalCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Escape a source file name for a table cell: every control character, space,
 * `%`, `,` or DEL becomes `%XX` (two uppercase hex digits).
 */
function escapeSourceName(name: string): string {
  let out = '';
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code <= 0x20 || code === 0x25 || code === 0x2c || code === 0x7f) {
      out += '%' + code.toString(16).toUpperCase().padStart(2, '0');
    } else {
      out += name[i];
    }
  }
  return out;
}

/** Plain comma-joined list; `-` when empty. No array-run compression. */
function joinList(items: string[]): string {
  return items.length === 0 ? '-' : items.join(',');
}

/**
 * Comma-joined list with array-run compression: three or more consecutive
 * items that share everything up to a final `[index]`, indices ascending by
 * one, collapse to `NAME[first..last]`.
 */
function formatRunList(items: string[]): string {
  if (items.length === 0) {
    return '-';
  }
  const out: string[] = [];
  let i = 0;
  const arrayItem = (text: string): { prefix: string; index: number } | undefined => {
    const m = /^(.*)\[(\d+)\]$/.exec(text);
    return m === undefined || m === null ? undefined : { prefix: m[1], index: parseInt(m[2], 10) };
  };
  while (i < items.length) {
    const first = arrayItem(items[i]);
    if (first !== undefined) {
      let j = i;
      let last = first.index;
      while (j + 1 < items.length) {
        const next = arrayItem(items[j + 1]);
        if (next !== undefined && next.prefix === first.prefix && next.index === last + 1) {
          j++;
          last = next.index;
        } else {
          break;
        }
      }
      if (j - i + 1 >= 3) {
        out.push(`${first.prefix}[${first.index}..${last}]`);
        i = j + 1;
        continue;
      }
    }
    out.push(items[i]);
    i++;
  }
  return out.join(',');
}

function signedInt32(bits: number): string {
  const value = bits >= 0x80000000 ? bits - 0x100000000 : bits;
  return value.toString();
}

/**
 * Shortest decimal (1 to 9 significant digits), always with a decimal point,
 * that converts back to the same single-precision value carried by `bits`.
 */
function floatOverrideText(bits: number): string {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, bits >>> 0);
  const value = view.getFloat32(0);
  for (let digits = 1; digits <= 9; digits++) {
    const candidate = value.toPrecision(digits);
    if (Math.fround(Number(candidate)) === value) {
      return toPlainDecimal(candidate);
    }
  }
  return toPlainDecimal(value.toString());
}

/** Render a decimal string (possibly in exponential form) as a plain decimal with a decimal point. */
function toPlainDecimal(text: string): string {
  const asNumber = Number(text);
  if (!text.includes('e') && !text.includes('E')) {
    return text.includes('.') ? text : `${text}.0`;
  }
  // Exponential form from toPrecision: expand manually rather than trust
  // Number#toFixed, whose fixed digit count would reintroduce rounding noise
  // toPrecision already resolved.
  const negative = asNumber < 0;
  const magnitude = Math.abs(asNumber);
  const [mantissa, exponentText] = magnitude.toExponential().split('e');
  const exponent = parseInt(exponentText, 10);
  const digits = mantissa.replace('.', '');
  let result: string;
  if (exponent >= 0) {
    const whole = digits.padEnd(exponent + 1, '0').substring(0, exponent + 1);
    const frac = digits.substring(exponent + 1) || '0';
    result = `${whole}.${frac}`;
  } else {
    result = `0.${'0'.repeat(-exponent - 1)}${digits}`;
  }
  return (negative ? '-' : '') + result;
}

function formatOverrides(overrides: LayoutOverride[]): string {
  if (overrides.length === 0) {
    return '-';
  }
  return overrides.map((o) => `${o.name}=${o.isFloat ? floatOverrideText(o.bits) : signedInt32(o.bits)}`).join(',');
}

// ============================================================================
// Table rendering
// ============================================================================

/**
 * Render one table: header, rule and rows, two-space indented, cells
 * separated by two spaces, `Size` columns right-aligned, every other column
 * left-aligned, and the last cell of every line never padded.
 */
function renderTable(headers: string[], rows: string[][]): string[] {
  const cols = headers.length;
  const widths = headers.map((h, i) => rows.reduce((w, row) => Math.max(w, row[i].length), h.length));
  const rightAlign = headers.map((h) => h === 'Size');
  const renderRow = (cells: string[]): string => {
    const parts = cells.map((cell, i) => {
      if (i === cols - 1) {
        return cell;
      }
      return rightAlign[i] ? cell.padStart(widths[i]) : cell.padEnd(widths[i]);
    });
    return '  ' + parts.join('  ');
  };
  const lines = [renderRow(headers), renderRow(widths.map((w) => '-'.repeat(w)))];
  for (const row of rows) {
    lines.push(renderRow(row));
  }
  return lines;
}

// ============================================================================
// Generator
// ============================================================================

export class MapGenerator {
  private context: Context;
  private lines: string[] = [];

  constructor(context: Context) {
    this.context = context;
  }

  /** Write the map file, if `-m`/`--map` requested one and the compile produced a layout. */
  public generate(): void {
    if (!this.context.compileOptions.writeMapFile) {
      return;
    }
    const layout = this.context.objectLayout;
    if (layout === undefined) {
      return;
    }

    const mapFilename = this.context.compileOptions.mapFilename;
    this.lines = [];
    try {
      this.emitHeader(layout);
      this.emitSummary(layout);
      this.emitObjectTree(layout);
      this.emitMemoryLayout(layout);
      this.emitObjectDetails(layout);
      const facts = this.collectFacts(layout);
      this.emitAddressIndex(layout, facts);
      this.emitSymbolIndex(layout, facts);
      // One synchronous write: anything reading the map right after the
      // compiler reports "Wrote <name>.map" must see the complete file.
      fs.writeFileSync(mapFilename, this.lines.join(''));
    } finally {
      this.lines = [];
    }

    this.context.logger.progressMsg(`Wrote ${mapFilename}`);
  }

  // --------------------------------------------------------------------
  // Header
  // --------------------------------------------------------------------

  private emitHeader(layout: ObjectLayout): void {
    const topFile = this.context.sourceFiles.getTopFile();
    this.writeLine('================================================================================');
    this.writeLine(`PNut-TS Memory Map: ${layout.topSourceFileName}`);
    this.writeLine(`Spin2_v${topFile.versionNumber}`);
    this.writeLine(`Generated: ${new Date().toISOString()}`);
    this.writeLine('================================================================================');
    this.writeLine('');
  }

  // --------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------

  private emitSummary(layout: ObjectLayout): void {
    this.writeLine('=== SUMMARY ===');
    this.writeLine('');
    this.writeLine(`  ${this.summarySentence(layout)}`);
    this.writeLine('');

    const total = layout.imageBytes + layout.varBytes;
    const labelWidth = 16;
    const valueWidth = Math.max(layout.imageBytes, layout.varBytes, total).toString().length;
    this.writeLine(`  ${'Code/DAT bytes'.padEnd(labelWidth)}${layout.imageBytes.toString().padStart(valueWidth)}`);
    this.writeLine(`  ${'VAR bytes'.padEnd(labelWidth)}${layout.varBytes.toString().padStart(valueWidth)}`);
    this.writeLine(`  ${'Total bytes'.padEnd(labelWidth)}${total.toString().padStart(valueWidth)}`);
    this.writeLine(`  ${'Hub base'.padEnd(labelWidth)}${hex5(layout.hubLoadBase)}`);
    this.writeLine('');

    this.writeLine('  image       compiled code and DAT, shared by every instance that uses it');
    this.writeLine('  instance    the top object, or one OBJ declaration or array element below it');
    this.writeLine('  shared DAT  an image holds its DAT once; all of its instances use the same bytes');
    this.writeLine('  own VAR     each instance has its own VAR block; the first long of it is reserved');
    this.writeLine('  #n          image number: #1 is the top object, the rest ascend in address order');
    this.writeLine('  path        instance name: (top) A A.LEAF D[1] A.D[1].LEAF; D[0..4] means D[0] to D[4]');
    this.writeLine('  address     offset from the first byte of the top object image; hub address = address + hub base');
    this.writeLine('');
  }

  private summarySentence(layout: ObjectLayout): string {
    if (layout.kind === 'pasm') {
      return 'This PASM-only program is 1 image with no objects, so it has no instances and no VAR.';
    }
    const declarationCount = layout.declarationCount;
    if (declarationCount === 0) {
      return 'The top object became 1 instance, built from 1 image; no image is shared.';
    }
    const instanceCount = layout.instances.length;
    const imageCount = layout.images.length;
    const sharedCount = layout.images.filter((image) => image.users.length > 1).length;
    const shared =
      sharedCount === 0
        ? 'no image is shared'
        : sharedCount === 1
          ? '1 image is shared by more than one instance'
          : `${sharedCount} images are shared by more than one instance`;
    const decl = declarationCount === 1 ? 'declaration' : 'declarations';
    const inst = instanceCount === 1 ? 'instance' : 'instances';
    const img = imageCount === 1 ? 'image' : 'images';
    return `The top object and ${declarationCount} OBJ ${decl} became ${instanceCount} ${inst}, built from ${imageCount} ${img}; ${shared}.`;
  }

  // --------------------------------------------------------------------
  // OBJECT TREE
  // --------------------------------------------------------------------

  private emitObjectTree(layout: ObjectLayout): void {
    this.writeLine('=== OBJECT TREE ===');
    this.writeLine('');
    if (layout.kind === 'pasm' || layout.instances.length === 0) {
      this.writeLine('  (none)');
      this.writeLine('');
      return;
    }
    const rows = layout.instances.map((instance) => [
      '  '.repeat(instance.depth) + instance.path,
      `#${instance.image.number}`,
      escapeSourceName(instance.sourceFileName),
      formatOverrides(instance.overrides)
    ]);
    for (const line of renderTable(['Instance', 'Image', 'Source', 'Overrides'], rows)) {
      this.writeLine(line);
    }
    this.writeLine('');
  }

  // --------------------------------------------------------------------
  // MEMORY LAYOUT
  // --------------------------------------------------------------------

  private emitMemoryLayout(layout: ObjectLayout): void {
    this.writeLine('=== MEMORY LAYOUT ===');
    this.writeLine('');

    this.writeLine('  Images');
    const imageRows = layout.images.map((image) => [
      `${hex5(image.base)}-${hex5(image.base + image.size - 1)}`,
      image.size.toString(),
      `#${image.number}`,
      joinList(image.sources.map(escapeSourceName)),
      layout.kind === 'pasm' ? '-' : formatRunList(image.users.map((u) => u.path))
    ]);
    for (const line of renderTable(['Range', 'Size', 'Image', 'Source', 'Instances'], imageRows)) {
      this.writeLine(line);
    }
    this.writeLine('');

    if (layout.kind === 'spin') {
      this.writeLine('  VAR blocks');
      const varRows = layout.instances.map((instance) => [
        `${hex5(instance.varBase)}-${hex5(instance.varBase + instance.varBytes - 1)}`,
        instance.varBytes.toString(),
        `#${instance.image.number}`,
        instance.path
      ]);
      for (const line of renderTable(['Range', 'Size', 'Image', 'Instance'], varRows)) {
        this.writeLine(line);
      }
      this.writeLine('');
    }
  }

  // --------------------------------------------------------------------
  // OBJECT DETAILS
  // --------------------------------------------------------------------

  private imageSourceCell(image: LayoutImage): string {
    return joinList(image.sources.map(escapeSourceName));
  }

  private emitObjectDetails(layout: ObjectLayout): void {
    this.writeLine('=== OBJECT DETAILS ===');
    this.writeLine('');

    for (const image of layout.images) {
      this.writeLine(`--- #${image.number} ${this.imageSourceCell(image)} ---`);
      this.writeLine('');

      if (image.symbols.methods.length > 0) {
        this.writeLine('  Methods');
        const rows = image.symbols.methods.map((m) => [m.name, offset5(m.offset), hex5(image.base + m.offset)]);
        for (const line of renderTable(['Name', 'Offset', 'Address'], rows)) {
          this.writeLine(line);
        }
        this.writeLine('');
      }

      if (image.symbols.dat.length > 0) {
        this.writeLine('  DAT');
        const rows = image.symbols.dat.map((d) => [d.type, d.name, offset5(d.offset), hex5(image.base + d.offset)]);
        for (const line of renderTable(['Type', 'Name', 'Offset', 'Address'], rows)) {
          this.writeLine(line);
        }
        this.writeLine('');
      }

      if (image.symbols.pasmLabels.length > 0) {
        this.writeLine('  PASM labels');
        const rows = image.symbols.pasmLabels.map((p) => [p.name, cog3(p.cog), offset5(p.offset), hex5(image.base + p.offset)]);
        for (const line of renderTable(['Name', 'Cog', 'Offset', 'Address'], rows)) {
          this.writeLine(line);
        }
        this.writeLine('');
      }

      if (image.symbols.inlinePasm.length > 0) {
        this.writeLine('  Inline PASM');
        // A label inside an ORGH inline block has no cog address (hub mode);
        // its Cog cell is `-`. Everything else prints as a normal label row.
        const rows = image.symbols.inlinePasm.map((p) => [
          p.name,
          p.cog === undefined ? '-' : cog3(p.cog),
          offset5(p.offset),
          hex5(image.base + p.offset)
        ]);
        for (const line of renderTable(['Name', 'Cog', 'Offset', 'Address'], rows)) {
          this.writeLine(line);
        }
        this.writeLine('');
      }

      if (image.slots.length > 0) {
        this.writeLine('  Child slots');
        const rows = image.slots.map((slot) => [slot.index.toString(), formatRunList(slot.names), `#${slot.image.number}`, offset5(slot.varOffset)]);
        for (const line of renderTable(['Slot', 'Name', 'Image', 'VAR'], rows)) {
          this.writeLine(line);
        }
        this.writeLine('');
      }

      const varRows: string[][] = [];
      for (const user of image.users) {
        for (const sym of user.varSymbols) {
          varRows.push([user.path, sym.type, sym.name, sym.size.toString(), offset5(sym.offset), hex5(user.varBase + sym.offset)]);
        }
      }
      if (varRows.length > 0) {
        this.writeLine('  VAR');
        for (const line of renderTable(['Instance', 'Type', 'Name', 'Size', 'Offset', 'Address'], varRows)) {
          this.writeLine(line);
        }
        this.writeLine('');
      }
    }
  }

  // --------------------------------------------------------------------
  // Facts shared by ADDRESS INDEX and SYMBOL INDEX
  // --------------------------------------------------------------------

  private collectFacts(layout: ObjectLayout): Fact[] {
    const facts: Fact[] = [];
    for (const image of layout.images) {
      facts.push({ address: image.base, type: 'IMAGE', name: '(start)', imageNumber: image.number });
      for (const m of image.symbols.methods) {
        facts.push({ address: image.base + m.offset, type: 'METHOD', name: m.name, imageNumber: image.number });
      }
      for (const d of image.symbols.dat) {
        facts.push({ address: image.base + d.offset, type: 'DAT', name: d.name, imageNumber: image.number });
      }
      for (const p of image.symbols.pasmLabels) {
        facts.push({ address: image.base + p.offset, type: 'PASM', name: p.name, imageNumber: image.number });
      }
      for (const p of image.symbols.inlinePasm) {
        facts.push({ address: image.base + p.offset, type: 'INLINE', name: p.name, imageNumber: image.number });
      }
    }
    layout.instances.forEach((instance, index) => {
      facts.push({ address: instance.varBase, type: 'VAR', name: '(start)', instancePath: instance.path, treeIndex: index });
      for (const sym of instance.varSymbols) {
        facts.push({ address: instance.varBase + sym.offset, type: 'VAR', name: sym.name, instancePath: instance.path, treeIndex: index });
      }
    });
    return facts;
  }

  // --------------------------------------------------------------------
  // ADDRESS INDEX
  // --------------------------------------------------------------------

  private emitAddressIndex(layout: ObjectLayout, facts: Fact[]): void {
    this.writeLine('=== ADDRESS INDEX ===');
    this.writeLine('');
    const typeOrder: Record<Fact['type'], number> = { IMAGE: 0, METHOD: 1, DAT: 2, PASM: 3, INLINE: 4, VAR: 5 };
    const sorted = [...facts].sort((a, b) => {
      if (a.address !== b.address) return a.address - b.address;
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      const aStart = a.name === '(start)';
      const bStart = b.name === '(start)';
      if (aStart !== bStart) return aStart ? -1 : 1;
      if (a.name !== b.name) return ordinalCompare(a.name, b.name);
      if (a.type === 'VAR') return (a.treeIndex ?? 0) - (b.treeIndex ?? 0);
      return (a.imageNumber ?? 0) - (b.imageNumber ?? 0);
    });
    if (sorted.length === 0) {
      this.writeLine('  (none)');
      this.writeLine('');
      return;
    }
    const rows = sorted.map((f) => [hex5(f.address), f.type, f.type === 'VAR' ? (f.instancePath ?? '') : `#${f.imageNumber}`, f.name]);
    for (const line of renderTable(['Address', 'Type', 'Owner', 'Name'], rows)) {
      this.writeLine(line);
    }
    this.writeLine('');
  }

  // --------------------------------------------------------------------
  // SYMBOL INDEX
  // --------------------------------------------------------------------

  private emitSymbolIndex(layout: ObjectLayout, facts: Fact[]): void {
    this.writeLine('=== SYMBOL INDEX ===');
    this.writeLine('');
    const named = facts.filter((f) => f.name !== '(start)');
    const typeOrder: Record<Fact['type'], number> = { IMAGE: 0, METHOD: 1, DAT: 2, PASM: 3, INLINE: 4, VAR: 5 };
    const sorted = [...named].sort((a, b) => {
      if (a.name !== b.name) return ordinalCompare(a.name, b.name);
      if (a.address !== b.address) return a.address - b.address;
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      if (a.type === 'VAR') return (a.treeIndex ?? 0) - (b.treeIndex ?? 0);
      return (a.imageNumber ?? 0) - (b.imageNumber ?? 0);
    });
    if (sorted.length === 0) {
      this.writeLine('  (none)');
      this.writeLine('');
      return;
    }
    const rows = sorted.map((f) => [f.name, f.type, f.type === 'VAR' ? (f.instancePath ?? '') : `#${f.imageNumber}`, hex5(f.address)]);
    for (const line of renderTable(['Symbol', 'Type', 'Owner', 'Address'], rows)) {
      this.writeLine(line);
    }
    this.writeLine('');
  }

  private writeLine(text: string): void {
    this.lines.push(text + '\n');
  }
}

interface Fact {
  address: number;
  type: 'IMAGE' | 'METHOD' | 'DAT' | 'PASM' | 'INLINE' | 'VAR';
  name: string;
  imageNumber?: number;
  instancePath?: string;
  treeIndex?: number;
}
