const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

let backendProcess;
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 620,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  Menu.setApplicationMenu(null);

  win.loadURL(
    isDev
      ? 'http://localhost:3000/loading.html'
      : `file://${path.join(__dirname, '../public/loading.html')}`
  );

  win.once('ready-to-show', () => {
    win.hide();
  });

  win.on('close', (event) => {
    event.preventDefault();
    win.minimize();
  });

  const loadMainURL = () => {
    win.loadURL(
      isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`
    );
  };

  setTimeout(loadMainURL, 3000);

  win.webContents.on('did-fail-load', () => {
    console.log('Failed to load, retrying...');
    setTimeout(loadMainURL, 3000);
  });
}

app.whenReady().then(() => {
  backendProcess = require('child_process').fork(
    path.join(__dirname, '../backend/server.js'),
    {
      env: { ...process.env, MONGODB_URI: process.env.MONGODB_URI },
    }
  );

  createWindow();

  const ret = globalShortcut.register('F6', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });

  if (!ret) {
    console.log('Global shortcut registration failed.');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    backendProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function shutdown() {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
}

app.on('before-quit', () => shutdown());
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  shutdown();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Exiting...');
  shutdown();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Exiting...');
  shutdown();
});