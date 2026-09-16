/** @format */
'use strict';

// src/classes/objectLayout.ts
// The program's object layout, read from the final compiled image.

import { SymbolEntry } from './symbolTable';
import { eElementType } from './types';
import { deserializeSymbols, serializeSymbols } from './objectCache';

// ============================================================================
// Compile-time record
// ============================================================================

/** One OBJ override as written, in declaration order. */
export interface LayoutOverride {
  name: string;
  /** The 32-bit pattern as stored, unsigned. A float is its IEEE-754 single bits. */
  bits: number;
  isFloat: boolean;
}

/**
 * What ONE compile of ONE object produced.
 *
 * Captured at the compile itself (or restored from the cache entry that
 * compile wrote), never looked up by source file afterwards: two declarations
 * of one file with different overrides are two variants with their own
 * offsets, and keying by file is what let the last one overwrite the first.
 */
export interface CompiledVariant {
  sourceFileName: string;
  /** User symbols exactly as the resolver reported them. */
  symbols: SymbolEntry[];
  /** VAR symbol name -> bytes it occupies (element size x count). */
  varSizes: Map<string, number>;
  /** This object's own VAR block size after its long-align (0 in PASM mode). */
  ownVarBytes: number;
}

/** Tree form of the recorded declarations, one node per compile (or cache replay). */
export interface RecordedNode {
  sourceFileName: string;
  overrides: LayoutOverride[];
  /** Declaration index in the parent's OBJ blocks; -1 for the top. */
  position: number;
  /** Header slots this declaration takes: 1..255; 1 for the top. */
  elementCount: number;
  /** Brackets were written (`d[1]` is an array of one). */
  isArray: boolean;
  variant: CompiledVariant;
  /** Ascending position. */
  children: RecordedNode[];
}

/** One flat recorded declaration, as the compiler accumulates them. */
export interface RecordedDeclaration {
  parentInstanceId: number; // -1 = declared by the top object
  childPosition: number;
  sourceFileName: string;
  overrides: { name: string; value: string; isFloat: boolean }[];
  elementCount: number;
  isArray: boolean;
  variant: CompiledVariant | undefined;
}

export type LayoutKind = 'spin' | 'pasm';

export interface LayoutBuildInput {
  kind: LayoutKind;
  /** Top image bytes: psize bytes for Spin, the hub bytes for PASM. */
  image: Uint8Array;
  /** Total VAR bytes (0 for PASM). */
  varBytes: number;
  /** Offset of image byte 0 in the composed .bin. */
  hubLoadBase: number;
  top: RecordedNode;
}

// ============================================================================
// Layout model
// ============================================================================

export interface ImageSymbols {
  methods: { name: string; methodIndex: number; offset: number }[];
  dat: { name: string; type: DatTypeName; offset: number }[];
  pasmLabels: { name: string; cog: number; offset: number }[];
  /** `cog` is undefined for a label inside an ORGH block (hub mode). */
  inlinePasm: { name: string; cog: number | undefined; offset: number }[];
}

export type DatTypeName = 'BYTE' | 'WORD' | 'LONG' | 'STRUCT';
export type VarTypeName = 'BYTE' | 'WORD' | 'LONG' | 'STRUCT' | '^BYTE' | '^WORD' | '^LONG' | '^STRUCT';

export interface LayoutMethodEntry {
  index: number;
  /** Entry offset from the image base (low 20 bits). */
  offset: number;
  params: number;
  results: number;
}

export interface LayoutImageSlot {
  index: number;
  codeOffset: number;
  varOffset: number;
  image: LayoutImage;
  /** Distinct declared names across users, ordinal order. */
  names: string[];
}

/** Facts that are bytes of the image, so the same for every instance using it. */
export interface LayoutImage {
  number: number;
  base: number;
  /** Object size long (PASM: the image length). */
  size: number;
  headerBytes: number;
  methodTable: LayoutMethodEntry[];
  slots: LayoutImageSlot[];
  /** Instances using the image, tree order. */
  users: LayoutInstance[];
  /** Distinct source file names of the users, ordinal order. */
  sources: string[];
  /** Every distinct symbol set compiled into these bytes, first-user order. */
  symbolVariants: { symbols: ImageSymbols; users: LayoutInstance[] }[];
  /** Union of the variants, one row per distinct (kind, type, name, cog, offset). */
  symbols: ImageSymbols;
}

