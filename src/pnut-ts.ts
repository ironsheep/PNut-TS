#!/usr/bin/env node
/* eslint-disable no-console */
/** @format */

// src/pnut-ts.ts
'use strict';
import { Command, type OptionValues } from 'commander';
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

export class PNutInTypeScript {
  private readonly program = new Command();
  private options: OptionValues = this.program.opts();
  private argsArray: string[] = [];
  private context: Context = createContext();
  private compiler: Compiler = new Compiler(this.context);
  private spinDocument: SpinDocument | undefined = undefined;
  private shouldAbort: boolean = false;

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
      .name('Pnut-TS')
      .version('0.0.0', '-V, --version', 'output the version number')
      .usage('[optons] filename')
      .description('Propeller2 spin compiler/downloader')
      .arguments('[filename]')
      .action((filename) => {
        this.options.filename = filename;
      })
      .option('-b, --both', 'compile with DEBUG, download to FLASH and run')
      .option('-c, --compile', 'compile file')
      .option('-d, --debug', 'compile with DEBUG')
      .option('-e, --elementizer', 'log elementizer efforts')
      .option('-f, --flash', 'download to FLASH and run')
      .option('-r, --ram', 'download to RAM and run')
      .option('-v, --verbose', 'output verbose messages');

    this.context.logger.setProgramName(this.program.name());
    //this.context.logger.progressMsg(`after setting name`);

    this.program.parse();
    //this.context.logger.progressMsg(`after parse()`);

    this.options = { ...this.options, ...this.program.opts() };

    if (this.options.verbose) {
      this.context.logger.enabledVerbose();
    }

    if (this.options.elementizer) {
      this.context.logger.verboseMsg('LOG: elementizer');
      this.context.logOptions.logElementizer = true;
    }

    const filename: string = this.options.filename;
    //this.context.logger.progressMsg(`grab filename`);

    if (filename !== undefined && filename !== '') {
      this.context.logger.verboseMsg(`Working with file [${filename}]`);
      this.spinDocument = new SpinDocument(filename);
    } else {
      this.context.logger.errorMsg('Missing filename argument');
      this.shouldAbort = true;
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
    }

    if (this.options.flash) {
      this.context.logger.progressMsg('Downloading to FLASH');
      this.context.compileOptions.writeFlash = true;
    }

    if (this.options.ram) {
      this.context.logger.progressMsg('Downloading to RAM');
      this.context.compileOptions.writeRAM = true;
    }

    if (this.options.ram && this.options.flash) {
      this.context.logger.errorMsg('Please only use one of -f and -r');
      this.shouldAbort = true;
    }

    if (this.options.compile) {
      this.context.logger.verboseMsg(`Compiling file [${filename}]`);
      this.context.compileOptions.compile = true;
      if (!this.spinDocument || !this.spinDocument.validFile) {
        this.context.logger.errorMsg(`File [${filename}] does not exist or is not a .spin2 file`);
        this.shouldAbort = true;
      }
    }
    if (this.options.compile) {
      this.context.logger.logMessage('\n');
      this.context.logger.logMessage(`lib dir [${this.context.libraryFolder}]\n`);
      this.context.logger.logMessage(`wkg dir [${this.context.currentFolder}]\n`);
      this.context.logger.logMessage('\n');
    }
    if (!this.shouldAbort && this.spinDocument) {
      this.compiler.Compile(this.spinDocument);
    }
    // const optionsString: string = 'options: ' + String(this.options);
    // this.verboseMsg(optionsString);
    // this.progressMsg('Done');
    return 0;
  }
}

// ------------------------------------------------------
// our actual command line tool when run stand-alone
//
const cliTool = new PNutInTypeScript();
cliTool.run();
