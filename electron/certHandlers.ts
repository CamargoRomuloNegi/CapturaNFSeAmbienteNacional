import { ipcMain, dialog } from 'electron';
import { extractCertFromPfx, CertData } from './certUtils';

let activeCertData: CertData | null = null;

export function setupCertHandlers() {
  ipcMain.handle('selectCertificate', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Selecione o Certificado A1 (.pfx ou .p12)',
      properties: ['openFile'],
      filters: [{ name: 'Certificados', extensions: ['pfx', 'p12'] }],
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Nenhum arquivo selecionado' };
    }

    return { success: true, filePath: filePaths[0] };
  });

  ipcMain.handle('unlockCertificate', async (_, filePath: string, password: string) => {
    try {
      // Extrai e joga na memória do backend
      const certData = extractCertFromPfx(filePath, password);
      activeCertData = certData;

      return {
        success: true,
        cn: certData.cn,
        cnpj: certData.cnpj
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('getActiveCertificate', async () => {
    if (activeCertData) {
      return { success: true, cn: activeCertData.cn, cnpj: activeCertData.cnpj };
    }
    return { success: false };
  });
}

// Para ser usado internamente pelo SyncEngine depois
export function getActiveCertData() {
  return activeCertData;
}