export interface LayoutDeclaration {
  name: string;
  position: number;
  firstSlot: number;
  elementCount: number;
  isArray: boolean;
  elementIndex: number;
}

export interface LayoutVarSymbol {
  name: string;
  type: VarTypeName;
  offset: number;
  size: number;
}

/** Facts that can differ between instances sharing one image. */
export interface LayoutInstance {
  path: string;
  slotPath: number[];
  depth: number;
  parent: LayoutInstance | undefined;
  /** Indexed by slot. */
  children: LayoutInstance[];
  declaration: LayoutDeclaration | undefined;
  sourceFileName: string;
  overrides: LayoutOverride[];
  image: LayoutImage;
  codeBase: number;
  /** Absolute: topVarBase + varOffset. */
  varBase: number;
  varOffset: number;
  /** Own VAR block. */
  varBytes: number;
  /** Own VAR block plus descendants. */
  varExtent: number;
  varSymbols: LayoutVarSymbol[];
  variant: CompiledVariant;
}

export interface ObjectLayout {
  kind: LayoutKind;
  topSourceFileName: string;
  imageBytes: number;
  varBytes: number;
  topVarBase: number;
  hubLoadBase: number;
  images: LayoutImage[];
  /** Tree order; empty for PASM. */
  instances: LayoutInstance[];
  /** Sum over distinct source files of the distinct OBJ names declared in that file. */
  declarationCount: number;
}

// ============================================================================
// Errors
// ============================================================================

const ERROR_PREFIX = 'Internal error: ObjectLayout:';

function fail(where: string, what: string): never {
  throw new Error(`${ERROR_PREFIX} ${where}: ${what}`);
}

function hex(value: number): string {
  return `$${value.toString(16).toUpperCase().padStart(5, '0')}`;
}

// ============================================================================
// Recorded tree
// ============================================================================

/** Convert a raw override value string to its unsigned 32-bit pattern. */
function overrideBits(where: string, name: string, value: string): number {
  let parsed: bigint;
  try {
    parsed = BigInt(value);
  } catch {
    fail(where, `override ${name} has a non-numeric value [${value}]`);
  }
  return Number(BigInt.asUintN(32, parsed));
}

/**
 * Build the recorded tree from the compiler's flat declaration list.
 *
 * Throws when a declaration never received its variant: every declaration's
 * compile or cache replay completes before the layout is built, so a missing
 * one means the capture is broken, and building without it would silently
 * drop that subtree's symbols.
 */
export function recordedTreeFrom(topSourceFileName: string, topVariant: CompiledVariant | undefined, recorded: RecordedDeclaration[]): RecordedNode {
  if (topVariant === undefined) {
    fail('(top)', 'no compiled variant recorded for the top object');
  }
  const top: RecordedNode = {
    sourceFileName: topSourceFileName,
    overrides: [],
    position: -1,
    elementCount: 1,
    isArray: false,
    variant: topVariant,
    children: []
  };
  const nodes: RecordedNode[] = [];
  for (let id = 0; id < recorded.length; id++) {
    const entry = recorded[id];
    const where = `recorded declaration ${id} (${entry.sourceFileName})`;
    if (entry.variant === undefined) {
      fail(where, 'no compiled variant recorded (compile or cache replay did not capture one)');
    }
    nodes.push({
      sourceFileName: entry.sourceFileName,
      overrides: entry.overrides.map((o) => ({ name: o.name, bits: overrideBits(where, o.name, o.value), isFloat: o.isFloat })),
      position: entry.childPosition,
      elementCount: entry.elementCount,
      isArray: entry.isArray,
      variant: entry.variant,
      children: []
    });
  }
  for (let id = 0; id < recorded.length; id++) {
    const parentId = recorded[id].parentInstanceId;
    if (parentId !== -1 && (parentId < 0 || parentId >= nodes.length)) {
      fail(`recorded declaration ${id}`, `parent ${parentId} does not exist`);
    }
    const parent = parentId === -1 ? top : nodes[parentId];
    parent.children.push(nodes[id]);
  }
  const sortChildren = (node: RecordedNode): void => {
    node.children.sort((a, b) => a.position - b.position);
    node.children.forEach(sortChildren);
  };
  sortChildren(top);
  return top;
}

