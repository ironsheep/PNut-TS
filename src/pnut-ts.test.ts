/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/** @format */

// src/pnuts2.test.ts
import { PNutInTypeScript } from './pnut-ts';
import mockConsole from 'jest-mock-console';

describe('PNutInTypeScript', () => {
  let restoreConsole: any;

  beforeEach(() => {
    restoreConsole = mockConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  /*
  test('run function logs correct message for for -V (version) option', () => {
    process.argv = ['node', 'pnut-ts.js', '-V'];
    const cliTool = new PNutInTypeScript();
    // cliTool.setArgs(['node', 'pnut-ts.js', '-V']);
    expect(() => cliTool.run()).toThrow('0.0.0');
  });
  */

  test('run function logs correct message for --debug option', () => {
    process.argv = ['node', 'pnut-ts.js', '--debug'];
    const cliTool = new PNutInTypeScript();
    // cliTool.setArgs(['node', 'pnut-ts.js', '--debug']);
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('Pnut-TS: Compiling with DEBUG');
  });

  test('run function logs correct message for --verbose option', () => {
    process.argv = ['node', 'pnut-ts.js', '--verbose'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('Pnut-TS: Verbose- Verbose output is on');
  });

  test('run function logs correct message for --flash option', () => {
    process.argv = ['node', 'pnut-ts.js', '--flash'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('Pnut-TS: Downloading to FLASH');
  });

  test('run function logs correct message for --ram option', () => {
    process.argv = ['node', 'pnut-ts.js', '--ram'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('Pnut-TS: Downloading to RAM');
  });
});
