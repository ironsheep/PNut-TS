/**
 * The duplicate-source warning.
 *
 * "Build correctly, but be loud": a build that reaches byte-identical source at
 * two different paths is still correct, so this must stay a WARNING and must
 * never fail a build. What it must also do is stay quiet about ordinary reuse —
 * one object declared several times is the single commonest shape in Spin2, and
 * a diagnostic that cries wolf there would be turned off and never read again.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { DuplicateSourceWatch } from '../../utils/duplicateSources';
import { fixturesDir, cleanupDir } from './cacheFixtures';

const toolPath = path.resolve(__dirname, '../../pnut-ts.js');

function compile(dir: string, entry: string, flags = ''): string {
  try {
    return execSync(`node ${toolPath} ${flags} ${entry}`, { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string };
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

describe('duplicate source detection', () => {
  describe('DuplicateSourceWatch', () => {
    let dir: string;
    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-dupwatch-'));
    });
    afterEach(() => cleanupDir(dir));

    test('the same path noted twice is ordinary reuse, not duplication', () => {
      const file = path.join(dir, 'a.spin2');
      fs.writeFileSync(file, 'PUB go()\n');
      const watch = new DuplicateSourceWatch();
      expect(watch.note(file)).toBeUndefined();
      expect(watch.note(file)).toBeUndefined();
    });

    test('identical content at two paths is reported once, naming both', () => {
      const first = path.join(dir, 'a.spin2');
      const second = path.join(dir, 'b.spin2');
      fs.writeFileSync(first, 'PUB go()\n');
      fs.writeFileSync(second, 'PUB go()\n');
      const watch = new DuplicateSourceWatch();
      expect(watch.note(first)).toBeUndefined();
      const warning = watch.note(second);
      expect(warning).toContain('Duplicate source');
      expect(warning).toContain(first);
      expect(warning).toContain(second);
      // A pair is worth saying once.
      expect(watch.note(second)).toBeUndefined();
    });

    test('content decides, not name or timestamp', () => {
      const first = path.join(dir, 'a.spin2');
      const second = path.join(dir, 'b.spin2');
      fs.writeFileSync(first, 'PUB go()\n');
      fs.writeFileSync(second, 'PUB go()\n');
      const later = new Date(Date.now() + 10_000);
      fs.utimesSync(second, later, later);
      const watch = new DuplicateSourceWatch();
      watch.note(first);
      expect(watch.note(second)).toContain('Duplicate source');
    });

    test('an unreadable path is ignored rather than thrown', () => {
      const watch = new DuplicateSourceWatch();
      expect(watch.note(path.join(dir, 'does-not-exist.spin2'))).toBeUndefined();
    });
  });

  describe('end to end', () => {
    let dir: string;
    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-dupsrc-'));
    });
    afterEach(() => cleanupDir(dir));

    test('warns when two -I directories hold the same object, and still builds', () => {
      fs.mkdirSync(path.join(dir, 'libA'));
      fs.mkdirSync(path.join(dir, 'libB'));
      fs.writeFileSync(path.join(dir, 'libA', 'helper.spin2'), 'PUB value() : r\n  r := 42\n');
      fs.writeFileSync(path.join(dir, 'libB', 'helper2.spin2'), 'PUB value() : r\n  r := 42\n');
      fs.writeFileSync(
        path.join(dir, 'top.spin2'),
        'CON\n  _clkfreq = 200_000_000\nOBJ\n  a : "helper"\n  b : "helper2"\nPUB main() : r\n  r := a.value() + b.value()\n'
      );
      const output = compile(dir, 'top.spin2', `-I ${path.join(dir, 'libA')} -I ${path.join(dir, 'libB')}`);
      expect(output).toContain('Duplicate source');
      // A warning, not an error: the binary must still be produced.
      expect(fs.existsSync(path.join(dir, 'top.bin'))).toBe(true);
    }, 30_000);

    test('stays silent when one object is declared several times', () => {
      // sgl_app_top declares sgl_svc_logger twice. That is ordinary Spin2 and
      // must never warn, or the diagnostic becomes noise people filter out.
      for (const name of [
        'sgl_app_top.spin2',
        'sgl_shared_state.spin2',
        'sgl_svc_logger.spin2',
        'sgl_svc_config.spin2',
        'sgl_fmt_util.spin2',
        'sgl_tick_leaf.spin2',
        'sgl_cfg_defaults.dat'
      ]) {
        fs.copyFileSync(path.join(fixturesDir, name), path.join(dir, name));
      }
      const output = compile(dir, 'sgl_app_top.spin2');
      expect(output).not.toContain('Duplicate source');
      expect(fs.existsSync(path.join(dir, 'sgl_app_top.bin'))).toBe(true);
    }, 30_000);
  });
});
