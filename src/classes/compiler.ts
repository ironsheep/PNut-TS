// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { PreprocessorError, SpinDocument } from './spinDocument';
import { Spin2Parser } from './spin2Parser';
import { RegressionReporter } from './regression';
import { DatFile, ObjFile, SpinFiles } from './spinFiles';
import { SymbolEntry, SymbolTable } from './symbolTable';
import { ChildObjectsImage } from './childObjectsImage';
import { loadFileAsUint8Array, loadUint8ArrayFailed } from '../utils/files';
import { ObjectImage } from './objectImage';
import path from 'path';
import { OBJ_LIMIT } from './spinResolver';
import { ObjInstanceInfo } from './objInstanceInfo';
import { DuplicateSourceWatch } from '../utils/duplicateSources';
import { eElementType } from './types';
import {
  CACHE_FORMAT_VERSION,
  CachedInstance,
  CachedOverride,
  CachedSubtreeSymbols,
  CacheMetadata,
  DebugInfo,
  ManifestEntry,
  ObjectCache,
  manifestEntryFor,
  mergeManifests,
  patchBrkSite,
  recomputeChildChecksum
} from './objectCache';

// src/classes/compiler.ts

const OBJ_STACK_LIMIT: number = 16;

export class Compiler {
  private context: Context;
  private isLogging: boolean;
  private isLoggingOutline: boolean;
  private srcFile: SpinDocument | undefined;
  private spin2Parser: Spin2Parser;
  private objectFileCount: number = 0; // from pascal EditUnit.pas ObjFileCount
  // references to our global data
  private objectData: ChildObjectsImage; // pascal P2.ObjData
  private datFileData: ChildObjectsImage; // pascal P2.DatData
  private objImage: ObjectImage; // pascal P2.Obj
  private spinFiles: SpinFiles;

  // our pascal global equivalents
  private childImages: ChildObjectsImage; // pascal ObjFileBuff
  private objectFileOffset: number = 0; // pascal ObjFilePtr

  private countByFilename = new Map<string, number>();
  private readonly obj_limit: number = OBJ_LIMIT; // max object size (2MB) PNut obj_limit as of v49

  // Early deduplication memory statistics
  private memoryStats = {
    totalObjectsCompiled: 0,
    duplicatesDetected: 0,
    memoryBytesSaved: 0,
    duplicatesBySize: new Map<number, number>()
  };

  // Global storage and mapping for early deduplication
  private globalChildObjectIndexMap: Map<number, number> = new Map(); // globalLogicalIndex -> physicalIndex
  private globalLogicalIndexCounter: number = 0; // Global unique counter for deduplication

