/* eslint-disable no-console */
// insertBuildDate.js
const fs = require('fs');
const path = require('path');

const outfileName = '../out/pnut-ts.js';

const filePath = path.join(__dirname, outfileName); // Update this path to your compiled JavaScript file
const buildDate = new Date();

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file from disk: ${err}`);
  } else {
    // Replace the placeholder with the build date
    const result = data.replace('{buildDateHere}', `Build date: ${buildDate.toLocaleDateString()}`);

    fs.writeFile(filePath, result, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing file: ${err}`);
      }
    });
    console.timeLog(`Updated: ${outfileName}`);

  }
});
