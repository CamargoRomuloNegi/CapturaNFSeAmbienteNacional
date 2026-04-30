# Arquitetura Inicial

## Objetivo
Entregar um MVP com UX simples para escritórios e agente local para download de XML/PDF.

## Componentes

1. **Web (Next.js)**
   - Configuração visual (CNPJ, competência, timeout, retries, concorrência, pasta de saída e certificado).
   - Chama agente local via HTTP.

2. **Agent (Node + Express)**
   - Endpoints:
     - `GET /` metadados do serviço
     - `GET /health`
     - `GET /certificates` (tenta Windows Store, fallback mock)
     - `POST /capture`
     - `GET /jobs/:id`
   - Validações de payload básicas.
   - Criação da estrutura de diretórios `MM-AAAA-CNPJ/XML` e `PDF` + `manifest.json`.
   - Geração de XML placeholder para validar pipeline local.

## Evolução planejada
- Integrar chamadas reais às APIs oficiais NFS-e com mTLS.
- Substituir placeholder por download real de XML/PDF.
- Implementar fila persistente, retentativas avançadas, checkpoint e logs operacionais.