// ============================================================================
// Header walk
// ============================================================================

const MSB = 0x80000000;

interface DecodedHeader {
  slots: { codeOffset: number; varOffset: number }[];
  methodTable: LayoutMethodEntry[];
  size: number;
  headerBytes: number;
}

function readLong(image: Uint8Array, offset: number): number | undefined {
  if (offset < 0 || offset + 4 > image.length) {
    return undefined;
  }
  return (image[offset] | (image[offset + 1] << 8) | (image[offset + 2] << 16) | (image[offset + 3] << 24)) >>> 0;
}

function decodeHeader(image: Uint8Array, base: number, where: string): DecodedHeader {
  const slots: { codeOffset: number; varOffset: number }[] = [];
  let cursor = base;
  for (;;) {
    const first = readLong(image, cursor);
    if (first === undefined) {
      fail(where, `object table at ${hex(base)} runs past the image end`);
    }
    if ((first & MSB) !== 0) {
      break;
    }
    const second = readLong(image, cursor + 4);
    if (second === undefined) {
      fail(where, `object table pair at ${hex(cursor)} runs past the image end`);
    }
    slots.push({ codeOffset: first, varOffset: second });
    cursor += 8;
  }
  const methodTable: LayoutMethodEntry[] = [];
  let size = 0;
  for (;;) {
    const raw = readLong(image, cursor);
    if (raw === undefined) {
      fail(where, `method table at ${hex(base)} runs past the image end`);
    }
    cursor += 4;
    if ((raw & MSB) === 0) {
      size = raw;
      break;
    }
    methodTable.push({ index: methodTable.length, offset: raw & 0xfffff, params: (raw >>> 24) & 0x7f, results: (raw >>> 20) & 0x0f });
  }
  const headerBytes = cursor - base;
  if (methodTable.length === 0) {
    fail(where, `object at ${hex(base)} has no methods`);
  }
  if (size < headerBytes || base + size > image.length) {
    fail(where, `object at ${hex(base)} has size ${size}, outside [${headerBytes}, image end ${image.length - base}]`);
  }
  for (let index = 0; index < slots.length; index++) {
    const { codeOffset } = slots[index];
    if (codeOffset === 0 || base + codeOffset >= image.length) {
      fail(where, `slot ${index} code offset ${hex(codeOffset)} from ${hex(base)} is outside the image`);
    }
  }
  return { slots, methodTable, size, headerBytes };
}

// ============================================================================
// Symbol decoding
// ============================================================================

const DAT_TYPES: Map<eElementType, DatTypeName> = new Map([
  [eElementType.type_dat_byte, 'BYTE'],
  [eElementType.type_dat_word, 'WORD'],
  [eElementType.type_dat_long, 'LONG'],
  [eElementType.type_dat_struct, 'STRUCT'],
  [eElementType.type_dat_long_res, 'LONG']
]);

const VAR_TYPES: Map<eElementType, VarTypeName> = new Map([
  [eElementType.type_var_byte, 'BYTE'],
  [eElementType.type_var_word, 'WORD'],
  [eElementType.type_var_long, 'LONG'],
  [eElementType.type_var_struct, 'STRUCT'],
  [eElementType.type_var_byte_ptr, '^BYTE'],
  [eElementType.type_var_word_ptr, '^WORD'],
  [eElementType.type_var_long_ptr, '^LONG'],
  [eElementType.type_var_struct_ptr, '^STRUCT']
]);

/** Cog-mode label offsets share their long with the cog address and keep only 18 bits. */
const COG_LABEL_OFFSET_LIMIT = 0x40000;

function symbolLong(symbol: SymbolEntry): number | undefined {
  return typeof symbol.value === 'bigint' ? Number(BigInt.asUintN(32, symbol.value)) : undefined;
}

