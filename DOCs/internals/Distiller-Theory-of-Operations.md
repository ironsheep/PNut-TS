# PNut-TS Object Distiller Theory of Operations

## Overview

The **Object Distiller** is a sophisticated binary optimization system in the PNut-TS compiler that eliminates redundant object code from the final binary. It operates after object compilation to identify and remove duplicate object instances, significantly reducing binary size while maintaining functionality.

## Purpose and Benefits

### Primary Goals
1. **Binary Size Optimization**: Removes duplicate object code from the final binary
2. **Memory Efficiency**: Reduces RAM and flash memory usage on P2 microcontrollers
3. **Code Deduplication**: Eliminates redundant copies of identical child objects
4. **Link-Time Optimization**: Performs optimizations that aren't possible during individual object compilation

### Performance Impact
- **Size Reduction**: Can achieve significant binary size reductions (tracked via `distilledBytes`)
- **Memory Savings**: Reduces both program and variable memory requirements
- **Runtime Efficiency**: Maintains original performance while using less memory

## Architecture Overview

### Clean Implementation

The distiller is fully extracted into a dedicated `ObjectDistiller` class with supporting data structures:

```typescript
// src/classes/objectDistiller.ts
export class ObjectDistiller {
  private context: Context;
  private distillerList: DistillerList;

  public distillObjects(objImage: ObjectImage): number;
}

// src/classes/distillerList.ts
export class DistillerRecord { ... }
export class DistillerList { ... }
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `ObjectDistiller` | `objectDistiller.ts` | Main distillation algorithm |
| `DistillerList` | `distillerList.ts` | Collection of records with search/update methods |
| `DistillerRecord` | `distillerList.ts` | Individual object metadata |

## Distiller Record Structure

### Record Format
Each object in the distiller is represented by a `DistillerRecord`:

```typescript
class DistillerRecord {
  objectId: number;        // Unique identifier for this object
  objectOffset: number;    // Byte offset in the object image
  subObjectCount: number;  // Number of child objects
  methodCount: number;     // Number of PUB/PRI methods
  objectSize: number;      // Total size in bytes
  subObjectIds: number[];  // Child object references (bit 31 = completion flag)

// NOTE (v1.55.4): `subObjectIds` still describes the binary object tree and is
// still what dedup compares. It is NO LONGER how the `.map` file's hierarchy is
// derived. Map generation now reads an explicit instance store built during
// compilation (`src/classes/objInstanceInfo.ts`), because walking `subObjectIds`
// could not distinguish two declarations of one object and could not see the
// descendants of a cache-served child at all. `mapGenerator` still reads
// distiller records — but by RECORD index, never by objectId.
}
```

### Data Layout Visualization
```
Record Structure:
┌─────────────────────────────────────────────────────────────┐
│ objectId:        Unique identifier                          │
│ objectOffset:    Position in binary image                   │
│ subObjectCount:  Number of child objects                    │
│ methodCount:     Number of PUB/PRI methods                  │
│ objectSize:      Size in bytes                              │
│ subObjectIds[]:  Child object references (0x80000000 flag)  │
└─────────────────────────────────────────────────────────────┘
```

## Distiller Process Flow

### Entry Point

The distiller is invoked from `SpinResolver.distill_obj_blocks()`:

```typescript
private distill_obj_blocks() {
  const bytesRemoved = this.objectDistiller.distillObjects(this.objImage);
  this.distilledBytes = bytesRemoved;
}
```

### Five-Phase Algorithm

The main `distillObjects()` method orchestrates five phases:

```typescript
public distillObjects(objImage: ObjectImage): number {
  const startingOffset = objImage.offset;

  this.distillerList.clear();
  this.buildObjectTree(objImage, 0, 0, 1);           // Phase 1
  this.scrubObjectOffsets(objImage);                  // Phase 2

  let wasEliminated: boolean;
  do {
    wasEliminated = this.eliminateRedundantObjects(objImage);  // Phase 3
  } while (wasEliminated);

  this.rebuildOptimizedImage(objImage);               // Phase 4
  this.reconnectReferences(objImage, 0);              // Phase 5

  return startingOffset - objImage.offset;            // bytes saved
}
```

### Phase 1: Build (`buildObjectTree()`)
**Purpose**: Recursively analyze object tree and create distiller records

```
Process Flow:
1. Start with root object (ID=0, offset=0)
2. For each object:
   ├── Count sub-objects (longs without bit 31 set)
   ├── Count methods (longs with bit 31 set)
   ├── Read object size from terminating long
   ├── Create DistillerRecord with collected metadata
   └── Recursively process each sub-object
3. Build complete object dependency tree
```

### Phase 2: Scrub (`scrubObjectOffsets()`)
**Purpose**: Prepare objects for comparison by normalizing sub-object offsets

```typescript
private scrubObjectOffsets(objImage: ObjectImage): void {
  for (const [, record] of this.distillerList.records()) {
    for (let subObjIndex = 0; subObjIndex < record.subObjectCount; subObjIndex++) {
      // Clear sub-object offsets to facilitate later comparison
      objImage.replaceLong(0, record.objectOffset + subObjIndex * 8);
    }
  }
}
```

This zeroes out sub-object offset fields, making objects with identical code appear identical for binary comparison.

### Phase 3: Eliminate (`eliminateRedundantObjects()`)
**Purpose**: Identify and remove redundant objects through iterative comparison

```
Elimination Algorithm:
1. For each object record:
   ├── Check if all sub-objects are processed (bit 31 set)
   ├── If ready, search for identical objects:
   │   ├── Compare object sizes
   │   ├── Compare sub-object counts
   │   ├── Compare sub-object ID arrays
   │   └── Perform binary content comparison
   ├── If match found:
   │   ├── Update all references to point to kept object
   │   ├── Remove redundant record
   │   └── Return true (triggers another iteration)
   └── Continue until no matches found
