# PNut-TS Object Distiller Theory of Operations

## Overview

The **Object Distiller** (`ObjectDistiller.distillObjects()`,
`src/classes/objectDistiller.ts`) removes byte-identical duplicate child
object images from the compiled binary. It runs from
`SpinResolver.distill_obj_blocks()`, called after `compile_obj_blocks()` has
already assembled every child into the parent's `objImage` — see "Distiller
Process Flow" below for exactly how much it removes and when.

## Purpose and Benefits

### Primary Goals
1. **Binary Size Optimization**: `eliminateRedundantObjects()` drops a
   redundant object's bytes outright (Phase 3/4 below); `distillObjects()`
   returns the exact count removed
2. **Memory Efficiency**: reduces the compiled **code** footprint only — see
   "Performance Impact" below for what it does not touch
3. **Code Deduplication**: `areRecordsEquivalent()` requires identical size,
   identical sub-object-ID list and identical binary content before two
   objects are considered the same
4. **Link-Time Optimization**: distillation runs on the fully-assembled
   parent image (after `compile_obj_blocks()`), so it can compare objects
   that were compiled independently and know nothing of each other

### Performance Impact
- **Size Reduction**: `distillObjects()`'s return value
  (`startingOffset - objImage.offset`, added into `this.distilledBytes`) is
  the exact byte count removed — see "Optimization Impact" below; there is no
  fixed or typical percentage
- **Memory Savings**: **code/program memory only.** The distiller compares
  and removes object **code** bytes; it never reads or writes a VAR offset
  (VAR offsets are the second LONG of each sub-object table slot, backpatched
  by `compile_obj_blocks()` before distillation runs — see
  [Theory-of-Operations.md](Theory-of-Operations.md) §4.2 "Object Instance
  Spacing"). Each surviving reference to a deduplicated object still gets its
  own VAR allocation; distillation does not reduce VAR memory.
- **Runtime Efficiency**: eliminated objects are removed outright (Phase 4),
  so the surviving, deduplicated object's own bytes — and thus its runtime
  behavior — are unchanged from before distillation

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
Each object in the distiller is represented by a `DistillerRecord`
(`src/classes/distillerList.ts`). The real class backs each of these with a
private field and a getter (`objectOffset` and `subObjectIds` also have
setters, used during Phase 4/5); shown here as plain fields for brevity:

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
// derived; that changed again in v1.55.8.
//
// NOTE (v1.55.8): `mapGenerator` no longer reads distiller records at all — by
// RECORD index or otherwise. The `.map` file is built from `ObjectLayout`
// (`src/classes/objectLayout.ts`), which walks the compiled image's own object
// header tables directly, following the Spin2 interpreter's object-call rule.
// The distiller's records remain the input to dedup; they are simply no longer
// the map's data source.
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

The distiller is invoked from `SpinResolver.distill_obj_blocks()`, which only
runs in SPIN2 mode (`this.pasmMode == false` — a PASM2-only top object has no
object tree to distill) and accumulates bytes removed across calls:

```typescript
private distill_obj_blocks() {
  if (this.pasmMode == false) {
    const bytesRemoved = this.objectDistiller.distillObjects(this.objImage);
    this.distilledBytes += bytesRemoved;
  }
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
Per `SpinResolver.compile2()` (see
[Theory-of-Operations.md](Theory-of-Operations.md) §4.2), in call order:
```
compile_var_blocks() / compile_sub_blocks_id()   (symbol/method IDs)
compile_dat_blocks() / compile_sub_blocks()       (bytecode/PASM2 generation)
compile_obj_blocks()                              (child binaries copied in, VAR offsets patched)
distill_obj_blocks() → ObjectDistiller.distillObjects()   ← this document
compile_final()                                   (checksum + symbol table, this object only)
```
`ComposeRam()`'s final `.bin`/`.obj` writes happen later still, once every
object in the tree has been through this sequence — see
[Theory-of-Operations.md](Theory-of-Operations.md) Phase 6.

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
`distillObjects()` returns the exact byte count it removed
(`startingOffset - objImage.offset`); how much that is depends entirely on how
many byte-identical child object instances a given source tree compiles —
there is no fixed or typical percentage to cite. Eliminated objects are
removed from the image outright (Phase 4), so runtime behavior for the
surviving, deduplicated object is identical to the pre-distillation copy.

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

**As of v1.55.8, the map generator does not use the distiller at all.** The
`.map` file is built from `ObjectLayout` (`src/classes/objectLayout.ts`), which
derives every image and instance fact from the compiled image's own object
header tables — see `DOCs/internals/MAP-File-Format.md`. The distiller still
exposes its record list (below) for dedup's own use; nothing in map generation
reads it.

```typescript
public get records(): DistillerList {
  return this.distillerList;
}
```

## Conclusion

`ObjectDistiller.distillObjects()` runs its five phases (Build, Scrub,
Eliminate, Rebuild, Reconnect — detailed above) once per SPIN2-mode object,
from `SpinResolver.distill_obj_blocks()`, and removes byte-identical
duplicate child object **code** from that object's compiled image before
`compile_final()` appends the checksum and symbol table (see
[Theory-of-Operations.md](Theory-of-Operations.md) §5.1/§6.5). It does not
affect VAR memory (see "Performance Impact" above) and, as of v1.55.8, its
records are not read by map generation (see "Map Generation Integration"
above).
