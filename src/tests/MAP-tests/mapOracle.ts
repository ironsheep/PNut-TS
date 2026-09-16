/** @format */

// Image ground-truth decoder — the witness the .map is judged against.
//
// INDEPENDENCE IS THE WHOLE POINT. This module must import nothing from
// src/classes or src/utils, and it must never read a .map file. The compiler's
// ObjectLayout and map generator walk the same header tables; a decoder built
// on their machinery would share any misunderstanding and certify it. Only
// node built-ins are used here.
//
// AUTHORITIES (in order):
//   1. Windows PNut .obj.GOLD bytes.
//   2. The interpreter's object-call rule, src/ext/Spin2_interpreter.spin2
//      `callh` / `calloffh`:
//        w := obj index;  rdlong y,z from pbase + w*8   (code offset, VAR offset)
//        pbase += y;  vbase += z                        (applied at every depth)
//        v := method index;  rdlong v from pbase + v*4; entry := pbase + v
//        (params/results live in bits 30..20; the entry is the low 20 bits)
//   3. The PNut compiler (REF-V52A/p2com.asm), which is where the header walk
//      itself is stated:
//        - distill_build / the .obj pub-scan: object pairs are counted "until a
//          long with msb set"; method longs are counted "until msb clear"; that
//          msb-clear long is the object size (end offset of the object's own
//          code, children excluded — compile_sub_blocks @@enteroffset).
//        - compile_sub_blocks_id: every Spin object has at least one PUB
//          (error_npmf, "No PUB method or DAT block found"), and a DAT-only
//          file is PASM mode, which cannot be a child object (EditorUnit.pas,
//          "is a PASM file and cannot be used as a Spin2 object"). So the
//          method run is never empty and the walk is unambiguous.
//        - distill_rebuild: after distillation the image is the concatenation
//          of the distinct object records, each padded to a long. Distinct
//          regions therefore tile [0, image length) exactly.
//        - compile_obj_blocks @@index: VAR offsets are handed out cumulatively
//          in slot order from the parent's var_ptr, which starts at 4 (the
//          first VAR long is reserved for pbase — interpreter `makeptr`).
//        - compile_final: the .obj file is  long vsize, long psize, psize image
//          bytes, a checksum byte, then the pub/con list; all bytes of the file
//          sum to zero mod 256. PASM-mode .obj files are the raw image with no
//          header at all.
//
// If this decoder and a GOLD image disagree, the decoder is wrong until a
// second path proves otherwise. Never adjust it to agree with our compiler.

'use strict';

import fs from 'fs';

/** Spin images carry object header tables; PASM-only images are raw hub bytes. */
export type ImageKind = 'spin' | 'pasm';

/** Raw image bytes plus whatever sizing facts the container recorded. */
export interface RawImage {
  kind: ImageKind;
  /** Object image bytes (for Spin, psize bytes starting at the top object's header). */
  image: Buffer;
  /** Total VAR bytes for the whole tree (Spin only; from the .obj header or listing). */
  varSize: number | undefined;
  /** Where the bytes came from, for diagnostics. */
  origin: 'listing' | 'obj';
}

/** Raised when a container (listing / .obj) cannot be read as claimed. */
export class OracleFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OracleFormatError';
  }
}

// --- Containers ----------------------------------------------------------

/** Round up to a multiple of 4. */
export function alignLong(value: number): number {
  return (value + 3) & ~3;
}

/** Read an unsigned little-endian long; undefined when out of range. */
export function readLong(image: Buffer, offset: number): number | undefined {
  if (offset < 0 || offset + 4 > image.length) {
    return undefined;
  }
  return image.readUInt32LE(offset);
}

function parseUnderscoredNumber(text: string): number {
  return Number(text.replace(/_/g, ''));
}

/**
 * Extract the object image from listing text (`-l`, ours or a Windows GOLD).
 *
 * The image is the first hex dump run; a `DEBUG data` dump that follows it
 * (listings compiled with -d) is not part of the object image and is ignored.
 * The run must be contiguous from $00000 and its length must equal the
 * listing's own `OBJ bytes:` (Spin) or `Hub bytes:` (PASM) summary.
 */
