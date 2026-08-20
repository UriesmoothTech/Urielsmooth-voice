import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose safe IPC methods to renderer process
 * This ensures only approved IPC calls can be made from the renderer
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Consent and auth
  openConsentWindow: () => ipcRenderer.invoke('open-consent-window'),
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getEnvConfig: () => ipcRenderer.invoke('get-env-config'),
  isDevMode: () => ipcRenderer.invoke('is-dev-mode'),
  
  // User preferences
  setPreference: (key, value) => ipcRenderer.invoke('set-preference', key, value),
  getPreference: (key) => ipcRenderer.invoke('get-preference', key),
  
  // Window management
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Logging (secure)
  log: (level, message) => ipcRenderer.invoke('log', level, message),
  
  // Audio device enumeration
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  
  // Listen for events
  onVoiceActivityDetected: (callback) =>
    ipcRenderer.on('voice-activity-detected', (event, data) => callback(data)),
  onProcessingComplete: (callback) =>
    ipcRenderer.on('processing-complete', (event, data) => callback(data)),
});

export {};
