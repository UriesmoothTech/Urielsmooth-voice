import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let consentWindow;

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create consent window (modal)
 */
function createConsentWindow() {
  if (consentWindow) {
    consentWindow.focus();
    return;
  }

  consentWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    width: 600,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  consentWindow.loadURL(
    isDev
      ? 'http://localhost:3000/consent'
      : `file://${path.join(__dirname, '../build/index.html#/consent')}`
  );

  consentWindow.on('closed', () => {
    consentWindow = null;
  });
}

/**
 * App events
 */
app.on('ready', () => {
  createWindow();
  createApplicationMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Application menu
 */
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About URIESMOOTH Voice',
          click: () => {
            // Show about dialog
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * IPC Handlers
 */

// Open consent window
ipcMain.handle('open-consent-window', () => {
  createConsentWindow();
  return { success: true };
});

// Get app info
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    isDev,
    platform: process.platform,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
  };
});

// Store user preferences
const userPreferences = {};

ipcMain.handle('set-preference', (event, key, value) => {
  userPreferences[key] = value;
  return { success: true };
});

ipcMain.handle('get-preference', (event, key) => {
  return userPreferences[key] || null;
});

// Check if development mode
ipcMain.handle('is-dev-mode', () => {
  return isDev;
});

// Get environment config
ipcMain.handle('get-env-config', () => {
  return {
    backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
    isDev,
    mockServices: process.env.REACT_APP_MOCK_SERVICES !== 'false',
  };
});

export default app;
