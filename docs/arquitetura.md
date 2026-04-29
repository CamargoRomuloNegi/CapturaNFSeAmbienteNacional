# Arquitetura Inicial

## Objetivo
Entregar um MVP com UX simples para escritórios e agente local para download de XML/PDF.

## Componentes

1. **Web (Next.js)**
   - Configuração visual (CNPJ, competência, timeout, retries, concorrência, pasta de saída).
   - Chama agente local via HTTP.

2. **Agent (Node + Express)**
   - Exposição de endpoints de saúde, listagem de certificados (mock inicial), e início de captura.
   - Criação de estrutura de diretórios `AAAA-MM-CNPJ/XML` e `PDF`.

## Evolução planejada
- Integrar leitura real de certificados A1.
- Integrar APIs oficiais NFS-e com mTLS.
- Implementar fila, retentativas, checkpoint e logs operacionais.
