#!/usr/bin/env node
/** @format */

// src/pnuts.ts
'use strict';
import { Command, type OptionValues } from 'commander';
import { Logger } from './classes/Log';
import { Context, createContext } from './utils/context';

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
    const filename: string = this.options.filename;
    if (filename !== undefined && filename !== '') {
      this.context.logger.logMessage(`Working with file [${filename}]`);
    } else {
      // this.warningMsg('Missing filename argument');
    }
    this.verboseMsg('Verbose output is on');

    if (this.options.both) {
      this.verboseMsg('have BOTH: enabling FLASH and DEBUG');
      this.options.debug = true;
      this.options.flash = true;
    }

    if (this.options.debug) {
      this.progressMsg('Compiling with DEBUG');
    }

    if (this.options.flash) {
      this.progressMsg('Downloading to FLASH');
    }

    if (this.options.ram) {
      this.progressMsg('Downloading to RAM');
    }

    if (this.options.compile) {
      this.verboseMsg(`Compiling file [${filename}]`);
    }
    this.context.logger.logMessage('\n');

    // const optionsString: string = 'options: ' + String(this.options);
    // this.verboseMsg(optionsString);
    // this.progressMsg('Done');
    return 0;
  }

  private verboseMsg(msg: string): void {
    if (this.options?.verbose) {
      this.context.logger.logMessage(`${this.program.name()}: Verbose- ${msg}`);
    }
  }

  private warningMsg(msg: string): void {
    this.context.logger.logMessage(`${this.program.name()}: WARNING- ${msg}`);
  }

  private progressMsg(msg: string): void {
    this.context.logger.logMessage(`${this.program.name()}: ${msg}`);
  }
}

// ------------------------------------------------------
// our actual command line tool when run stand-alone
//
const cliTool = new PNutInTypeScript();
cliTool.run();
