/** @format */
'use strict';

// src/classes/objInstanceInfo.ts
// Stores object instance information for map file generation

import { SymbolEntry } from './symbolTable';

/**
 * ConstantOverride - A single constant override value
 */
export interface ConstantOverride {
  name: string;
  value: bigint | string;
  isFloat: boolean;
}

/**
 * ObjInstanceInfo - Information about a single object instance in the binary
 *
 * Tracks the relationship between:
 * - The instance name used in the OBJ declaration (e.g., "child1")
 * - The source file (e.g., "param_child.spin2")
 * - Any constant overrides applied (e.g., DEFAULT_VALUE = 20)
 * - The parent object that declared this instance
 */
export class ObjInstanceInfo {
  private _instanceName: string; // Name from OBJ declaration (e.g., "child1")
  private _sourceFileName: string; // Source .spin2 file (e.g., "param_child.spin2")
  private _sourceFileIndex: number; // Index into Context.sourceFiles / objectSymbolStore keys
  private _parentInstanceId: number; // _instanceId of the declaring parent, -1 at top
  private _childPosition: number; // Position in the parent's OBJ block, -1 at top
  private _instanceId: number; // This instance's identity within the store
  private _recordIndex: number = -1; // Distiller record index, assigned after distillation
  private _overrides: ConstantOverride[] = [];

  constructor(
    instanceName: string,
    sourceFileName: string,
    sourceFileIndex: number,
    parentInstanceId: number,
    childPosition: number,
    instanceId: number
  ) {
    this._instanceName = instanceName;
    this._sourceFileName = sourceFileName;
    this._sourceFileIndex = sourceFileIndex;
    this._parentInstanceId = parentInstanceId;
    this._childPosition = childPosition;
    this._instanceId = instanceId;
  }

  get instanceName(): string {
    return this._instanceName;
  }

  get sourceFileName(): string {
    return this._sourceFileName;
  }

  get sourceFileBaseName(): string {
    // Remove .spin2 extension if present
    return this._sourceFileName.replace(/\.spin2$/i, '');
  }

  /** Identity of the parent that declared this instance; -1 at the top level. */
  get parentInstanceId(): number {
    return this._parentInstanceId;
  }

  /** Position in the parent's OBJ block; -1 at the top level. */
  get childPosition(): number {
    return this._childPosition;
  }

  /** This instance's identity. An instance is (parent, position), never its object. */
  get instanceId(): number {
    return this._instanceId;
  }

  /** Index into Context.sourceFiles — the space objectSymbolStore is keyed by. */
  get sourceFileIndex(): number {
    return this._sourceFileIndex;
  }

  /**
   * Index of the distiller record holding this instance's size and offset.
   *
   * Assigned after distillation, never at construction: elimination splices
   * records out of the list, so any index captured earlier is stale by the
   * time the map is written. Several instances legitimately share one record —
   * that is dedup working, and it is the diamond case.
   */
  get recordIndex(): number {
    return this._recordIndex;
  }

  set recordIndex(index: number) {
    this._recordIndex = index;
  }

  get overrides(): ConstantOverride[] {
    return this._overrides;
  }

  get hasOverrides(): boolean {
    return this._overrides.length > 0;
  }

  /**
   * Add a constant override
   */
  public addOverride(name: string, value: bigint | string, isFloat: boolean = false): void {
    this._overrides.push({ name, value, isFloat });
  }

  /**
   * Add overrides from a symbol table (used when extracting from ObjFile)
   */
  public addOverridesFromSymbols(symbols: SymbolEntry[]): void {
    for (const symbol of symbols) {
      const isFloat = symbol.type.toString().includes('float');
      this._overrides.push({
        name: symbol.name,
        value: symbol.value,
        isFloat
      });
    }
  }

  /**
   * Format overrides as a string for display
   * e.g., "DEFAULT_VALUE=20, MULTIPLIER=5"
   */
  public formatOverrides(): string {
    if (this._overrides.length === 0) {
      return '';
    }
    return this._overrides
      .map((o) => {
        const valueStr = typeof o.value === 'bigint' ? o.value.toString() : o.value;
        return `${o.name}=${valueStr}`;
      })
      .join(', ');
  }
}

/**
 * ObjInstanceStore — every object instance in the compiled program.
 *
 * Keyed by INSTANCE IDENTITY, not by object. An object declared twice is two
 * instances and must stay two entries; keying by object made the second
 * silently overwrite the first, which is how a declared sibling went missing
 * from the map entirely.
 */
export class ObjInstanceStore {
  private _instances: Map<number, ObjInstanceInfo> = new Map();
  private _nextInstanceId: number = 0;

  /** Identity for the next instance. An instance is (parent, position). */
  public allocateInstanceId(): number {
    return this._nextInstanceId++;
  }

  /** Add an instance. Identity is its own; two instances of one object coexist. */
  public addInstance(instance: ObjInstanceInfo): void {
    this._instances.set(instance.instanceId, instance);
  }

  /** Look an instance up by its identity. */
  public getInstance(instanceId: number): ObjInstanceInfo | undefined {
    return this._instances.get(instanceId);
  }

  /** All instances, in creation order — which is declaration order. */
  public getAllInstances(): ObjInstanceInfo[] {
    return Array.from(this._instances.values()).sort((a, b) => a.instanceId - b.instanceId);
  }

  /** The instances a given parent declared, in declaration order. */
  public getChildInstances(parentInstanceId: number): ObjInstanceInfo[] {
    return this.getAllInstances().filter((i) => i.parentInstanceId === parentInstanceId);
  }

  /**
   * Get the number of instances
   */
  public get count(): number {
    return this._instances.size;
  }

  /**
   * Clear all instances
   */
  public clear(): void {
    this._instances.clear();
    this._nextInstanceId = 0;
  }
}
