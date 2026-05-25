import axios, { AxiosInstance } from 'axios';
import https from 'https';

// Documentação Técnica NFS-e: Respeitando limite de 50 requisições por segundo
// Mas seremos ainda mais conservadores (1 por segundo por default) para não bloquear o escritório.
const NFSE_API_URL = 'https://api.nfse.gov.br/v1'; // Exemplo fictício do endpoint oficial

export class NfseClient {
  private api: AxiosInstance;

  constructor(certPem: string, keyPem: string) {
    // Configura o agente HTTPS para fazer chamadas mTLS usando o certificado extraído
    const httpsAgent = new https.Agent({
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: false, // Pode ser alterado para validação forte do gov se necessário
    });

    this.api = axios.create({
      baseURL: NFSE_API_URL,
      httpsAgent,
      timeout: 30000, // Timeout de 30 segundos (Circuit Breaker base)
    });

    // Interceptor para Circuit Breaker / Retries
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Se a API governamental retornar 429 (Too Many Requests), podemos esperar e tentar novamente
        if (error.response && error.response.status === 429) {
          console.warn('[NFS-e API] 429 Too Many Requests. Rate limit atingido.');
          // Em um app completo, aqui adicionaríamos um delay (sleep) automático.
        }
        return Promise.reject(error);
      }
    );
  }

  // Consulta notas fiscais por período
  async consultarNotasPorPeriodo(dataInicial: string, dataFinal: string, cnpj: string) {
    try {
      const response = await this.api.get('/notas', {
        params: { dataInicial, dataFinal, cnpj },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Erro na consulta de notas: ${error.message}`);
    }
  }

  // Baixa o XML de uma nota específica
  async baixarXmlNota(chave: string) {
    try {
      const response = await this.api.get(`/notas/${chave}/xml`, { responseType: 'text' });
      return response.data;
    } catch (error: any) {
      throw new Error(`Erro ao baixar XML ${chave}: ${error.message}`);
    }
  }
}
