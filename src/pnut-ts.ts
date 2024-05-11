#!/usr/bin/env node
/* eslint-disable no-console */
/** @format */

// src/pnut-ts.ts
'use strict';
import { Command, Option, CommanderError, type OptionValues } from 'commander';
import { Context } from './utils/context';
import { Compiler } from './classes/compiler';
import { SpinDocument } from './classes/spinDocument';
//import { UsbSerial } from './utils/usb.serial';

// NOTEs re-stdio in js/ts
// REF https://blog.logrocket.com/using-stdout-stdin-stderr-node-js/

// expose our installation path
// REF: https://stackoverflow.com/questions/32944714/best-way-to-find-the-location-of-a-specific-file-within-a-node-dependency
// can then get by:
//  var assets = require('foo');
//  fs.readFile(assets.root + '/bar.png', function(){/*whatever*/});
export const root: string = __dirname;

export class PNutInTypeScript {
  private readonly program = new Command();
  private options: OptionValues = this.program.opts();
  private version: string = '0.0.1';
  private argsArray: string[] = [];
  private context: Context;
  private spinDocument: SpinDocument | undefined = undefined;
  private shouldAbort: boolean = false;
  private requiresFilename: boolean = false;

  constructor() {
    process.stdout.on('error', (error: Error) => {
      console.error(`PNut-TS: An error occurred on stdout: "${error.message}", Aborting.`);
      process.exit(1);
    });

    process.stderr.on('error', (error: Error) => {
      console.error(`PNut-TS: An error occurred on stderr: "${error.message}", Aborting.`);
      process.exit(1);
    });
    process.stdout.on('close', () => {
      console.log('PNut-TS: stdout was closed');
    });

    process.stderr.on('close', () => {
      console.log('PNut-TS: stderr was closed');
    });
    this.context = Context.instance();
  }

  public setArgs(args: string[]): void {
    this.argsArray = args;
  }

