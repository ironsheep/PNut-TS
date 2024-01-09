#!/usr/bin/env node
/** @format */

// src/pnuts.ts
'use strict';
import { Command, type OptionValues } from 'commander';
import { Logger } from './classes/Log';
import { Context, createContext } from './utils/context';
import { Compiler } from './classes/compiler';

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

  // constructor() {}

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
      .option('-f, --flash', 'download to FLASH and run')
      .option('-r, --ram', 'download to RAM and run')
      .option('-v, --verbose', 'output verbose messages');

    this.program.parse();
    // this.options = this.program.opts();
    this.options = { ...this.options, ...this.program.opts() };

    this.context.logger.setProgramName(this.program.name());

    const filename: string = this.options.filename;
    if (filename !== undefined && filename !== '') {
      this.context.logger.logMessage(`Working with file [${filename}]`);
    } else {
      // this.warningMsg('Missing filename argument');
    }

    if (this.options.verbose) {
      this.context.logger.enabledVerbose();
    }

    if (this.options.both) {
      this.context.logger.verboseMsg('have BOTH: enabling FLASH and DEBUG');
      this.options.debug = true;
      this.options.flash = true;
      this.options.ram = false;
    }

    if (this.options.debug) {
      this.context.logger.progressMsg('Compiling with DEBUG');
    }

    if (this.options.flash) {
      this.context.logger.progressMsg('Downloading to FLASH');
    }

    if (this.options.ram) {
      this.context.logger.progressMsg('Downloading to RAM');
    }

    if (this.options.compile) {
      this.context.logger.verboseMsg(`Compiling file [${filename}]`);
    }
    this.context.logger.logMessage('\n');
    this.context.logger.logMessage(`lib dir [${this.context.libraryFolder}]\n`);
    this.context.logger.logMessage(`wkg dir [${this.context.currentFolder}]\n`);
    this.context.logger.logMessage('\n');

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
