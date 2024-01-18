/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/** @format */

// src/pnuts2.test.ts
import { PNutInTypeScript } from './pnut-ts';

describe('PNutInTypeScript', () => {
  const write: any = process.stdout.write;

  beforeEach(() => {
    process.stdout.write = jest.fn();
  });

  afterEach(() => {
    process.stdout.write = write;
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
    expect(process.stdout.write).toHaveBeenCalledWith('Pnut-TS: Compiling with DEBUG\r\n');
  });

  test('run function logs correct message for --verbose option', () => {
    process.argv = ['node', 'pnut-ts.js', '--verbose'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('Pnut-TS: Verbose output is enabled\r\n');
  });

  test('run function logs correct message for --flash option', () => {
    process.argv = ['node', 'pnut-ts.js', '--flash'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('Pnut-TS: Downloading to FLASH\r\n');
  });

  test('run function logs correct message for --ram option', () => {
    process.argv = ['node', 'pnut-ts.js', '--ram'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('Pnut-TS: Downloading to RAM\r\n');
  });
});
