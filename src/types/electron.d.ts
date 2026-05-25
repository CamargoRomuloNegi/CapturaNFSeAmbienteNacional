import { ipcRenderer } from 'electron';

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      setupSupabase: (url: string, key: string) => Promise<{ success: boolean; message: string; sql?: string }>;
      checkSupabaseConfig: () => Promise<{ success: boolean; hasConfig: boolean }>;
      selectCertificate: () => Promise<{ success: boolean; filePath?: string; message?: string }>;
      unlockCertificate: (filePath: string, password: string) => Promise<{ success: boolean; message?: string; cn?: string; cnpj?: string }>;
      getActiveCertificate: () => Promise<{ success: boolean; cn?: string; cnpj?: string }>;
      startSync: (dataInicial: string, dataFinal: string) => Promise<{ success: boolean; message?: string }>;
      onSyncProgress: (callback: (data: { status: string; message: string }) => void) => void;
    };
  }
}
