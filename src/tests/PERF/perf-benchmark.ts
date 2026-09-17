/* eslint-disable no-console */
'use strict';

import { PNutInTypeScript } from '../../pnut-ts';
import { sync as globSync } from 'glob';
import { performance } from 'perf_hooks';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Path resolution (from dist/tests/PERF/ after compilation)
const ROOT_DIR = path.resolve(__dirname, '../../..');
const TEST_DIR = path.join(ROOT_DIR, 'TEST');
const RESULTS_DIR = path.join(TEST_DIR, 'PERF-results');

// The compiler writes its outputs (.lst/.obj/.bin/.map) next to the source
// file it compiled — there is no output-directory flag, only `-o` for the
// binary's basename. A benchmark run therefore used to overwrite files in
// TEST/ itself, including committed fixtures such as
// TEST/MAP-tests/test5-inline/inline_top.map with whatever the CURRENT
// generator produces — stale the moment the generator changes, and dirtying
// `git status` on every run. Each category's fixtures are copied once into a
// private temp directory outside the repo, and every compile in that category
// runs against the copy; nothing under TEST/ is ever written to.
const STAGING_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-perf-'));
process.on('exit', () => {
  try {
    fs.rmSync(STAGING_ROOT, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

/** Copy one category's fixture directory into the staging root, once. */
function stageCategory(category: string): string {
  const source = path.join(TEST_DIR, category);
  const staged = path.join(STAGING_ROOT, category);
  if (!fs.existsSync(staged) && fs.existsSync(source)) {
    fs.cpSync(source, staged, { recursive: true });
  }
  return STAGING_ROOT;
}

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const VERSION: string = packageJson.version;

// ─── Interfaces ──────────────────────────────────────────────────────

interface FileResult {
  file: string;
  timeMs: number;
  sizeBytes: number;
  error?: string;
}

interface CategoryResult {
  files: number;
  totalMs: number;
  avgMs: number;
  results: FileResult[];
}

interface BenchmarkResults {
  timestamp: string;
  version: string;
  nodeVersion: string;
  totalFiles: number;
  totalTimeMs: number;
  categories: Record<string, CategoryResult>;
}

// ─── Category Configuration ──────────────────────────────────────────

type DebugRule = 'none' | 'all' | 'all-except' | 'prefixes' | 'name-contains-debug';

interface CategoryConfig {
  flags: string[];
  debugRule: DebugRule;
  noDebugFiles?: string[];
  debugPrefixes?: string[];
  specialArgs?: boolean;
  globPattern?: string; // override for non-standard directory layouts
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'CON-tests': { flags: [], debugRule: 'none' },
  'DAT-PASM-tests': { flags: ['-O'], debugRule: 'none' },
  'DBG-tests': { flags: ['-O'], debugRule: 'all' },
  'EXT-tests': { flags: ['-O'], debugRule: 'none' },
  'LANG-FEAT-tests': { flags: ['-O'], debugRule: 'none' },
  'LANG-VER-tests': { flags: ['-O'], debugRule: 'all-except', noDebugFiles: ['spin_builtin_math_v51.spin2'] },
  'LARGE-tests': {
    flags: ['-O'],
    debugRule: 'prefixes',
    debugPrefixes: ['flash_fs_demo', 'demo_octo', 'demo_p2gw', 'demo_180', 'demo_quad'],
    globPattern: '*/*.spin2'
  },
  'LOADER-tests': { flags: ['-O'], debugRule: 'none' },
  'OBJ-tests': { flags: ['-O'], debugRule: 'none' },
  'SPIN-tests': { flags: ['-O'], debugRule: 'none' },
  'VAR-tests': { flags: ['-O'], debugRule: 'none' },
  'PREPROC-tests': { flags: ['-i'], debugRule: 'none', specialArgs: true },
  'MAP-tests': { flags: ['-m'], debugRule: 'none' },
  'FLASH-tests': { flags: ['-O', '-F'], debugRule: 'none' },
  'ENCODING-tests': { flags: ['-O'], debugRule: 'none' },
  'V52A-tests': { flags: ['-O'], debugRule: 'name-contains-debug' },
  'WUMMI-tests': { flags: ['-O'], debugRule: 'all' }
};

// ─── File Discovery ──────────────────────────────────────────────────

function discoverFiles(category: string, testDirBase: string): string[] {
  const testDirPath = path.join(testDirBase, category);

  if (!fs.existsSync(testDirPath)) {
    console.warn(`  WARNING: Test directory not found: ${testDirPath}`);
    return [];
  }

  // MAP-tests: discover top files from expected.json in subdirectories
  if (category === 'MAP-tests') {
    return discoverMapFiles(testDirPath);
  }

  const config = CATEGORY_CONFIG[category];
  const pattern = config.globPattern ?? '*.spin2';
  let files: string[] = [];

  try {
    files = globSync(path.join(testDirPath, pattern));
  } catch (error) {
    console.error(`  ERROR: glob issue for ${category}:`, error);
    return [];
  }

  // Standard filters
  files = files.filter((f) => !f.endsWith('__pre.spin2') && !f.endsWith('-pre.spin2'));

  // PREPROC: also filter byHandPre files
  if (category === 'PREPROC-tests') {
    files = files.filter((f) => !f.endsWith('.byHandPre.spin2'));
  }

  // LARGE-tests: apply same exclusions as regression tests
  if (category === 'LARGE-tests') {
    files = files.filter((f) => !f.includes('BLDC-Motor-drv') && !f.includes('iOTgw') && !f.includes('TOF/'));
  }

  files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return files;
}

function discoverMapFiles(testDirPath: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(testDirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const expectedPath = path.join(testDirPath, entry.name, 'expected.json');
    if (!fs.existsSync(expectedPath)) continue;

    try {
      const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
      if (expected.top_file) {
        const topFilePath = path.join(testDirPath, entry.name, expected.top_file);
        if (fs.existsSync(topFilePath)) {
          files.push(topFilePath);
        }
      }
    } catch {
      // Skip malformed expected.json
    }
  }

  files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return files;
}

// ─── Argument Building ───────────────────────────────────────────────

function needsDebug(category: string, filePath: string): boolean {
  const config = CATEGORY_CONFIG[category];
  const basename = path.basename(filePath);

  switch (config.debugRule) {
    case 'none':
      return false;
    case 'all':
      return true;
    case 'all-except':
      return !(config.noDebugFiles ?? []).includes(basename);
    case 'prefixes':
      return (config.debugPrefixes ?? []).some((prefix) => basename.startsWith(prefix));
    case 'name-contains-debug':
      return basename.toLowerCase().includes('debug');
  }
}

function getPreprocSpecialArgs(filePath: string): string[] {
  const testDirPath = path.dirname(filePath);
  const basename = path.basename(filePath, '.spin2');

  if (basename === 'include') {
    return ['-I', path.join(testDirPath, 'inc'), '--pass', 'preprocess'];
  } else if (basename === 'condCodeElse') {
    return ['-D', 'CLOCK_300MHZ'];
  } else if (basename === 'condNestCodeCmdLn') {
    return ['-D', 'USE_PSRAM8', '-U', 'USE_PSRAM16'];
  }
  return [];
}

function getArgsForFile(category: string, filePath: string): string[] {
  const config = CATEGORY_CONFIG[category];
  const debugFlag = needsDebug(category, filePath) ? ['-d'] : [];
  const specialArgs = config.specialArgs ? getPreprocSpecialArgs(filePath) : [];

  return ['node', 'pnut-ts.js', ...debugFlag, ...specialArgs, ...config.flags, '--', filePath];
}

// ─── Console Suppression ─────────────────────────────────────────────

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

function suppressConsole(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stdout.write = (() => true) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stderr.write = (() => true) as any;
}

function restoreConsole(): void {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
}

// ─── Benchmark Execution ─────────────────────────────────────────────

async function benchmarkFile(args: string[]): Promise<{ timeMs: number; error?: string }> {
  suppressConsole();
  try {
    const start = performance.now();
    const compiler = new PNutInTypeScript(args);
    await compiler.run();
    const elapsed = performance.now() - start;
    return { timeMs: Math.round(elapsed * 10) / 10 };
  } catch (error) {
    const elapsed = -1;
    const message = error instanceof Error ? error.message : String(error);
    return { timeMs: elapsed, error: message };
  } finally {
    restoreConsole();
  }
}

// ─── Output Formatting ──────────────────────────────────────────────

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

function printSummaryTable(results: BenchmarkResults): void {
  const header = `${padRight('Category', 20)} ${padLeft('Files', 6)} ${padLeft('Total(ms)', 11)} ${padLeft('Avg(ms)', 10)} ${padLeft('Min(ms)', 10)} ${padLeft('Max(ms)', 10)}`;
  const separator = '─'.repeat(header.length);

  console.log('');
  console.log(header);
  console.log(separator);

  let totalFiles = 0;
  let totalTime = 0;
  let globalMin = Infinity;
  let globalMax = -Infinity;

  const categories = Object.keys(results.categories).sort();
  for (const cat of categories) {
    const catResult = results.categories[cat];
    const successResults = catResult.results.filter((r) => r.timeMs >= 0);

    if (successResults.length === 0) {
      console.log(`${padRight(cat, 20)} ${padLeft(String(catResult.files), 6)} ${padLeft('(all failed)', 11)}`);
      continue;
    }

    const times = successResults.map((r) => r.timeMs);
    const min = Math.min(...times);
    const max = Math.max(...times);

    totalFiles += successResults.length;
    totalTime += catResult.totalMs;
    if (min < globalMin) globalMin = min;
    if (max > globalMax) globalMax = max;

    console.log(
      `${padRight(cat, 20)} ${padLeft(String(catResult.files), 6)} ${padLeft(catResult.totalMs.toFixed(1), 11)} ${padLeft(catResult.avgMs.toFixed(1), 10)} ${padLeft(min.toFixed(1), 10)} ${padLeft(max.toFixed(1), 10)}`
    );
  }

  console.log(separator);
  const overallAvg = totalFiles > 0 ? totalTime / totalFiles : 0;
  console.log(
    `${padRight('TOTAL', 20)} ${padLeft(String(totalFiles), 6)} ${padLeft(totalTime.toFixed(1), 11)} ${padLeft(overallAvg.toFixed(1), 10)} ${padLeft(globalMin === Infinity ? 'N/A' : globalMin.toFixed(1), 10)} ${padLeft(globalMax === -Infinity ? 'N/A' : globalMax.toFixed(1), 10)}`
  );
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`PNut-TS Performance Benchmark v${VERSION}`);
  console.log(`Node ${process.version} on ${process.platform} ${process.arch}`);
  console.log('');

  const results: BenchmarkResults = {
    timestamp: new Date().toISOString(),
    version: VERSION,
    nodeVersion: process.version,
    totalFiles: 0,
    totalTimeMs: 0,
    categories: {}
  };

  const categoryNames = Object.keys(CATEGORY_CONFIG);

  for (const category of categoryNames) {
    const stagedBase = stageCategory(category);
    const files = discoverFiles(category, stagedBase);
    console.log(`Benchmarking ${category} (${files.length} files)...`);

    const categoryResults: FileResult[] = [];

    for (const filePath of files) {
      const args = getArgsForFile(category, filePath);
      const sizeBytes = fs.statSync(filePath).size;
      const basename = path.basename(filePath);

      const { timeMs, error } = await benchmarkFile(args);

      const result: FileResult = { file: basename, timeMs, sizeBytes };
      if (error) {
        result.error = error;
      }
      categoryResults.push(result);

      // Show progress for individual files
      if (error) {
        console.log(`  FAIL  ${basename} (${error.substring(0, 60)})`);
      }
    }

    // Compute category totals
    const successResults = categoryResults.filter((r) => r.timeMs >= 0);
    const totalMs = successResults.reduce((sum, r) => sum + r.timeMs, 0);
    const avgMs = successResults.length > 0 ? totalMs / successResults.length : 0;

    results.categories[category] = {
      files: categoryResults.length,
      totalMs: Math.round(totalMs * 10) / 10,
      avgMs: Math.round(avgMs * 10) / 10,
      results: categoryResults
    };
  }

  // Compute overall totals
  const allCategories = Object.values(results.categories);
  results.totalFiles = allCategories.reduce((sum, c) => sum + c.files, 0);
  results.totalTimeMs = Math.round(allCategories.reduce((sum, c) => sum + c.totalMs, 0) * 10) / 10;

  // Print summary table
  printSummaryTable(results);

  // Save JSON results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const outputPath = path.join(RESULTS_DIR, `benchmark-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2) + '\n');
  console.log(`Results saved to: ${outputPath}`);
}

main().catch((err) => {
  restoreConsole();
  console.error('Benchmark failed:', err);
  process.exit(1);
});
