#!/usr/bin/env node
/* eslint-disable no-console */
/** @format */

// src/pnut-ts.ts
'use strict';
import { Command, Option, CommanderError, type OptionValues } from 'commander';
import { Context, createContext } from './utils/context';
import { Compiler } from './classes/compiler';
import { SpinDocument } from './classes/spinDocument';

// NOTEs re-stdio in js/ts
// REF https://blog.logrocket.com/using-stdout-stdin-stderr-node-js/

// expose our installation path
// REF: https://stackoverflow.com/questions/32944714/best-way-to-find-the-location-of-a-specific-file-within-a-node-dependency
// can then get by:
//  var assets = require('foo');
//  fs.readFile(assets.root + '/bar.png', function(){/*whatever*/});
module.exports.root = __dirname;

function errorColor(str: string) {
  // Add ANSI escape codes to display text in red.
  return `\x1b[31m${str}\x1b[0m`;
}

export class PNutInTypeScript {
  private readonly program = new Command();
  private options: OptionValues = this.program.opts();
  private version: string = '0.0.0';
  private argsArray: string[] = [];
  private context: Context = createContext();
  private compiler: Compiler = new Compiler(this.context);
  private spinDocument: SpinDocument | undefined = undefined;
  private shouldAbort: boolean = false;
  private requiresFilename: boolean = false;

  constructor() {
    process.stdout.on('error', (error: Error) => {
      console.error(`Pnut-TS: An error occurred on stdout: "${error.message}", Aborting.`);
      process.exit(1);
    });

    process.stderr.on('error', (error: Error) => {
      console.error(`Pnut-TS: An error occurred on stderr: "${error.message}", Aborting.`);
      process.exit(1);
    });
    process.stdout.on('close', () => {
      console.log('Pnut-TS: stdout was closed');
    });

    process.stderr.on('close', () => {
      console.log('Pnut-TS: stderr was closed');
    });
  }

  public setArgs(args: string[]): void {
    this.argsArray = args;
  }

