const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Browse for folder
  browseFolder: () => ipcRenderer.invoke('browse-folder'),

  // Get file path from File object (Electron security requirement)
  getFilePath: (file) => webUtils.getPathForFile(file),

  // Auto-detect game folder
  autoDetectGame: () => ipcRenderer.invoke('auto-detect-game'),

  // Validate game folder
  validateGameFolder: (data) => ipcRenderer.invoke('validate-game-folder', data),

  // Install skins
  installSkins: (data) => ipcRenderer.invoke('install-skins', data),

  // Install sound mods
  installSound: (data) => ipcRenderer.invoke('install-sound', data),

  // Check sound mod status
  checkSoundMod: (data) => ipcRenderer.invoke('check-sound-mod', data),

  // Enable sound mod
  enableSoundMod: (data) => ipcRenderer.invoke('enable-sound-mod', data),

  // List installed skins
  listInstalledSkins: (data) => ipcRenderer.invoke('list-installed-skins', data),

  // List installed sound mods
  listInstalledSoundMods: (data) => ipcRenderer.invoke('list-installed-sound-mods', data),

  // Delete skin
  deleteSkin: (data) => ipcRenderer.invoke('delete-skin', data),

  // Delete sound mod
  deleteSoundMod: (data) => ipcRenderer.invoke('delete-sound-mod', data),

  // Open folder in explorer
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // Listen for install progress
  onInstallProgress: (callback) => {
    ipcRenderer.on('install-progress', (event, data) => callback(data));
  },

  // Remove install progress listener
  removeInstallProgressListener: () => {
    ipcRenderer.removeAllListeners('install-progress');
  },

  // Ping
  ping: () => ipcRenderer.invoke('ping'),

  // Check if running in Electron
  isElectron: true,
});
