/** @format */

// Ground-truth checkers: the `.map` file vs the image decoder (mapOracle.ts)
// and, where one exists, the shape's construction record (shapeMatrix.ts).
//
// Map-Instance-Correctness §4 part 2. Two layers:
//
//   - `checkMapStructure` needs no expected.json: OBJECT TREE and MEMORY
//     LAYOUT VAR blocks are both depth-first pre-order in slot order (the map
//     spec states this for OBJECT TREE; mapOracle's decoder walks the same
//     order), so `map.tree[i]` and `program.instances[i]` name the same
//     instance for every i — this is checked, not assumed, by comparing each
//     row's printed path against the expected label the shape (when present)
//     or the oracle's own path builder produces. Image numbers, ranges,
//     sizes, child-slot counts and method address sets are checked against
//     the decoded object tables. This is what the GOLD corpora use, since
//     they carry no expected.json.
//   - `checkMapAgainstShape` adds shapeMatrix-driven checks that need the
//     construction record: overrides text, VAR symbol names/offsets/sizes,
//     DAT symbol addresses against magic-marker byte search, and the
//     SUMMARY sentence's counts.
//
// VAR symbol and VAR block addresses are checked against the ORACLE's decoded
// VAR base (mapOracle), not the map's own VAR-blocks table — so a defect
// confined to one table cannot hide behind another that reads the same wrong
// number back to itself.

'use strict';

import { DecodedProgram, RawImage, findLongValue } from './mapOracle';
import { ParsedMap } from './mapParser';
import { ExpectedNode, ShapeExpectation, expectedInstances } from './shapeMatrix';

function hex(value: number): string {
  return `$${value.toString(16).toUpperCase().padStart(5, '0')}`;
}

function labelOf(name: string): string {
  return name === '' ? '(TOP)' : name.toUpperCase();
}

/** Spec's Overrides cell: `NAME=VALUE` joined by commas, `-` when none; integers print signed decimal. */
export function formatOverrides(overrides: Record<string, number>): string {
  const entries = Object.entries(overrides);
  if (entries.length === 0) {
    return '-';
  }
  return entries
    .map(([name, value]) => {
      const unsigned = value >>> 0;
      const signed = unsigned >= 0x80000000 ? unsigned - 0x100000000 : unsigned;
      return `${name}=${signed}`;
    })
    .join(',');
}

/**
 * Structural checks that need only the map and the oracle's decode: no
 * expected.json required. Used by both the shape matrix and the GOLD corpora.
 */
export function checkMapStructure(map: ParsedMap, program: DecodedProgram): string[] {
  const problems: string[] = [];
  if (map.tree.length !== program.instances.length) {
    problems.push(`OBJECT TREE rows: ${map.tree.length}, decoded instances: ${program.instances.length}`);
  }
  if (map.varBlocks.length !== 0 && map.varBlocks.length !== program.instances.length) {
    problems.push(`VAR blocks rows: ${map.varBlocks.length}, decoded instances: ${program.instances.length}`);
  }

  const sortedMapImages = [...map.images].sort((a, b) => a.rangeStart - b.rangeStart);
  if (sortedMapImages.length !== program.images.length) {
    problems.push(`image count: map ${sortedMapImages.length}, decoded ${program.images.length}`);
  }
  const decodedByMapImage = new Map<number, DecodedProgram['images'][number]>();
  for (let i = 0; i < Math.min(sortedMapImages.length, program.images.length); i++) {
    const mapImage = sortedMapImages[i];
    const decoded = program.images[i];
    decodedByMapImage.set(mapImage.image, decoded);
    if (mapImage.rangeStart !== decoded.base) {
      problems.push(`image #${mapImage.image} base: map ${hex(mapImage.rangeStart)}, decoded ${hex(decoded.base)}`);
    }
    if (mapImage.size !== decoded.size) {
      problems.push(`image #${mapImage.image} size: map ${mapImage.size}, decoded ${decoded.size}`);
    }
  }

  const n = Math.min(map.tree.length, program.instances.length);
  for (let i = 0; i < n; i++) {
    const treeRow = map.tree[i];
    const decoded = program.instances[i];
    const decodedImage = decodedByMapImage.get(treeRow.image);
    if (decodedImage === undefined) {
      problems.push(`tree row ${i} (${treeRow.path}): image #${treeRow.image} has no decoded counterpart`);
    } else if (decodedImage.base !== decoded.codeBase) {
      problems.push(
        `tree row ${i} (${treeRow.path}): image #${treeRow.image} base ${hex(decodedImage.base)} != decoded instance code base ${hex(decoded.codeBase)}`
      );
    }
    if (i < map.varBlocks.length) {
      const varRow = map.varBlocks[i];
      if (varRow.rangeStart !== decoded.varBase) {
        problems.push(`VAR block row ${i} (${treeRow.path}): start ${hex(varRow.rangeStart)}, decoded VAR base ${hex(decoded.varBase)}`);
      }
      if (decoded.ownVarSize !== undefined && varRow.size !== decoded.ownVarSize) {
        problems.push(`VAR block row ${i} (${treeRow.path}): size ${varRow.size}, decoded own VAR size ${decoded.ownVarSize}`);
      }
    }
  }

  problems.push(...checkVarSymbolPacking(map, program));

  // Child slots and Methods, per image, against the decoded object tables.
  for (const block of map.details) {
    const decoded = decodedByMapImage.get(block.image);
    if (decoded === undefined) {
      continue;
    }
    if (block.childSlots.length > 0 && block.childSlots.length !== decoded.slots.length) {
      problems.push(`image #${block.image}: Child slots rows ${block.childSlots.length}, decoded slots ${decoded.slots.length}`);
    }
    const mapMethodAddresses = block.methods.map((m) => m.address).sort((a, b) => a - b);
    const decodedMethodEntries = decoded.methods.map((m) => m.entry).sort((a, b) => a - b);
    if (JSON.stringify(mapMethodAddresses) !== JSON.stringify(decodedMethodEntries)) {
      problems.push(
        `image #${block.image}: method addresses [${mapMethodAddresses.map(hex).join(',')}], decoded [${decodedMethodEntries.map(hex).join(',')}]`
      );
    }
  }
  return problems;
}

