# Captura NFS-e Ambiente Nacional

## Como usar (modo operacional)
1. Inicie o agent e web.
2. Clique em **Ler certificados**.
3. Se disponível, o CNPJ será preenchido automaticamente.
4. Digite a senha do certificado.
5. Informe `certFilePath` (.pfx/.p12), período inicial/final e clique em **Iniciar download**.
6. Acompanhe o status em tela (`queued`, `running`, `completed`, `failed`).

## Erros importantes
- Se `NFSE_BASE_URL` não estiver definida, o job falhará com erro explícito.
- Se senha/certificado estiver incorreto, o job retorna erro de validação do certificado.

## Variáveis de ambiente
```bash
export NFSE_BASE_URL="https://api.nfse.gov.br"
export NFSE_MIN_INTERVAL_MS=1500
export NFSE_PAGE_SIZE=50
```
