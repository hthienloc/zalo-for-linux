const { app, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const windowManager = require('./src/main/window-manager');
const trayManager = require('./src/main/tray-manager');
const screenshotBridge = require('./src/main/screenshot-bridge');

// Paths
// ---------------------------------------------------------------------------

const appDir = fs.existsSync(path.join(__dirname, 'app'))
  ? path.join(__dirname, 'app')
  : path.join(path.dirname(process.execPath), 'app');

const iconPath = path.join(appDir, 'pc-dist', 'favicon-512x512.png');
const trayIconPath = iconPath;

// Wire up dependencies
trayManager.setWindowManager(windowManager);

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.on('before-quit', () => {
  windowManager.setAppQuitting(true);
  trayManager.destroyTray();
  try { globalShortcut.unregisterAll(); } catch (_) { }
});
 
app.once('ready', () => {
});

app.on('browser-window-created', (_evt, win) => {
  try {
    if (fs.existsSync(iconPath)) {
      win.setIcon(iconPath);
    }

    screenshotBridge.setupScreenshotBridge(windowManager);

    windowManager.setupWindowEvents(win, trayManager, () => {
      trayManager.updateTrayMenu();
    });
  } catch (e) {
    console.error('Error in browser-window-created:', e);
  }
});

// ---------------------------------------------------------------------------
// Ready
// ---------------------------------------------------------------------------

app.once('ready', () => {
  try { Menu.setApplicationMenu(null); } catch (_) { }

  const effectiveTrayIconPath = fs.existsSync(trayIconPath) ? trayIconPath : iconPath;

  if (fs.existsSync(effectiveTrayIconPath)) {
    trayManager.initTray(effectiveTrayIconPath);
    try {
      globalShortcut.register('CommandOrControl+Shift+I', windowManager.toggleDevTools);
    } catch (e) {
      console.error('Global shortcut register failed:', e);
    }
  }
});

// ---------------------------------------------------------------------------
// Bootstrap Zalo
// ---------------------------------------------------------------------------

function bootstrap() {
  const bootstrapPath = path.join(appDir, 'bootstrap.js');
  if (!fs.existsSync(bootstrapPath)) {
    console.error('Zalo bootstrap.js not found at:', bootstrapPath);
    return;
  }
  process.chdir(appDir);
  try {
    require(bootstrapPath);
  } catch (e) {
    console.error('Error loading Zalo:', e);
  }
}

bootstrap();