/**
 * VAR symbol rows in OBJECT DETAILS, checked two ways with no expected.json
 * needed: (1) the packing rule itself (Data-Packing guide / MAP-File-Format.md
 * "Instances"): offsets start at +$00004 and each next symbol follows the
 * previous one's size with no padding; (2) each row's Address equals the
 * ORACLE's decoded VAR base for that instance (via OBJECT TREE's index
 * alignment with the decoder, not the map's own VAR-blocks table) plus the
 * row's own Offset. A generator defect that mis-offsets one VAR row breaks at
 * least one of the two.
 */
export function checkVarSymbolPacking(map: ParsedMap, program: DecodedProgram): string[] {
  const problems: string[] = [];
  const varBaseByPath = new Map<string, number>();
  for (let i = 0; i < Math.min(map.tree.length, program.instances.length); i++) {
    varBaseByPath.set(map.tree[i].path.toUpperCase(), program.instances[i].varBase);
  }
  for (const block of map.details) {
    const groups = new Map<string, typeof block.vars>();
    for (const row of block.vars) {
      const list = groups.get(row.instance) ?? [];
      list.push(row);
      groups.set(row.instance, list);
    }
    for (const [instance, rows] of groups) {
      let expectedOffset = 4;
      for (const row of rows) {
        if (row.offset !== expectedOffset) {
          problems.push(`VAR ${instance}.${row.name} (#${block.image}): offset ${hex(row.offset)}, packing rule expects ${hex(expectedOffset)}`);
        }
        const base = varBaseByPath.get(instance.toUpperCase());
        if (base !== undefined && row.address !== base + row.offset) {
          problems.push(
            `VAR ${instance}.${row.name} (#${block.image}): address ${hex(row.address)}, expected decoded VAR base + offset = ${hex(base + row.offset)}`
          );
        }
        expectedOffset += row.size;
      }
    }
  }
  return problems;
}

/** VAR blocks table vs the oracle's decoded VAR base, by instance path (shape-driven; independent of index order). */
export function checkVarBlocksAgainstShape(expectation: ShapeExpectation, map: ParsedMap, program: DecodedProgram): string[] {
  const problems: string[] = [];
  if (expectation.tree === null) {
    return problems;
  }
  const expected = expectedInstances(expectation.tree);
  const n = Math.min(expected.length, map.tree.length, program.instances.length);
  for (let i = 0; i < n; i++) {
    const label = labelOf(expected[i].name);
    const treeRow = map.tree[i];
    if (treeRow.path.toUpperCase() !== label) {
      problems.push(`tree row ${i}: path "${treeRow.path}", expected "${label}"`);
      continue;
    }
    const varRow = map.varBlocks.find((v) => v.instance.toUpperCase() === label);
    const decoded = program.instances[i];
    if (varRow === undefined) {
      problems.push(`${label}: no VAR block row`);
      continue;
    }
    if (varRow.rangeStart !== decoded.varBase) {
      problems.push(`${label}: VAR block start ${hex(varRow.rangeStart)}, decoded VAR base ${hex(decoded.varBase)}`);
    }
    if (varRow.size !== expected[i].node.varOwnSize) {
      problems.push(`${label}: VAR block size ${varRow.size}, expected ${expected[i].node.varOwnSize}`);
    }
  }
  return problems;
}

