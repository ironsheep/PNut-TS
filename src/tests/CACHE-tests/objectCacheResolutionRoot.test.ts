/**
 * The resolution root is part of a child object's identity.
 *
 * `OBJ k : "kid"` and `DAT ... FILE "blob.dat"` are LOGICAL names. Which file
 * each reaches is decided by the top-level file's directory and the -I search
 * list — not by the child's own source. So one shared library object can, and
 * must, compile to different bytes under two different apps.
 *
 * Before the resolution context entered the cache key, it didn't: the second
 * app was served the first app's binary. No flag was needed to reach it beyond
 * `-C` — two apps in one project, both built from the project root, share the
 * default `.pnut-cache` and collided there.
 *
 * Every assertion here is against an UNCACHED compile of the same tree. The
 * cache is only ever correct insofar as it reproduces what a plain compile
 * would have produced.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fixturesDir, compileSpin2, cleanupDir } from './cacheFixtures';

/** appA and appB, sharing one library object, each with its own blob.dat. */
interface TwoAppProject {
  root: string;
  cleanup: () => void;
}

const TOP = 'root_app_top.spin2';

function stageTwoAppProject(): TwoAppProject {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cache-resroot-'));
  fs.mkdirSync(path.join(root, 'lib'));
  fs.copyFileSync(path.join(fixturesDir, 'root_lib_blobholder.spin2'), path.join(root, 'lib', 'root_lib_blobholder.spin2'));
  // The two apps get byte-identical sources and differing blobs. The blob is
  // named identically in both — that collision of LOGICAL name over differing
  // content is the whole point of the fixture.
  for (const [app, blob] of [
    ['appA', 'root_app_alpha.dat'],
    ['appB', 'root_app_beta.dat']
  ]) {
    fs.mkdirSync(path.join(root, app));
    fs.copyFileSync(path.join(fixturesDir, TOP), path.join(root, app, TOP));
    fs.copyFileSync(path.join(fixturesDir, blob), path.join(root, app, 'blob.dat'));
  }
  return { root, cleanup: () => cleanupDir(root) };
}

/** Compile `<app>/root_app_top.spin2` from the PROJECT ROOT, returning its binary. */
function buildApp(project: TwoAppProject, app: string, cacheFlags: string): Buffer {
  const binPath = path.join(project.root, app, TOP.replace(/\.spin2$/, '.bin'));
  if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
  const libDir = path.join(project.root, 'lib');
  compileSpin2(project.root, path.join(app, TOP), `-I ${libDir} ${cacheFlags}`.trim());
  return fs.readFileSync(binPath);
}

describe('ObjectCache — the resolution root is part of a child object identity', () => {
  let project: TwoAppProject;

  beforeEach(() => {
    project = stageTwoAppProject();
  });

  afterEach(() => {
    project.cleanup();
  });

  test('two apps sharing a library object each get their OWN FILE blob (default cache dir)', () => {
    const truthA = buildApp(project, 'appA', '');
    const truthB = buildApp(project, 'appB', '');

    // Guard against a vacuous test: if the two uncached builds were identical,
    // every later assertion would pass while proving nothing.
    expect(Buffer.compare(truthA, truthB)).not.toBe(0);

    // No --cache-dir: both apps land in the same default .pnut-cache under the
    // project root. This is the configuration that served the wrong binary.
    const cachedA = buildApp(project, 'appA', '--cache');
    const cachedB = buildApp(project, 'appB', '--cache');

    expect(Buffer.compare(cachedA, truthA)).toBe(0);
    expect(Buffer.compare(cachedB, truthB)).toBe(0);
  });

  test('order does not matter — appB first, then appA', () => {
    const truthA = buildApp(project, 'appA', '');
    const truthB = buildApp(project, 'appB', '');

    const cachedB = buildApp(project, 'appB', '--cache');
    const cachedA = buildApp(project, 'appA', '--cache');

    expect(Buffer.compare(cachedB, truthB)).toBe(0);
    expect(Buffer.compare(cachedA, truthA)).toBe(0);
  });

  test('two projects sharing one explicit --cache-dir stay independent', () => {
    const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cache-shared-'));
    try {
      const truthA = buildApp(project, 'appA', '');
      const truthB = buildApp(project, 'appB', '');

      const cachedA = buildApp(project, 'appA', `--cache --cache-dir ${shared}`);
      const cachedB = buildApp(project, 'appB', `--cache --cache-dir ${shared}`);

      expect(Buffer.compare(cachedA, truthA)).toBe(0);
      expect(Buffer.compare(cachedB, truthB)).toBe(0);
    } finally {
      cleanupDir(shared);
    }
  });

  test('rebuilding one app repeatedly still matches its uncached binary', () => {
    const truthA = buildApp(project, 'appA', '');
    buildApp(project, 'appA', '--cache'); // cold, populates
    const warmA = buildApp(project, 'appA', '--cache'); // warm, must still be right
    expect(Buffer.compare(warmA, truthA)).toBe(0);
  });
});