function byOffsetThenName<T extends { offset: number; name: string }>(a: T, b: T): number {
  return a.offset - b.offset || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

function decodeImageSymbols(variant: CompiledVariant, header: DecodedHeader, where: string): ImageSymbols {
  const symbols: ImageSymbols = { methods: [], dat: [], pasmLabels: [], inlinePasm: [] };
  for (const symbol of variant.symbols) {
    const value = symbolLong(symbol);
    if (value === undefined) {
      continue;
    }
    if (symbol.type === eElementType.type_method) {
      const methodIndex = (value & 0xffff) - 2 * header.slots.length;
      if (methodIndex < 0 || methodIndex >= header.methodTable.length) {
        fail(where, `method ${symbol.name} indexes header long ${value & 0xffff}, outside the method table`);
      }
      symbols.methods.push({ name: symbol.name, methodIndex, offset: header.methodTable[methodIndex].offset });
      continue;
    }
    const datType = DAT_TYPES.get(symbol.type);
    if (datType === undefined) {
      continue;
    }
    if (value >>> 20 === 0xfff) {
      const offset = value & 0xfffff;
      if (symbol.isInline) {
        symbols.inlinePasm.push({ name: symbol.name, cog: undefined, offset });
      } else {
        symbols.dat.push({ name: symbol.name, type: datType, offset });
      }
      continue;
    }
    if (header.size > COG_LABEL_OFFSET_LIMIT) {
      fail(where, `label ${symbol.name} offset is ambiguous: cog-mode label offsets keep 18 bits and the image is ${header.size} bytes`);
    }
    const label = { name: symbol.name, cog: (value >>> 18) >> 2, offset: value & 0x3ffff };
    if (symbol.isInline) {
      symbols.inlinePasm.push(label);
    } else {
      symbols.pasmLabels.push(label);
    }
  }
  return normalizeImageSymbols(symbols);
}

/** Deduplicate each list and sort it (offset, then name, ordinal). */
function normalizeImageSymbols(symbols: ImageSymbols): ImageSymbols {
  const unique = <T extends { offset: number; name: string }>(rows: T[]): T[] => {
    const seen = new Map<string, T>();
    for (const row of rows) {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.set(key, row);
      }
    }
    return [...seen.values()].sort((a, b) => byOffsetThenName(a, b) || compareOrdinal(JSON.stringify(a), JSON.stringify(b)));
  };
  return {
    methods: unique(symbols.methods),
    dat: unique(symbols.dat),
    pasmLabels: unique(symbols.pasmLabels),
    inlinePasm: unique(symbols.inlinePasm)
  };
}

function compareOrdinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function decodeVarSymbols(variant: CompiledVariant, where: string): LayoutVarSymbol[] {
  const rows: LayoutVarSymbol[] = [];
  for (const symbol of variant.symbols) {
    const type = VAR_TYPES.get(symbol.type);
    const value = symbolLong(symbol);
    if (type === undefined || value === undefined) {
      continue;
    }
    const size = variant.varSizes.get(symbol.name);
    if (size === undefined) {
      fail(where, `VAR ${symbol.name} has no recorded size`);
    }
    rows.push({ name: symbol.name, type, offset: value & 0xfffff, size });
  }
  return rows.sort(byOffsetThenName);
}

// ============================================================================
// Builder
// ============================================================================

function alignLong(value: number): number {
  return (value + 3) & ~3;
}

/**
 * Build the layout from the final image and the recorded declarations.
 *
 * Pure: the result depends only on the input, which is what makes a warm
 * (cache-replayed) build produce the same layout as a cold one.
 *
 * The header walk follows the interpreter's object-call rule: a child's code
 * base is its parent's plus the slot's code offset, and its VAR base is its
 * parent's plus the slot's VAR offset, at every depth. Declarations attach to
 * slots by expansion, never by pairing two lists of possibly different
 * lengths: every count that must agree is checked, and a disagreement throws.
 */
