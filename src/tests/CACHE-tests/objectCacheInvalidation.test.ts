/** @format */

// Cache INVALIDATION tests — does the cache notice when an input changes?
//
// This suite is the counterpart to objectCache.test.ts, which tests cache
// FIDELITY: compile the same unmodified source three times (uncached / cold /
// warm) and assert all three agree. Fidelity was never the gap. No test in that
// file edits a source between compiles, so nothing there could ever have caught
// a cache that fails to invalidate. Every v1.54.x defect was a fidelity defect,
// so the harness grew around fidelity.
//
// The shape of every test here is the one thing fidelity testing cannot do:
//
//     compile  ->  change exactly one input  ->  recompile warm
//                  ->  assert the warm result equals a COLD compile
//                      of the changed tree
//
// THE ASSERTION THAT MATTERS IS BYTE EQUALITY. Measured 2026-08-21 on this
// fixture: editing the diamond node yields a warm binary 88 bytes larger than
// truth while the warm `.map` is byte-for-byte identical to the uncached one —
// same MEMORY LAYOUT, same `Objects:` count, same DAT addresses. The map
// describes the freshly-derived structure while the binary carries stale
// embedded content, so only the binary tells the truth. The map signals are
// asserted as corroboration because the reporter's tree did move them; they are
// a second net, never the first.
//
// Never assert on the .map instance/source NAME columns. They are wrong today
// (buildObjInstanceInfo mixes four index spaces) and the P2 Knowledge Base
// documents them as untrustworthy. Counts and addresses are correct while the
// labels are not.

'use strict';

import fs from 'fs';
import path from 'path';
import {
  CompileResult,
  StagedTree,
  compileCold,
  compileUncached,
  compileWarm,
  expectSingleDatRegion,
  mutateBlob,
  mutateFile,
  readObjectCount,
  stageTree,
  touchFile
} from './cacheFixtures';

/** Every file the sgl_* tree needs, blob included. */
const FIXTURE_FILES = [
  'sgl_app_top.spin2',
  'sgl_shared_state.spin2',
  'sgl_svc_logger.spin2',
  'sgl_svc_config.spin2',
  'sgl_fmt_util.spin2',
  'sgl_tick_leaf.spin2',
  'sgl_cfg_defaults.dat'
];

const ENTRY = 'sgl_app_top.spin2';

/**
 * Compile cold, apply one mutation, then compare a warm compile against an
 * uncached compile of the same mutated tree.
 *
 * The uncached compile is the definition of the right answer: it is what the
 * user would have got with no cache at all. Comparing warm against it — rather
 * than against a remembered value — means the test states the actual contract
 * ("caching changes speed, never output") instead of hard-coding today's bytes.
 */
function compileMutateRecompile(tree: StagedTree, mutate: (t: StagedTree) => void, flags: string = '') {
  const cold = compileCold(tree, ENTRY, flags);
  mutate(tree);
  const warm = compileWarm(tree, ENTRY, flags);
  const truth = compileUncached(tree, ENTRY, flags);
  return { cold, warm, truth };
}

