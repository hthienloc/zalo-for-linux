const { ipcMain } = require('electron');
const { execSync } = require('child_process');

function triggerScreenshot() {
  const { exec } = require('child_process');
  const tools = [
    { name: 'spectacle', cmd: 'spectacle -rbc' },
    { name: 'flameshot', cmd: 'flameshot gui' },
    { name: 'gnome-screenshot', cmd: 'gnome-screenshot -ac' },
    { name: 'xfce4-screenshooter', cmd: 'xfce4-screenshooter -rc' }
  ];

  return new Promise((resolve) => {
    let found = false;
    for (const tool of tools) {
      try {
        execSync(`which ${tool.name}`, { stdio: 'ignore' });
        found = true;
        console.log(`[Zalo Bridge] Triggering ${tool.name} (Async)...`);
        exec(tool.cmd, (err) => {
          if (err) console.error(`[Zalo Bridge] ${tool.name} error:`, err.message);
        });
        setTimeout(() => resolve(true), 1500);
        break;
      } catch (e) { continue; }
    }
    if (!found) resolve(false);
  });
}

function setupScreenshotBridge(windowManager) {
  const originalHandle = ipcMain.handle;
  ipcMain.handle = function (channel, handler) {
    if (channel === 'screen-capture') {
      const wrappedHandler = async (event, ...args) => {
        const opts = args[0];
        if (opts && opts.captureMode === false) {
          const mainWindow = windowManager.getMainWindow();
          if (mainWindow) mainWindow.hide();
          await triggerScreenshot();
          if (mainWindow) {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('show-from-tray');
          }
          return true;
        }
        return handler(event, ...args);
      };
      return originalHandle.apply(ipcMain, [channel, wrappedHandler]);
    }
    return originalHandle.apply(ipcMain, [channel, handler]);
  };
}

module.exports = {
  setupScreenshotBridge
};