export function buildObjectLayout(input: LayoutBuildInput): ObjectLayout {
  const { image } = input;
  const topSourceFileName = input.top.sourceFileName;
  const declarationCount = countDeclarations(input.top);

  if (input.kind === 'pasm') {
    const header: DecodedHeader = { slots: [], methodTable: [], size: image.length, headerBytes: 0 };
    const symbols = decodeImageSymbols(input.top.variant, header, '(top)');
    const pasmImage: LayoutImage = {
      number: 1,
      base: 0,
      size: image.length,
      headerBytes: 0,
      methodTable: [],
      slots: [],
      users: [],
      sources: [topSourceFileName],
      symbolVariants: [{ symbols, users: [] }],
      symbols
    };
    return {
      kind: 'pasm',
      topSourceFileName,
      imageBytes: image.length,
      varBytes: 0,
      topVarBase: image.length,
      hubLoadBase: input.hubLoadBase,
      images: [pasmImage],
      instances: [],
      declarationCount
    };
  }

  if (image.length % 4 !== 0) {
    fail('(top)', `image length ${image.length} is not long-aligned`);
  }
  const topVarBase = image.length;
  const headers = new Map<number, DecodedHeader>();
  const images = new Map<number, LayoutImage>();
  const instances: LayoutInstance[] = [];

  const imageAt = (base: number, where: string): { header: DecodedHeader; layoutImage: LayoutImage } => {
    let header = headers.get(base);
    if (header === undefined) {
      header = decodeHeader(image, base, where);
      headers.set(base, header);
      images.set(base, {
        number: 0,
        base,
        size: header.size,
        headerBytes: header.headerBytes,
        methodTable: header.methodTable,
        slots: [],
        users: [],
        sources: [],
        symbolVariants: [],
        symbols: { methods: [], dat: [], pasmLabels: [], inlinePasm: [] }
      });
    }
    return { header, layoutImage: images.get(base)! };
  };

  const visit = (
    node: RecordedNode,
    parent: LayoutInstance | undefined,
    path: string,
    slotPath: number[],
    codeBase: number,
    varOffset: number,
    varExtent: number,
    declaration: LayoutDeclaration | undefined
  ): LayoutInstance => {
    const { header, layoutImage } = imageAt(codeBase, path);
    const varBytes = header.slots.length > 0 ? header.slots[0].varOffset : varExtent;
    if (node.variant.ownVarBytes !== varBytes) {
      fail(path, `compiled own VAR size ${node.variant.ownVarBytes} but the image header gives ${varBytes}`);
    }
    const instance: LayoutInstance = {
      path,
      slotPath,
      depth: slotPath.length,
      parent,
      children: [],
      declaration,
      sourceFileName: node.sourceFileName,
      overrides: node.overrides,
      image: layoutImage,
      codeBase,
      varBase: topVarBase + varOffset,
      varOffset,
      varBytes,
      varExtent,
      varSymbols: decodeVarSymbols(node.variant, path),
      variant: node.variant
    };
    instances.push(instance);
    layoutImage.users.push(instance);

    const declared = node.children.reduce((sum, child) => sum + child.elementCount, 0);
    if (declared !== header.slots.length) {
      fail(path, `declares ${declared} slots but its image header has ${header.slots.length}`);
    }
    node.children.forEach((child, index) => {
      if (child.position !== index) {
        fail(path, `recorded declaration positions are not 0..${node.children.length - 1} (found ${child.position} at ${index})`);
      }
    });

    let slot = 0;
    for (const child of node.children) {
      const objSymbol = node.variant.symbols.find(
        (symbol) => symbol.type === eElementType.type_obj && symbolLong(symbol) !== undefined && symbolLong(symbol)! >>> 24 === child.position
      );
      if (objSymbol === undefined) {
        fail(path, `no OBJ symbol for declaration ${child.position} (${child.sourceFileName})`);
      }
      const firstSlot = symbolLong(objSymbol)! & 0xffffff;
      if (firstSlot !== slot) {
        fail(path, `OBJ ${objSymbol.name} starts at slot ${firstSlot} but its declarations place it at slot ${slot}`);
      }
      if (child.elementCount < 1) {
        fail(path, `OBJ ${objSymbol.name} has element count ${child.elementCount}`);
      }
      for (let element = 0; element < child.elementCount; element++) {
        const name = child.isArray ? `${objSymbol.name}[${element}]` : objSymbol.name;
        const childPath = parent === undefined && declaration === undefined ? name : `${path}.${name}`;
        const pair = header.slots[slot];
        const nextVar = slot + 1 < header.slots.length ? header.slots[slot + 1].varOffset : varExtent;
        const childExtent = nextVar - pair.varOffset;
        if (childExtent < 4 || childExtent % 4 !== 0) {
          fail(childPath, `VAR extent ${childExtent} is not a positive multiple of 4`);
        }
        const childInstance = visit(
          child,
          instance,
          childPath,
          [...slotPath, slot],
          codeBase + pair.codeOffset,
          varOffset + pair.varOffset,
          childExtent,
          {
            name: objSymbol.name,
            position: child.position,
            firstSlot,
            elementCount: child.elementCount,
            isArray: child.isArray,
            elementIndex: element
          }
        );
        instance.children.push(childInstance);
        slot++;
      }
    }
    return instance;
  };

  visit(input.top, undefined, '(top)', [], 0, 0, input.varBytes, undefined);

  // Images: ascending address, numbered from 1, tiling the image.
  const ordered = [...images.values()].sort((a, b) => a.base - b.base);
  let expectedBase = 0;
  ordered.forEach((layoutImage, index) => {
    layoutImage.number = index + 1;
    if (layoutImage.base !== expectedBase) {
      fail(`image #${layoutImage.number}`, `starts at ${hex(layoutImage.base)} but the previous image ends (padded) at ${hex(expectedBase)}`);
    }
    expectedBase = layoutImage.base + alignLong(layoutImage.size);
  });
  if (expectedBase !== image.length) {
    fail('(top)', `images end at ${hex(expectedBase)} but the image is ${image.length} bytes`);
  }

  for (const layoutImage of ordered) {
    const header = headers.get(layoutImage.base)!;
    const where = `image #${layoutImage.number}`;
    layoutImage.sources = [...new Set(layoutImage.users.map((user) => user.sourceFileName))].sort(compareOrdinal);
    layoutImage.slots = header.slots.map((pair, index) => {
      const names = new Set<string>();
      for (const user of layoutImage.users) {
        const child = user.children[index];
        names.add(child.path.substring(child.path.lastIndexOf('.') + 1));
      }
      return {
        index,
        codeOffset: pair.codeOffset,
        varOffset: pair.varOffset,
        image: images.get(layoutImage.base + pair.codeOffset)!,
        names: [...names].sort(compareOrdinal)
      };
    });
    const variantsByKey = new Map<string, { symbols: ImageSymbols; users: LayoutInstance[] }>();
    for (const user of layoutImage.users) {
      const symbols = decodeImageSymbols(user.variant, header, `${where} (${user.path})`);
      const key = JSON.stringify(symbols);
      const existing = variantsByKey.get(key);
      if (existing === undefined) {
        variantsByKey.set(key, { symbols, users: [user] });
      } else {
        existing.users.push(user);
      }
    }
    layoutImage.symbolVariants = [...variantsByKey.values()];
    layoutImage.symbols = normalizeImageSymbols({
      methods: layoutImage.symbolVariants.flatMap((v) => v.symbols.methods),
      dat: layoutImage.symbolVariants.flatMap((v) => v.symbols.dat),
      pasmLabels: layoutImage.symbolVariants.flatMap((v) => v.symbols.pasmLabels),
      inlinePasm: layoutImage.symbolVariants.flatMap((v) => v.symbols.inlinePasm)
    });
  }

  return {
    kind: 'spin',
    topSourceFileName,
    imageBytes: image.length,
    varBytes: input.varBytes,
    topVarBase,
    hubLoadBase: input.hubLoadBase,
    images: ordered,
    instances,
    declarationCount
  };
}