```

**Equivalence Check**:
```typescript
private areRecordsEquivalent(objImage, record1, record2): boolean {
  // 1. Object sizes must match
  if (record1.objectSize !== record2.objectSize) return false;

  // 2. Sub-object counts must match
  if (record1.subObjectCount !== record2.subObjectCount) return false;

  // 3. Sub-object IDs must match
  for (let i = 0; i < record1.subObjectCount; i++) {
    if (record1.subObjectIds[i] !== record2.subObjectIds[i]) return false;
  }

  // 4. Binary content must match
  const sizeInLongs = (record1.objectSize + 3) >> 2;
  for (let i = 0; i < sizeInLongs; i++) {
    if (objImage.readLong(record1.objectOffset + i * 4) !==
        objImage.readLong(record2.objectOffset + i * 4)) return false;
  }

  return true;
}
```

### Phase 4: Rebuild (`rebuildOptimizedImage()`)
**Purpose**: Reconstruct optimized binary image without eliminated objects

```
Rebuild Process:
1. Create temporary ObjectImage
2. For each remaining record:
   ├── Copy object binary data to new position
   ├── Update record offset to new location
   └── Maintain object alignment
3. Replace original objImage content with compacted version
```

### Phase 5: Reconnect (`reconnectReferences()`)
**Purpose**: Fix up all sub-object references to point to new locations

```
Reconnection Process:
1. For each object with sub-objects:
   ├── For each sub-object reference:
   │   ├── Find target object's record by ID
   │   ├── Calculate relative offset from parent
   │   └── Write relative offset to parent's sub-object slot
   └── Recursively process sub-objects
```

## DistillerList API

The `DistillerList` class provides collection management:

| Method | Purpose |
|--------|---------|
| `addrecord(record)` | Add a new DistillerRecord |
| `getRecordAt(index)` | Get record by index |
| `removeRecordAt(index)` | Remove record at index |
| `findRecordIndexByObjectId(id)` | Find record by object ID (masks bit 31) |
| `replaceSubObjectId(oldId, newId)` | Bulk update all sub-object references |
| `records()` | Generator for iteration with index |
| `forEach(callback)` | Iteration helper |

## Integration Points

### In Compilation Pipeline
```
Compilation Flow:
├── Symbol Resolution
├── Code Generation
├── Object Assembly
├── Object Integration
├── Distiller Optimization  ← ObjectDistiller.distillObjects()
└── Final Binary Output
```

### Location in Code
- **SpinResolver**: `src/classes/spinResolver.ts` - Invokes distiller
- **ObjectDistiller**: `src/classes/objectDistiller.ts` - Algorithm implementation
- **DistillerList**: `src/classes/distillerList.ts` - Data structures

### Logging
Controlled by `--log distiller` command-line option:
```typescript
private logMessage(message: string): void {
  if (this.isLogging) {
    this.context.logger.logMessage(message);
  }
}
```

## Performance Characteristics

### Time Complexity
| Phase | Complexity | Notes |
|-------|------------|-------|
| Build | O(n) | n = number of objects |
| Scrub | O(n×m) | m = average sub-objects |
| Eliminate | O(n²) | Object comparison loop |
| Rebuild | O(n) | Single pass copy |
| Reconnect | O(n×m) | Recursive reference fixup |

### Space Complexity
- **Record Storage**: O(n) for object metadata
- **Binary Comparison**: O(1) temporary space
- **Rebuild Buffer**: O(total_binary_size) temporary space

### Optimization Impact
The distiller typically achieves:
- **10-40% binary size reduction** for object-heavy applications
- **Proportional memory savings** at runtime
- **No performance penalty** - identical runtime behavior

## Error Handling

### Internal Validation
```typescript
// In reconnectReferences()
const matchIndex = this.distillerList.findRecordIndexByObjectId(subObjId);
if (matchIndex < 0) {
  throw new Error(`ERROR[INTERNAL] failed to locate Object Id ${subObjId} in list`);
}
```

## Map Generation Integration

The distiller exposes its record list for map file generation:

```typescript
public get records(): DistillerList {
  return this.distillerList;
}
```

This allows the map generator to access object metadata (IDs, offsets, sizes) for memory map output.

## Conclusion

The Object Distiller provides sophisticated link-time optimization for PNut-TS compiled binaries. The clean class-based architecture with `ObjectDistiller`, `DistillerList`, and `DistillerRecord` enables:

1. **Clear Separation of Concerns**: Algorithm logic in ObjectDistiller, data management in DistillerList
2. **Type Safety**: Typed classes instead of integer arrays
3. **Maintainability**: Self-documenting method names and structure
4. **Testability**: Isolated components easier to unit test
5. **Extensibility**: New optimization strategies easy to implement

The five-phase approach ensures both correctness and optimal size reduction, making it a critical component for memory-constrained P2 microcontroller applications.