export function parseListingImage(text: string): RawImage {
  const lines = text.split(/\r\n|\r|\n/);
  const bytes: number[] = [];
  let objBytes: number | undefined;
  let varBytes: number | undefined;
  let hubBytes: number | undefined;
  for (const line of lines) {
    if (/^DEBUG data\s*$/.test(line)) {
      break;
    }
    let match = line.match(/^OBJ bytes:\s+([\d_]+)\s*$/);
    if (match) {
      objBytes = parseUnderscoredNumber(match[1]);
      continue;
    }
    match = line.match(/^VAR bytes:\s+([\d_]+)\s*$/);
    if (match) {
      varBytes = parseUnderscoredNumber(match[1]);
      continue;
    }
    match = line.match(/^Hub bytes:\s+([\d_]+)\s*$/);
    if (match) {
      hubBytes = parseUnderscoredNumber(match[1]);
      continue;
    }
    match = line.match(/^([0-9A-F]{5})-((?: [0-9A-F]{2}){1,16})(?:\s|$)/);
    if (match) {
      const address = parseInt(match[1], 16);
      if (address !== bytes.length) {
        throw new OracleFormatError(`listing dump not contiguous: line $${match[1]} but ${bytes.length} bytes read`);
      }
      for (const hex of match[2].trim().split(' ')) {
        bytes.push(parseInt(hex, 16));
      }
    }
  }
  let kind: ImageKind;
  let expected: number;
  if (objBytes !== undefined) {
    kind = 'spin';
    expected = objBytes;
  } else if (hubBytes !== undefined) {
    kind = 'pasm';
    expected = hubBytes;
  } else {
    throw new OracleFormatError('listing has neither "OBJ bytes:" nor "Hub bytes:" summary');
  }
  if (bytes.length !== expected) {
    throw new OracleFormatError(`listing dump holds ${bytes.length} bytes but summary says ${expected}`);
  }
  return { kind, image: Buffer.from(bytes), varSize: kind === 'spin' ? varBytes : undefined, origin: 'listing' };
}

/** Read a listing file and extract its object image. */
export function readListingImage(filePath: string): RawImage {
  return parseListingImage(fs.readFileSync(filePath, 'latin1'));
}

/**
 * Extract the object image from .obj file bytes (ours from -O, or a GOLD).
 *
 * The kind must be stated: a PASM-mode .obj has no header, and no byte test
 * can tell it apart from a Spin .obj with certainty. For Spin the header,
 * alignment and whole-file checksum are all validated.
 */
export function parseObjFile(fileBytes: Buffer, kind: ImageKind): RawImage {
  if (kind === 'pasm') {
    return { kind, image: Buffer.from(fileBytes), varSize: undefined, origin: 'obj' };
  }
  if (fileBytes.length < 9) {
    throw new OracleFormatError(`.obj too short for a Spin header (${fileBytes.length} bytes)`);
  }
  const varSize = fileBytes.readUInt32LE(0);
  const imageLength = fileBytes.readUInt32LE(4);
  if (varSize % 4 !== 0 || imageLength % 4 !== 0) {
    throw new OracleFormatError(`.obj header not long-aligned: vsize=${varSize} psize=${imageLength}`);
  }
  if (8 + imageLength + 1 > fileBytes.length) {
    throw new OracleFormatError(`.obj psize ${imageLength} + header + checksum exceeds file length ${fileBytes.length}`);
  }
  let sum = 0;
  for (const byte of fileBytes) {
    sum = (sum + byte) & 0xff;
  }
  if (sum !== 0) {
    throw new OracleFormatError(`.obj checksum fails: bytes sum to $${sum.toString(16)} mod 256, expected 0`);
  }
  return { kind, image: Buffer.from(fileBytes.subarray(8, 8 + imageLength)), varSize, origin: 'obj' };
}

/** Read a .obj or .obj.GOLD file (read-only) and extract its object image. */
export function readObjFile(filePath: string, kind: ImageKind): RawImage {
  return parseObjFile(fs.readFileSync(filePath), kind);
}

// --- Header walk -----------------------------------------------------------

