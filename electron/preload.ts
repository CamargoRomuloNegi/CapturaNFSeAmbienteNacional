import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  setupSupabase: (url: string, key: string) => ipcRenderer.invoke('setupSupabase', url, key),
  checkSupabaseConfig: () => ipcRenderer.invoke('checkSupabaseConfig'),
  selectCertificate: () => ipcRenderer.invoke('selectCertificate'),
  unlockCertificate: (filePath: string, password: string) => ipcRenderer.invoke('unlockCertificate', filePath, password),
  getActiveCertificate: () => ipcRenderer.invoke('getActiveCertificate'),
  startSync: (dataInicial: string, dataFinal: string) => ipcRenderer.invoke('startSync', dataInicial, dataFinal),
  onSyncProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('syncProgress', (_event, value) => callback(value));
  }
});
