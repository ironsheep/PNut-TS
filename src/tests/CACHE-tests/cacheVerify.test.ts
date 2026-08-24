/**
 * `--cache-verify` — proving the cache is honest.
 *
 * The flag compiles twice: once with no cache in a clean child process, once
 * normally, then compares. Two properties matter and both are tested here.
 *
 * 1. It must PASS on a healthy cache without disturbing the build.
 * 2. It must actually compare something. The failure that nearly shipped was a
 *    verification that always passed: output files are written through async
 *    streams, so reading them the instant `Compile()` returned produced the
 *    PREVIOUS run's bytes — the reference compared against itself. That is why
 *    the binary and map writers are synchronous, and why the test below asserts
 *    the compared artifacts actually change when the source does.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { referenceArgs } from '../../utils/cacheVerify';
import { fixturesDir, cleanupDir, cleanupOutputFiles } from './cacheFixtures';

const toolPath = path.resolve(__dirname, '../../pnut-ts.js');

const SGL = [
  'sgl_app_top.spin2',
  'sgl_shared_state.spin2',
  'sgl_svc_logger.spin2',
  'sgl_svc_config.spin2',
  'sgl_fmt_util.spin2',
  'sgl_tick_leaf.spin2',
  'sgl_cfg_defaults.dat'
];

function stage(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-verify-'));
  for (const name of SGL) fs.copyFileSync(path.join(fixturesDir, name), path.join(dir, name));
  return dir;
}

function run(dir: string, flags: string): { status: number; output: string } {
  try {
    const output = execSync(`node ${toolPath} ${flags} sgl_app_top.spin2`, { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, output };
  } catch (error: unknown) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('--cache-verify', () => {
  describe('reference argument construction', () => {
    test('strips every cache flag so the reference compile uses no cache', () => {
      const args = referenceArgs(['--cache-verify', '-C', '--cache-clear', '--cache-dir', '/tmp/x', '-m', 'top.spin2']);
      expect(args).toEqual(['-m', 'top.spin2']);
    });

    test('strips the --cache-dir=VALUE spelling too', () => {
      expect(referenceArgs(['--cache-dir=/tmp/x', '--cache', 'top.spin2'])).toEqual(['top.spin2']);
    });

    test('carries through everything that is not a cache flag', () => {
      // A reference built under different options would differ for reasons that
      // are not the cache's fault, so these must survive untouched.
      const args = referenceArgs(['--cache-verify', '-d', '-O', '-I', '/libs', '-D', 'SYM', 'top.spin2']);
      expect(args).toEqual(['-d', '-O', '-I', '/libs', '-D', 'SYM', 'top.spin2']);
    });
  });

  describe('end to end', () => {
    let dir: string;
    beforeEach(() => {
      dir = stage();
    });
    afterEach(() => {
      cleanupDir(dir);
    });

    test('passes on a cold cache and again on a warm one', () => {
      const cold = run(dir, '--cache-verify -m');
      expect(cold.status).toBe(0);
      expect(cold.output).toContain('Object cache verified');

      const warm = run(dir, '--cache-verify -m');
      expect(warm.status).toBe(0);
      expect(warm.output).toContain('Object cache verified');
      // The warm run must really have used the cache, or it verified nothing.
      expect(warm.output).toMatch(/Object cache: [1-9]\d* hit/);
    }, 60_000);

    test('leaves the same binary a plain cached build would', () => {
      run(dir, '--cache-verify -m');
      const verified = fs.readFileSync(path.join(dir, 'sgl_app_top.bin'));
      cleanupOutputFiles(dir, 'sgl_app_top');
      run(dir, '--cache -m');
      const plain = fs.readFileSync(path.join(dir, 'sgl_app_top.bin'));
      expect(Buffer.compare(verified, plain)).toBe(0);
    }, 60_000);

    test('the compared artifacts are readable immediately after the compile returns', () => {
      // Guards the async-write trap directly: edit the source, rebuild, and the
      // outputs on disk must reflect the edit the moment the process exits.
      run(dir, '--cache-verify -m');
      const before = fs.readFileSync(path.join(dir, 'sgl_app_top.bin'));
      const leaf = path.join(dir, 'sgl_tick_leaf.spin2');
      fs.writeFileSync(leaf, fs.readFileSync(leaf, 'utf8').replace('TICK_STEP = 1', 'TICK_STEP = 9'));
      const result = run(dir, '--cache-verify -m');
      expect(result.status).toBe(0);
      const after = fs.readFileSync(path.join(dir, 'sgl_app_top.bin'));
      expect(Buffer.compare(before, after)).not.toBe(0);
    }, 60_000);
  });
});
