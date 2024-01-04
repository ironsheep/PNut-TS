/** @format */

// src/pnuts2.test.ts
import { PNutInTypeScript } from './pnuts2';
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
    process.argv = ['node', 'pnuts2.js', '-V'];
    const cliTool = new PNutInTypeScript();
    // cliTool.setArgs(['node', 'pnuts2.js', '-V']);
    expect(() => cliTool.run()).toThrow('0.0.0');
  });
  */

  test('run function logs correct message for --debug option', () => {
    process.argv = ['node', 'pnuts2.js', '--debug'];
    const cliTool = new PNutInTypeScript();
    // cliTool.setArgs(['node', 'pnuts2.js', '--debug']);
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('PnuTS: Compiling with DEBUG');
  });

  test('run function logs correct message for --verbose option', () => {
    process.argv = ['node', 'pnuts2.js', '--verbose'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('PnuTS: Verbose- Verbose output is on');
  });

  test('run function logs correct message for --flash option', () => {
    process.argv = ['node', 'pnuts2.js', '--flash'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('PnuTS: Downloading to FLASH');
  });

  test('run function logs correct message for --ram option', () => {
    process.argv = ['node', 'pnuts2.js', '--ram'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(console.log).toHaveBeenCalledWith('PnuTS: Downloading to RAM');
  });
});
