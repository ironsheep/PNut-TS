/** @format */

// Shape-matrix expectations, checked against the image decoder.
//
// Each shape in TEST/MAP-tests/shapes/ carries <shape>.expected.json, written
// from construction: the object tree as declared (names, element counts,
// overrides), which declarations must share one compiled image, VAR symbol
// offsets from declared sizes (Data-Packing guide rule), and DAT markers — each
// a LONG with a magic value located in the image bytes.
//
// Like mapOracle.ts this imports nothing from src/classes or src/utils and never
// reads a .map. Part 2 (the map checker) consumes the same expectation files.

'use strict';

import fs from 'fs';
import path from 'path';
import { DecodedProgram, RawImage, alignLong, findLongValue, instanceAt, regionContaining } from './mapOracle';

/** Directory of committed shape sources and expectations. */
export const shapesDir = path.resolve(__dirname, '../../../TEST/MAP-tests/shapes');

export interface ExpectedVar {
  name: string;
  type: string;
  count: number;
  offset: number;
  size: number;
}

export interface ExpectedMarker {
  name: string;
  /** Hex string, e.g. "0xB0500001". */
  value: string;
  /** PASM shapes only: exact image offset. */
  offset?: number;
}

export interface ExpectedObj {
  name: string;
  count: number;
  node: ExpectedNode;
}

export interface ExpectedNode {
  source: string;
  overrides: Record<string, number>;
  /** Declarations with the same label must share one compiled image, and only they. */
  image: string;
  var: ExpectedVar[];
  /** VAR bytes of this instance alone (4 reserved + declared, padded to a long). */
  varOwnSize: number;
  /** VAR bytes of the whole subtree. */
  varTotal: number;
  dat: ExpectedMarker[];
  objs: ExpectedObj[];
}

export interface ShapeExpectation {
  shape: string;
  top: string;
  /** Every source file the compile needs (for staging). */
  files: string[];
  kind: 'spin' | 'pasm';
  /** When set, the compile must fail with a message containing this text. */
  compileError: string | null;
  note: string;
  tree: ExpectedNode | null;
  imageLength?: number;
  dat?: ExpectedMarker[];
}