  // Persistent object cache
  private objectCache: ObjectCache;

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = ctx.logOptions.logCompile;
    this.isLoggingOutline = ctx.logOptions.logOutline;
    this.spin2Parser = new Spin2Parser(ctx);
    // get references to the single global data
    this.objectData = ctx.compileData.objectData;
    this.objectData.refreshLogging();
    this.datFileData = ctx.compileData.datFileData;
    this.datFileData.refreshLogging();
    this.objImage = ctx.compileData.objImage;
    this.objImage.refreshLogging();
    this.spinFiles = ctx.compileData.spinFiles;
    this.spinFiles.enableLogging(this.isLogging);
    // allocate our local data
    this.childImages = new ChildObjectsImage(ctx, 'childImages');
    // Initialize persistent object cache
    // (cacheClear is handled at CLI parse time so it works even when no source file is given)
    this.objectCache = new ObjectCache(ctx.compileOptions.cache, ctx.compileOptions.cacheDir);
    // Reset memory statistics for this compilation
    this.resetMemoryStats();
  }

  private resetMemoryStats(): void {
    this.memoryStats = {
      totalObjectsCompiled: 0,
      duplicatesDetected: 0,
      memoryBytesSaved: 0,
      duplicatesBySize: new Map<number, number>()
    };
    // Reset global index mapping
    this.globalChildObjectIndexMap.clear();
    this.globalLogicalIndexCounter = 0;
    this.recordedInstances = [];
    this.currentInstanceId = -1;
    this.replayedDescendantSymbols.clear();
  }

  /**
   * Report a resolved source path, warning once if its bytes were already
   * reached by a different path.
   *
   * A warning, never an error: the build is correct either way. What it costs
   * the reader is one line; what it buys is sight of a duplication that no
   * single source file can show them.
   */
  /**
   * An OBJ block's parameter overrides, in the form the map and the cache both
   * want.
   *
   * Values become strings here: the cache sidecar is JSON, which has no bigint,
   * and the map prints these rather than computing with them.
   */
  private overridesFromSymbolTable(overrideSymbolTable: SymbolTable | undefined): CachedOverride[] {
    if (overrideSymbolTable === undefined) {
      return [];
    }
    return overrideSymbolTable.allSymbols.map((symbol) => ({
      name: symbol.name,
      value: typeof symbol.value === 'bigint' ? symbol.value.toString() : symbol.value,
      isFloat: symbol.type.toString().includes('float')
    }));
  }

  private noteSourceFile(fileSpec: string): void {
    const warning = this.duplicateSources.note(fileSpec);
    if (warning !== undefined) {
      this.context.logger.infoMsg(`WARNING: ${warning}`);
    }
  }

  public getEarlyDeduplicationSavings(): number {
    return this.memoryStats.memoryBytesSaved;
  }

  public Compile() {
    //logContextState(this.context, 'Compiler');
    if (this.isLogging) this.logMessage(`* Compiler LOGGING is enabled!`);

    this.srcFile = this.context.sourceFiles.getTopFile();
    this.duplicateSources.reset();
    this.noteSourceFile(this.srcFile.fileSpec);

    // TESTING: if requested, run our resolver regression test report generator
    if (this.context.reportOptions.writeResolverReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.runResolverRegression(this.srcFile.dirName, this.srcFile.fileName);
    }

    // if we have a valid file then let's parse it and generate code
    if (this.srcFile.validFile) {
      // here we make calls to the P2* methods (e.g., this.spin2Parser.P2Compile1(), , etc.)
      try {
        this.objectFileCount = 0; // pascal ObjFileCount
        this.objectFileOffset = 0; // pascal ObjFilePtr
        // thinking: pass context:fileIndex instead of fileName??
        this.compileRecursively(0, this.srcFile);

        // Validate index mapping after all child objects are processed
        if (this.globalChildObjectIndexMap.size > 0) {
          this.validateIndexMapping();
        }

        // Log deduplication statistics if any duplicates were found
        this.logDuplicationStats();

        // Log cache statistics if cache is enabled
        this.logCacheStats();

        // Build object instance info for map file generation
        this.buildObjInstanceInfo();

        // Pass early deduplication savings to spin2Parser for list file reporting
        this.spin2Parser.setEarlyDeduplicationSavings(this.memoryStats.memoryBytesSaved);

        this.spin2Parser.P2List();
        this.spin2Parser.P2Map();
        this.spin2Parser.ComposeRam();
      } catch (error: unknown) {
        if (error instanceof PreprocessorError) {
          // Raised while preprocessing a child object. Its diagnostics are already
          // on stderr; dressing this up as a compiler error would print a second,
          // less specific message pointing at the wrong place.
          throw error;
        }
        if (error instanceof Error) {
          const sourceFileID: number = this.spin2Parser.failingFileID;
          const srcDocument: SpinDocument | undefined = this.context.sourceFiles.getFileHavingID(sourceFileID);
          const filename: string = srcDocument !== undefined ? srcDocument.fileSpec : this.srcFile.fileSpec;
          const sourceLineNumber: number = this.spin2Parser.sourceLineNumber;
          const compilerErrorText: string = `${filename}:${sourceLineNumber}:error:${error.message}`;
          //this.context.logger.logMessage(` DBG filename=[${filename}], sourceLineNumber=(${sourceLineNumber}), errTxt=[${compilerErrorText}]`);
          // Errors are reported once, on stderr only, as plain text -- see logger.compilerErrorMsg().
          this.context.logger.compilerErrorMsg(compilerErrorText);
          //if (error.stack !== undefined && !underTestStatus) {
          //  this.context.logger.errorMsg(error.stack);
          //}
        } else {
          // If it's not an Error object, it could be a string, null, etc.
          this.context.logger.errorMsg(error);
        }
        // Re-throw so the caller can set a non-zero exit code
        throw error;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  /**
   * Subtree dependency manifests, one entry per child that has finished
   * compiling (or cache-hit) at the current recursion level.
   *
   * Same shape as the defSymbols / debug-record snapshots above it: a child
   * marks the length on the way in, its descendants push on the way out, and
   * the child splices its descendants' contributions back off to fold into its
   * own manifest. What makes this the fix is that the fold is RECURSIVE — a
   * parent's manifest names every file in its whole subtree, so revalidating a
   * parent revalidates everything beneath it without visiting any of it.
   */
  private subtreeManifests: ManifestEntry[][] = [];

  /**
   * The object instance tree, recorded while compiling rather than
   * reconstructed afterwards.
   *
   * This is where the truth lives: at the moment compileRecursively descends
   * into a child it knows the declaring parent, the child's position in that
   * parent's OBJ block, and the child's source file. Rebuilding that later
   * from distiller records meant translating between index spaces that were
   * never the same space, which is what produced mislabelled and missing
   * entries in the .map. The distiller walks the compiled binary and has no
   * knowledge of source files at all — by design — so it cannot be the source
   * of this association.
   */
  private recordedInstances: {
    parentInstanceId: number;
    childPosition: number;
    sourceFileName: string;
    /** Overrides this instance was declared with; the map prints them. */
    overrides: CachedOverride[];
  }[] = [];
  private currentInstanceId: number = -1;

  /**
   * Symbols for descendants restored from a cache hit, keyed by source file
   * name.
   *
   * Held by NAME because these files are never loaded: the hit is what skipped
   * them, so they have no entry in Context.sourceFiles and therefore no source
   * file index to key on. buildObjInstanceInfo gives each one an index at the
   * end, once the whole tree is known.
   */
  private replayedDescendantSymbols: Map<string, SymbolEntry[]> = new Map();

  /**
   * Sees every resolved source path this build touches, and says so when two
   * of them hold the same bytes. Per-compile, so nothing leaks between runs.
   */
  private duplicateSources: DuplicateSourceWatch = new DuplicateSourceWatch();

  private compileRecursively(depth: number, srcFile: SpinDocument, overrideParameters: SymbolTable | undefined = undefined) {
    if (this.isLoggingOutline)
      this.logMessageOutline(`++ compileRecursly(${depth}, [${srcFile.fileName}]) - ENTRY ---------------------------------------`);
    if (this.spin2Parser !== undefined) {
      if (depth > OBJ_STACK_LIMIT) {
        throw new Error(`Object nesting exceeds ${OBJ_STACK_LIMIT} levels - illegal circular reference may exist`);
      }

      // --- CACHE CHECK (for child objects only) ---
      let cacheKey: string | undefined;
      // Snapshot of defSymbols length BEFORE this child's recursion begins.
      // Used on the cache-miss store path to slice out the subtree exportdef
      // contribution so a future cache hit can replay it.
      let defSymbolsLengthAtKey: number = 0;
      // Snapshot of debugRawData recordCount BEFORE this child's recursion
      // begins. On the cache-miss store path we slice
      // [recordCountAtKey+1 .. recordCountAfter] to capture every debug
      // record the child's subtree contributed (including grandchildren that
      // compiled fresh under this child). Without this slice, sd's .dbg only
      // contains records that sd's own brkSites reference — and grandchild
      // records that aren't dedup'd against sd's debug() calls would be lost
      // on a future cache hit, leaving the top-level binary's debug data
      // table 100-200 bytes shorter than a fresh compile.
      let recordCountAtKey: number = 0;
      // Mark where this child's descendants will push their manifests, so the
      // store path can splice out exactly this subtree's contribution.
      const manifestMarkAtKey: number = this.subtreeManifests.length;
      // Mark where this child's subtree instances begin, so the store path can
      // slice out exactly what this compile contributed.
      const instanceMarkAtKey: number = this.recordedInstances.length;
      if (this.objectCache.isEnabled && depth > 0) {
        defSymbolsLengthAtKey = this.context.preProcessorOptions.defSymbols.length;
        recordCountAtKey = this.spin2Parser.debugRawData.recordCount;
        cacheKey = this.objectCache.computeKey({
          preprocessedLines: srcFile.allPreprocessedLines,
          overrides: overrideParameters,
          compilerVersion: this.context.compilerVersion,
          enableDebug: this.context.compileOptions.enableDebug,
          // Pass-by-reference is fine: computeKey reads-only, and the caller
          // doesn't mutate this between key computation and now. defSymbols
          // captures both CLI `-D` flags and any symbols the parent (or
          // earlier ancestors) propagated via `#pragma exportdef`, so the key
          // distinguishes contexts that produce different grandchild content
          // even when this child's own preprocessedLines is identical.
          defSymbols: this.context.preProcessorOptions.defSymbols,
          // The resolution root is the TOP-LEVEL file's directory, not this
          // child's — `DAT ... FILE` and OBJ names both resolve from there.
          // Two apps in one project reach the same library object through
          // different roots and need different embedded blobs.
          resolutionRoot: this.srcFile !== undefined ? this.srcFile.dirName : '',
          includeFolders: this.context.preProcessorOptions.includeFolders
        });
        // getIfValid re-hashes every file this entry was built from before
        // handing the binary back. An entry whose subtree changed is counted a
        // miss and we fall through to a normal compile.
        const cachedBinary = this.objectCache.getIfValid(cacheKey);
        if (cachedBinary) {
          // Cache hit — inject cached binary into childImages, skip full compilation
          if (this.isLoggingOutline) this.logMessageOutline(`  -- CACHE HIT -- [${srcFile.fileName}], key=${cacheKey.substring(0, 12)}...`);
          this.memoryStats.totalObjectsCompiled++;

          // The .dbg sidecar carries the child's full hit-replay payload
          // (debug records + brkSites + subtree exportdef contributions).
          // It's load-bearing on EVERY v1.54.6+ cache hit, even when --debug
          // is off, because the subtree exports must replay so subsequent
          // siblings preprocess against the same defSymbols state they would
          // have under a cold compile.
          const cachedDebugInfo = this.objectCache.getDebugInfo(cacheKey);
          if (cachedDebugInfo === undefined) {
            throw new Error(
              `Object cache: missing or invalid .dbg sidecar for [${srcFile.fileName}] (key=${cacheKey.substring(0, 12)}...). ` +
                `Run with --cache-clear to rebuild.`
            );
          }

          // Replay this child's subtree exportdef contributions onto the
          // shared defSymbols so subsequent siblings see them. v1.54.6's
          // critical fix: without this, sibling preprocesses run against a
          // stale defSymbols (missing what skipped grandchildren would have
          // pushed) and produce wrong binaries. defineSymbol is idempotent
          // (verified §5.1 of Object-Cache-Correctness-Analysis.md), so
          // duplicates and ordering don't matter.
          for (const sym of cachedDebugInfo.subtreeExports) {
            this.context.preProcessorOptions.defSymbols.push(sym);
          }

          // Replay debug records + patch brkSites only when debug is on.
          // The records and brkSites lists are empty for non-debug compiles
          // anyway, but we gate explicitly to skip the checksum-recompute
          // walk on the common path.
          if (this.context.compileOptions.enableDebug) {
            const indexRemap = new Map<number, number>();
            for (const record of cachedDebugInfo.records) {
              const newIndex = this.spin2Parser.debugRawData.injectRecord(record.bytes);
              indexRemap.set(record.origIndex, newIndex);
            }
            let needsChecksumFix = false;
            for (const site of cachedDebugInfo.brkSites) {
              const newIndex = indexRemap.get(site.origIndex);
              if (newIndex === undefined) {
                throw new Error(
                  `Object cache: brkSite origIndex ${site.origIndex} not in records map for [${srcFile.fileName}] ` +
                    `(key=${cacheKey.substring(0, 12)}...). Run with --cache-clear to rebuild.`
                );
              }
              if (newIndex !== site.origIndex) needsChecksumFix = true;
              patchBrkSite(cachedBinary, site, newIndex);
            }
            // Spin object loader rejects images whose byte-sum is non-zero;
            // any brkCode change alters that sum, so refresh the checksum.
            // Skip when no patch actually changed bytes (identity remap, e.g.
            // same-parent recompile) — saves a full-binary scan on the common
            // path.
            if (needsChecksumFix) {
              recomputeChildChecksum(cachedBinary);
            }
          }

          const duplicateInfo = this.childImages.findDuplicateChild(cachedBinary);
          let physicalFileIndex: number;

          if (duplicateInfo.exists) {
            physicalFileIndex = duplicateInfo.fileIndex;
            this.memoryStats.duplicatesDetected++;
            this.memoryStats.memoryBytesSaved += cachedBinary.length;
            const sizeCount = this.memoryStats.duplicatesBySize.get(cachedBinary.length) || 0;
            this.memoryStats.duplicatesBySize.set(cachedBinary.length, sizeCount + 1);
          } else {
            physicalFileIndex = this.objectFileCount;
            if (this.objectFileOffset + cachedBinary.length > this.obj_limit) {
              throw new Error(`OBJ data exceeds ${this.obj_limit / 1024}k limit (m690)`);
            }
            this.childImages.setOffset(this.objectFileOffset);
            this.childImages.ensureFits(this.objectFileOffset, cachedBinary.length);
            this.childImages.rawUint8Array.set(cachedBinary, this.objectFileOffset);
            this.childImages.recordLengthOffsetForFile(this.objectFileCount, this.objectFileOffset, cachedBinary.length);
            this.objectFileOffset += cachedBinary.length;
            this.objectFileCount++;
          }

          // Restore the child's user symbols so the map file generator sees them.
          // Only read the .sym sidecar when a map is actually being written —
          // saves I/O on the common path.
          if (this.context.compileOptions.writeMapFile) {
            const cachedSymbols = this.objectCache.getSymbols(cacheKey);
            if (cachedSymbols !== undefined) {
              const fileIndex = this.context.sourceFiles.getFileIndex(srcFile);
              if (fileIndex >= 0) {
                this.context.objectSymbolStore.storeSymbols(fileIndex, cachedSymbols);
              }
            } else if (this.isLoggingOutline) {
              this.logMessageOutline(`  -- CACHE HIT but .sym missing/invalid for [${srcFile.fileName}] — map will be incomplete for this object`);
            }
          }

          // Hand this subtree's manifest up. It was validated as the
          // condition of this hit, so it is current by construction and the
          // parent can fold it into its own without re-checking. Skipping this
          // would make the parent's manifest cover only the children that
          // compiled fresh — reintroducing the same blind spot one level up.
          const cachedManifest = this.objectCache.getManifest(cacheKey);
          this.subtreeManifests.push(cachedManifest ?? []);

          // Replay the instance subtree. A hit returns before the child-object
          // loop below, so nothing else would record this child's OWN children
          // and the .map would silently lose every level beneath it. This is
          // the same short-circuit that produced the staleness defect — a
          // skipped subtree cannot report what it contains — so it needs the
          // same treatment: capture at store, replay at hit.
          if (this.context.compileOptions.writeMapFile) {
            // Restore descendant symbols too. The .sym restore below covers
            // only THIS child; its grandchildren are never visited on a hit,
            // so without this their methods disappear from the map even though
            // the hierarchy above now shows them.
            const cachedSubtreeSymbols = this.objectCache.getSubtreeSymbols(cacheKey);
            if (cachedSubtreeSymbols !== undefined) {
              for (const entry of cachedSubtreeSymbols) {
                if (!this.replayedDescendantSymbols.has(entry.sourceFileName)) {
                  this.replayedDescendantSymbols.set(entry.sourceFileName, entry.symbols);
                }
              }
            }

            const cachedInstances = this.objectCache.getInstances(cacheKey);
            if (cachedInstances !== undefined) {
              const subtreeBase = this.recordedInstances.length;
              for (const cached of cachedInstances) {
                // Names, not indices, and resolved later: a replayed subtree
                // can name a file that has not been registered yet, because
                // this hit is what skipped loading it.
                this.recordedInstances.push({
                  parentInstanceId: cached.relativeParent === -1 ? this.currentInstanceId : subtreeBase + cached.relativeParent,
                  childPosition: cached.childPosition,
                  sourceFileName: cached.sourceFileName,
                  overrides: cached.overrides ?? []
                });
              }
            }
          }

          this.globalChildObjectIndexMap.set(this.globalLogicalIndexCounter, physicalFileIndex);
          this.globalLogicalIndexCounter++;
          return; // Skip full compilation
        }
      }
      // --- END CACHE CHECK ---

      // local variables
      let objectFiles: number = 0; // pascal ObjFiles
      let dataFiles: number = 0; // pascal DatFiles
      const objectCountsPerChild: number[] = [];

      // load source file and perform first pass of compilation
      this.spin2Parser.setSourceFile(srcFile);

      // NOTE TODO: we need to request collapse_debug_data from compile2 if depth = 2
      if (this.context.passOptions.afterPreprocess == false) {
        if (this.context.passOptions.afterElementize == false) {
          if (this.isLogging) this.logMessage(`  -- compRecur(${depth}) - compile1 - pass 1 ----------------------------------------`);
          this.spin2Parser.P2Compile1(overrideParameters);

          const objFileList: ObjFile[] = [...this.spinFiles.objFiles];
          const datFileList: DatFile[] = [...this.spinFiles.datFiles];
          objectFiles = objFileList.length;
          dataFiles = datFileList.length;

          if (this.spinFiles.pasmMode && depth > 0) {
            throw new Error(`${srcFile.fileName} is a PASM file and cannot be used as a Spin2 object`);
          }
          if (objectFiles > 0) {
            // do compile1 pass each child for this object
            //const objFileList: ObjFile[] = this.spinFiles.objFiles;
            for (let index = 0; index < objFileList.length; index++) {
              const objFile = objFileList[index];
              const fileSpec: string = objFile.fileSpec;
              this.noteSourceFile(fileSpec);
              // reuse existing document if present
              let childObjSourceFile = this.context.sourceFiles.getFile(fileSpec);
              if (childObjSourceFile === undefined) {
                if (this.isLoggingOutline) this.logMessageOutline(`--- load child object [${path.basename(fileSpec)}]`);
                childObjSourceFile = new SpinDocument(this.context, fileSpec);
                this.context.sourceFiles.addFile(childObjSourceFile);
              }
              objFile.setSpinSourceFileId(childObjSourceFile.fileId);
              const overrideSymbolTable: SymbolTable | undefined = objFile.parameterSymbolTable;
              // Record the instance before descending: parent identity, this
              // child's position in the parent's OBJ block, and the child's
              // source file. `index` IS the declaration position — objFileList
              // is built by parsing the OBJ block in order.
              const childInstanceId = this.recordedInstances.length;
              this.recordedInstances.push({
                overrides: this.overridesFromSymbolTable(overrideSymbolTable),
                parentInstanceId: this.currentInstanceId,
                childPosition: index,
                sourceFileName: childObjSourceFile.fileName
              });
              const enclosingInstanceId = this.currentInstanceId;
              this.currentInstanceId = childInstanceId;
              this.compileRecursively(depth + 1, childObjSourceFile, overrideSymbolTable);
              this.currentInstanceId = enclosingInstanceId;
              // Track this child's index in the parent's list
              // This gets incremented whether it's a duplicate or not
              objectCountsPerChild.push(this.globalLogicalIndexCounter - 1);
            }
          }

          if (this.isLoggingOutline) this.logMessageOutline(`  -- compRecur(${depth}) - compile1 - pass 2 ----------------------------------------`);
          this.spin2Parser.setSourceFile(srcFile);
          this.spin2Parser.P2Compile1(overrideParameters);
          //
          // load sub-objects' .obj files
          //  move  ObjFileBuff (this.childImages) into P2.ObjData (this.objectData)
          if (this.isLoggingOutline) this.logMessageOutline(`* compRecur(${depth}) processing ${objectFiles} OBJ file(s)`);
          if (objectFiles > 0) {
            let objDataOffset: number = 0; // pascal p
            this.objectData.clear();
            // for each child...
            for (let childIdx = 0; childIdx < objectFiles; childIdx++) {
              const logicalFileIdx = objectCountsPerChild[childIdx]; // Now contains logical index
              // Translate logical to physical index
              const physicalFileIdx = this.globalChildObjectIndexMap.get(logicalFileIdx);
              if (physicalFileIdx === undefined) {
                throw new Error(`Internal error: missing index mapping for logical index ${logicalFileIdx} at childIdx ${childIdx}`);
              }
              // pascal inline       s
              const [objOffset, objLength] = this.childImages.getOffsetAndLengthForFile(physicalFileIdx);
              if (this.isLoggingOutline)
                this.logMessageOutline(
                  `  -- compRecur(${depth}) obj loop childIdx=(${childIdx}), logicalIdx=(${logicalFileIdx}), physicalIdx=(${physicalFileIdx}), objOffset=(${objOffset}), objLength=(${objLength})`
                );
              // for this child, append child image to objectData
              this.childImages.setOffset(objOffset); // set read start
              this.objectData.setOffset(objDataOffset); // set write start

              this.objectData.ensureFits(objDataOffset, objLength); // throws exception if bad!
              this.objectData.rawUint8Array.set(this.childImages.rawUint8Array.subarray(objOffset, objOffset + objLength), objDataOffset);
              // Record using childIdx (position in parent's child list), not physical file index
              this.objectData.recordLengthOffsetForFile(childIdx, objDataOffset, objLength);
              objDataOffset += objLength;
              // DEBUG dump into .obj file for inspection
              //const newObjFileSpec = this.uniqueObjectName(depth, srcFile.dirName, srcFile.fileName, 'Data'); // REMOVE BEFORE FLIGHT
              //dumpUniqueChildObjectFile(this.objectData, objDataOffset, newObjFileSpec, this.context); // REMOVE BEFORE FLIGHT
              // DEBUG dump object records for inspection
              if (this.isLoggingOutline) {
                this.logMessageOutline(`* - -------------------------------`);
                for (let objFileIndex = 0; objFileIndex < this.objectData.objectFileCount; objFileIndex++) {
                  const [recOffset, recLength] = this.objectData.getOffsetAndLengthForFile(objFileIndex);
                  this.logMessageOutline(`  -- compRecur() fileIdx=[${objFileIndex}], objOffset=(${recOffset}), objLength(${recLength})`);
                }
                this.logMessageOutline(`* - -------------------------------`);
              }
            }
          }
          //
          // load any data files
          if (this.isLoggingOutline) this.logMessageOutline(`* compRecur(${depth}) processing ${dataFiles} DAT file(s)`);
          if (dataFiles > 0) {
            let fileDataOffset: number = 0; // pascal p
            //const datFileList: DatFile[] = this.spinFiles.datFiles;
            if (this.isLoggingOutline) this.logMessageOutline(`++ DAT FILE Compiler have (${dataFiles}) data files listLen=(${datFileList.length})`);
            for (let datFileIdx = 0; datFileIdx < datFileList.length; datFileIdx++) {
              const datFile: DatFile = datFileList[datFileIdx];
              const datImage: Uint8Array = loadFileAsUint8Array(datFile.fileSpec, this.context);
              const filename: string = path.basename(datFile.fileSpec);
              const failedToLoad: boolean = loadUint8ArrayFailed(datImage) ? true : false;
              if (failedToLoad == false) {
                if (this.isLoggingOutline)
                  this.logMessageOutline(
                    `++ DAT FILE Compiler [dfd=${this.datFileData.id}]  [${filename}], idx=(${datFileIdx}) len=(${datImage.length})`
                  );
                // ensure fits
                this.datFileData.ensureFits(fileDataOffset, datImage.length);
                // place file content into image
                this.datFileData.rawUint8Array.set(datImage, fileDataOffset);
                // record new arrival
                this.datFileData.recordLengthOffsetForFilename(filename, fileDataOffset, datImage.length);
                fileDataOffset += datImage.length;
              }
            }
          }
          //
          // perform second pass of compilation
          if (this.isLoggingOutline) this.logMessageOutline(`  -- compRecur(${depth}).compile2 ENTRY`);
          this.spin2Parser.P2Compile2(depth == 0); // NOTE: if at zero  (see above note...)

          // Save symbols for this object (for map file generation)
          const fileIndex = this.context.sourceFiles.getFileIndex(srcFile);
          const childSymbols = this.spin2Parser.getUserSymbolTable();
          if (fileIndex >= 0) {
            this.context.objectSymbolStore.storeSymbols(fileIndex, childSymbols);
          }

          const objectLength: number = this.objImage.offset;
          // Track this compilation for statistics
          this.memoryStats.totalObjectsCompiled++;

          // determine if we need this child copy
          const childImage: Uint8Array = this.objImage.rawUint8Array.subarray(0, 0 + objectLength);

          // Fold this subtree's manifest: everything the descendants
          // contributed (spliced off the shared accumulator) plus this file
          // itself. Runs whether or not this object is cached, because a
          // depth-0 top level still has to hand nothing upward while its
          // children's entries must not be left dangling on the accumulator.
          const descendantManifests = this.subtreeManifests.splice(manifestMarkAtKey);
          // `DAT ... FILE` blobs are inputs with no presence in the source: the
          // bytes land in this object's binary but the .spin2 text only names
          // the file. Nothing in the cache key sees them (row A7), so editing a
          // blob alone used to serve a binary carrying the old contents with no
          // diagnostic. Hashing them here closes that with the same mechanism
          // as the source entries.
          //
          // A blob that has since been deleted is deliberately NOT tolerated
          // here: manifestEntryFor throws, which propagates as a compile error
          // rather than silently producing an entry that omits it. Omitting it
          // would make the next hit validate clean against an input that no
          // longer exists.
          const blobEntries: ManifestEntry[] = datFileList.map((datFile) => manifestEntryFor(datFile.fileSpec));
          const subtreeManifest: ManifestEntry[] = mergeManifests(...descendantManifests, [manifestEntryFor(srcFile.fileSpec)], blobEntries);
          if (depth > 0) {
            this.subtreeManifests.push(subtreeManifest);
          }

          // --- CACHE STORE (for child objects on cache miss) ---
          if (cacheKey !== undefined) {
            const binaryCopy = new Uint8Array(childImage);
            // Build the hit-replay payload. Three pieces, all in the .dbg
            // sidecar (see DebugInfo in objectCache.ts):
            //   1. debug records the child references (when --debug on)
            //   2. brkSite write positions in the binary (when --debug on)
            //   3. subtree exportdef contributions — symbols this child's
            //      descendants pushed onto context.defSymbols during compile.
            //      These need to replay on cache hit so siblings see them.
            //      v1.54.6's specific fix; written regardless of --debug.
            const childBrkSites = this.context.compileOptions.enableDebug ? this.objImage.brkSites : [];
            // Records to capture in the .dbg sidecar are the UNION of:
            //   (a) records added to debug_data during this child's subtree
            //       compile — slice [recordCountAtKey+1 .. recordCountAfter].
            //       This catches grandchild debug records that aren't
            //       referenced by THIS child's brkSites (e.g., stack_check's
            //       records when sd has different debug() content). Without
            //       this slice, a cache hit on sd skips the grandchild
            //       compile, the grandchild's records are never re-added,
            //       and the top-level debug data table comes out shorter
            //       than a fresh compile.
            //   (b) records this child's brkSites reference — captures
            //       cross-sibling-deduped records (e.g. utils.debug() that
            //       dedup'd against sd's record). The bytes are stored so
            //       on cache hit we re-inject and remap origIndex correctly
            //       even if the producing sibling didn't run in this compile.
            const subtreeOrigIndices: number[] = [];
            if (this.context.compileOptions.enableDebug) {
              const recordsAfter = this.spin2Parser.debugRawData.recordCount;
              for (let idx = recordCountAtKey + 1; idx <= recordsAfter; idx++) {
                subtreeOrigIndices.push(idx);
              }
            }
            const brkSiteOrigIndices = childBrkSites.map((s) => s.origIndex);
            const uniqueOrigIndices: number[] = [...new Set([...subtreeOrigIndices, ...brkSiteOrigIndices])].sort((a, b) => a - b);
            const records = uniqueOrigIndices.map((origIndex) => ({
              origIndex,
              bytes: this.spin2Parser.debugRawData.getRecordBytes(origIndex)
            }));
            // Slice defSymbols additions made during this child's subtree
            // compile. The slice covers descendant preprocesses that pushed
            // exportdefs AND any subtree-exports replays from grandchildren
            // that themselves cache-hit during this compile (those replays
            // pushed onto the same shared array, so they're in the slice).
            // Recursive correctness: each cache entry captures its full
            // transitive contribution.
            const subtreeExports = this.context.preProcessorOptions.defSymbols.slice(defSymbolsLengthAtKey);
            const debugInfo: DebugInfo = { records, brkSites: childBrkSites, subtreeExports };
            const metadata: CacheMetadata = {
              source: srcFile.fileName,
              overrides: overrideParameters ? this.serializeOverrides(overrideParameters) : '',
              compilerVersion: this.context.compilerVersion,
              enableDebug: this.context.compileOptions.enableDebug,
              cacheFormatVersion: CACHE_FORMAT_VERSION,
              timestamp: Date.now(),
              binarySize: objectLength,
              symbolCount: childSymbols.length
            };
            // Always store .dbg in v1.54.6+. Its absence on a future hit
            // unambiguously signals corruption (partial write or stale entry
            // that slipped through key-version protection).
            // Relativise this subtree's instances so they can be replanted
            // under a different parent on a later hit.
            const subtreeInstances: CachedInstance[] = this.recordedInstances.slice(instanceMarkAtKey).map((recorded) => ({
              relativeParent: recorded.parentInstanceId === this.currentInstanceId ? -1 : recorded.parentInstanceId - instanceMarkAtKey,
              childPosition: recorded.childPosition,
              sourceFileName: recorded.sourceFileName,
              overrides: recorded.overrides
            }));
            // Capture every descendant's symbols so a later hit can restore
            // what it will not compile. Deduped by source file — several
            // instances of one object share one symbol set.
            const seenDescendants = new Set<string>();
            const subtreeSymbols: CachedSubtreeSymbols[] = [];
            for (const recorded of this.recordedInstances.slice(instanceMarkAtKey)) {
              if (seenDescendants.has(recorded.sourceFileName)) continue;
              seenDescendants.add(recorded.sourceFileName);
              const descendantFile = this.context.sourceFiles.getFile(recorded.sourceFileName);
              if (descendantFile === undefined) continue;
              const descendantIndex = this.context.sourceFiles.getFileIndex(descendantFile);
              const symbols = this.context.objectSymbolStore.getSymbols(descendantIndex);
              if (symbols !== undefined && symbols.length > 0) {
                subtreeSymbols.push({ sourceFileName: recorded.sourceFileName, symbols });
              }
            }
            this.objectCache.set(cacheKey, binaryCopy, {
              metadata,
              symbols: childSymbols,
              debugInfo,
              manifest: subtreeManifest,
              instances: subtreeInstances,
              subtreeSymbols
            });
            if (this.isLoggingOutline)
              this.logMessageOutline(
                `  -- CACHE STORE -- [${srcFile.fileName}], key=${cacheKey.substring(0, 12)}..., ` +
                  `size=${objectLength}, symbols=${childSymbols.length}, ` +
                  `dbgRecords=${records.length}, brkSites=${childBrkSites.length}, subtreeExports=${subtreeExports.length}`
              );
          }
          // --- END CACHE STORE ---

          // Check if binary already exists in list using new method
          const duplicateInfo = this.childImages.findDuplicateChild(childImage);
          let physicalFileIndex: number;

          if (duplicateInfo.exists) {
            // Reuse existing object - this is a duplicate!
            physicalFileIndex = duplicateInfo.fileIndex;
            if (this.isLoggingOutline)
              this.logMessageOutline(
                `  -- REUSE DUPE -- logicalIdx=(${this.globalLogicalIndexCounter}), physicalIdx=(${physicalFileIndex}), objLen=(${objectLength})`
              );
            // Track memory statistics
            this.memoryStats.duplicatesDetected++;
            this.memoryStats.memoryBytesSaved += objectLength;
            const sizeCount = this.memoryStats.duplicatesBySize.get(objectLength) || 0;
            this.memoryStats.duplicatesBySize.set(objectLength, sizeCount + 1);
          } else {
            // Store new object - not a duplicate
            physicalFileIndex = this.objectFileCount;

            // save obj file into memory if a copy doesn't already exist
            // now copy obj data to output
            if (this.objectFileOffset + objectLength > this.obj_limit) {
              throw new Error(`OBJ data exceeds ${this.obj_limit / 1024}k limit (m691)`);
            }
            // Save obj file into memory
            //  move P2.OBJ (this.objImage) into ObjFileBuff (this.childImages)
            this.childImages.setOffset(this.objectFileOffset);
            this.childImages.ensureFits(this.objectFileOffset, objectLength); // throws exception if bad!
            this.childImages.rawUint8Array.set(childImage, this.objectFileOffset);

            this.childImages.recordLengthOffsetForFile(this.objectFileCount, this.objectFileOffset, objectLength);
            this.objectFileOffset += objectLength;
            this.objectFileCount++;
            // DEBUG dump into .obj file for inspection
            //const newObjFileSpec = this.uniqueObjectName(depth, srcFile.dirName, srcFile.fileName, 'Child'); // REMOVE BEFORE FLIGHT
            //dumpUniqueChildObjectFile(this.childImages, this.objectFileOffset, newObjFileSpec, this.context); // REMOVE BEFORE FLIGHT
            if (this.isLoggingOutline)
              this.logMessageOutline(
                `  -- NEW OBJECT -- logicalIdx=(${this.globalLogicalIndexCounter}), physicalIdx=(${physicalFileIndex}), objFiCnt=(${this.objectFileCount}), objLen=(${objectLength}), new objEndOffset=(${this.objectFileOffset})`
              );
          }

          // Map logical index to physical index
          this.globalChildObjectIndexMap.set(this.globalLogicalIndexCounter, physicalFileIndex);
          // Always increment logical index (even for duplicates)
          this.globalLogicalIndexCounter++;
          if (this.isLoggingOutline) this.logMessageOutline(`  -- compRecur(${depth}).compile2 EXIT`);
        }
      }
    }
    if (this.isLoggingOutline)
      this.logMessageOutline(`++ compileRecursly(${depth}, [${srcFile.fileName}]) - EXIT ----------------------------------------`);
    if (this.isLoggingOutline) this.logMessageOutline(``);
  }

  private uniqueObjectName(depth: number, dirSpec: string, filename: string, structId: string): string {
    let uniqCount: number = 1;
    if (this.countByFilename.has(filename)) {
      const fileSeenCount = this.countByFilename.get(filename);
      if (fileSeenCount !== undefined) {
        uniqCount = fileSeenCount + 1;
      }
    }
    this.countByFilename.set(filename, uniqCount);
    const sourceType = path.extname(filename);
    const newFileSpec = path.join(dirSpec, `${structId}-${depth}-${filename}`.replace(sourceType, '.obj'));
    return newFileSpec;
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

  private logCacheStats(): void {
    if (!this.objectCache.isEnabled) return;
    const { hits, misses } = this.objectCache.stats;
    if (hits > 0 || misses > 0) {
      const cacheMsg = `Object cache: ${hits} hit(s), ${misses} miss(es) (${this.objectCache.cachePath})`;
      if (this.isLoggingOutline) {
        this.logMessageOutline(cacheMsg);
      } else {
        this.context.logger.infoMsg(cacheMsg);
      }
    }
  }

  private serializeOverrides(overrides: SymbolTable): string {
    return overrides.allSymbols
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => `${s.name}:${s.type}:${s.value}`)
      .join(',');
  }

  private validateIndexMapping(): void {
    // Validate all index mappings are consistent
    const objectCount = this.childImages.objectFileCount;

    // Check all physical indices are valid
    for (const [logical, physical] of this.globalChildObjectIndexMap) {
      if (physical < 0 || physical >= objectCount) {
        throw new Error(
          `Index mapping error: Logical index ${logical} maps to invalid physical index ${physical} (valid range: 0-${objectCount - 1})`
        );
      }
    }

    // Check for gaps in logical indices
    const logicalIndices = Array.from(this.globalChildObjectIndexMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i < logicalIndices.length; i++) {
      if (logicalIndices[i] !== i) {
        throw new Error(`Index mapping error: Gap detected in logical indices at position ${i}. Expected ${i}, found ${logicalIndices[i]}`);
      }
    }

    // Check that we have mappings for all expected logical indices
    if (logicalIndices.length !== this.globalLogicalIndexCounter) {
      throw new Error(
        `Index mapping error: Mismatch between number of mappings (${logicalIndices.length}) and next logical index (${this.globalLogicalIndexCounter})`
      );
    }

    if (this.isLoggingOutline)
      this.logMessageOutline(`Index mapping validation passed: ${logicalIndices.length} logical indices mapped to ${objectCount} physical objects`);
  }

  private logDuplicationStats(): void {
    // Only log if we have duplicates and outline logging is enabled
    if (this.memoryStats.duplicatesDetected > 0 && this.isLoggingOutline) {
      this.logMessageOutline('');
      this.logMessageOutline('=== Early Object Deduplication Statistics ===');
      this.logMessageOutline(`Total objects compiled: ${this.memoryStats.totalObjectsCompiled}`);
      this.logMessageOutline(`Duplicate objects detected: ${this.memoryStats.duplicatesDetected}`);
      this.logMessageOutline(`Memory saved: ${this.memoryStats.memoryBytesSaved} bytes`);

      const deduplicationRatio = (this.memoryStats.duplicatesDetected / this.memoryStats.totalObjectsCompiled) * 100;
      this.logMessageOutline(`Deduplication ratio: ${deduplicationRatio.toFixed(1)}%`);

      // Log breakdown by object size
      if (this.memoryStats.duplicatesBySize.size > 0) {
        this.logMessageOutline('');
        this.logMessageOutline('Duplicates by size:');
        const sortedSizes = Array.from(this.memoryStats.duplicatesBySize.entries()).sort((a, b) => b[0] - a[0]);
        for (const [size, count] of sortedSizes) {
          const sizeKB = (size / 1024).toFixed(2);
          const savedKB = ((size * count) / 1024).toFixed(2);
          this.logMessageOutline(`  ${sizeKB} KB objects: ${count} duplicates (saved ${savedKB} KB)`);
        }
      }

      this.logMessageOutline('==============================================');
      this.logMessageOutline('');
    }
  }

  /**
   * Build the object instance tree for map generation.
   *
   * Consumes the instances recorded during compilation (see
   * `recordedInstances`) rather than reconstructing the hierarchy from
   * distiller records. The reconstruction was the defect: it had to translate
   * between four different index spaces — distiller record index, distiller
   * objectId, source-file index, and a bitfield packed into the OBJ symbol —
   * and got several of the conversions wrong, silently, in ways that only
   * showed when an object was declared more than once.
   *
   * Two things are still resolved here because they are not known during the
   * descent: the declared instance NAME (which comes from the parent's
   * type_obj symbols) and the distiller RECORD (which does not exist until
   * distillation has run and cannot be captured earlier — elimination splices
   * records out of the list).
   */
  private replayedIndexByName: Map<string, number> = new Map();

  /**
   * Index under which a never-loaded descendant's replayed symbols live.
   *
   * Allocated above the real source-file range so it cannot collide with a
   * loaded file's index. These objects exist in the map — with a name, a size
   * and methods — while never having been opened this run, which is the whole
   * point of a cache hit.
   */
  private indexForReplayedDescendant(sourceFileName: string): number {
    const symbols = this.replayedDescendantSymbols.get(sourceFileName);
    if (symbols === undefined) return -1;
    const existing = this.replayedIndexByName.get(sourceFileName);
    if (existing !== undefined) return existing;
    const index = this.context.sourceFiles.fileCount + this.replayedIndexByName.size;
    this.replayedIndexByName.set(sourceFileName, index);
    this.context.objectSymbolStore.storeSymbols(index, symbols);
    return index;
  }

  private buildObjInstanceInfo(): void {
    this.context.objInstanceStore.clear();
    this.replayedIndexByName.clear();

    const allSymbols = this.context.objectSymbolStore.getAllSymbols();
    const topFile = this.context.sourceFiles.getTopFile();
    const topFileIndex = this.context.sourceFiles.getFileIndex(topFile);

    // The top level is instance -1's child in recording terms: it has no
    // declaring parent and no position in anyone's OBJ block.
    const topInstance = new ObjInstanceInfo(
      topFile.fileName.replace(/\.spin2$/i, ''),
      topFile.fileName,
      topFileIndex,
      -1,
      -1,
      this.context.objInstanceStore.allocateInstanceId()
    );
    this.context.objInstanceStore.addInstance(topInstance);

    // Recorded children. Instance ids run in recording order, and the top
    // level occupies id 0, so a recorded entry's id is its index + 1 and a
    // recorded parentInstanceId of -1 means "declared by the top level".
    for (let recordedIdx = 0; recordedIdx < this.recordedInstances.length; recordedIdx++) {
      const recorded = this.recordedInstances[recordedIdx];
      // Resolve the source file here rather than at record time: replayed
      // subtrees can name files that were not registered yet when recorded.
      const childFile = this.context.sourceFiles.getFile(recorded.sourceFileName);
      const sourceFileName = recorded.sourceFileName;
      const sourceFileIndex =
        childFile !== undefined ? this.context.sourceFiles.getFileIndex(childFile) : this.indexForReplayedDescendant(recorded.sourceFileName);
      const parentInstanceId = recorded.parentInstanceId === -1 ? 0 : recorded.parentInstanceId + 1;

      // Resolve the declared name from the PARENT's symbols. Two corrections
      // over the previous code, both of which produced wrong labels:
      //
      //  - the symbol table is keyed by SOURCE-FILE index, so it must be read
      //    with the parent's source-file index; it was being read with a
      //    distiller record index, which could return another object's symbols
      //    outright.
      //  - a type_obj symbol's value is
      //        ((objFileCount - 1) << 24) | objectInstanceInMemoryCount
      //    (spinResolver.ts). The child's declaration position is in the HIGH
      //    bits; the old code masked `value & 0xffffff`, reading the
      //    instance-in-memory counter — a different quantity entirely — and
      //    comparing it against a position.
      const parentInstance = this.context.objInstanceStore.getInstance(parentInstanceId);
      const parentSymbols = parentInstance ? allSymbols.get(parentInstance.sourceFileIndex) : undefined;
      let instanceName = `child_${recorded.childPosition}`;
      if (parentSymbols !== undefined) {
        for (const sym of parentSymbols) {
          if (sym.type !== eElementType.type_obj) continue;
          const value = typeof sym.value === 'bigint' ? Number(sym.value) : 0;
          if (value >>> 24 === recorded.childPosition) {
            instanceName = sym.name;
            break;
          }
        }
      }

      const instance = new ObjInstanceInfo(
        instanceName,
        sourceFileName,
        sourceFileIndex,
        parentInstanceId,
        recorded.childPosition,
        this.context.objInstanceStore.allocateInstanceId()
      );
      // The Overrides column exists to explain why one source file became
      // several images. It was printed empty for years because nothing ever
      // filled it in.
      for (const override of recorded.overrides) {
        instance.addOverride(override.name, override.value, override.isFloat);
      }
      this.context.objInstanceStore.addInstance(instance);
    }

    this.assignDistillerRecords();

    if (this.isLoggingOutline) this.logMessageOutline(`Built instance info for ${this.context.objInstanceStore.count} instances`);
  }

  /**
   * Attach each instance to the distiller record holding its size and offset.
   *
   * Walked in parallel rather than indexed: the distiller tree and the
   * recorded instance tree have the same SHAPE — each parent's `subObjectIds`
   * lists its children in declaration order, the same order the compiler
   * descended in — so zipping them is well defined even though the record
   * INDICES are not stable (elimination splices records out).
   *
   * Deduplication legitimately points several instances at one record. That is
   * the DAT-singleton case working as intended, and it is exactly what the old
   * object-keyed lookup could not represent.
   */
  private assignDistillerRecords(): void {
    const records = this.spin2Parser.distiller.records;
    const store = this.context.objInstanceStore;

    const walk = (recordIndex: number, instanceId: number): void => {
      const instance = store.getInstance(instanceId);
      if (instance === undefined) return;
      instance.recordIndex = recordIndex;

      const record = records.getRecordAt(recordIndex);
      if (record === undefined) return;

      const children = store.getChildInstances(instanceId);
      const subObjectIds = record.subObjectIds;
      const pairCount = Math.min(children.length, subObjectIds.length);
      for (let position = 0; position < pairCount; position++) {
        const childRecordIndex = records.findRecordIndexByObjectId(subObjectIds[position] & 0x7fffffff);
        if (childRecordIndex >= 0) {
          walk(childRecordIndex, children[position].instanceId);
        }
      }
    };

    walk(0, 0);
  }
}
