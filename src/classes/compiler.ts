// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { PreprocessorError, SpinDocument } from './spinDocument';
import { Spin2Parser } from './spin2Parser';
import { RegressionReporter } from './regression';
import { DatFile, ObjFile, SpinFiles } from './spinFiles';
import { SymbolTable } from './symbolTable';
import { ChildObjectsImage } from './childObjectsImage';
import { loadFileAsUint8Array, loadUint8ArrayFailed } from '../utils/files';
import { ObjectImage } from './objectImage';
import path from 'path';
import { OBJ_LIMIT } from './spinResolver';
import { DuplicateSourceWatch } from '../utils/duplicateSources';
import { eElementType } from './types';
import fs from 'fs';
import {
  CACHE_FORMAT_VERSION,
  CachedInstance,
  CachedOverride,
  CachedVariant,
  CacheMetadata,
  DebugInfo,
  ManifestEntry,
  ObjectCache,
  manifestEntryFor,
  mergeManifests,
  patchBrkSite,
  recomputeChildChecksum,
  serializeSymbols
} from './objectCache';
import {
  CompiledVariant,
  LayoutBuildInput,
  RecordedDeclaration,
  buildObjectLayout,
  layoutInputToJson,
  layoutToJson,
  recordedTreeFrom
} from './objectLayout';

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
    this.topVariant = undefined;
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
      // `type` is the numeric enum; a string test on it was never true, so
      // every float override was recorded as an integer.
      isFloat: symbol.type === eElementType.type_con_float
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

    // if we have a valid file then let's parse it and generate code
    if (this.srcFile.validFile) {
      // here we make calls to the P2* methods (e.g., this.spin2Parser.P2Compile1(), , etc.)
      try {
        // TESTING: if requested, run our resolver regression test report generator.
        // Inside the try so a write failure (e.g. an unwritable output directory)
        // is reported the same way as every other compile-phase failure below,
        // rather than propagating uncaught back to the CLI's outer catch, which
        // logs nothing (see pnut-ts.ts: "Error already logged by Compiler.Compile()").
        if (this.context.reportOptions.writeResolverReport) {
          const reporter: RegressionReporter = new RegressionReporter(this.context);
          reporter.runResolverRegression(this.srcFile.dirName, this.srcFile.fileName);
        }
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

        // Build the object layout from the final image, before anything moves it
        this.buildObjectLayoutWhenWanted();

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
   * Debug records contributed by each child that has finished compiling (or
   * cache-hit) at the current recursion level, in THIS compile's index space.
   *
   * Exists because a count delta cannot see a record an earlier sibling
   * already contributed. `injectRecord` deduplicates: it returns the existing
   * index and does not grow the table when a matching record is already
   * present. So `[recordCountAtKey+1 .. recordCountAfter]` captures only the
   * records a subtree added that nothing before it had added — which makes the
   * stored payload a function of COMPILE ORDER, while the key is a function of
   * content alone. One key, two payloads; whichever compile ran first wins.
   *
   * Measured (REF-CACHE-BUG/findings-260830, reported by the P2-uSD-FAT32-FS
   * project): compiling a program that declares the SD driver at depth 1 and
   * again under `isp_rt_utilities` stored the utils entry with 45 records;
   * compiling the same object cold stored the same key with 50. The five
   * missing ones belonged to a depth-3 grandchild whose records the depth-1
   * sibling had already contributed. A later build that hit that entry emitted
   * a binary 221 bytes short, and because dropping records renumbers the whole
   * debug table, the emitted code of UNRELATED objects changed too.
   *
   * Accumulating the real record sets instead makes the payload
   * order-independent, which is what the key already assumes it is.
   */
  private subtreeDebugRecords: { origIndex: number; bytes: Uint8Array }[][] = [];

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
  private recordedInstances: RecordedDeclaration[] = [];
  private currentInstanceId: number = -1;

  /** What the top object's compile produced (the top is never cached). */
  private topVariant: CompiledVariant | undefined = undefined;

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
      // Mark where this child's descendants will push their debug records. The
      // store path splices exactly this subtree's contribution back off and
      // folds it in, the same way manifests fold. See subtreeDebugRecords.
      const debugRecordMarkAtKey: number = this.subtreeDebugRecords.length;
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

          // The .sym sidecar carries the object-layout payload: what this
          // child's compile and every descendant's compile produced, and the
          // instance subtree. Required on every hit, map or not: a parent that
          // compiles above this hit stores its own entry from what is replayed
          // here, so skipping the replay in a build without -m stored an
          // incomplete subtree that a later -m build then served.
          const layoutPayload = this.objectCache.getLayoutPayload(cacheKey);
          if (layoutPayload === undefined) {
            throw new Error(
              `Object cache: missing or invalid .sym sidecar for [${srcFile.fileName}] (key=${cacheKey.substring(0, 12)}...). ` +
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
            // Hand this subtree's records up to the declaring parent, rebased
            // into THIS compile's index space. A hit returns before any
            // descendant compiles, so these records are the only evidence the
            // parent will ever get that its subtree references them — and
            // injectRecord may have deduplicated them against records already
            // in the table, in which case the parent's own count delta sees
            // nothing. That is the defect this accumulator exists to close;
            // see subtreeDebugRecords.
            const replayedRecords: { origIndex: number; bytes: Uint8Array }[] = [];
            for (const record of cachedDebugInfo.records) {
              const newIndex = this.spin2Parser.debugRawData.injectRecord(record.bytes);
              indexRemap.set(record.origIndex, newIndex);
              replayedRecords.push({ origIndex: newIndex, bytes: record.bytes });
            }
            this.subtreeDebugRecords.push(replayedRecords);
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
            // Same as the miss path, but these sites have ALREADY been patched
            // in cachedBinary to this compile's indices — so what travels up is
            // where the parent must look, not what it must write.
            this.childImages.recordBrkSitesForFile(this.objectFileCount, this.context.compileOptions.enableDebug ? cachedDebugInfo.brkSites : []);
            this.objectFileOffset += cachedBinary.length;
            this.objectFileCount++;
          }

          // This child's own compiled variant, as its compile would have
          // recorded it.
          this.recordedInstances[this.currentInstanceId].variant = this.compiledVariantFromCache(layoutPayload.own);

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
          {
            const subtreeBase = this.recordedInstances.length;
            const replayedVariants = layoutPayload.variants.map((variant) => this.compiledVariantFromCache(variant));
            for (const cached of layoutPayload.instances) {
              // Names, not indices, and resolved later: a replayed subtree
              // can name a file that has not been registered yet, because
              // this hit is what skipped loading it.
              this.recordedInstances.push({
                parentInstanceId: cached.relativeParent === -1 ? this.currentInstanceId : subtreeBase + cached.relativeParent,
                childPosition: cached.childPosition,
                sourceFileName: cached.sourceFileName,
                overrides: cached.overrides,
                elementCount: cached.elementCount,
                isArray: cached.isArray,
                variant: replayedVariants[cached.variant]
              });
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
                sourceFileName: childObjSourceFile.fileName,
                elementCount: objFile.instanceCount,
                isArray: objFile.isArray,
                variant: undefined
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
              // Re-key the sites from physical file index to this parent's child
              // position, which is the index compile_obj_blocks walks.
              this.objectData.recordBrkSitesForFile(childIdx, this.childImages.getBrkSitesForFile(physicalFileIdx));
              objDataOffset += objLength;
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

          const childSymbols = this.spin2Parser.getUserSymbolTable();
          // What THIS compile produced, attached to the declaration that caused
          // it — not to the source file, which a later compile of the same file
          // with other overrides would overwrite.
          const compiledVariant: CompiledVariant = {
            sourceFileName: srcFile.fileName,
            symbols: childSymbols,
            varSizes: this.spin2Parser.getVarSymbolSizes(),
            ownVarBytes: this.spin2Parser.getOwnVarBytes()
          };
          if (depth === 0) {
            this.topVariant = compiledVariant;
          } else {
            this.recordedInstances[this.currentInstanceId].variant = compiledVariant;
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
          // Spliced unconditionally, exactly like the manifests above: leaving
          // a descendant's contribution on the accumulator would fold it into
          // the NEXT sibling's entry as well.
          const descendantDebugRecords = this.subtreeDebugRecords.splice(debugRecordMarkAtKey).flat();
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
            //   (c) records every DESCENDANT reported contributing, rebased
            //       into this compile's index space. This is the piece the
            //       count delta in (a) structurally cannot supply: a record an
            //       earlier sibling already added does not grow the table when
            //       this subtree injects it, so (a) is empty for exactly the
            //       records that matter. Without (c) the payload stored under a
            //       content-addressed key depends on compile ORDER.
            const descendantOrigIndices = descendantDebugRecords.map((r) => r.origIndex);
            const uniqueOrigIndices: number[] = [...new Set([...subtreeOrigIndices, ...brkSiteOrigIndices, ...descendantOrigIndices])].sort(
              (a, b) => a - b
            );
            const records = uniqueOrigIndices.map((origIndex) => ({
              origIndex,
              bytes: this.spin2Parser.debugRawData.getRecordBytes(origIndex)
            }));
            // Hand this subtree's complete set up to the declaring parent, so
            // the fold is recursive the way the manifest fold is.
            if (depth > 0) {
              this.subtreeDebugRecords.push(records.map((r) => ({ origIndex: r.origIndex, bytes: r.bytes })));
            }
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
            // Each descendant carries the variant ITS compile (or replay)
            // produced, so a later hit restores every fork with its own
            // symbols. Variants are deduplicated by content: identical compiles
            // of one object store one copy.
            const variants: CachedVariant[] = [];
            const variantIndexByContent = new Map<string, number>();
            const subtreeInstances: CachedInstance[] = this.recordedInstances.slice(instanceMarkAtKey).map((recorded, offset) => {
              if (recorded.variant === undefined) {
                throw new Error(
                  `Internal error: ObjectLayout: recorded declaration ${instanceMarkAtKey + offset} (${recorded.sourceFileName}) has no compiled variant at cache store`
                );
              }
              const cachedVariant: CachedVariant = {
                sourceFileName: recorded.variant.sourceFileName,
                symbols: recorded.variant.symbols,
                varSizes: [...recorded.variant.varSizes.entries()],
                ownVarBytes: recorded.variant.ownVarBytes
              };
              const content = JSON.stringify([
                cachedVariant.sourceFileName,
                serializeSymbols(cachedVariant.symbols),
                cachedVariant.varSizes,
                cachedVariant.ownVarBytes
              ]);
              let variantIndex = variantIndexByContent.get(content);
              if (variantIndex === undefined) {
                variantIndex = variants.length;
                variants.push(cachedVariant);
                variantIndexByContent.set(content, variantIndex);
              }
              return {
                relativeParent: recorded.parentInstanceId === this.currentInstanceId ? -1 : recorded.parentInstanceId - instanceMarkAtKey,
                childPosition: recorded.childPosition,
                sourceFileName: recorded.sourceFileName,
                overrides: recorded.overrides,
                elementCount: recorded.elementCount,
                isArray: recorded.isArray,
                variant: variantIndex
              };
            });
            this.objectCache.set(cacheKey, binaryCopy, {
              metadata,
              symbols: childSymbols,
              ownVar: {
                sourceFileName: srcFile.fileName,
                varSizes: [...compiledVariant.varSizes.entries()],
                ownVarBytes: compiledVariant.ownVarBytes
              },
              debugInfo,
              manifest: subtreeManifest,
              instances: subtreeInstances,
              variants
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
            // Carry this child's brkSites alongside its bytes. compile_obj_blocks
            // copies the bytes into the declaring parent's image; without the
            // sites travelling too, the parent's cache entry describes a binary
            // whose descendants' brkCodes it cannot patch on replay (§17).
            this.childImages.recordBrkSitesForFile(this.objectFileCount, this.context.compileOptions.enableDebug ? this.objImage.brkSites : []);
            this.objectFileOffset += objectLength;
            this.objectFileCount++;
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

  /** A cached variant in the form the compile records. */
  private compiledVariantFromCache(cached: CachedVariant): CompiledVariant {
    return {
      sourceFileName: cached.sourceFileName,
      symbols: cached.symbols,
      varSizes: new Map(cached.varSizes),
      ownVarBytes: cached.ownVarBytes
    };
  }

  /**
   * Build the object layout when a map is being written.
   *
   * `PNUT_TS_LAYOUT_JSON` (undocumented, for the test suite) also builds it and
   * writes the builder's input and the resulting layout, as JSON, to that path.
   */
  private buildObjectLayoutWhenWanted(): void {
    this.context.objectLayout = undefined;
    const dumpPath = process.env.PNUT_TS_LAYOUT_JSON;
    if (!this.context.compileOptions.writeMapFile && !dumpPath) {
      return;
    }
    const finalImage = this.spin2Parser.finalImageForLayout();
    const topFile = this.context.sourceFiles.getTopFile();
    const input: LayoutBuildInput = {
      kind: finalImage.kind,
      image: finalImage.image,
      varBytes: finalImage.varBytes,
      hubLoadBase: this.spin2Parser.hubLoadBase(),
      top: recordedTreeFrom(topFile.fileName, this.topVariant, this.recordedInstances)
    };
    const layout = buildObjectLayout(input);
    this.context.objectLayout = layout;
    if (dumpPath) {
      fs.writeFileSync(dumpPath, JSON.stringify({ input: layoutInputToJson(input), layout: layoutToJson(layout) }));
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
}