/** One method-table long. */
export interface DecodedMethod {
  /** Method index within the object (0 = first PUB). */
  index: number;
  /** Raw long as stored. */
  raw: number;
  /** Entry offset relative to the object's code base (low 20 bits). */
  offset: number;
  /** Absolute entry address within the image (code base + offset). */
  entry: number;
  /** Parameter count (bits 30..24). */
  params: number;
  /** Result count (bits 23..20). */
  results: number;
}

/** One distinct compiled object image, identified by its code base. */
export interface DecodedObjectImage {
  /** Code base (pbase) within the image. */
  base: number;
  /** Child slot pairs as stored: code and VAR offsets relative to this object. */
  slots: { codeOffset: number; varOffset: number }[];
  methods: DecodedMethod[];
  /** Object size long: end offset of this object's own code (children excluded). */
  size: number;
  /** Header table length in bytes: slots*8 + methods*4 + 4. */
  headerBytes: number;
  /** Every instance path that resolves to this code base. */
  instancePaths: number[][];
}

/** One instance in the tree: a slot path and where the interpreter would place it. */
export interface DecodedInstance {
  /** Slot indices from the top object; [] is the top. */
  path: number[];
  /** Absolute code base (pbase). */
  codeBase: number;
  /** Absolute VAR base (vbase), image-relative (top VAR base = image length rounded to a long). */
  varBase: number;
  /** VAR base relative to the top VAR base. */
  varOffset: number;
  /**
   * VAR bytes owned by this instance subtree, bounded by the next sibling's VAR
   * offset (or the parent's extent). Undefined for the top when the VAR total is unknown.
   */
  varExtent: number | undefined;
  /** VAR bytes of this instance alone: first child's VAR offset, or the extent when leaf. */
  ownVarSize: number | undefined;
}

export interface DecodedProgram {
  kind: ImageKind;
  imageLength: number;
  /** Top VAR base: image length rounded up to a long. */
  topVarBase: number;
  varSize: number | undefined;
  /** Instances in depth-first pre-order; instances[0] is the top (Spin only). */
  instances: DecodedInstance[];
  /** Distinct object images by ascending code base (Spin only). */
  images: DecodedObjectImage[];
  /** Every inconsistency found. Empty means the decode is self-consistent. */
  problems: string[];
}

const MSB = 0x80000000;
const MAX_DEPTH = 64;

function hex(value: number): string {
  return `$${value.toString(16).toUpperCase().padStart(5, '0')}`;
}

function pathName(path: number[]): string {
  return path.length === 0 ? '<top>' : path.join('.');
}

/**
 * Decode one object's header at `base`. Returns undefined (and records a
 * problem) when the tables run off the image.
 */
function decodeHeader(image: Buffer, base: number, problems: string[]): DecodedObjectImage | undefined {
  const slots: { codeOffset: number; varOffset: number }[] = [];
  let cursor = base;
  for (;;) {
    const first = readLong(image, cursor);
    if (first === undefined) {
      problems.push(`object ${hex(base)}: slot table runs past image end`);
      return undefined;
    }
    if ((first & MSB) !== 0) {
      break;
    }
    const second = readLong(image, cursor + 4);
    if (second === undefined) {
      problems.push(`object ${hex(base)}: slot pair at ${hex(cursor)} runs past image end`);
      return undefined;
    }
    slots.push({ codeOffset: first, varOffset: second });
    cursor += 8;
  }
  const methods: DecodedMethod[] = [];
  let size: number | undefined;
  for (;;) {
    const raw = readLong(image, cursor);
    if (raw === undefined) {
      problems.push(`object ${hex(base)}: method table runs past image end`);
      return undefined;
    }
    cursor += 4;
    if ((raw & MSB) === 0) {
      size = raw;
      break;
    }
    const offset = raw & 0xfffff;
    methods.push({
      index: methods.length,
      raw,
      offset,
      entry: base + offset,
      params: (raw >>> 24) & 0x7f,
      results: (raw >>> 20) & 0x0f
    });
  }
  return { base, slots, methods, size, headerBytes: cursor - base, instancePaths: [] };
}

/**
 * Decode a raw image by the interpreter rule. Never throws for inconsistent
 * content — every inconsistency lands in `problems`, so a corrupted image is
 * reported rather than silently half-decoded.
 */
