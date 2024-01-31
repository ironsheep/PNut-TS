/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/** @format */

// src/pnut-ts.test.ts

import { PNutInTypeScript } from '../../pnut-ts';

describe('PNutInTypeScript', () => {
  const write: any = process.stdout.write;

  beforeEach(() => {
    process.stdout.write = jest.fn();
  });

  afterEach(() => {
    process.stdout.write = write;
  });

  /*  tests don't work on this method!
  test('run function logs correct message for for -V (version) option', () => {
    process.argv = ['node', 'pnut-ts.js', '-V'];
    const cliTool = new PNutInTypeScript();
    // cliTool.setArgs(['node', 'pnut-ts.js', '-V']);
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('0.0.0\r\n');
  });
  */

  test('run function logs correct message for --debug option', () => {
    process.argv = ['node', 'pnut-ts.js', '--debug', 'f1.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('PNut-TS: Compiling with DEBUG\r\n');
  });

  test('run function logs correct message for --verbose option', () => {
    process.argv = ['node', 'pnut-ts.js', '--verbose', 'f1.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('PNut-TS: Verbose output is enabled\r\n');
  });

  test('run function logs correct message for --flash option', () => {
    process.argv = ['node', 'pnut-ts.js', '--flash', 'f1.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('PNut-TS: Downloading to FLASH\r\n');
  });

  test('run function logs correct message for --ram option', () => {
    process.argv = ['node', 'pnut-ts.js', '--ram', 'f1.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('PNut-TS: Downloading to RAM\r\n');
  });
});