/** Every shape expectation, sorted by shape name. */
export function loadShapeExpectations(): ShapeExpectation[] {
  return fs
    .readdirSync(shapesDir)
    .filter((name) => name.endsWith('.expected.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(shapesDir, name), 'utf8')) as ShapeExpectation);
}

/** One expected instance: the slot path the interpreter would take, and its declaration. */
export interface ExpectedInstance {
  path: number[];
  /** Dotted declaration name, e.g. "TOP2.INNER[1].L[0]"; "" for the top. */
  name: string;
  node: ExpectedNode;
}

/** Flatten the declared tree into slot paths: OBJ declarations in order, array elements consecutive. */
export function expectedInstances(root: ExpectedNode): ExpectedInstance[] {
  const out: ExpectedInstance[] = [];
  const walk = (node: ExpectedNode, pathSoFar: number[], name: string): void => {
    out.push({ path: pathSoFar, name, node });
    let slot = 0;
    for (const obj of node.objs) {
      for (let element = 0; element < obj.count; element++) {
        const elementName = obj.count > 1 ? `${obj.name}[${element}]` : obj.name;
        walk(obj.node, [...pathSoFar, slot], name === '' ? elementName : `${name}.${elementName}`);
        slot++;
      }
    }
  };
  walk(root, [], '');
  return out;
}

function hex(value: number): string {
  return `$${value.toString(16).toUpperCase().padStart(5, '0')}`;
}

/** Self-check of an expectation file: VAR offsets must follow the packing rule they claim. */
export function checkExpectationArithmetic(root: ExpectedNode): string[] {
  const problems: string[] = [];
  for (const { name, node } of expectedInstances(root)) {
    const label = name === '' ? '<top>' : name;
    let offset = 4;
    for (const variable of node.var) {
      if (variable.offset !== offset) {
        problems.push(`${label}: VAR ${variable.name} offset ${variable.offset}, packing rule gives ${offset}`);
      }
      offset += variable.size;
    }
    if (alignLong(offset) !== node.varOwnSize) {
      problems.push(`${label}: varOwnSize ${node.varOwnSize}, packing rule gives ${alignLong(offset)}`);
    }
    const total = node.varOwnSize + node.objs.reduce((sum, obj) => sum + obj.count * obj.node.varTotal, 0);
    if (total !== node.varTotal) {
      problems.push(`${label}: varTotal ${node.varTotal}, sum gives ${total}`);
    }
  }
  return problems;
}

/**
 * Compare a decoded Spin image with a shape's expectation. Returns every
 * disagreement; empty means the image matches the tree as constructed.
 */
export function checkShapeAgainstImage(expectation: ShapeExpectation, raw: RawImage, program: DecodedProgram): string[] {
  const problems: string[] = [];
  if (expectation.tree === null) {
    return ['shape has no tree to check'];
  }
  const expected = expectedInstances(expectation.tree);
  if (program.instances.length !== expected.length) {
    problems.push(`instance count: decoded ${program.instances.length}, expected ${expected.length}`);
  }
  if (program.varSize !== expectation.tree.varTotal) {
    problems.push(`total VAR bytes: image says ${program.varSize}, expected ${expectation.tree.varTotal}`);
  }

  // Tree shape, VAR sizes and code bases per expected instance.
  const baseOfLabel = new Map<string, number>();
  const labelOfBase = new Map<number, string>();
  for (const { path: slotPath, name, node } of expected) {
    const label = name === '' ? '<top>' : name;
    const instance = instanceAt(program, slotPath);
    if (instance === undefined) {
      problems.push(`${label}: no instance at slot path [${slotPath.join('.')}]`);
      continue;
    }
    const object = program.images.find((candidate) => candidate.base === instance.codeBase);
    const slotCount = node.objs.reduce((sum, obj) => sum + obj.count, 0);
    if (object !== undefined && object.slots.length !== slotCount) {
      problems.push(`${label}: ${object.slots.length} slots decoded, ${slotCount} declared`);
    }
    if (instance.ownVarSize !== node.varOwnSize) {
      problems.push(`${label}: own VAR size decoded ${instance.ownVarSize}, expected ${node.varOwnSize}`);
    }
    if (instance.varExtent !== node.varTotal) {
      problems.push(`${label}: VAR extent decoded ${instance.varExtent}, expected ${node.varTotal}`);
    }
    const knownBase = baseOfLabel.get(node.image);
    if (knownBase === undefined) {
      baseOfLabel.set(node.image, instance.codeBase);
    } else if (knownBase !== instance.codeBase) {
      problems.push(`${label}: image ${node.image} expected shared, but at ${hex(instance.codeBase)} and ${hex(knownBase)}`);
    }
    const knownLabel = labelOfBase.get(instance.codeBase);
    if (knownLabel === undefined) {
      labelOfBase.set(instance.codeBase, node.image);
    } else if (knownLabel !== node.image) {
      problems.push(`${label}: images ${knownLabel} and ${node.image} expected distinct, but both at ${hex(instance.codeBase)}`);
    }
  }
  if (program.images.length !== baseOfLabel.size) {
    problems.push(`distinct images: decoded ${program.images.length}, expected ${baseOfLabel.size}`);
  }

  // DAT markers: each value occurs exactly once inside every distinct image that
  // declares it, and nowhere else.
  const labelsByValue = new Map<number, Set<string>>();
  for (const { node } of expected) {
    for (const marker of node.dat) {
      const value = Number(marker.value) >>> 0;
      const labels = labelsByValue.get(value) ?? new Set<string>();
      labels.add(node.image);
      labelsByValue.set(value, labels);
    }
  }
  for (const [value, labels] of labelsByValue) {
    const hits = findLongValue(raw.image, value);
    const valueHex = `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
    if (hits.length === 0) {
      problems.push(`marker ${valueHex}: MISSING from image (expected in ${[...labels].join(', ')})`);
      continue;
    }
    if (hits.length !== labels.size) {
      problems.push(
        `marker ${valueHex}: ${hits.length} occurrence(s) at ${hits.map(hex).join(', ')}, expected ${labels.size} (${[...labels].join(', ')})`
      );
    }
    for (const label of labels) {
      const base = baseOfLabel.get(label);
      const region = base === undefined ? undefined : program.images.find((candidate) => candidate.base === base);
      if (region === undefined) {
        continue;
      }
      const inside = hits.filter((hit) => hit >= region.base + region.headerBytes && hit + 4 <= region.base + region.size);
      if (inside.length !== 1) {
        problems.push(
          `marker ${valueHex}: ${inside.length} occurrence(s) inside ${label} code region ${hex(region.base)}+${region.size}, expected 1`
        );
      }
    }
    for (const hit of hits) {
      const region = regionContaining(program, hit);
      const owner = region === undefined ? undefined : labelOfBase.get(region.base);
      if (owner === undefined || !labels.has(owner)) {
        problems.push(`marker ${valueHex}: stray occurrence at ${hex(hit)} (region ${owner ?? 'none'})`);
      }
    }
  }
  return problems;
}

/** Compare a PASM-only image with its expectation (exact length and marker offsets). */
export function checkPasmShape(expectation: ShapeExpectation, raw: RawImage): string[] {
  const problems: string[] = [];
  if (raw.kind !== 'pasm') {
    problems.push(`image kind ${raw.kind}, expected pasm`);
  }
  if (expectation.imageLength !== undefined && raw.image.length !== expectation.imageLength) {
    problems.push(`image length ${raw.image.length}, expected ${expectation.imageLength}`);
  }
  for (const marker of expectation.dat ?? []) {
    const hits = findLongValue(raw.image, Number(marker.value));
    if (hits.length !== 1 || hits[0] !== marker.offset) {
      problems.push(
        `marker ${marker.name} ${marker.value}: found at [${hits.map(hex).join(', ')}], expected exactly ${marker.offset === undefined ? '?' : hex(marker.offset)}`
      );
    }
  }
  return problems;
}