  public run(): number {
    this.program
      .configureOutput({
        // Visibly override write routines as example!
        writeOut: (str) => process.stdout.write(this.prefixName(str)),
        writeErr: (str) => process.stdout.write(this.prefixName(str)),
        // Highlight errors in color.
        outputError: (str, write) => write(this.errorColor(str))
      })
      .name('pnut-ts')
      .version(`v${this.version}`, '-V, --version', 'Output the version number')
      .usage('[optons] filename')
      .description(`Propeller Spin2 compiler/downloader - v${this.version}`)
      .arguments('[filename]')
      .action((filename) => {
        this.options.filename = filename;
      })
      .option('-b, --both', 'Compile with DEBUG, download to FLASH and run')
      .option('-c, --compile', 'Compile file')
      .option('-d, --debug', 'Compile with DEBUG')
      .option('-f, --flash', 'Download to FLASH and run')
      .option('-r, --ram', 'Download to RAM and run')
      .option('-l, --list', 'Generate listing files (.lst) from compilation')
      .option('-p, --plug <dvcNode>', 'download to/flash Propeller attached to <dvcNode>')
      .option('-n, --dvcnodes', 'List available USB PropPlug device (n)odes')
      .option('-O, --obj', 'Generate object files (.obj) from compilation')
      .option('-B, --bin', 'Generate binrnary files (.bin) suitable for download')
      .option('-o, --output <name>', 'Specify output file basename')
      .option('-i, --interface', 'Generate interface document files (.txt) during compilation')
      .option('-I, --Include <dir...>', 'Add preprocessor include directories')
      .option('-U, --Undefine <symbol...>', 'Undefine (remove) preprocessor symbol(s)')
      .option('-D, --Define <symbol...>', 'Define (add) preprocessor symbol(s)')
      .addOption(new Option('--log <objectName...>', 'objectName').choices(['all', 'compiler', 'elementizer', 'parser', 'preproc', 'resolver']))
      .addOption(new Option('--regression <testName...>', 'testName').choices(['element', 'tables', 'resolver', 'preproc']))
      .addOption(new Option('--pass <passName...>', 'Stop after passName').choices(['preprocess', 'elementize', 'con-block']))
      .option('-v, --verbose', 'Output verbose messages');

    this.program.addHelpText('beforeAll', `$-`);

    this.program.addHelpText(
      'afterAll',
      `$-
      Example:
         $ pnut-ts -c my-top-level.spin2         # compile leaving .binary
         $ pnut-ts -c -l my-top-level.spin2      # compile file leaving .binary and .lst files
         $ pnut-ts -c -d -r my-top-level.spin2   # compile file with Debug and run from RAM
         $ pnut-ts -cf my-top-level.spin2        # compile file without Debug download to FLASH and run
         `
    );

    //this.program.showHelpAfterError('(add --help for additional information)');

    this.program.exitOverride(); // throw instead of exit

    this.context.logger.setProgramName(this.program.name());
    //this.context.logger.progressMsg(`after setting name`);
    try {
      this.program.parse();
    } catch (error: unknown) {
      if (error instanceof CommanderError) {
        //this.context.logger.logMessage(`Error: name=[${error.name}], message=[${error.message}]`);
        if (error.name === 'CommanderError') {
          this.context.logger.logMessage(``); // our blank line so prompt is not too close after output
          //this.context.logger.logMessage(`  xyzxzy `);
          if (error.message !== '(outputHelp)') {
            this.context.logger.logMessage(`  (See --help for available options)\n`);
            //this.program.outputHelp();
          }
        } else {
          if (error.name != 'oe' && error.message != 'outputHelp') {
            this.context.logger.logMessage(`Catch name=[${error.name}], message=[${error.message}]`);
          }
        }
      } else {
        this.context.logger.logMessage(`Catch unknown error=[${error}]`);
      }
    }
    //this.context.logger.progressMsg(`after parse()`);

    this.options = { ...this.options, ...this.program.opts() };

    if (this.options.verbose) {
      this.context.logger.enabledVerbose();
    }

    if (this.options.list) {
      this.context.compileOptions.writeListing = true;
    }

    if (this.options.bin) {
      this.context.compileOptions.writeBin = true;
    }

    if (this.options.obj) {
      this.context.compileOptions.writeObj = true;
    }

    if (this.options.dvcnodes) {
      //this.loadUsbPortsFound();
      for (let index = 0; index < this.context.runEnvironment.serialPortDevices.length; index++) {
        const dvcNode = this.context.runEnvironment.serialPortDevices[index];
        this.context.logger.progressMsg(` USB #${index + 1} [${dvcNode}]`);
      }
      if (this.context.runEnvironment.serialPortDevices.length == 0) {
        this.context.logger.progressMsg(` USB  - no Serial Ports Found!`);
      }
    }

    if (this.options.plug) {
      this.context.compileOptions.propPlug = this.options.plug;
      this.context.logger.verboseMsg(`* using USB [${this.context.compileOptions.propPlug}]`);
    }

    // REMOVE BEFORE FLIGHT: DO NOT release with the following uncommented
    //this.runTestCode(); // for quick live testing...

    this.context.logger.verboseMsg(`* opts[${this.program.opts()}]`);
    this.context.logger.verboseMsg(`* args[${this.program.args}]`);

    if (this.options.regression) {
      // forward our REGRESSION TEST Options
      this.requiresFilename = true;
      const choices: string[] = this.options.regression;
      this.context.logger.verboseMsg('MODE: Regression Testing- Gen Reports:');
      if (choices.includes('element')) {
        this.context.reportOptions.writeElementsReport = true;
        this.context.logger.verboseMsg('  Element Report');
      }
      if (choices.includes('tables')) {
        this.context.reportOptions.writeTablesReport = true;
        this.context.logger.verboseMsg('  Tables Report');
      }
      if (choices.includes('preproc')) {
        this.context.reportOptions.writePreprocessReport = true;
        this.context.logger.verboseMsg('  preProcessor Report');
      }
      if (choices.includes('resolver')) {
        this.context.reportOptions.writeResolverReport = true;
        this.context.logger.verboseMsg('  resolver Report');
      }
    }

    if (this.options.log) {
      // forward our LOG Options
      this.requiresFilename = true;
      const choices: string[] = this.options.log;
      this.context.logger.verboseMsg('MODE: Logging:');
      //this.context.logger.verboseMsg(`* log: [${choices}]`);
      const wantsAll: boolean = choices.includes('all');
      if (choices.includes('elementizer') || wantsAll) {
        this.context.logOptions.logElementizer = true;
        this.context.logger.verboseMsg('  Elementizer');
      }
      if (choices.includes('parser') || wantsAll) {
        this.context.logOptions.logParser = true;
        this.context.logger.verboseMsg('  Parser');
      }
      if (choices.includes('compiler') || wantsAll) {
        this.context.logOptions.logCompile = true;
        this.context.logger.verboseMsg('  Compile');
      }
      if (choices.includes('resolver') || wantsAll) {
        this.context.logOptions.logResolver = true;
        this.context.logger.verboseMsg('  Resolver');
      }
      if (choices.includes('preproc')) {
        this.context.logOptions.logPreprocessor = true;
        this.context.logger.verboseMsg('  PreProcessor');
      }
    }

    if (this.options.pass) {
      // forward our PASS Options (stop after pass)
      this.requiresFilename = true;
      const choices: string[] = this.options.pass;
      this.context.logger.verboseMsg('MODE: End after:');
      if (choices.includes('preprocess')) {
        this.context.passOptions.afterPreprocess = true;
        this.context.logger.verboseMsg('  PreProcessing');
      }
      if (choices.includes('elementize')) {
        this.context.passOptions.afterElementize = true;
        this.context.logger.verboseMsg('  Elementizer');
      }
      if (choices.includes('con-block')) {
        this.context.passOptions.afterConBlock = true;
        this.context.logger.verboseMsg('  ConBlocks');
      }
    }

    if (this.options.output) {
      // forward our Output Filename
      const outFilename = this.options.output;
      this.context.compileOptions.outputFilename = outFilename;
      this.context.logger.verboseMsg(`* Override output filename, now [${outFilename}]`);
    }

    if (this.options.both) {
      this.context.logger.verboseMsg('have BOTH: enabling FLASH and DEBUG');
      this.options.debug = true;
      this.options.flash = true;
      this.options.ram = false;
    }

    if (this.options.debug) {
      this.context.logger.progressMsg('Compiling with DEBUG');
      this.context.compileOptions.enableDebug = true;
      this.requiresFilename = true;
    }

    if (this.options.flash) {
      this.context.logger.progressMsg('Downloading to FLASH');
      this.context.compileOptions.writeFlash = true;
      this.requiresFilename = true;
    }

    if (this.options.ram) {
      this.context.logger.progressMsg('Downloading to RAM');
      this.context.compileOptions.writeRAM = true;
      this.requiresFilename = true;
    }

    if (this.options.ram && this.options.flash) {
      //this.program.error('Please only use one of -f and -r');
      this.context.logger.errorMsg('Please only use one of -f and -r');
      this.shouldAbort = true;
    }

    if (this.options.compile) {
      this.requiresFilename = true;
    }

    if (this.options.Include) {
      // forward  Include Folder name(s)
      const includeDirs: string[] = this.options.Include;
      for (const newFolder of includeDirs) {
        this.context.preProcessorOptions.includeFolders.push(newFolder);
      }
    }

    if (this.options.Define) {
      // forward  Defined Symbol(s)
      this.context.logger.verboseMsg(`* Def [${this.options.Define}]`);
      // internally all Preprocessor symbols are UPPER CASE
      for (const newSymbol of this.options.Define) {
        this.context.preProcessorOptions.defSymbols.push(newSymbol.toUpperCase());
      }
    }

    if (this.options.Undefine) {
      // forward Symbol(s) to be Undefined
      this.context.logger.verboseMsg(`* Undef [${this.options.Undefine}]`);
      // internally all Preprocessor symbols are UPPER CASE
      for (const newSymbol of this.options.Undefine) {
        this.context.preProcessorOptions.undefSymbols.push(newSymbol.toUpperCase());
      }
    }

    let filename: string | undefined = this.options.filename;
    if (filename && filename.endsWith('.json')) {
      filename = undefined;
    }

    if (filename !== undefined && filename !== '') {
      this.context.logger.verboseMsg(`Working with file [${filename}]`);
      // set up output filespec in case we are writing a listing file
      const lstFilespec = filename.replace('.spin2', '.lst');
      this.context.compileOptions.listFilename = lstFilespec;
      if (this.options.list) {
        this.context.logger.verboseMsg(`* Write listing file: ${lstFilespec}`);
      }
      // and load our .spin2 top-level file
      this.spinDocument = new SpinDocument(this.context, filename);
      // record this new file in our master list of files we compiled to buid the binary
      this.context.sourceFiles.addFile(this.spinDocument);
      // TODO post symbols to conext object instead of top-level doc??
      this.spinDocument.defineSymbol('__VERSION__', this.version);
    } else {
      if (this.requiresFilename) {
        console.log('arguments: %O', this.program.args);
        console.log('options: %o', this.program.opts());
        this.context.logger.errorMsg('Missing filename argument');
        this.shouldAbort = true;
      }
    }

    const theCompiler = new Compiler(this.context);

    if (this.options.compile) {
      this.context.compileOptions.compile = true;
      if (!this.spinDocument || !this.spinDocument.validFile) {
        this.context.logger.errorMsg(`File [${filename}] does not exist or is not a .spin2 file`);
        this.shouldAbort = true;
      } else {
        this.context.currentFolder = this.spinDocument?.dirName;
      }

      this.context.logger.logMessage('');
      this.context.logger.infoMsg(`lib dir [${this.context.libraryFolder}]`);
      this.context.logger.infoMsg(`wkg dir [${this.context.currentFolder}]`);
      this.context.logger.logMessage('');
    }
    if (!this.shouldAbort && this.spinDocument && this.options.compile) {
      this.context.logger.verboseMsg(`Compiling file [${filename}]`);
      if (!this.context.reportOptions.writePreprocessReport) {
        theCompiler.Compile();
      }
    }
    // const optionsString: string = 'options: ' + String(this.options);
    // this.verboseMsg(optionsString);
    // this.progressMsg('Done');
    return 0;
  }

