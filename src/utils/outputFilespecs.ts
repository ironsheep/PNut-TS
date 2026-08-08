/** @format */

// Where this compilation's output files go.

'use strict';
// src/utils/outputFilespecs.ts

import * as path from 'path';
import { Context } from './context';

/**
 * Every file a single compilation can produce.
 *
 * The derivations used to live at the places that wrote each file -- three in
 * pnut-ts.ts and three more in spin2Parser.ts -- which meant anything else that
 * needed to know an output's name (the failure cleanup, for one) had to restate
 * the rules and would silently drift the first time one of them changed. They
 * are stated once, here, and both the writers and the cleanup read them.
 */
export interface iOutputFilespecs {
  listing: string;
  map: string;
  flash: string;
  object: string;
  /** Honours -o, which replaces the derived name entirely. */
  binary: string;
  /** The flash-loader variant of the binary; -o overrides this one too. */
  flashLoaderBinary: string;
}

/**
 * Derive every output filespec from the listing filespec, which pnut-ts.ts sets
 * from the source filename as soon as the source resolves.
 *
 * Returns empty strings throughout when no source has been resolved yet -- the
 * cleanup relies on that to tell "this build produced nothing" from "this build
 * produced files we should remove".
 */
export function outputFilespecs(context: Context): iOutputFilespecs {
  const listing: string = context.compileOptions.listFilename;
  if (listing.length == 0) {
    return { listing: '', map: '', flash: '', object: '', binary: '', flashLoaderBinary: '' };
  }
  const binarySuffix: string = context.compileOptions.binarySuffix;
  const overrideName: string = context.compileOptions.outputFilename;
  // -o names the binary outright, replacing both the derived name and the suffix
  // that -a would otherwise have chosen.
  const overridden: string = overrideName.length > 0 ? path.join(path.dirname(listing), overrideName) : '';
  return {
    listing: listing,
    map: listing.replace('.lst', '.map'),
    flash: listing.replace('.lst', '.flash'),
    object: listing.replace('.lst', '.obj'),
    binary: overridden.length > 0 ? overridden : listing.replace('.lst', `.${binarySuffix}`),
    flashLoaderBinary: overridden.length > 0 ? overridden : listing.replace('.lst', `.${binarySuffix}f`)
  };
}
