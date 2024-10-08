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

  test('run function logs correct message for --debug option', () => {
    process.argv = ['node', 'pnut-ts.js', '--debug', 'TEST/emptySpinFile.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('pnut-ts: Compiling with DEBUG\r\n');
  });

  test('run function logs correct message for --verbose option', () => {
    process.argv = ['node', 'pnut-ts.js', '--verbose', 'TEST/emptySpinFile.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('pnut-ts: Verbose output is enabled\r\n');
  });

  test('run function logs correct message for --flash option', () => {
    process.argv = ['node', 'pnut-ts.js', '--flash', 'TEST/emptySpinFile.spin2'];
    const cliTool = new PNutInTypeScript();
    cliTool.run();
    expect(process.stdout.write).toHaveBeenCalledWith('pnut-ts: Downloading to FLASH\r\n');
  });
});