function countDeclarations(top: RecordedNode): number {
  const namesByFile = new Map<string, Set<string>>();
  const walk = (node: RecordedNode): void => {
    let names = namesByFile.get(node.sourceFileName);
    if (names === undefined) {
      names = new Set<string>();
      namesByFile.set(node.sourceFileName, names);
    }
    for (const symbol of node.variant.symbols) {
      if (symbol.type === eElementType.type_obj) {
        names.add(symbol.name);
      }
    }
    node.children.forEach(walk);
  };
  walk(top);
  let count = 0;
  for (const names of namesByFile.values()) {
    count += names.size;
  }
  return count;
}

// ============================================================================
// JSON forms (cache-independent; used by the test observation hook)
// ============================================================================

interface SerializedNode {
  f: string;
  o: LayoutOverride[];
  p: number;
  n: number;
  a: boolean;
  s: ReturnType<typeof serializeSymbols>;
  z: [string, number][];
  w: number;
  c: SerializedNode[];
}

export interface SerializedLayoutInput {
  kind: LayoutKind;
  image: string;
  varBytes: number;
  hubLoadBase: number;
  top: SerializedNode;
}

export function layoutInputToJson(input: LayoutBuildInput): SerializedLayoutInput {
  const node = (n: RecordedNode): SerializedNode => ({
    f: n.sourceFileName,
    o: n.overrides,
    p: n.position,
    n: n.elementCount,
    a: n.isArray,
    s: serializeSymbols(n.variant.symbols),
    z: [...n.variant.varSizes.entries()],
    w: n.variant.ownVarBytes,
    c: n.children.map(node)
  });
  return {
    kind: input.kind,
    image: Buffer.from(input.image).toString('hex'),
    varBytes: input.varBytes,
    hubLoadBase: input.hubLoadBase,
    top: node(input.top)
  };
}

