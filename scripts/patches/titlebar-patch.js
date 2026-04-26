const fs = require('fs');
const path = require('path');

function patchTitlebar(appDir) {
  try {
    const mainJsPath = path.join(appDir, 'main-dist', 'main.js');
    if (fs.existsSync(mainJsPath)) {
      let mainContent = fs.readFileSync(mainJsPath, 'utf8');

      if (mainContent.includes('T,frame:!1')) {
        mainContent = mainContent.replace(/T,frame:!1/g, 'T,frame:!0');
        fs.writeFileSync(mainJsPath, mainContent, 'utf8');
        console.log('✅ Patched T,frame:!1 -> T,frame:!0 (title bar enabled)');
      } else {
        console.log('⚠️  Pattern T,frame:!1 not found in main.js, skipping patch');
      }
    } else {
      console.log('⚠️  main.js not present, skipping patch');
    }
  } catch (e) {
    console.error('❌ Failed to patch main.js:', e && e.message);
  }
}

module.exports = { patchTitlebar };