export function decodeImage(raw: RawImage): DecodedProgram {
  const image = raw.image;
  const imageLength = image.length;
  const topVarBase = alignLong(imageLength);
  const problems: string[] = [];
  const program: DecodedProgram = {
    kind: raw.kind,
    imageLength,
    topVarBase,
    varSize: raw.varSize,
    instances: [],
    images: [],
    problems
  };
  if (raw.kind === 'pasm') {
    return program;
  }
  if (imageLength % 4 !== 0) {
    problems.push(`image length ${imageLength} is not long-aligned`);
  }
  const byBase = new Map<number, DecodedObjectImage>();

  const visit = (path: number[], codeBase: number, varOffset: number, varExtent: number | undefined): void => {
    if (path.length > MAX_DEPTH) {
      problems.push(`instance ${pathName(path)}: nesting exceeds ${MAX_DEPTH} (cyclic slot offsets?)`);
      return;
    }
    let object = byBase.get(codeBase);
    if (object === undefined) {
      object = decodeHeader(image, codeBase, problems);
      if (object === undefined) {
        return;
      }
      byBase.set(codeBase, object);
    }
    object.instancePaths.push(path);
    const firstChildVar = object.slots.length > 0 ? object.slots[0].varOffset : undefined;
    const instance: DecodedInstance = {
      path,
      codeBase,
      varBase: topVarBase + varOffset,
      varOffset,
      varExtent,
      ownVarSize: firstChildVar !== undefined ? firstChildVar : varExtent
    };
    program.instances.push(instance);
    for (let slot = 0; slot < object.slots.length; slot++) {
      const { codeOffset, varOffset: childVarOffset } = object.slots[slot];
      const childPath = [...path, slot];
      if (codeOffset === 0 || codeBase + codeOffset >= imageLength) {
        problems.push(`instance ${pathName(childPath)}: code offset ${hex(codeOffset)} from ${hex(codeBase)} is outside the image`);
        continue;
      }
      if (codeOffset % 4 !== 0 || childVarOffset % 4 !== 0) {
        problems.push(`instance ${pathName(childPath)}: slot offsets not long-aligned (code ${hex(codeOffset)}, var ${hex(childVarOffset)})`);
      }
      const nextVar = slot + 1 < object.slots.length ? object.slots[slot + 1].varOffset : varExtent;
      const childExtent = nextVar === undefined ? undefined : nextVar - childVarOffset;
      visit(childPath, codeBase + codeOffset, varOffset + childVarOffset, childExtent);
    }
  };

  visit([], 0, 0, raw.varSize);
  program.images = [...byBase.values()].sort((a, b) => a.base - b.base);
  program.problems.push(...checkConsistency(program));
  return program;
}

/**
 * Structural invariants of a Spin image, each traceable to PNut or the
 * interpreter (see header comment). Returns problems; empty means consistent.
 */
