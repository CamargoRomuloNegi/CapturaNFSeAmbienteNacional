# Arquitetura Atual

## Fluxo
1. Web coleta parâmetros operacionais (CNPJ, período, certificado A1, timeout e intervalo entre chamadas).
2. Agent enfileira job e processa em background.
3. Conector mTLS consulta endpoint de listagem por período.
4. Para cada documento, baixa XML (e PDF quando disponível).
5. Grava em `MM-AAAA-CNPJ/XML|PDF` e atualiza `manifest.json`.

## Controles de segurança/limite
- `minRequestIntervalMs` configurável por execução.
- Retry para `429` e `5xx` com espera adicional.
- Timeout por request.
- Abordagem conservadora (`NFSE_PAGE_SIZE=50`, intervalo default de `1500ms`).

## Observações
- Endpoint base e formatos exatos da API dependem do ambiente oficial (`NFSE_BASE_URL`).
- Certificado Windows Store é listado para apoio ao usuário, mas o uso mTLS de execução é por arquivo `.pfx/.p12` + senha.
