// jest.config.js
const additionalConfig1 = require('./jest-config/jest-coverage-config.json');

module.exports = {
  ...require('./old.jestconfig.json'), // Main configuration
  ...additionalConfig1 // Merge additional configurations
  // Use Object.assign or lodash's _.merge for more complex scenarios
};