  public run(): number {
    this.program
      .configureOutput({
        // Visibly override write routines as example!
        writeOut: (str) => process.stdout.write(`Pnut-TS: ${str}`),
        writeErr: (str) => process.stdout.write(`Pnut-TS: ${str}`),
        // Highlight errors in color.
        outputError: (str, write) => write(errorColor(str))
      })
      .name('Pnut-TS')
      .version(`v${this.version}`, '-V, --version', 'output the version number')
      .usage('[optons] filename')
      .description('Propeller2 spin compiler/downloader')
      .arguments('[filename]')
      .action((filename) => {
        this.options.filename = filename;
      })
      .option('-b, --both', 'compile with DEBUG, download to FLASH and run')
      .option('-c, --compile', 'compile file')
      .option('-d, --debug', 'compile with DEBUG')
      .option('-f, --flash', 'download to FLASH and run')
      .option('-r, --ram', 'download to RAM and run')
      .option('-l, --list', 'emit listing files (.lst) from compilation')
      .option('-o, --output <name>', 'set output filename')
      .option('-i, --interface', 'emit interface document files (.txt) during compilation')
      .option('-I, --Include <dir...>', 'add preprocessor include directories')
      .option('-U, --Undefine <symbol...>', 'undefine (remove) preprocessor symbol(s)')
      .option('-D, --Define <symbol...>', 'define (add) preprocessor symbol(s)')
      .addOption(new Option('--log <object...>', 'object').choices(['all', 'elements', 'parser', 'resolver', 'preproc']))
      .addOption(new Option('--regression <testName...>', 'testName').choices(['element', 'tables', 'resolver', 'preproc']))
      .option('-v, --verbose', 'output verbose messages');

    this.program.exitOverride(); // throw instead of exit

    this.context.logger.setProgramName(this.program.name());
    //this.context.logger.progressMsg(`after setting name`);
    try {
      this.program.parse();
    } catch (error: unknown) {
      if (error instanceof CommanderError) {
        //this.context.logger.logMessage(`Error: name=[${error.name}], message=[${error.message}]`);
        if (error.name === 'CommanderError') {
          this.context.logger.logMessage(``);
          this.program.outputHelp();
        } else {
          this.context.logger.logMessage(`Catch name=[${error.name}], message=[${error.message}]`);
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

    // REMOVE BEFORE FLIGHT: DO NOT release with the following uncommented
    this.runTestCode(); // for quick live testing...

    this.context.logger.verboseMsg(`* opts[${this.program.opts()}]`);
    this.context.logger.verboseMsg(`* args[${this.program.args}]`);

    if (this.options.regression) {
      // forward our REGRESSION TEST Options
      this.requiresFilename = true;
      const choices: string[] = this.options.regression;
      this.context.logger.verboseMsg('MODE: Regression Testing');
      if (choices.includes('element')) {
        this.context.reportOptions.writeElementsReport = true;
        this.context.logger.verboseMsg('Gen: Element Report');
      }
      if (choices.includes('tables')) {
        this.context.reportOptions.writeTablesReport = true;
        this.context.logger.verboseMsg('Gen: Tables Report');
      }
      if (choices.includes('preproc')) {
        this.context.reportOptions.writePreprocessReport = true;
        this.context.logger.verboseMsg('Gen: preProcessor Report');
      }
      if (choices.includes('resolver')) {
        this.context.reportOptions.writeResolverReport = true;
        this.context.logger.verboseMsg('Gen: resolver Report');
      }
    }

    if (this.options.log) {
      // forward our LOG Options
      this.requiresFilename = true;
      const choices: string[] = this.options.log;
      this.context.logger.verboseMsg('MODE: Logging');
      //this.context.logger.verboseMsg(`* log: [${choices}]`);
      const wantsAll: boolean = choices.includes('all');
      if (choices.includes('elements') || wantsAll) {
        this.context.logOptions.logElementizer = true;
        this.context.logger.verboseMsg('Elementizer logging');
      }
      if (choices.includes('parser') || wantsAll) {
        this.context.logOptions.logParser = true;
        this.context.logger.verboseMsg('Parser logging');
      }
      if (choices.includes('resolver') || wantsAll) {
        this.context.logOptions.logResolver = true;
        this.context.logger.verboseMsg('Resolver logging');
      }
      if (choices.includes('preproc')) {
        this.context.logOptions.logPreprocessor = true;
        this.context.logger.verboseMsg('PreProcessor logging');
      }
    }

    if (this.options.output) {
      // forward our Output Filename
      const outFilename = this.options.output;
      this.context.compileOptions.outputFilename = outFilename;
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
      this.spinDocument = new SpinDocument(this.context, filename);
      this.spinDocument.defineSymbol('__VERSION__', this.version);
    } else {
      if (this.requiresFilename) {
        console.log('arguments: %O', this.program.args);
        console.log('options: %o', this.program.opts());
        this.context.logger.errorMsg('Missing filename argument');
        this.shouldAbort = true;
      }
    }

    if (this.options.compile) {
      this.context.compileOptions.compile = true;
      if (!this.spinDocument || !this.spinDocument.validFile) {
        this.context.logger.errorMsg(`File [${filename}] does not exist or is not a .spin2 file`);
        this.shouldAbort = true;
      }

      this.context.logger.logMessage('');
      this.context.logger.logMessage(`lib dir [${this.context.libraryFolder}]`);
      this.context.logger.logMessage(`wkg dir [${this.context.currentFolder}]`);
      this.context.logger.logMessage('');
    }
    if (!this.shouldAbort && this.spinDocument && this.options.compile) {
      this.context.logger.verboseMsg(`Compiling file [${filename}]`);
      this.spinDocument.preProcess();
      if (!this.context.reportOptions.writePreprocessReport) {
        this.compiler.Compile(this.spinDocument);
      }
    }
    // const optionsString: string = 'options: ' + String(this.options);
    // this.verboseMsg(optionsString);
    // this.progressMsg('Done');
    return 0;
  }

  private runTestCode() {
    return;
    const parmA: number = 0xffffffff;
    const parmB: number = 0x00000001;
    let a: bigint = BigInt(parmA) & BigInt(0xffffffff);
    const b: bigint = BigInt(parmB) & BigInt(0xffffffff);
    //a &= BigInt(0xffffffff);
    //b &= BigInt(0xffffffff);
    //a &= BigInt(0x7ffffffffffff);
    //b &= BigInt(0x7ffffffffffff);
    a = ((a << 32n) / b) & BigInt(0xffffffff);

    const aHex = a.toString(16).padStart(16, '0');
    const bHex = b.toString(16).padStart(16, '0');
    const aHexGrouped = aHex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(`a: 0x${aHexGrouped.toUpperCase()} a=(${a})`);

    const bHexGrouped = bHex.replace(/(\w{4})/g, '$1_').slice(0, -1);
    this.context.logger.logMessage(`b: 0x${bHexGrouped.toUpperCase()} b=(${b})`);
  }
}

// ------------------------------------------------------
// our actual command line tool when run stand-alone
//
const cliTool = new PNutInTypeScript();
cliTool.run();
