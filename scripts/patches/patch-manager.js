const { patchTitlebar } = require('./titlebar-patch');
const { patchSqlite } = require('./sqlite-patch');

function runAllPatches(appDir) {
  console.log('🔧 Running patches...');
  patchTitlebar(appDir);
  patchSqlite(appDir);
  console.log('✅ All patches executed.');
}

module.exports = { runAllPatches };