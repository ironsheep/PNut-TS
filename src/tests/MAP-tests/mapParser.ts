/** @format */

// A complete parser for the `.map` grammar specified in
// `DOCs/internals/MAP-File-Format.md`. This is the ONE parser test code for
// the new format should use — mapFormat.test.ts's byte-for-byte checks don't
// need it, but verify-map.ts (and anything else that wants structured facts
// out of a map) does.
//
// Deliberately independent of src/classes: it parses the text the compiler
// wrote, not the model that produced it.

'use strict';

export interface MapHeader {
  topSourceFile: string;
  languageVersion: number;
}

export interface SummaryTotals {
  codeDataBytes: number;
  varBytes: number;
  totalBytes: number;
  hubBase: number;
}

export interface TreeRow {
  depth: number;
  path: string;
  image: number;
  source: string;
  overrides: string; // raw cell, '-' or 'NAME=VALUE,...'
}

export interface ImageLayoutRow {
  rangeStart: number;
  rangeEnd: number;
  size: number;
  image: number;
  source: string;
  instances: string[]; // expanded (array runs resolved)
}

export interface VarBlockRow {
  rangeStart: number;
  rangeEnd: number;
  size: number;
  image: number;
  instance: string;
}

export interface MethodRow {
  name: string;
  offset: number;
  address: number;
}

export interface DatRow {
  type: string;
  name: string;
  offset: number;
  address: number;
}

export interface PasmRow {
  name: string;
  cog: string; // '$xxx' or '-' for inline-hub rows
  offset: number;
  address: number;
}

export interface ChildSlotRow {
  slot: number;
  names: string[]; // expanded
  image: number;
  varOffset: number;
}

export interface VarSymbolRow {
  instance: string;
  type: string;
  name: string;
  size: number;
  offset: number;
  address: number;
}

export interface ObjectDetailBlock {
  image: number;
  source: string;
  methods: MethodRow[];
  dat: DatRow[];
  pasmLabels: PasmRow[];
  inlinePasm: PasmRow[];
  childSlots: ChildSlotRow[];
  vars: VarSymbolRow[];
}

export interface AddressIndexRow {
  address: number;
  type: string;
  owner: string;
  name: string;
}

export interface SymbolIndexRow {
  symbol: string;
  type: string;
  owner: string;
  address: number;
}

export interface ParsedMap {
  header: MapHeader;
  summarySentence: string;
  totals: SummaryTotals;
  tree: TreeRow[];
  images: ImageLayoutRow[];
  varBlocks: VarBlockRow[];
  details: ObjectDetailBlock[];
  addressIndex: AddressIndexRow[];
  symbolIndex: SymbolIndexRow[];
}

/** Split a line on runs of whitespace, dropping the leading empty token. */
function splitCells(line: string): string[] {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed.split(/\s+/);
}

function parseHexAddress(text: string): number {
  if (!text.startsWith('$')) {
    throw new Error(`mapParser: expected address token, got "${text}"`);
  }
  return parseInt(text.slice(1), 16);
}

function parseOffset(text: string): number {
  if (!text.startsWith('+$')) {
    throw new Error(`mapParser: expected offset token, got "${text}"`);
  }
  return parseInt(text.slice(2), 16);
}

function parseImageNum(text: string): number {
  if (!text.startsWith('#')) {
    throw new Error(`mapParser: expected image token, got "${text}"`);
  }
  return parseInt(text.slice(1), 10);
}

function parseRange(text: string): { start: number; end: number } {
  const [a, b] = text.split('-');
  return { start: parseHexAddress(a), end: parseHexAddress(b) };
}

