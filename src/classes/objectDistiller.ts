/** @format */

'use strict';

import { Context } from '../utils/context';
import { DistillerList, DistillerRecord } from './distillerList';
import { BrkSite, ObjectImage } from './objectImage';

/**
 * ObjectDistiller - Handles object deduplication and optimization for compiled Spin2/PASM2 code.
 *
 * This class owns all distillation logic, replacing the legacy distiller code in SpinResolver.
 * The five-phase algorithm:
 * 1. buildObjectTree() - Recursively builds object tree from compiled image
 * 2. scrubObjectOffsets() - Clears sub-object offsets for binary comparison
 * 3. eliminateRedundantObjects() - Removes duplicate objects (loops until none found)
 * 4. rebuildOptimizedImage() - Compacts the object image
 * 5. reconnectReferences() - Reconnects sub-object references with new offsets
 */
export class ObjectDistiller {
  private context: Context;
  private distillerList: DistillerList;
  private isLogging: boolean;
  private isLoggingOutline: boolean;

  constructor(ctx: Context) {
    this.context = ctx;
    this.distillerList = new DistillerList(ctx);
    this.isLogging = ctx.logOptions.logDistiller;
    this.isLoggingOutline = ctx.logOptions.logOutline;
  }

  public get recordCount(): number {
    return this.distillerList.recordCount;
  }

  /**
   * Get access to the distiller list for map generation
   */
  public get records(): DistillerList {
    return this.distillerList;
  }

  /**
   * Main entry point - Distills (optimizes) the object image by eliminating duplicate objects.
   * @param objImage - The object image to optimize
   * @returns Number of bytes saved by optimization
   */
  public distillObjects(objImage: ObjectImage): number {
    const startingOffset = objImage.offset;

    this.distillerList.clear();
    this.buildObjectTree(objImage, 0, 0, 1);
    this.scrubObjectOffsets(objImage);

    let wasEliminated: boolean;
    do {
      wasEliminated = this.eliminateRedundantObjects(objImage);
    } while (wasEliminated);

    this.rebuildOptimizedImage(objImage);
    this.reconnectReferences(objImage, 0);

    return startingOffset - objImage.offset; // bytes saved
  }

  /**
   * Build object tree recursively from compiled image.
   * Counts sub-objects, methods, and creates DistillerRecords.
   */
  private buildObjectTree(objImage: ObjectImage, objectId: number, objectOffset: number, subObjectId: number): number {
    this.logMessageOutline(`* buildObjectTree(id=(${objectId}), ofs=(${objectOffset}), subObjId=(${subObjectId}))`);

    // Count sub-objects by reading longs until we find one with bit 31 set
    let tableEntry: number;
    let subObjectCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      tableEntry = objImage.readLong(objectOffset + subObjectCount * 8);
      if ((tableEntry & 0x80000000) === 0) {
        subObjectCount++;
      } else {
        break;
      }
    }

