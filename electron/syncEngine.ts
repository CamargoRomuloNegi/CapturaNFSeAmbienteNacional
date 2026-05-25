import { getActiveCertData } from './certHandlers';
import { NfseClient } from './nfseClient';
import { saveXmlLocally } from './fileUtils';
import Store from 'electron-store';
import { createClient } from '@supabase/supabase-js';
import { ipcMain } from 'electron';

const store = new Store();

// Utilitário nativo para aguardar N milissegundos sem travar a thread
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Limite rigoroso de tempo da API Nacional (ex: max 1 req por 1.5s)
const API_DELAY_MS = 1500;

export function setupSyncHandlers() {
  ipcMain.handle('startSync', async (event, dataInicial: string, dataFinal: string) => {
    try {
      const certData = getActiveCertData();
      if (!certData || !certData.certPem || !certData.keyPem || !certData.cnpj) {
        throw new Error('Certificado não carregado.');
      }

      const supabaseUrl = store.get('supabaseUrl') as string;
      const supabaseKey = store.get('supabaseKey') as string;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const client = new NfseClient(certData.certPem, certData.keyPem);
      const logMsg = `Iniciando sincronização de ${dataInicial} até ${dataFinal} para o CNPJ ${certData.cnpj}`;
      console.log(logMsg);
      event.sender.send('syncProgress', { status: 'running', message: logMsg });

      // Aqui consultaríamos a API verdadeira e iteraríamos as notas.
      // Em caráter de simulação controlada, faremos um loop fictício de chaves devolvidas.
      const mockNotas = [
        { chave: '35230112345678000199550010000000011123456789', data: new Date().toISOString() },
        { chave: '35230112345678000199550010000000021123456780', data: new Date().toISOString() }
      ];

      for (const nota of mockNotas) {
        try {
          event.sender.send('syncProgress', { status: 'running', message: `Baixando nota ${nota.chave}...` });

          // Simula download XML (aqui usaria o client.baixarXmlNota)
          const mockXml = `<nfse><chave>${nota.chave}</chave><status>Autorizado</status></nfse>`;

          // 1. Salvar fisicamente no disco nas pastas organizadas
          const pathFisico = saveXmlLocally(certData.cnpj!, nota.data, nota.chave, mockXml);

          // 2. Salvar metadados no Supabase
          const { error } = await supabase.from('notas_fiscais').upsert({
            id: nota.chave,
            cnpj_emitente: certData.cnpj,
            data_emissao: nota.data,
            status: 'Autorizado',
            caminho_xml: pathFisico
          });

          if (error) {
            console.error('Erro ao salvar no supabase:', error);
          }
        } catch (err: any) {
           event.sender.send('syncProgress', { status: 'error', message: `Erro na nota ${nota.chave}: ${err.message}` });
        }

        // Aplica o throttling obrigatório da API antes da próxima iteração
        await delay(API_DELAY_MS);
      }

      const finalMsg = 'Sincronização concluída com sucesso!';
      event.sender.send('syncProgress', { status: 'completed', message: finalMsg });
      return { success: true };
    } catch (err: any) {
      event.sender.send('syncProgress', { status: 'error', message: err.message });
      return { success: false, message: err.message };
    }
  });
}
