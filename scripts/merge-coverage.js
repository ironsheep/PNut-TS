#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs-extra');

// from perplexity conversation: https://www.perplexity.ai/search/are-there-coverage-tools-we-ca-QZZ0L9vJQieMOCMUafS3Hw

//import { execSync } from 'child_process';
//import fs from 'fs-extra';

const REPORTS_FOLDER = 'jest-coverage';
const FINAL_OUTPUT_FOLDER = 'jest-coverage-merged';

const run = (commands) => {
  commands.forEach((command) => execSync(command, { stdio: 'inherit' }));
};

// Create the reports folder and move the reports from different test runs inside it
fs.emptyDirSync(FINAL_OUTPUT_FOLDER);
fs.copyFileSync(
  `${REPORTS_FOLDER}/coverage-final.json`,
  `${FINAL_OUTPUT_FOLDER}/jest-coverage.json`
);

// Add more coverage files if you have multiple test runs
// fs.copyFileSync('another-coverage/coverage-final.json', `${REPORTS_FOLDER}/another-coverage.json`);

fs.emptyDirSync('.nyc_output');
fs.emptyDirSync(FINAL_OUTPUT_FOLDER);

// Run "nyc merge" inside the reports folder, merging the coverage files into one
run([
  `nyc merge ${REPORTS_FOLDER} && mv coverage.json .nyc_output/out.json`,
  `nyc report --reporter=lcov --report-dir=${FINAL_OUTPUT_FOLDER}`
]);

console.log('Merged coverage report created in ./coverage');