    // Count methods by reading longs until we find one without bit 31 set
    let methodCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      tableEntry = objImage.readLong(objectOffset + subObjectCount * 8 + methodCount * 4);
      if ((tableEntry & 0x80000000) !== 0) {
        methodCount++;
      } else {
        break; // tableEntry now contains object size
      }
    }

    // Collect sub-object IDs
    const subObjIds: number[] = [];
    for (let index = 0; index < subObjectCount; index++) {
      subObjIds.push(subObjectId + index);
    }

    // Create and add record (tableEntry is object size from last loop)
    const record = new DistillerRecord(objectId, objectOffset, subObjectCount, methodCount, tableEntry, subObjIds);
    this.distillerList.addrecord(record);

    // Process sub-objects recursively
    let newSubObjectId = subObjectId + subObjectCount;
    for (let index = 0; index < subObjectCount; index++) {
      const subObjectOffset = objImage.readLong(objectOffset + index * 8);
      newSubObjectId = this.buildObjectTree(objImage, subObjectId + index, objectOffset + subObjectOffset, newSubObjectId);
    }

    return newSubObjectId;
  }

  /**
   * Clear sub-object offsets in preparation for binary comparison.
   * Writes zero to each sub-object slot.
   */
  private scrubObjectOffsets(objImage: ObjectImage): void {
    this.logMessage(`* scrubObjectOffsets()`);

    for (const [, record] of this.distillerList.records()) {
      for (let subObjIndex = 0; subObjIndex < record.subObjectCount; subObjIndex++) {
        // Clear sub-object offsets to facilitate later comparison
        objImage.replaceLong(0, record.objectOffset + subObjIndex * 8);
      }
    }
  }

  /**
   * Find and eliminate one redundant (duplicate) object.
   * Returns true if an elimination occurred, false otherwise.
   * Caller should loop until false is returned.
   */
  private eliminateRedundantObjects(objImage: ObjectImage): boolean {
    this.logMessage(`* eliminateRedundantObjects()`);

    // Iterate through all records
    for (let matchIdx = 0; matchIdx < this.distillerList.recordCount; matchIdx++) {
      const matchRecord = this.distillerList.getRecordAt(matchIdx)!;

      // Check if all sub-objects are marked complete (bit 31 set)
      let allComplete = true;
      for (const subId of matchRecord.subObjectIds) {
        if ((subId & 0x80000000) === 0) {
          allComplete = false;
          break;
        }
      }

      if (!allComplete) {
        continue;
      }

      // Search forward for a matching (equivalent) record
      for (let searchIdx = matchIdx + 1; searchIdx < this.distillerList.recordCount; searchIdx++) {
        const searchRecord = this.distillerList.getRecordAt(searchIdx)!;

        if (this.areRecordsEquivalent(objImage, matchRecord, searchRecord)) {
          // Found a match - update references and remove the redundant record
          const oldId = matchRecord.objectId;
          const newId = searchRecord.objectId;

          this.logMessage(`  -- MATCH FOUND: record[${matchIdx}] matches record[${searchIdx}], oldId=${oldId}, newId=${newId}`);

          // Update all sub-object ID references
          this.distillerList.replaceSubObjectId(oldId, newId);

          // Remove the redundant record
          this.distillerList.removeRecordAt(matchIdx);

          return true; // Signal that we eliminated something
        }
      }
    }

    return false; // No elimination occurred
  }

  /**
   * Compare two records for equivalence (same content, can be deduplicated).
   */
  private areRecordsEquivalent(objImage: ObjectImage, record1: DistillerRecord, record2: DistillerRecord): boolean {
    // Object sizes must match
    if (record1.objectSize !== record2.objectSize) {
      return false;
    }

    // Sub-object counts must match
    if (record1.subObjectCount !== record2.subObjectCount) {
      return false;
    }

    // Sub-object IDs must match
    for (let i = 0; i < record1.subObjectCount; i++) {
      if (record1.subObjectIds[i] !== record2.subObjectIds[i]) {
        return false;
      }
    }

    // Binary content must match (compare longs)
    const sizeInLongs = (record1.objectSize + 3) >> 2;
    for (let i = 0; i < sizeInLongs; i++) {
      const long1 = objImage.readLong(record1.objectOffset + i * 4);
      const long2 = objImage.readLong(record2.objectOffset + i * 4);
      if (long1 !== long2) {
        return false;
      }
    }

    return true;
  }

  /**
   * Rebuild the object image with optimized (compacted) layout.
   * Updates record offsets and copies object content to new positions.
   */
  private rebuildOptimizedImage(objImage: ObjectImage): void {
    const savedOffset = objImage.offset;
    this.logMessage(`* rebuildOptimizedImage() imgOfs=(${savedOffset})`);

    // Create temporary image to build compacted result
    const rebuildImage = new ObjectImage(this.context, 'rebuildImage');
    rebuildImage.setOffsetTo(0);

    // Old -> new region map, captured as the copy happens. This is the only
    // place the correspondence exists: record.objectOffset is overwritten in
    // the same loop that reads it.
    const moves: { from: number; to: number; size: number }[] = [];

    // Copy each object's content to new positions
    for (const [, record] of this.distillerList.records()) {
      const sourceOffset = record.objectOffset;

      // Update record with new offset position
      record.objectOffset = rebuildImage.offset;

      // Copy object content (convert bytes to longs, rounded up)
      const sizeInLongs = (record.objectSize + 3) >> 2;
      moves.push({ from: sourceOffset, to: record.objectOffset, size: sizeInLongs * 4 });
      for (let longIndex = 0; longIndex < sizeInLongs; longIndex++) {
        const sourceLong = objImage.readLong(sourceOffset + longIndex * 4);
        rebuildImage.appendLong(sourceLong);
      }
    }

    // Move the brkCode write sites with the bytes they point at.
    //
    // Two reasons this cannot be skipped. A site left at a pre-rebuild offset
    // makes the cache patch an unrelated byte on a later hit, and the loader
    // rejects an image whose checksum then fails to match. And a site inside a
    // region eliminateRedundantObjects DROPPED must go: those bytes are gone,
    // and the surviving twin carries its own sites for the identical content.
    // Dropping is therefore not a loss — it is the duplicate being deduped.
    //
    // Done BEFORE setOffsetTo below, which shrinks the image and discards any
    // site at or beyond the new end. Remapping first means the survivors are
    // already at their new, smaller offsets when that runs.
    const relocatedSites: BrkSite[] = [];
    for (const site of objImage.brkSites) {
      const move = moves.find((m) => site.offset >= m.from && site.offset < m.from + m.size);
      if (move !== undefined) {
        relocatedSites.push({ ...site, offset: move.to + (site.offset - move.from) });
      }
    }
    objImage.replaceBrkSites(relocatedSites);

    // Replace original image content with rebuilt content
    objImage.rawUint8Array.set(rebuildImage.rawUint8Array.subarray(0, rebuildImage.offset));
    objImage.setOffsetTo(rebuildImage.offset);

    this.logMessage(`  -- rebuildExit imgOfs=(${savedOffset}) -> (${objImage.offset})`);
  }

  /**
   * Reconnect sub-object references with new offsets after rebuild.
   * Recursively processes all objects starting from root.
   */
  private reconnectReferences(objImage: ObjectImage, recordIndex: number): void {
    const record = this.distillerList.getRecordAt(recordIndex);
    if (!record) {
      return;
    }

    this.logMessage(`* reconnectReferences(recordIndex=${recordIndex})`);

    for (let subIdx = 0; subIdx < record.subObjectCount; subIdx++) {
      const subObjId = record.subObjectIds[subIdx] & 0x7fffffff;

      // Find the record with matching object ID
      const matchIndex = this.distillerList.findRecordIndexByObjectId(subObjId);
      if (matchIndex < 0) {
        throw new Error(`ERROR[INTERNAL] failed to locate Object Id ${subObjId} in list`);
      }

      const matchRecord = this.distillerList.getRecordAt(matchIndex)!;

      // Calculate and write relative offset
      const relativeOffset = (matchRecord.objectOffset - record.objectOffset) & 0x7fffffff;
      objImage.replaceLong(relativeOffset, record.objectOffset + subIdx * 8);

      // Recursively process the sub-object
      this.reconnectReferences(objImage, matchIndex);
    }
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }

  private logMessageOutline(message: string): void {
    if (this.isLoggingOutline) {
      this.context.logger.logMessage(message);
    }
  }
}