/** Expand `NAME[a..b]` runs and plain names in a comma-joined list cell. */
export function expandList(cell: string): string[] {
  if (cell === '-') {
    return [];
  }
  const out: string[] = [];
  for (const item of cell.split(',')) {
    const run = /^(.*)\[(\d+)\.\.(\d+)\]$/.exec(item);
    if (run !== null) {
      const prefix = run[1];
      const first = parseInt(run[2], 10);
      const last = parseInt(run[3], 10);
      for (let i = first; i <= last; i++) {
        out.push(`${prefix}[${i}]`);
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

function extractSection(lines: string[], name: string): string[] {
  const start = lines.findIndex((l) => l === `=== ${name} ===`);
  if (start === -1) {
    throw new Error(`mapParser: section "${name}" not found`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('=== '));
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Parse a two-space-indented table given its body lines. Leading blank lines
 * (e.g. the section's opening blank line) are skipped; the first non-blank
 * line is the header, the next is the rule, and rows follow until a blank
 * line or the end of input.
 */
function parseTable(lines: string[]): string[][] {
  let i = 0;
  while (i < lines.length && lines[i].trim().length === 0) {
    i++;
  }
  // i -> header, i+1 -> rule, i+2.. -> rows
  const rows: string[][] = [];
  for (let r = i + 2; r < lines.length; r++) {
    const line = lines[r];
    if (line.trim().length === 0) {
      break;
    }
    rows.push(splitCells(line));
  }
  return rows;
}

export function parseMap(text: string): ParsedMap {
  const lines = text.split('\n');

  // --- Header ---
  const headerLines = lines.slice(0, 5);
  const topMatch = /^PNut-TS Memory Map: (.*)$/.exec(headerLines[1]);
  const verMatch = /^Spin2_v(\d+)$/.exec(headerLines[2]);
  if (topMatch === null || verMatch === null) {
    throw new Error('mapParser: header lines not recognized');
  }
  const header: MapHeader = { topSourceFile: topMatch[1], languageVersion: parseInt(verMatch[1], 10) };

  // --- SUMMARY ---
  const summaryLines = extractSection(lines, 'SUMMARY').filter((l) => l.trim().length > 0);
  const summarySentence = summaryLines[0].trim();
  const totals: SummaryTotals = { codeDataBytes: 0, varBytes: 0, totalBytes: 0, hubBase: 0 };
  for (const line of summaryLines) {
    const t = line.trim();
    let m = /^Code\/DAT bytes\s+(\d+)$/.exec(t);
    if (m) totals.codeDataBytes = parseInt(m[1], 10);
    m = /^VAR bytes\s+(\d+)$/.exec(t);
    if (m) totals.varBytes = parseInt(m[1], 10);
    m = /^Total bytes\s+(\d+)$/.exec(t);
    if (m) totals.totalBytes = parseInt(m[1], 10);
    m = /^Hub base\s+(\$[0-9A-F]+)$/.exec(t);
    if (m) totals.hubBase = parseHexAddress(m[1]);
  }

  // --- OBJECT TREE ---
  const treeLines = extractSection(lines, 'OBJECT TREE');
  const tree: TreeRow[] = [];
  const treeIsNone = treeLines.some((l) => l.trim() === '(none)');
  if (!treeIsNone) {
    let start = 0;
    while (start < treeLines.length && treeLines[start].trim().length === 0) {
      start++;
    }
    // start -> header, start+1 -> rule, start+2.. -> rows
    for (let i = start + 2; i < treeLines.length; i++) {
      const line = treeLines[i];
      if (line.trim().length === 0) {
        break;
      }
      const row = splitCells(line);
      const [instanceCell, imageCell, sourceCell, overridesCell] = row;
      const leading = line.match(/^( *)/)![1].length;
      // Base indent (depth 0, `(top)`) is 2 spaces; each depth adds 2 more.
      const depth = Math.max(0, Math.floor((leading - 2) / 2));
      tree.push({ depth, path: instanceCell, image: parseImageNum(imageCell), source: sourceCell, overrides: overridesCell });
    }
  }

  // --- MEMORY LAYOUT ---
  const memoryLines = extractSection(lines, 'MEMORY LAYOUT');
  const images: ImageLayoutRow[] = [];
  const varBlocks: VarBlockRow[] = [];
  {
    const imagesIdx = memoryLines.findIndex((l) => l.trim() === 'Images');
    const varIdx = memoryLines.findIndex((l) => l.trim() === 'VAR blocks');
    if (imagesIdx !== -1) {
      const end = varIdx !== -1 ? varIdx : memoryLines.length;
      for (const row of parseTable(memoryLines.slice(imagesIdx + 1, end))) {
        if (row.length === 0) continue;
        const [rangeCell, sizeCell, imageCell, sourceCell, instancesCell] = row;
        const range = parseRange(rangeCell);
        images.push({
          rangeStart: range.start,
          rangeEnd: range.end,
          size: parseInt(sizeCell, 10),
          image: parseImageNum(imageCell),
          source: sourceCell,
          instances: expandList(instancesCell)
        });
      }
    }
    if (varIdx !== -1) {
      for (const row of parseTable(memoryLines.slice(varIdx + 1))) {
        if (row.length === 0) continue;
        const [rangeCell, sizeCell, imageCell, instanceCell] = row;
        const range = parseRange(rangeCell);
        varBlocks.push({
          rangeStart: range.start,
          rangeEnd: range.end,
          size: parseInt(sizeCell, 10),
          image: parseImageNum(imageCell),
          instance: instanceCell
        });
      }
    }
  }

  // --- OBJECT DETAILS ---
  const detailsLines = extractSection(lines, 'OBJECT DETAILS');
  const details: ObjectDetailBlock[] = [];
  {
    const blockStarts: number[] = [];
    for (let i = 0; i < detailsLines.length; i++) {
      if (/^--- #\d+ /.test(detailsLines[i])) {
        blockStarts.push(i);
      }
    }
    for (let b = 0; b < blockStarts.length; b++) {
      const start = blockStarts[b];
      const end = b + 1 < blockStarts.length ? blockStarts[b + 1] : detailsLines.length;
      const blockLines = detailsLines.slice(start, end);
      const headMatch = /^--- #(\d+) (.*) ---$/.exec(blockLines[0]);
      if (headMatch === null) {
        throw new Error(`mapParser: bad OBJECT DETAILS heading: ${blockLines[0]}`);
      }
      const block: ObjectDetailBlock = {
        image: parseInt(headMatch[1], 10),
        source: headMatch[2],
        methods: [],
        dat: [],
        pasmLabels: [],
        inlinePasm: [],
        childSlots: [],
        vars: []
      };
      // Sub-tables are separated by blank lines and titled by their own name line.
      let i = 1;
      while (i < blockLines.length) {
        const title = blockLines[i].trim();
        if (title.length === 0) {
          i++;
          continue;
        }
        // find end of this sub-table (next blank line)
        let j = i + 1;
        while (j < blockLines.length && blockLines[j].trim().length !== 0) {
          j++;
        }
        const tableLines = blockLines.slice(i + 1, j); // header, rule, rows
        const rows = parseTable(tableLines);
        if (title === 'Methods') {
          for (const r of rows) block.methods.push({ name: r[0], offset: parseOffset(r[1]), address: parseHexAddress(r[2]) });
        } else if (title === 'DAT') {
          for (const r of rows) block.dat.push({ type: r[0], name: r[1], offset: parseOffset(r[2]), address: parseHexAddress(r[3]) });
        } else if (title === 'PASM labels') {
          for (const r of rows) block.pasmLabels.push({ name: r[0], cog: r[1], offset: parseOffset(r[2]), address: parseHexAddress(r[3]) });
        } else if (title === 'Inline PASM') {
          for (const r of rows) block.inlinePasm.push({ name: r[0], cog: r[1], offset: parseOffset(r[2]), address: parseHexAddress(r[3]) });
        } else if (title === 'Child slots') {
          for (const r of rows)
            block.childSlots.push({ slot: parseInt(r[0], 10), names: expandList(r[1]), image: parseImageNum(r[2]), varOffset: parseOffset(r[3]) });
        } else if (title === 'VAR') {
          for (const r of rows)
            block.vars.push({
              instance: r[0],
              type: r[1],
              name: r[2],
              size: parseInt(r[3], 10),
              offset: parseOffset(r[4]),
              address: parseHexAddress(r[5])
            });
        } else {
          throw new Error(`mapParser: unrecognized OBJECT DETAILS sub-table "${title}"`);
        }
        i = j;
      }
      details.push(block);
    }
  }

  // --- ADDRESS INDEX ---
  const addressIndex: AddressIndexRow[] = [];
  for (const row of parseTable(extractSection(lines, 'ADDRESS INDEX'))) {
    if (row.length === 0) continue;
    addressIndex.push({ address: parseHexAddress(row[0]), type: row[1], owner: row[2], name: row[3] });
  }

  // --- SYMBOL INDEX ---
  const symbolIndex: SymbolIndexRow[] = [];
  for (const row of parseTable(extractSection(lines, 'SYMBOL INDEX'))) {
    if (row.length === 0) continue;
    symbolIndex.push({ symbol: row[0], type: row[1], owner: row[2], address: parseHexAddress(row[3]) });
  }

  return { header, summarySentence, totals, tree, images, varBlocks, details, addressIndex, symbolIndex };
}
