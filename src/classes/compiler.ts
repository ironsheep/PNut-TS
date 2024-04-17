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

// src/classes/compiler.ts

const OBJ_STACK_LIMIT: number = 16;

export class Compiler {
  private context: Context;
  private isLogging: boolean = false;
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

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = ctx.logOptions.logCompile;
    this.spin2Parser = new Spin2Parser(ctx);
    // get refereces to the single global data
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
          this.context.logger.logMessage(`EEEE: About to report: ${error.message}`);
          const filename: string = this.srcFile.fileName;
          const sourceLineNumber: number = this.spin2Parser.sourceLineNumber;
          this.context.logger.compilerErrorMsg(`${filename}:${sourceLineNumber}:error:${error.message}`);
          if (error.stack) {
            this.context.logger.errorMsg(error.stack);
          }
        } else {
          // If it's not an Error object, it could be a string, null, etc.
          this.context.logger.errorMsg(error);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private compileRecursively(depth: number, srcFile: SpinDocument, overrideParameters: SymbolTable | undefined = undefined) {
    this.logMessage(`* compileRecursively(${depth}, [${srcFile.fileName}]) - ENTRY ----------------------------------------`);
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
              const childObjSourceFile = new SpinDocument(this.context, fileSpec);
              this.context.sourceFiles.addFile(childObjSourceFile);
              objFile.setSpinSourceFileId(childObjSourceFile.fileId);
              const overrideSymbolTable: SymbolTable | undefined = objFile.parameterSymbolTable;
              this.compileRecursively(depth + 1, childObjSourceFile, overrideSymbolTable);
              // get sub-object's obj file index
              objectCountsPerChild.push(this.objectFileCount - 1);
            }
          }

          this.logMessage(`  -- compRecur(${depth}) - compile1 - pass 2 ----------------------------------------`);
          this.spin2Parser.setSourceFile(srcFile);
          this.spin2Parser.P2Compile1(overrideParameters);
          //
          // load sub-objects' .obj files
          this.logMessage(`* compRecur(${depth}) processing ${objectFiles} OBJ file(s)`);
          if (objectFiles > 0) {
            let objDataOffset: number = 0; // pascal p
            for (let childIdx = 0; childIdx < objectFiles; childIdx++) {
              const fileIdx = objectCountsPerChild[childIdx]; // pascal j
              // pascal inline       s
              const [objOffset, objLength] = this.childImages.getOffsetAndLengthForFile(fileIdx);
              this.logMessage(
                `  -- compRecur(${depth}) obj loop childIdx=(${childIdx}), fileIdx=(${fileIdx}), objOffset=(${objOffset}), objLength=(${objLength})`
              );
              this.childImages.setOffset(objOffset); // set read start
              this.objectData.setOffset(objDataOffset); // set write start
              for (let byteCount = 0; byteCount < objLength; byteCount++) {
                this.objectData.write(this.childImages.read());
              }
              this.objectData.recordLengthOffsetForFile(fileIdx, objDataOffset, objLength);
              objDataOffset += objLength;
            }
          }
          //
          // load any data files
          this.logMessage(`* compRecur(${depth}) processing ${dataFiles} DAT file(s)`);
          if (dataFiles > 0) {
            let fileDataOffset: number = 0; // pascal p
            //const datFileList: DatFile[] = this.spinFiles.datFiles;
            for (let datFileIdx = 0; datFileIdx < datFileList.length; datFileIdx++) {
              this.datFileData.setOffset(fileDataOffset); // set write start
              const datFile: DatFile = datFileList[datFileIdx];
              const datImage: Uint8Array = loadFileAsUint8Array(datFile.fileSpec, this.context);
              const failedToLoad: boolean = loadUint8ArrayFailed(datImage) ? true : false;
              if (failedToLoad == false) {
                this.logMessage(`  -- DatFile idx=(${datFileIdx}) len=(${datImage.length}) `);
                for (let byteIndex = 0; byteIndex < datImage.length; byteIndex++) {
                  this.datFileData.write(datImage[byteIndex]);
                }
                this.datFileData.recordLengthOffsetForFile(datFileIdx, fileDataOffset, datImage.length);
                fileDataOffset += datImage.length;
              }
            }
          }
          //
          // perform second pass of compilation
          this.logMessage(`  -- compRecur(${depth}) - compile2 ----------------------------------------`);
          this.spin2Parser.P2Compile2(); // NOTE: if at zero  (see above note...)

          // now copy obj data to ourput
          const objectLength: number = this.objImage.offset;
          if (this.objectFileOffset + objectLength > ChildObjectsImage.MAX_SIZE_IN_BYTES) {
            throw new Error(`OBJ data exceeds ${ChildObjectsImage.MAX_SIZE_IN_BYTES / 1024}k limit`);
          }
          this.childImages.setOffset(this.objectFileOffset);
          this.objImage.setOffsetTo(0);
          for (let index = 0; index < objectLength; index++) {
            this.childImages.write(this.objImage.readNext());
          }
          this.childImages.recordLengthOffsetForFile(this.objectFileCount, this.objectFileOffset, objectLength);
          this.objectFileOffset += objectLength;
          this.objectFileCount++;
        }
      }
    }
    this.logMessage(`* compileRecursively(${depth}) - EXIT ----------------------------------------`);
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
