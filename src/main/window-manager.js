const { BrowserWindow } = require('electron');
const fs = require('fs');

let mainWindow = null;
let isAppQuitting = false;

function setAppQuitting(quitting) {
  isAppQuitting = quitting;
}

function getAppQuitting() {
  return isAppQuitting;
}

function getMainWindow() {
  return mainWindow;
}

function setMainWindow(win) {
  mainWindow = win;
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
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

function checkTitle(win, title, onMainWindowDetected) {
  if (title.includes('Zalo')) {
    setMainWindow(win);
    if (onMainWindowDetected) {
      onMainWindowDetected();
    }
  }
}

function setupWindowEvents(win, trayManager, onMainWindowDetected) {
  win.setMenuBarVisibility(false);
  if (win.removeMenu) win.removeMenu();
  win.autoHideMenuBar = true;

  win.on('page-title-updated', (e, title) => checkTitle(win, title, onMainWindowDetected));
  checkTitle(win, win.getTitle(), onMainWindowDetected);

  win.on('close', (event) => {
    if (!isAppQuitting && trayManager.getTray() && (win === mainWindow || win.getTitle().includes('Zalo'))) {
      event.preventDefault();
      setTimeout(() => {
        if (!isAppQuitting && !win.isDestroyed()) {
          win.hide();
        }
      }, 50);
    }
  });

  win.on('closed', () => {
    if (win === mainWindow) {
      setMainWindow(null);
      trayManager.updateTrayMenu();
    }
  });
}

module.exports = {
  getMainWindow,
  setMainWindow,
  showMainWindow,
  hideMainWindow,
  toggleDevTools,
  setAppQuitting,
  getAppQuitting,
  setupWindowEvents
};