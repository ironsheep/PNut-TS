/**
 * Listing (-l), preprocessor report (-i) and --regression outputs must be
 * complete the instant the compiler process exits.
 *
 * Before this fix, all four writers used fs.createWriteStream() and
 * stream.end() -- which returns before the bytes reach disk. A reader
 * (another process, a test harness, --cache-verify's own reference compare)
 * that opens the file right after the compiler exits could see a stale or
 * truncated version. That defect class is why the .bin/.flash/.map writers
 * were already made synchronous (see mapGenerator.ts:69); this suite covers
 * the remaining four.
 *
 * It also covers the unwritable-output-path case: today's fix means a write
 * failure there is reported the same way as any other compile-phase error
 * (`path:line:error:text` on stderr, non-zero exit) instead of an uncaught
 * Node exception with a raw stack trace.
 */

'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { cleanupDir } from './cacheFixtures';

const toolPath = path.resolve(__dirname, '../../pnut-ts.js');

/** Multi-object fixture: exercises -l on a program with a child object. */
const OBJ_TEST_DIR = path.resolve(__dirname, '../../../TEST/OBJ-tests');
const OBJ_TOP = 'spin_test20.spin2';
const OBJ_CHILD = 'spin_test20_child.spin2';

/** Fixture with #ifdef/#else/#endif preprocessor directives, for -i. */
const PREPROC_TEST_DIR = path.resolve(__dirname, '../../../TEST/PREPROC-tests');
const PREPROC_SRC = 'condCode.spin2';

function stageInto(files: Array<{ srcDir: string; name: string }>, label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pnut-syncwrite-${label}-`));
  for (const { srcDir, name } of files) {
    fs.copyFileSync(path.join(srcDir, name), path.join(dir, name));
  }
  return dir;
}

/** True when running as root, under which chmod 0o555 does not deny writes. */
function isRoot(): boolean {
  return typeof process.getuid === 'function' && process.getuid() === 0;
}

describe('synchronous writers: -l, -i, --regression', () => {
  let dir: string;

  afterEach(() => {
    if (dir) cleanupDir(dir);
  });

  test('-l and -i outputs are complete the instant the process exits', () => {
    dir = stageInto(
      [
        { srcDir: OBJ_TEST_DIR, name: OBJ_TOP },
        { srcDir: OBJ_TEST_DIR, name: OBJ_CHILD }
      ],
      'lst-i'
    );

    execFileSync(process.execPath, [toolPath, '-l', '-i', '-q', path.join(dir, OBJ_TOP)], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Read both files back the instant the child process has returned --
    // exactly the scenario an async stream.end() could leave incomplete.
    const lstPath = path.join(dir, 'spin_test20.lst');
    const prePath = path.join(dir, 'spin_test20__pre.spin2');

    expect(fs.existsSync(lstPath)).toBe(true);
    expect(fs.existsSync(prePath)).toBe(true);

    const lstContent = fs.readFileSync(lstPath, 'utf8');
    const preContent = fs.readFileSync(prePath, 'utf8');

    // Complete-content assertions: the listing carries the emitted symbol
    // list and the OBJ-byte summary line; the preprocessed source carries
    // every line of the original, ending on its trailing newline.
    expect(lstContent).toContain('Spin2_v');
    expect(lstContent).toMatch(/OBJ bytes:/);
    expect(lstContent.length).toBeGreaterThan(0);
    expect(preContent.length).toBeGreaterThan(0);
    expect(preContent.endsWith('\n')).toBe(true);

    const originalLines = fs.readFileSync(path.join(dir, OBJ_TOP), 'utf8').split(/\r\n|\n/).length;
    const preLines = preContent.split('\n').length;
    // writeProprocessedSrc emits one line per input line plus the trailing
    // newline from the final push, so line counts should match (+/-1 for the
    // split's trailing empty entry).
    expect(preLines).toBeGreaterThanOrEqual(originalLines - 1);
  });

  test('--regression element/preproc/resolver outputs are complete the instant the process exits', () => {
    dir = stageInto(
      [
        { srcDir: OBJ_TEST_DIR, name: OBJ_TOP },
        { srcDir: OBJ_TEST_DIR, name: OBJ_CHILD },
        { srcDir: PREPROC_TEST_DIR, name: PREPROC_SRC }
      ],
      'regression'
    );

    execFileSync(process.execPath, [toolPath, '--regression', 'element', '-q', path.join(dir, OBJ_TOP)], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    execFileSync(process.execPath, [toolPath, '--regression', 'resolver', '-q', path.join(dir, OBJ_TOP)], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    execFileSync(process.execPath, [toolPath, '--regression', 'preproc', '-q', path.join(dir, PREPROC_SRC)], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const elemPath = path.join(dir, 'spin_test20.elem');
    const resolvPath = path.join(dir, 'spin_test20.resolv');
    const prePath = path.join(dir, 'condCode.pre');

    for (const p of [elemPath, resolvPath, prePath]) {
      expect(fs.existsSync(p)).toBe(true);
    }

    const elemContent = fs.readFileSync(elemPath, 'utf8');
    const resolvContent = fs.readFileSync(resolvPath, 'utf8');
    const preContent = fs.readFileSync(prePath, 'utf8');

    expect(elemContent).toContain('# Report for regression testing');
    expect(elemContent.trim().endsWith('# ---------------------------------------')).toBe(true);
    expect(resolvContent).toContain("' Report for resolver testing");
    expect(resolvContent.trim().endsWith("' ---------------------------------------")).toBe(true);
    expect(preContent).toContain("' Report for regression testing");
    expect(preContent.trim().endsWith("' ---------------------------------------")).toBe(true);
  });

  test('an unwritable output directory is reported cleanly, not as an uncaught crash', () => {
    if (isRoot()) {
      // eslint-disable-next-line no-console
      console.warn('SKIPPED: running as root -- chmod 0o555 does not deny root a write, so this probe cannot fire.');
      return;
    }

    dir = stageInto(
      [
        { srcDir: OBJ_TEST_DIR, name: OBJ_TOP },
        { srcDir: OBJ_TEST_DIR, name: OBJ_CHILD }
      ],
      'unwritable'
    );
    fs.chmodSync(dir, 0o555);

    let threw = false;
    let stderrText = '';
    let status: number | null = 0;
    try {
      execFileSync(process.execPath, [toolPath, '-l', '-q', path.join(dir, OBJ_TOP)], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (error: unknown) {
      threw = true;
      const execError = error as { status: number | null; stderr: string };
      status = execError.status;
      stderrText = execError.stderr;
    } finally {
      // restore write access so afterEach can clean up
      fs.chmodSync(dir, 0o755);
    }

    expect(threw).toBe(true);
    expect(status).not.toBe(0);
    // Clean compiler-error contract: "path:line:error:text" on stderr.
    expect(stderrText).toMatch(/spin_test20\.spin2:\d+:error:/);
    expect(stderrText).toContain('spin_test20.lst');
    // Must NOT regress to the old async-stream crash shape.
    expect(stderrText).not.toContain("Unhandled 'error' event");
    expect(stderrText).not.toMatch(/at emitErrorNT/);
    // Must NOT falsely announce success for the file that failed to write.
    expect(stderrText).not.toMatch(/Wrote .*spin_test20\.lst/);
  });
});
