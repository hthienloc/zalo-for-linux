const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, session } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
// ---------------------------------------------------------------------------

const appDir = fs.existsSync(path.join(__dirname, 'app'))
  ? path.join(__dirname, 'app')
  : path.join(path.dirname(process.execPath), 'app');

const iconPath = path.join(appDir, 'pc-dist', 'favicon-512x512.png');
const trayIconPath = iconPath;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let tray = null;
let mainWindow = null;
let isAppQuitting = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleDevTools() {
  try {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (win && win.webContents) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    }
  } catch (e) {
    console.error('Toggle DevTools failed', e);
  }
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    // Synchronize Zalo's internal UI state
    try {
      mainWindow.webContents.send('show-from-tray');
    } catch (e) {
      console.error('Failed to send show-from-tray:', e);
    }
  }
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: showMainWindow
    },
    {
      label: 'Hide',
      click: hideMainWindow
    },
    {
      label: 'Toggle DevTools',
      click: toggleDevTools
    },
    {
      label: 'Quit',
      click: () => {
        isAppQuitting = true;
        if (tray) {
          tray.destroy();
          tray = null;
        }
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.on('before-quit', () => {
  isAppQuitting = true;
  if (tray) {
    tray.destroy();
    tray = null;
  }
  try { globalShortcut.unregisterAll(); } catch (_) { }
});
 
app.once('ready', () => {
});

app.on('browser-window-created', (_evt, win) => {
  try {
    if (fs.existsSync(iconPath)) {
      win.setIcon(iconPath);
    }

    win.setMenuBarVisibility(false);
    if (win.removeMenu) win.removeMenu();
    win.autoHideMenuBar = true;

    // Detect Zalo main window by title
    const checkTitle = (title) => {
      if (title.includes('Zalo')) {
        mainWindow = win;
        updateTrayMenu();
      }
    };

    // Robust multi-tool fullscreen screenshot bridge (Linux)
    const triggerScreenshot = () => {
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
            // Synchronous check is fine for existence
            execSync(`which ${tool.name}`, { stdio: 'ignore' });
            found = true;
            console.log(`[Zalo Bridge] Triggering ${tool.name} (Async)...`);
            exec(tool.cmd, (err) => {
              if (err) console.error(`[Zalo Bridge] ${tool.name} error:`, err.message);
            });
            // Speculative restore: Assume tool grabs screen in < 1500ms
            setTimeout(() => resolve(true), 1500);
            break;
          } catch (e) { continue; }
        }
        if (!found) resolve(false);
      });
    };
 
    // Linux Screenshot Bridge
    const originalHandle = ipcMain.handle;
    ipcMain.handle = function (channel, handler) {
      if (channel === 'screen-capture') {
        const wrappedHandler = async (event, ...args) => {
          const opts = args[0];
          if (opts && opts.captureMode === false) {
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
 
    win.on('page-title-updated', (e, title) => checkTitle(title));
    
    // Initial check for already set title
    checkTitle(win.getTitle());

    // Minimize to tray instead of closing for the main window
    win.on('close', (event) => {
      // If it's the main window, just hide it
      if (!isAppQuitting && tray && (win === mainWindow || win.getTitle().includes('Zalo'))) {
        event.preventDefault();
        // Delay hide slightly to allow other listeners to finish
        setTimeout(() => {
          if (!isAppQuitting && !win.isDestroyed()) {
            win.hide();
          }
        }, 50);
      }
    });

    // Clean up mainWindow reference if destroyed
    win.on('closed', () => {
      if (win === mainWindow) {
        mainWindow = null;
        updateTrayMenu();
      }
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
    try {
      tray = new Tray(effectiveTrayIconPath);
      tray.setToolTip('Zalo');
      tray.on('click', showMainWindow);
      tray.on('double-click', showMainWindow); // Some environments prefer double click
      updateTrayMenu();
      globalShortcut.register('CommandOrControl+Shift+I', toggleDevTools);
    } catch (e) {
      console.error('Tray init failed:', e);
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