function checkConsistency(program: DecodedProgram): string[] {
  const problems: string[] = [];
  for (const object of program.images) {
    const where = `object ${hex(object.base)}`;
    if (object.base % 4 !== 0) {
      problems.push(`${where}: code base not long-aligned`);
    }
    if (object.methods.length === 0) {
      problems.push(`${where}: no method longs (every Spin object has at least one PUB)`);
    }
    if (object.size < object.headerBytes || object.base + object.size > program.imageLength) {
      problems.push(`${where}: size ${object.size} outside [header ${object.headerBytes}, image end]`);
    }
    let previous = -1;
    for (const method of object.methods) {
      if (method.offset < object.headerBytes || method.offset >= object.size) {
        problems.push(
          `${where}: method ${method.index} entry offset ${hex(method.offset)} outside code [${hex(object.headerBytes)}, ${hex(object.size)})`
        );
      }
      if (method.offset <= previous) {
        problems.push(`${where}: method ${method.index} entry ${hex(method.offset)} not after method ${method.index - 1}`);
      }
      previous = method.offset;
    }
  }
  // distill_rebuild: distinct regions, each padded to a long, tile the image.
  let expectedBase = 0;
  for (const object of program.images) {
    if (object.base !== expectedBase) {
      problems.push(`regions do not tile: object at ${hex(object.base)}, expected next region at ${hex(expectedBase)}`);
    }
    expectedBase = object.base + alignLong(object.size);
  }
  if (program.images.length > 0 && expectedBase !== program.imageLength) {
    problems.push(`regions do not tile: last region ends at ${hex(expectedBase)}, image length ${hex(program.imageLength)}`);
  }
  // compile_obj_blocks @@index: VAR offsets cumulative in slot order, from 4.
  for (const instance of program.instances) {
    const children = program.instances.filter(
      (other) => other.path.length === instance.path.length + 1 && instance.path.every((slot, i) => other.path[i] === slot)
    );
    let floor = instance.varOffset + 4;
    for (const child of children) {
      if (child.varOffset < floor) {
        problems.push(
          `instance ${pathName(child.path)}: VAR offset ${hex(child.varOffset)} below ${hex(floor)} (overlaps parent or previous sibling)`
        );
      }
      floor = child.varOffset + 4;
    }
    if (instance.varExtent !== undefined) {
      if (instance.varExtent < 4 || instance.varExtent % 4 !== 0) {
        problems.push(`instance ${pathName(instance.path)}: VAR extent ${instance.varExtent} not a positive multiple of 4`);
      }
      if (children.length > 0) {
        const last = children[children.length - 1];
        if (last.varOffset + 4 > instance.varOffset + instance.varExtent) {
          problems.push(`instance ${pathName(last.path)}: VAR offset past the parent's VAR extent`);
        }
      }
    }
  }
  return problems;
}

/** Find the object image whose own region [base, base + size) contains `address`. */
export function regionContaining(program: DecodedProgram, address: number): DecodedObjectImage | undefined {
  return program.images.find((object) => address >= object.base && address < object.base + object.size);
}

/** Instance by slot path. */
export function instanceAt(program: DecodedProgram, path: number[]): DecodedInstance | undefined {
  return program.instances.find((instance) => instance.path.length === path.length && instance.path.every((slot, i) => slot === path[i]));
}

// --- DAT markers ---------------------------------------------------------------

/** Where one magic value occurs in the image. */
export interface MarkerHit {
  name: string;
  value: number;
  /** Every byte offset holding the value as a little-endian long (any alignment). */
  offsets: number[];
}

/**
 * Every byte offset at which `value` appears as a little-endian long. All
 * alignments are searched: DAT LONGs follow BYTEs without implicit padding.
 */
export function findLongValue(image: Buffer, value: number): number[] {
  const offsets: number[] = [];
  const wanted = value >>> 0;
  for (let offset = 0; offset + 4 <= image.length; offset++) {
    if (image.readUInt32LE(offset) === wanted) {
      offsets.push(offset);
    }
  }
  return offsets;
}

/**
 * Locate each named magic value. A marker that is absent is reported with an
 * empty offsets list — never dropped — so a missing DAT symbol is visible.
 */
export function locateMarkers(image: Buffer, markers: { name: string; value: number }[]): MarkerHit[] {
  return markers.map(({ name, value }) => ({ name, value: value >>> 0, offsets: findLongValue(image, value) }));
}

/** Names of markers that were not found at all. */
export function missingMarkers(hits: MarkerHit[]): string[] {
  return hits.filter((hit) => hit.offsets.length === 0).map((hit) => hit.name);
}

/** Human-readable decode summary, for test failure messages. */
export function describeProgram(program: DecodedProgram): string {
  const lines: string[] = [`kind=${program.kind} image=${program.imageLength} topVarBase=${hex(program.topVarBase)} varSize=${program.varSize}`];
  for (const instance of program.instances) {
    const object = program.images.find((o) => o.base === instance.codeBase);
    lines.push(
      `  ${pathName(instance.path).padEnd(12)} code=${hex(instance.codeBase)} var=${hex(instance.varBase)} ` +
        `extent=${instance.varExtent} own=${instance.ownVarSize} slots=${object?.slots.length} methods=${object?.methods.length} size=${object?.size}`
    );
  }
  for (const problem of program.problems) {
    lines.push(`  PROBLEM: ${problem}`);
  }
  return lines.join('\n');
}
