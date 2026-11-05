/*
 * Jest reporter used by run-coverage.js: writes the counts and failures of a run
 * to options.outputFile. It runs beside the default reporter, so the run keeps the
 * console routing of the gated suite (Jest's --json would send console output to
 * stderr, which the suites capture as compiler output).
 */
'use strict';

const fs = require('fs');

class ResultsFileReporter {
  constructor(globalConfig, options) {
    this.outputFile = options.outputFile;
  }

  onRunComplete(_contexts, results) {
    const failed = [];
    for (const file of results.testResults) {
      if (file.testExecError)
        failed.push(
          `${file.testFilePath}: ${String(file.testExecError.message || '').split('\n')[0]}`
        );
      for (const a of file.testResults)
        if (a.status === 'failed') failed.push(a.fullName);
    }
    const out = {
      numTotalTestSuites: results.numTotalTestSuites,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      numTodoTests: results.numTodoTests,
      numRuntimeErrorTestSuites: results.numRuntimeErrorTestSuites,
      failed
    };
    fs.writeFileSync(this.outputFile, JSON.stringify(out));
  }
}

module.exports = ResultsFileReporter;
