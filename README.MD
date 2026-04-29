# Captura NFS-e Ambiente Nacional

Monorepo inicial para captura de XML/PDF da NFS-e com foco em escritórios contábeis.

## Estrutura

- `apps/web`: interface web (Next.js) para configuração e monitoramento.
- `apps/agent`: agente local Node.js responsável por certificado, consulta e download local.
- `docs/`: arquitetura, backlog e decisões técnicas.

## Como iniciar

```bash
npm install
npm run dev:agent
npm run dev:web
```

A interface web usa o endpoint local do agente (`http://localhost:3333`).