/** VAR symbol offsets/sizes/addresses vs the shape's expectations, addresses anchored to the oracle's decoded VAR base. */
export function checkVarSymbolsAgainstShape(expectation: ShapeExpectation, map: ParsedMap, program: DecodedProgram): string[] {
  const problems: string[] = [];
  if (expectation.tree === null) {
    return problems;
  }
  const expected = expectedInstances(expectation.tree);
  for (let i = 0; i < expected.length; i++) {
    const { name, node } = expected[i];
    const label = labelOf(name);
    const treeRow = map.tree.find((t) => t.path.toUpperCase() === label);
    const decoded = program.instances[i];
    if (treeRow === undefined) {
      if (node.var.length > 0) problems.push(`${label}: instance missing from OBJECT TREE, cannot check its VAR symbols`);
      continue;
    }
    const block = map.details.find((d) => d.image === treeRow.image);
    const rows = block === undefined ? [] : block.vars.filter((v) => v.instance.toUpperCase() === label);
    if (rows.length !== node.var.length) {
      problems.push(`${label}: VAR symbol rows ${rows.length}, expected ${node.var.length}`);
    }
    for (const expVar of node.var) {
      const found = rows.find((v) => v.name.toUpperCase() === expVar.name.toUpperCase());
      if (found === undefined) {
        problems.push(`${label}.${expVar.name}: VAR symbol missing from OBJECT DETAILS`);
        continue;
      }
      if (found.offset !== expVar.offset) {
        problems.push(`${label}.${expVar.name}: offset ${hex(found.offset)}, expected ${hex(expVar.offset)}`);
      }
      if (found.size !== expVar.size) {
        problems.push(`${label}.${expVar.name}: size ${found.size}, expected ${expVar.size}`);
      }
      const expectedAddress = decoded.varBase + expVar.offset;
      if (found.address !== expectedAddress) {
        problems.push(`${label}.${expVar.name}: address ${hex(found.address)}, expected decoded VAR base + offset = ${hex(expectedAddress)}`);
      }
    }
  }
  return problems;
}

/** DAT symbol addresses vs the magic-marker byte search of the whole image (mapOracle.findLongValue). */
export function checkDatMarkersAgainstShape(expectation: ShapeExpectation, map: ParsedMap, raw: RawImage): string[] {
  const problems: string[] = [];
  if (expectation.tree === null) {
    return problems;
  }
  const expected = expectedInstances(expectation.tree);
  for (const { name, node } of expected) {
    const label = labelOf(name);
    const treeRow = map.tree.find((t) => t.path.toUpperCase() === label);
    if (treeRow === undefined) {
      continue;
    }
    const block = map.details.find((d) => d.image === treeRow.image);
    for (const marker of node.dat) {
      const value = Number(marker.value) >>> 0;
      const hits = findLongValue(raw.image, value);
      const found = block?.dat.find((d) => d.name.toUpperCase() === marker.name.toUpperCase());
      if (found === undefined) {
        problems.push(`${label}: DAT marker ${marker.name} missing from OBJECT DETAILS #${treeRow.image}`);
        continue;
      }
      if (!hits.includes(found.address)) {
        problems.push(`${label}.${marker.name}: map address ${hex(found.address)} not among byte-search hits [${hits.map(hex).join(',')}]`);
      }
    }
  }
  return problems;
}

