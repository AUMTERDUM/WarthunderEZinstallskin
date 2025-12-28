const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Browse for folder
  browseFolder: () => ipcRenderer.invoke('browse-folder'),

  // Get file path from File object (Electron security requirement)
  getFilePath: (file) => webUtils.getPathForFile(file),

  // Install skins
  installSkins: (data) => ipcRenderer.invoke('install-skins', data),

  // Install sound mods
  installSound: (data) => ipcRenderer.invoke('install-sound', data),

  // Check sound mod status
  checkSoundMod: (data) => ipcRenderer.invoke('check-sound-mod', data),

  // Enable sound mod
  enableSoundMod: (data) => ipcRenderer.invoke('enable-sound-mod', data),

  // Open folder in explorer
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // Ping
  ping: () => ipcRenderer.invoke('ping'),

  // Check if running in Electron
  isElectron: true,
});
