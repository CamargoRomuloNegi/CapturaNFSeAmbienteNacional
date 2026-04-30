# Captura NFS-e Ambiente Nacional

## Como usar (modo simples)
1. Inicie o agent e web.
2. Clique em **Ler certificados** para listar A1 da Windows Store.
3. Se disponível, o CNPJ é preenchido automaticamente.
4. Digite a senha do certificado.
5. Informe período inicial/final e clique em **Iniciar download**.

## Observações importantes
- Para chamadas reais mTLS, informe `certFilePath` (`.pfx/.p12`) e configure `NFSE_BASE_URL`.
- Sem `NFSE_BASE_URL` ou sem `certFilePath`, o sistema executa em modo local seguro (gera pastas/manifest para validação do fluxo).
- O sistema aplica intervalo mínimo entre chamadas para evitar excesso de requisições.

## Variáveis de ambiente
```bash
export NFSE_BASE_URL="https://api.nfse.gov.br"
export NFSE_MIN_INTERVAL_MS=1500
export NFSE_PAGE_SIZE=50
```