describe('ObjectCache invalidation — a changed input must not be served stale', () => {
  let tree: StagedTree;

  beforeEach(() => {
    tree = stageTree(FIXTURE_FILES, 'invalidation');
  });

  afterEach(() => {
    tree.cleanup();
  });

  // --- Source mutation at each depth ------------------------------------

  test('depth-1 child change invalidates', () => {
    const { warm, truth } = compileMutateRecompile(tree, (t) =>
      mutateFile(t, 'sgl_svc_config.spin2', 'PUB reading() : value', 'PUB reading() : value | unused')
    );
    expect(warm.binary.equals(truth.binary)).toBe(true);
  });

  test('depth-2 grandchild change invalidates', () => {
    const { warm, truth } = compileMutateRecompile(tree, (t) => mutateFile(t, 'sgl_fmt_util.spin2', 'digits := 1', 'digits := 2'));
    expect(warm.binary.equals(truth.binary)).toBe(true);
  });

  // The headline defect. sgl_tick_leaf is reached ONLY through
  // sgl_shared_state, so nothing above names it and no parent's own source
  // changes when it does. Every ancestor cache-hits and the edit is invisible.
  test('depth-3 leaf change invalidates the whole chain above it', () => {
    const { warm, truth } = compileMutateRecompile(tree, (t) => mutateFile(t, 'sgl_tick_leaf.spin2', 'TICK_STEP = 1', 'TICK_STEP = 7'));
    expect(warm.binary.equals(truth.binary)).toBe(true);
  });

  // Distinct from the leaf case above, and the two must not be collapsed.
  // Editing the leaf makes every path stale IDENTICALLY, so dedup still
  // collapses them and the singleton survives. Editing the diamond node makes
  // the direct reference recompile fresh while the transitive references stay
  // stale inside cached parents — two different images of one object.
  test('diamond-node change invalidates every path that reaches it', () => {
    const { warm, truth } = compileMutateRecompile(tree, (t) =>
      mutateFile(t, 'sgl_shared_state.spin2', 'state_counter LONG  0', 'state_counter LONG  99')
    );
    expect(warm.binary.equals(truth.binary)).toBe(true);
  });

  // --- DAT FILE blob (row A7) -------------------------------------------

  test('DAT FILE blob change invalidates, with no source edit at all', () => {
    const { warm, truth } = compileMutateRecompile(tree, (t) =>
      mutateBlob(t, 'sgl_cfg_defaults.dat', Buffer.from('SGLCFGv2\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10', 'binary'))
    );
    expect(warm.binary.equals(truth.binary)).toBe(true);
  });

  // --- The DAT-singleton guarantee --------------------------------------

  // Corroborating signal, not the gate. Three objects declare sgl_shared_state;
  // however the cache behaves, they must reach ONE DAT region — two means the
  // singleton forked into independent state with separate locks.
  test('the DAT singleton stays single across a warm rebuild', () => {
    const { warm, truth } = compileMutateRecompile(tree, (t) =>
      mutateFile(t, 'sgl_shared_state.spin2', 'state_counter LONG  0', 'state_counter LONG  99')
    );
    const warmAddress = expectSingleDatRegion(warm.mapPath, 'STATE_LOCK');
    const truthAddress = expectSingleDatRegion(truth.mapPath, 'STATE_LOCK');
    expect(warmAddress).toBe(truthAddress);
    expect(readObjectCount(warm.mapPath)).toBe(readObjectCount(truth.mapPath));
  });

  // --- Negative cases: the cache must NOT over-invalidate ----------------

  // The reason the manifest hashes content instead of stat()ing mtime. A fresh
  // checkout, a CI job, and a container bind-mount all rewrite mtimes without
  // changing a byte; if that cost every user a full rebuild the fix would have
  // traded a correctness bug for a performance one.
  test('touching a file without changing it still hits the cache', () => {
    const cold = compileCold(tree, ENTRY);
    touchFile(tree, 'sgl_tick_leaf.spin2');
    const warm = compileWarm(tree, ENTRY);
    expect(warm.binary.equals(cold.binary)).toBe(true);
    expect(warm.stdout).not.toMatch(/error/i);
  });

  test('an unmodified tree recompiles warm to the identical binary', () => {
    const cold = compileCold(tree, ENTRY);
    const warm = compileWarm(tree, ENTRY);
    expect(warm.binary.equals(cold.binary)).toBe(true);
  });

  // --- Error case: a recorded input disappears --------------------------

  // A cached entry names files that were present when it was stored. When one
  // is gone the entry cannot be validated, and the required behavior is an
  // ordinary miss or a clear diagnostic — never a stale hit, and never a crash
  // with a stack trace.
  test('a deleted blob is reported, not served stale', () => {
    compileCold(tree, ENTRY);
    fs.unlinkSync(path.join(tree.dir, 'sgl_cfg_defaults.dat'));

    // Only the compile goes inside the try. Wrapping the assertions too would
    // catch their own failure and re-check it as if it were a compiler
    // diagnostic, reporting "no diagnostic" for what is really a stale binary.
    let warm: CompileResult | undefined;
    let message = '';
    try {
      warm = compileWarm(tree, ENTRY);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    if (warm !== undefined) {
      // It compiled — then it must not have quietly embedded the old blob.
      expect(warm.binary.includes(Buffer.from('SGLCFGv1'))).toBe(false);
    } else {
      expect(message).toMatch(/not found|DAT file/i);
      expect(message).not.toMatch(/at Object\.|at Module\./); // a diagnostic, not a stack dump
    }
  });
});
