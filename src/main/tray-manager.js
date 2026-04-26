const { Menu, Tray, app } = require('electron');

let tray = null;
let windowManager = null;

function setWindowManager(wm) {
  windowManager = wm;
}

function getTray() {
  return tray;
}

function updateTrayMenu() {
  if (!tray || !windowManager) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: windowManager.showMainWindow
    },
    {
      label: 'Hide',
      click: windowManager.hideMainWindow
    },
    {
      label: 'Toggle DevTools',
      click: windowManager.toggleDevTools
    },
    {
      label: 'Quit',
      click: () => {
        windowManager.setAppQuitting(true);
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

function initTray(trayIconPath) {
  try {
    tray = new Tray(trayIconPath);
    tray.setToolTip('Zalo');
    tray.on('click', windowManager.showMainWindow);
    tray.on('double-click', windowManager.showMainWindow);
    updateTrayMenu();
  } catch (e) {
    console.error('Tray init failed:', e);
  }
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = {
  setWindowManager,
  initTray,
  destroyTray,
  updateTrayMenu,
  getTray
};