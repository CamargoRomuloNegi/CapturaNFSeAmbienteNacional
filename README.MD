# Captura NFS-e Ambiente Nacional

Monorepo para captura de XML/PDF da NFS-e com foco em escritórios contábeis.

## Pré-requisitos
- Node.js 20+
- npm 10+

## Configuração de ambiente (Agent)

Crie variáveis no terminal antes de iniciar o agent:

```bash
# URL base da API nacional (exemplo; ajuste conforme documentação oficial/homologação)
export NFSE_BASE_URL="https://api.nfse.gov.br"

# Intervalo mínimo entre chamadas para evitar sobrecarga/rate limit
export NFSE_MIN_INTERVAL_MS=1500

# Tamanho de página de consulta (conservador)
export NFSE_PAGE_SIZE=50
```

No Windows PowerShell:

```powershell
$env:NFSE_BASE_URL="https://api.nfse.gov.br"
$env:NFSE_MIN_INTERVAL_MS="1500"
$env:NFSE_PAGE_SIZE="50"
```

## Como iniciar

```bash
npm install
npm run dev:agent
npm run dev:web
```

## Segurança e limites
- O agent aplica atraso mínimo entre requests (`minRequestIntervalMs`) e retry simples para `429` e `5xx`.
- Prioriza segurança e estabilidade em vez de velocidade máxima.
- O certificado A1 usado para mTLS nesta versão é informado por arquivo (`.pfx/.p12`) e senha na tela.
