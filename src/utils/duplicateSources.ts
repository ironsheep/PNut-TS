/** @format */

// Notice when one build compiles the same source from two different paths.

'use strict';
// src/utils/duplicateSources.ts

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Two paths, one file.
 *
 * A build that reaches byte-identical source at two different paths still
 * compiles correctly -- each copy becomes its own object, and if they compile
 * to identical images the distiller merges them anyway. So this is not an
 * error, and it must not become one.
 *
 * It is worth saying out loud regardless. Duplicated source is a structural
 * smell the compiler is uniquely placed to see: it holds every resolved path in
 * one place, which no single source file does. It is also the shape that made
 * the object cache dangerous -- one logical name reaching different content
 * from different roots -- so a reader seeing this warning is being shown the
 * conditions under which caching decisions get subtle.
 */
export class DuplicateSourceWatch {
  /** content hash -> the first path that presented it */
  private firstSeen: Map<string, string> = new Map();
  /** pairs already reported, so a file used five times warns once per partner */
  private reported: Set<string> = new Set();

  /**
   * Record a resolved source path. Returns a warning when this path duplicates
   * one already seen, or undefined when it is new.
   *
   * Keyed on CONTENT, not size or mtime: a fresh checkout, a container mount
   * and a copy all rewrite mtimes without changing a byte.
   */
  public note(filePath: string): string | undefined {
    let contents: Buffer;
    try {
      contents = fs.readFileSync(filePath);
    } catch {
      // Unreadable here means something else already failed, or is about to.
      // This is a diagnostic; it must never be what breaks a build.
      return undefined;
    }
    const resolved = path.resolve(filePath);
    const digest = crypto.createHash('sha256').update(contents).digest('hex');
    const previous = this.firstSeen.get(digest);
    if (previous === undefined) {
      this.firstSeen.set(digest, resolved);
      return undefined;
    }
    if (previous === resolved) {
      return undefined; // the same file reached twice, which is ordinary reuse
    }
    const pairKey = `${previous} ${resolved}`;
    if (this.reported.has(pairKey)) {
      return undefined;
    }
    this.reported.add(pairKey);
    return (
      `Duplicate source: [${resolved}] is byte-identical to [${previous}]. ` +
      `Both were compiled as separate objects. Consider referencing one copy, ` +
      `via -I, so edits cannot drift between them.`
    );
  }

  public reset(): void {
    this.firstSeen.clear();
    this.reported.clear();
  }
}