  //private async loadUsbPortsFound(): Promise<void> {
  //    const deviceNodes: string[] = await UsbSerial.serialDeviceList();
  //    this.context.runEnvironment.serialPortDevices = deviceNodes;
  //  }

  private errorColor(str: string): string {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`;
  }

  private prefixName(str: string): string {
    if (str.startsWith('$-')) {
      return `${str.substring(2)}`;
    } else {
      return `PNut-TS: ${str}`;
    }
  }

  // --------------------------------------------------
  // PLEASE PARDON OUR STRAY TEST CODE BELOW HERE
  // --------------------------------------------------

  private bigIntFloat32ToNumber(float32BigInt: bigint): number {
    // Create a new ArrayBuffer with a size of 4 bytes
    const buffer = new ArrayBuffer(4);
    // Create a new DataView from the ArrayBuffer
    const view = new DataView(buffer);
    // Get the least significant 32 bits of the BigInt and set into the DataView
    view.setUint32(0, Number(float32BigInt & BigInt(0xffffffff)), true); // true for little-endian
    // Create a new Float32Array from the ArrayBuffer
    const float32Array = new Float32Array(buffer);
    // Return the first element of the Float32Array
    return float32Array[0];
  }

  private numberToBigIntFloat32(float64: number): bigint {
    // Create a new ArrayBuffer with a size of 4 bytes
    const buffer = new ArrayBuffer(4);
    // Create a new Float32Array from the ArrayBuffer
    const float32Array = new Float32Array(buffer);
    // Set the first element of the Float32Array to the number
    float32Array[0] = float64;
    // Create a new DataView from the ArrayBuffer
    const view = new DataView(buffer);
    // Return the 32 bits from that DataView as a BigInt
    //   (note true is for little - endian)
    return BigInt(view.getUint32(0, true));
  }

  private runTestCode() {
    return;
    /*
    let testValue: bigint = BigInt(0x3f800000);
    let testResult: number = this.bigIntFloat32ToNumber(testValue);
    this.context.logger.logMessage(`--->   testResult=(${testResult}) <---`);

    testValue = BigInt(0x3fc00000);
    testResult = this.bigIntFloat32ToNumber(testValue);
    this.context.logger.logMessage(`--->   testResult2=(${testResult}) <---`);

    testValue = BigInt(0xbfc00000);
    testResult = this.bigIntFloat32ToNumber(testValue);
    this.context.logger.logMessage(`--->   testResult2=(${testResult}) <---`);
    this.context.logger.logMessage('');
    */
    let testValue: number = 1.5;
    let testResult: bigint = this.numberToBigIntFloat32(testValue);

    let biHex = testResult.toString(16).padStart(16, '0');
    let biHexGrouped = biHex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(` biB: 0x${biHexGrouped.toUpperCase()} a=(${testResult})`);

    testValue = -1.5;
    testResult = this.numberToBigIntFloat32(testValue);

    biHex = testResult.toString(16).padStart(16, '0');
    biHexGrouped = biHex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(` biB: 0x${biHexGrouped.toUpperCase()} a=(${testResult})`);
  }

  private runTestCodeOld() {
    //return;
    //const parmA: number = 0xffffffff;
    //const parmA: number = 0x87654321;
    const parmA: number = 0xedcba987;
    //const parmA: number = -1;
    //const parmA: number = 5;
    const parmB: number = 0x00000001;
    const a: bigint = BigInt(parmA) & BigInt(0xffffffff);
    const b: bigint = BigInt(parmB) & BigInt(0xffffffff);
    //a &= BigInt(0xffffffff);
    //b &= BigInt(0xffffffff);
    //a &= BigInt(0x7ffffffffffff);
    //b &= BigInt(0x7ffffffffffff);
    //a = ((a << 32n) / b) & BigInt(0xffffffff);

    const fa: number = Number(a);
    //const logA: number = Math.log(fa) / Math.log(2.0);
    //const logA2: number = Math.fround(Math.log2(fa) * Math.pow(2, 27));
    //const logA2: number = Math.log2(Number(a)) * Math.pow(2, 27);
    //const biA2: bigint = BigInt(Math.trunc(logA2));

    // QLOG
    //const biA = BigInt(Math.trunc(Math.log2(Number(a)) * Math.pow(2, 27)));

    // QEXP
    const biB = Math.trunc(Math.pow(2, Number(a) / Math.pow(2, 27))); // trunc ..E9, round ..EA
    //const biB2 = Math.trunc(Number(a) / Math.pow(2, 27));

    this.context.logger.logMessage(`fa=(${fa})`);
    //this.context.logger.logMessage(`loga=(${logA})`);
    //this.context.logger.logMessage(`biA=(${biA})`);
    this.context.logger.logMessage(`biB=(${biB})`);
    //this.context.logger.logMessage(`biB2=(${biB2})`);

    //const ba2Hex = biA.toString(16).padStart(16, '0');
    //const ba2HexGrouped = ba2Hex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    //this.context.logger.logMessage(` biA: 0x${ba2HexGrouped.toUpperCase()} a=(${biA})`);

    const bb2Hex = biB.toString(16).padStart(16, '0');
    const bb2HexGrouped = bb2Hex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(` biB: 0x${bb2HexGrouped.toUpperCase()} a=(${biB})`);

    const aHex = a.toString(16).padStart(16, '0');
    const aHexGrouped = aHex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(`   a: 0x${aHexGrouped.toUpperCase()} a=(${a})`);

    const bHex = b.toString(16).padStart(16, '0');
    const bHexGrouped = bHex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(`   b: 0x${bHexGrouped.toUpperCase()} b=(${b})`);
  }
}

// --------------------------------------------------
// our actual command line tool when run stand-alone
//
const cliTool = new PNutInTypeScript();
cliTool.run();
