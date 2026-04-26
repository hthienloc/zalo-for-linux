const fs = require('fs');
const path = require('path');

function patchSqlite(appDir) {
  try {
    const sqliteTargetDir = path.join(appDir, 'native', 'nativelibs', 'sqlite3', 'binding', 'napi-v6-linux-x64');
    fs.mkdirSync(sqliteTargetDir, { recursive: true });

    const targetNodePath = path.join(sqliteTargetDir, 'node_sqlite3.node');
    const sourceNodePath = path.join(__dirname, '..', '..', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node');

    if (fs.existsSync(sourceNodePath)) {
      fs.copyFileSync(sourceNodePath, targetNodePath);
      console.log('✅ SQLite3 Linux binary installed successfully!');
    } else {
      console.log('⚠️  SQLite3 binary not found in node_modules. Run "npm install" first.');
    }
  } catch (e) {
    console.error('❌ Failed to patch sqlite3:', e && e.message);
  }
}

module.exports = { patchSqlite };