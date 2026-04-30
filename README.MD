# Captura NFS-e Ambiente Nacional

Monorepo inicial para captura de XML/PDF da NFS-e com foco em escritórios contábeis.

## Estrutura

- `apps/web`: interface web (Next.js) para configuração e monitoramento.
- `apps/agent`: agente local Node.js responsável por certificado, consulta e download local.
- `docs/`: arquitetura, backlog e decisões técnicas.

## Pré-requisitos

- Node.js 20+
- npm 10+

## Como iniciar (Windows, Linux e macOS)

> **Importante:** execute os comandos na pasta raiz do projeto (onde está este `README.MD` e o `package.json` raiz).

```bash
npm install
npm run dev:agent
npm run dev:web
```

A interface web usa o endpoint local do agente (`http://localhost:3333`).

## Solução de problemas

### Erro `Missing script: "dev:agent"` ou `"dev:web"`

Você está em uma pasta sem o `package.json` correto.

1. Entre na raiz do projeto:
   ```bash
   cd /caminho/para/CapturaNFSeAmbienteNacional
   ```
2. Confira os scripts disponíveis:
   ```bash
   npm run
   ```
3. Rode novamente:
   ```bash
   npm run dev:agent
   npm run dev:web
   ```

### Executar diretamente por app (alternativa)

Se preferir, rode separado em dois terminais:

**Terminal 1 (agente):**
```bash
cd apps/agent
npm install
npm run dev
```

**Terminal 2 (web):**
```bash
cd apps/web
npm install
npm run dev
```

### Vulnerabilidades mostradas no `npm install`

O aviso de `npm audit` não impede subir o projeto em modo de desenvolvimento.
Ainda assim, é recomendado avaliar correções com:

```bash
npm audit
npm audit fix
```
