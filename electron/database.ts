import { ipcMain } from 'electron';
import { createClient } from '@supabase/supabase-js';
import Store from 'electron-store';

const store = new Store();

// SQL schema to initialize the database
export const INIT_SQL = `
-- Cole e execute este script no SQL Editor do seu painel Supabase.

CREATE TABLE IF NOT EXISTS empresas (
  cnpj VARCHAR(14) PRIMARY KEY,
  razao_social VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id VARCHAR(50) PRIMARY KEY, -- Chave de Acesso
  cnpj_emitente VARCHAR(14) REFERENCES empresas(cnpj),
  cnpj_tomador VARCHAR(14),
  data_emissao TIMESTAMP,
  valor DECIMAL(10,2),
  status VARCHAR(20),
  caminho_xml TEXT,
  caminho_pdf TEXT
);

CREATE TABLE IF NOT EXISTS eventos_nfse (
  id VARCHAR(50) PRIMARY KEY,
  chave_nota VARCHAR(50) REFERENCES notas_fiscais(id),
  tipo VARCHAR(50),
  data TIMESTAMP,
  xml_evento TEXT
);

CREATE TABLE IF NOT EXISTS logs_sincronizacao (
  id SERIAL PRIMARY KEY,
  data TIMESTAMP DEFAULT NOW(),
  cnpj VARCHAR(14),
  status VARCHAR(20),
  mensagem TEXT
);
`;

export function setupDatabaseHandlers() {
  ipcMain.handle('setupSupabase', async (_, url: string, key: string) => {
    try {
      // 1. Testa a conexão com as credenciais
      const supabase = createClient(url, key);
      const { error } = await supabase.from('empresas').select('cnpj').limit(1);

      // Como o Supabase na web as vezes traduz o erro de tabela inexistente de formas
      // variáveis dependendo da versão do postgREST (42P01, PGRST116 ou PGRST204),
      // e como chaves inválidas dariam throw em erro JWT 401 muito antes,
      // nós podemos ignorar erros de 'Could not find the table' textuais de forma direta.
      if (error && error.code !== '42P01' && error.code !== 'PGRST116' && !error.message?.includes('Could not find the table')) {
        throw new Error(`Falha de permissão ou chave incorreta: ${error.message}`);
      }

      // Salva de forma persistente localmente
      store.set('supabaseUrl', url);
      store.set('supabaseKey', key);

      return {
        success: true,
        message: 'Conectado com sucesso!',
        sql: INIT_SQL
      };
    } catch (err: any) {
      console.error('Supabase setup error:', err);
      return { success: false, message: err.message || 'Erro ao conectar no banco' };
    }
  });

  ipcMain.handle('checkSupabaseConfig', async () => {
    const url = store.get('supabaseUrl');
    const key = store.get('supabaseKey');
    return { success: true, hasConfig: !!url && !!key };
  });
}
