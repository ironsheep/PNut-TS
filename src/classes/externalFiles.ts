/** @format */

'use strict';

import path from 'path';
import { Context } from '../utils/context';
import { fileExists, loadFileAsUint8Array, loadUint8ArrayFailed } from '../utils/files';

// src/classes/childObjectImage.ts

export class ChildObjectsImage {
  private context: Context;
  private _clockSetterImage: Uint8Array = new Uint8Array(0);
  private _flashLoaderImage: Uint8Array = new Uint8Array(0);
  private _spinDebuggerImage: Uint8Array = new Uint8Array(0);
  private _spinInterpreterImage: Uint8Array = new Uint8Array(0);

  constructor(ctx: Context) {
    this.context = ctx;
  }

  get clockSetterLength(): number {
    if (this._clockSetterImage.length == 0) {
      this.loadFiles();
    }
    return this._clockSetterImage.length;
  }

  get clockSetter(): Uint8Array {
    return this._clockSetterImage;
  }

  get flashLoaderLength(): number {
    if (this._flashLoaderImage.length == 0) {
      this.loadFiles();
    }
    return this._flashLoaderImage.length;
  }

  get flashLoader(): Uint8Array {
    return this._flashLoaderImage;
  }

  get spinDebuggerLength(): number {
    if (this._spinDebuggerImage.length == 0) {
      this.loadFiles();
    }
    return this._spinDebuggerImage.length;
  }

  get spinDebugger(): Uint8Array {
    return this._spinDebuggerImage;
  }

  get spinInterpreterLength(): number {
    if (this._spinInterpreterImage.length == 0) {
      this.loadFiles();
    }
    return this._spinInterpreterImage.length;
  }

  get spinInterpreter(): Uint8Array {
    return this._spinInterpreterImage;
  }

  private loadFiles() {
    let tmpFSpec = path.join(this.context.extensionFolder, 'clock_setter.obj');
    let tmpImage = this.loadImage(tmpFSpec);
    if (tmpImage) {
      this._clockSetterImage = tmpImage;
    }
    tmpFSpec = path.join(this.context.extensionFolder, 'flash_loader.obj');
    tmpImage = this.loadImage(tmpFSpec);
    if (tmpImage) {
      this._flashLoaderImage = tmpImage;
    }
    tmpFSpec = path.join(this.context.extensionFolder, 'Spin2_debugger.obj');
    tmpImage = this.loadImage(tmpFSpec);
    if (tmpImage) {
      this._spinDebuggerImage = tmpImage;
    }
    tmpFSpec = path.join(this.context.extensionFolder, 'Spin2_interpreter.obj');
    tmpImage = this.loadImage(tmpFSpec);
    if (tmpImage) {
      this._spinDebuggerImage = tmpImage;
    }
  }

  private loadImage(fileSpec: string): Uint8Array | undefined {
    let desiredImage: Uint8Array | undefined = undefined;
    if (fileExists(fileSpec)) {
      const tmpImage = loadFileAsUint8Array(fileSpec);
      if (loadUint8ArrayFailed(tmpImage) == false) {
        desiredImage = tmpImage;
      }
    }
    return desiredImage;
  }
}