/** OBJECT TREE path/image/overrides, and each image's used-by (Instances) list. */
export function checkTreeAndUsedBy(expectation: ShapeExpectation, map: ParsedMap): string[] {
  const problems: string[] = [];
  if (expectation.tree === null) {
    return problems;
  }
  const expected = expectedInstances(expectation.tree);
  if (map.tree.length !== expected.length) {
    problems.push(`OBJECT TREE rows: ${map.tree.length}, expected ${expected.length}`);
  }
  const imageLabelToMapImage = new Map<string, number>();
  const n = Math.min(map.tree.length, expected.length);
  for (let i = 0; i < n; i++) {
    const { name, node } = expected[i];
    const label = labelOf(name);
    const treeRow = map.tree[i];
    if (treeRow.path.toUpperCase() !== label) {
      problems.push(`tree row ${i}: path "${treeRow.path}", expected "${label}"`);
    }
    const expectedOverrides = formatOverrides(node.overrides);
    if (treeRow.overrides !== expectedOverrides) {
      problems.push(`${label}: overrides "${treeRow.overrides}", expected "${expectedOverrides}"`);
    }
    const known = imageLabelToMapImage.get(node.image);
    if (known === undefined) {
      imageLabelToMapImage.set(node.image, treeRow.image);
    } else if (known !== treeRow.image) {
      problems.push(`${label}: declared image "${node.image}" maps to both #${known} and #${treeRow.image}`);
    }
  }
  for (const [imageLabel, mapImageNum] of imageLabelToMapImage) {
    const row = map.images.find((r) => r.image === mapImageNum);
    if (row === undefined) {
      problems.push(`image "${imageLabel}": map image #${mapImageNum} missing from MEMORY LAYOUT`);
      continue;
    }
    const expectedUsers = expected
      .filter((e) => e.node.image === imageLabel)
      .map((e) => labelOf(e.name))
      .sort();
    const actualUsers = row.instances.map((s) => s.toUpperCase()).sort();
    if (actualUsers.join(',') !== expectedUsers.join(',')) {
      problems.push(`image #${mapImageNum} Instances: [${actualUsers.join(',')}], expected [${expectedUsers.join(',')}]`);
    }
  }
  return problems;
}

/** SUMMARY totals and sentence counts vs the oracle's decode. */
export function checkSummaryCounts(map: ParsedMap, program: DecodedProgram): string[] {
  const problems: string[] = [];
  if (map.totals.codeDataBytes !== program.imageLength) {
    problems.push(`Code/DAT bytes: ${map.totals.codeDataBytes}, decoded image length ${program.imageLength}`);
  }
  if (program.varSize !== undefined && map.totals.varBytes !== program.varSize) {
    problems.push(`VAR bytes: ${map.totals.varBytes}, decoded VAR size ${program.varSize}`);
  }
  if (map.totals.totalBytes !== map.totals.codeDataBytes + map.totals.varBytes) {
    problems.push(`Total bytes: ${map.totals.totalBytes}, expected Code/DAT + VAR = ${map.totals.codeDataBytes + map.totals.varBytes}`);
  }
  const instMatch = /became (\d+) instance/.exec(map.summarySentence);
  if (instMatch !== null && parseInt(instMatch[1], 10) !== program.instances.length) {
    problems.push(`sentence instance count ${instMatch[1]}, decoded ${program.instances.length}`);
  }
  const imgMatch = /built from (\d+) image/.exec(map.summarySentence);
  if (imgMatch !== null && parseInt(imgMatch[1], 10) !== program.images.length) {
    problems.push(`sentence image count ${imgMatch[1]}, decoded ${program.images.length}`);
  }
  const sharedCount = program.images.filter((image) => image.instancePaths.length > 1).length;
  if (/no image is shared/.test(map.summarySentence)) {
    if (sharedCount !== 0) problems.push(`sentence says no image is shared, decoded shared-image count ${sharedCount}`);
  } else {
    const sharedMatch = /(\d+) images? (?:is|are) shared/.exec(map.summarySentence);
    if (sharedMatch !== null && parseInt(sharedMatch[1], 10) !== sharedCount) {
      problems.push(`sentence shared-image count ${sharedMatch[1]}, decoded ${sharedCount}`);
    }
  }
  return problems;
}

/** Every check this module offers, for one shape. */
export function checkMapAgainstShape(expectation: ShapeExpectation, map: ParsedMap, raw: RawImage, program: DecodedProgram): string[] {
  return [
    ...checkMapStructure(map, program),
    ...checkTreeAndUsedBy(expectation, map),
    ...checkVarBlocksAgainstShape(expectation, map, program),
    ...checkVarSymbolsAgainstShape(expectation, map, program),
    ...checkDatMarkersAgainstShape(expectation, map, raw),
    ...checkSummaryCounts(map, program)
  ];
}

export type { ExpectedNode };
