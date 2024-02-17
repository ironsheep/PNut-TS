/** @format */
'use strict';

// src/utils/fileUtils.ts

// a small collection of generally useful source file functions

import { SpinDocument } from '../classes/spinDocument';
import { SpinElement } from '../classes/spinElement';
import { Context } from './context';

export function getSourceSymbol(context: Context, element: SpinElement): string {
  let desiredSymbol: string = '';
  const srcDocument: SpinDocument | undefined = context.sourceFiles.getFileHavingID(element.fileId);
  if (srcDocument !== undefined && element.refersToSymbol) {
    const sourceLine: string = srcDocument.lineAt(element.sourceLineIndex).text;
    desiredSymbol = sourceLine.substring(element.sourceCharacterOffset, element.sourceCharacterEndOffset).toUpperCase();
  }
  return desiredSymbol;
}
