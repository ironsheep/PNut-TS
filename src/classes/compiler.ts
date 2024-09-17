// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { Spin2Parser } from './spin2Parser';
import { RegressionReporter } from './regression';
import { DatFile, ObjFile, SpinFiles } from './spinFiles';
import { SymbolTable } from './symbolTable';
import { ChildObjectsImage } from './childObjectsImage';
import { loadFileAsUint8Array, loadUint8ArrayFailed } from '../utils/files';
import { ObjectImage } from './objectImage';
import path from 'path';

// src/classes/compiler.ts

const OBJ_STACK_LIMIT: number = 16;

export class Compiler {
  private context: Context;
  private isLogging: boolean = false;
  private isLoggingOutline: boolean = false;
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

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = ctx.logOptions.logCompile;
    this.isLoggingOutline = ctx.logOptions.logOutline;
    this.spin2Parser = new Spin2Parser(ctx);
    // get references to the single global data
    this.objectData = ctx.compileData.objectData;
    this.datFileData = ctx.compileData.datFileData;
    this.objImage = ctx.compileData.objImage;
    this.spinFiles = ctx.compileData.spinFiles;
    // allocate our local data
    this.childImages = new ChildObjectsImage(ctx, 'childImages');
  }

  public Compile() {
    //logContextState(this.context, 'Compiler');
    this.logMessage(`* Compiler LOGGING is enabled!`);

    this.srcFile = this.context.sourceFiles.getTopFile();
    // TESTING: if requested, run our internal-tables regression report generator
    if (this.context.reportOptions.writeTablesReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.writeTableReport(this.srcFile.dirName, this.srcFile.fileName);
    }

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
        this.spin2Parser.P2List();
        const needFLash: boolean = this.context.compileOptions.writeFlash;
        const ramDownload: boolean = this.context.compileOptions.writeRAM;
        this.spin2Parser.ComposeRam(needFLash, ramDownload);
      } catch (error: unknown) {
        if (error instanceof Error) {
          const sourceFileID: number = this.spin2Parser.failingFileID;
          const srcDocument: SpinDocument | undefined = this.context.sourceFiles.getFileHavingID(sourceFileID);
          const filename: string = srcDocument !== undefined ? srcDocument.fileSpec : this.srcFile.fileSpec;
          const sourceLineNumber: number = this.spin2Parser.sourceLineNumber;
          const compilerErrorText: string = `${filename}:${sourceLineNumber}:error:${error.message}`;
          //this.context.logger.logMessage(`EEEE: About to report:   ${compilerErrorText}`);
          this.context.logger.logMessage(`${compilerErrorText}`);
          //this.context.logger.logMessage(` DBG filename=[${filename}], sourceLineNumber=(${sourceLineNumber}), errTxt=[${compilerErrorText}]`);
          const underTestStatus: boolean = this.context.reportOptions.regressionTesting;
          this.context.logger.compilerErrorMsg(compilerErrorText, underTestStatus);
          //if (error.stack !== undefined && !underTestStatus) {
          //  this.context.logger.errorMsg(error.stack);
          //}
        } else {
          // If it's not an Error object, it could be a string, null, etc.
          this.context.logger.errorMsg(error);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private compileRecursively(depth: number, srcFile: SpinDocument, overrideParameters: SymbolTable | undefined = undefined) {
    this.logMessageOutline(`++ compileRecursively(${depth}, [${srcFile.fileName}]) - ENTRY ---------------------------------------`);
    if (this.spin2Parser !== undefined) {
      if (depth > OBJ_STACK_LIMIT) {
        throw new Error(`Object nesting exceeds ${OBJ_STACK_LIMIT} levels - illegal circular reference may exist`);
      }

      // local variables
      let objectFiles: number = 0; // pascal ObjFiles
      let dataFiles: number = 0; // pascal DatFiles
      const objectCountsPerChild: number[] = [];

      // load source file and perform first pass of compilation
      this.spin2Parser.setSourceFile(srcFile);

      // NOTE TODO: we need to request collapse_debug_data from compile2 if depth = 2
      if (this.context.passOptions.afterPreprocess == false) {
        if (this.context.passOptions.afterElementize == false) {
          this.logMessage(`  -- compRecur(${depth}) - compile1 - pass 1 ----------------------------------------`);
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
              // reuse existing document if present
              let childObjSourceFile = this.context.sourceFiles.getFile(fileSpec);
              if (childObjSourceFile === undefined) {
                childObjSourceFile = new SpinDocument(this.context, fileSpec);
                this.context.sourceFiles.addFile(childObjSourceFile);
              }
              objFile.setSpinSourceFileId(childObjSourceFile.fileId);
              const overrideSymbolTable: SymbolTable | undefined = objFile.parameterSymbolTable;
              this.compileRecursively(depth + 1, childObjSourceFile, overrideSymbolTable);
              // get sub-object's obj file index
              this.logMessageOutline(
                `  -- push [objectCountsPerChild] depth(${depth}) entry[${objectCountsPerChild.length}] = fileIndex=[${this.objectFileCount - 1}] file=[${path.basename(fileSpec)}]`
              );
              objectCountsPerChild.push(this.objectFileCount - 1);
            }
          }

          this.logMessageOutline(`  -- compRecur(${depth}) - compile1 - pass 2 ----------------------------------------`);
          this.spin2Parser.setSourceFile(srcFile);
          this.spin2Parser.P2Compile1(overrideParameters);
          //
          // load sub-objects' .obj files
          //  move  ObjFileBuff (this.childImages) into P2.ObjData (this.objectData)
          this.logMessageOutline(`* compRecur(${depth}) processing ${objectFiles} OBJ file(s)`);
          if (objectFiles > 0) {
            let objDataOffset: number = 0; // pascal p
            this.objectData.clear();
            for (let childIdx = 0; childIdx < objectFiles; childIdx++) {
              const fileIdx = objectCountsPerChild[childIdx]; // pascal j
              // pascal inline       s
              const [objOffset, objLength] = this.childImages.getOffsetAndLengthForFile(fileIdx);
              this.logMessageOutline(
                `  -- compRecur(${depth}) obj loop childIdx=(${childIdx}), fileIdx=(${fileIdx}), objOffset=(${objOffset}), objLength=(${objLength})`
              );
              this.childImages.setOffset(objOffset); // set read start
              this.objectData.setOffset(objDataOffset); // set write start
              for (let byteCount = 0; byteCount < objLength; byteCount++) {
                this.objectData.write(this.childImages.read());
              }
              this.objectData.recordLengthOffsetForFile(fileIdx, objDataOffset, objLength);
              objDataOffset += objLength;
              // DEBUG dump into .obj file for inspection
              //const newObjFileSpec = this.uniqueObjectName(depth, srcFile.dirName, srcFile.fileName, 'Data'); // REMOVE BEFORE FLIGHT
              //dumpUniqueChildObjectFile(this.objectData, objDataOffset, newObjFileSpec, this.context); // REMOVE BEFORE FLIGHT
              // DEBUG dump object records for inspection
              this.logMessageOutline(`* - -------------------------------`);
              for (let objFileIndex = 0; objFileIndex < this.objectData.objectFileCount; objFileIndex++) {
                const [objOffset, objLength] = this.objectData.getOffsetAndLengthForFile(objFileIndex);
                this.logMessageOutline(`  -- compObjSyms() fileIdx=[${objFileIndex}], objOffset=(${objOffset}), objLength(${objLength})`);
              }
              this.logMessageOutline(`* - -------------------------------`);
            }
          }
          //
          // load any data files
          this.logMessageOutline(`* compRecur(${depth}) processing ${dataFiles} DAT file(s)`);
          if (dataFiles > 0) {
            let fileDataOffset: number = 0; // pascal p
            //const datFileList: DatFile[] = this.spinFiles.datFiles;
            this.logMessageOutline(`++ DAT FILE Compiler have (${dataFiles}) data files listLen=(${datFileList.length})`);
            for (let datFileIdx = 0; datFileIdx < datFileList.length; datFileIdx++) {
              this.datFileData.setOffset(fileDataOffset); // set write start
              const datFile: DatFile = datFileList[datFileIdx];
              const datImage: Uint8Array = loadFileAsUint8Array(datFile.fileSpec, this.context);
              const filename: string = path.basename(datFile.fileSpec);
              const failedToLoad: boolean = loadUint8ArrayFailed(datImage) ? true : false;
              if (failedToLoad == false) {
                this.logMessageOutline(
                  `++ DAT FILE Compiler [dfd=${this.datFileData.id}]  [${filename}], idx=(${datFileIdx}) len=(${datImage.length})`
                );
                for (let byteIndex = 0; byteIndex < datImage.length; byteIndex++) {
                  this.datFileData.write(datImage[byteIndex]);
                }
                this.datFileData.recordLengthOffsetForFilename(filename, fileDataOffset, datImage.length);
                fileDataOffset += datImage.length;
              }
            }
          }
          //
          // perform second pass of compilation
          this.logMessageOutline(`  -- compRecur(${depth}).compile2 ENTRY`);
          this.spin2Parser.P2Compile2(depth == 0); // NOTE: if at zero  (see above note...)

          // now copy obj data to output
          const objectLength: number = this.objImage.offset;
          if (this.objectFileOffset + objectLength > ChildObjectsImage.MAX_SIZE_IN_BYTES) {
            throw new Error(`OBJ data exceeds ${ChildObjectsImage.MAX_SIZE_IN_BYTES / 1024}k limit`);
          }
          // Save obj file into memory
          //  move P2.OBJ (this.objImage) into ObjFileBuff (this.childImages)
          this.childImages.setOffset(this.objectFileOffset);
          this.objImage.setOffsetTo(0);
          for (let index = 0; index < objectLength; index++) {
            this.childImages.write(this.objImage.readNext());
          }
          this.childImages.recordLengthOffsetForFile(this.objectFileCount, this.objectFileOffset, objectLength);
          this.objectFileOffset += objectLength;
          this.objectFileCount++;
          // DEBUG dump into .obj file for inspection
          //const newObjFileSpec = this.uniqueObjectName(depth, srcFile.dirName, srcFile.fileName, 'Child'); // REMOVE BEFORE FLIGHT
          //dumpUniqueChildObjectFile(this.childImages, this.objectFileOffset, newObjFileSpec, this.context); // REMOVE BEFORE FLIGHT
          this.logMessageOutline(`  -- objFiCnt=(${this.objectFileCount}), objLen=(${objectLength}), new objEndOffset=(${this.objectFileOffset})`);
          this.logMessageOutline(`  -- compRecur(${depth}).compile2 EXIT`);
        }
      }
    }
    this.logMessageOutline(`++ compileRecursively(${depth}, [${srcFile.fileName}]) - EXIT ----------------------------------------`);
    this.logMessageOutline(``);
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
}