export function layoutInputFromJson(json: SerializedLayoutInput): LayoutBuildInput {
  const node = (n: SerializedNode): RecordedNode => ({
    sourceFileName: n.f,
    overrides: n.o,
    position: n.p,
    elementCount: n.n,
    isArray: n.a,
    variant: { sourceFileName: n.f, symbols: deserializeSymbols(n.s), varSizes: new Map(n.z), ownVarBytes: n.w },
    children: n.c.map(node)
  });
  return {
    kind: json.kind,
    image: new Uint8Array(Buffer.from(json.image, 'hex')),
    varBytes: json.varBytes,
    hubLoadBase: json.hubLoadBase,
    top: node(json.top)
  };
}

/** Plain-data view of a layout: links become image numbers and instance paths. */
export function layoutToJson(layout: ObjectLayout): unknown {
  return {
    kind: layout.kind,
    topSourceFileName: layout.topSourceFileName,
    imageBytes: layout.imageBytes,
    varBytes: layout.varBytes,
    topVarBase: layout.topVarBase,
    hubLoadBase: layout.hubLoadBase,
    declarationCount: layout.declarationCount,
    images: layout.images.map((layoutImage) => ({
      number: layoutImage.number,
      base: layoutImage.base,
      size: layoutImage.size,
      headerBytes: layoutImage.headerBytes,
      methodTable: layoutImage.methodTable,
      slots: layoutImage.slots.map((slot) => ({
        index: slot.index,
        codeOffset: slot.codeOffset,
        varOffset: slot.varOffset,
        image: slot.image.number,
        names: slot.names
      })),
      users: layoutImage.users.map((user) => user.path),
      sources: layoutImage.sources,
      symbolVariants: layoutImage.symbolVariants.map((v) => ({ symbols: v.symbols, users: v.users.map((user) => user.path) })),
      symbols: layoutImage.symbols
    })),
    instances: layout.instances.map((instance) => ({
      path: instance.path,
      slotPath: instance.slotPath,
      depth: instance.depth,
      declaration: instance.declaration,
      sourceFileName: instance.sourceFileName,
      overrides: instance.overrides,
      image: instance.image.number,
      codeBase: instance.codeBase,
      varBase: instance.varBase,
      varOffset: instance.varOffset,
      varBytes: instance.varBytes,
      varExtent: instance.varExtent,
      varSymbols: instance.varSymbols
    }))
  };
}
