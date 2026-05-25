# Especificação Técnica (SPEC)

## 1. Arquitetura
A aplicação adota uma arquitetura de Aplicativo Desktop usando o framework **Electron**.
- **Frontend (Renderer Process):** React com TypeScript, utilizando Vite como bundler. Responsável apenas pela interface gráfica (UI/UX).
- **Backend (Main Process):** Node.js rodando embutido no Electron. Este processo tem acesso ao sistema de arquivos local, rede e comunicação via chamadas nativas, gerenciando o tráfego pesado e mantendo a segurança do mTLS.
- **Comunicação:** IPC (Inter-Process Communication) Bridge. O frontend pede algo (ex: "Baixe as notas"), o backend executa e devolve o resultado.
- **Armazenamento em Nuvem:** Supabase (PostgreSQL) usando o `supabase-js` diretamente pelo processo backend (Electron).

## 2. Modelo de Dados (Supabase PostgreSQL)
Scripts SQL automatizados no backend criarão a seguinte estrutura caso o Supabase esteja vazio:
- `empresas`: CNPJ, Razão Social, etc.
- `notas_fiscais`: ID (Chave de Acesso), CNPJ Emitente, CNPJ Tomador, Data Emissão, Valor, Status, Caminho Físico XML, Caminho Físico PDF.
- `eventos_nfse`: ID, Chave da Nota, Tipo (Cancelamento, Substituição), Data, XML do Evento.
- `logs_sincronizacao`: Para rastreabilidade de requisições, erros de API e auditoria técnica.

## 3. Segurança e Confiabilidade de Rede
Para garantir estabilidade, o software deve incorporar:
- **mTLS Agent Customizado:** Configuração de `https.Agent` para Node.js usando as chaves extraídas do arquivo A1.
- **Throttling e Rate Limiting:**
  - Fila controlada com pacotes para Node (ex: async queue).
  - Um intervalo fixo de espera entre as chamadas (ex: mínimo 1 segundo entre requisições), conforme diretrizes da API do Governo.
- **Tratamento de Exceções e Resiliência (Circuit Breaker):**
  - **Timeouts:** Se uma requisição passar de N segundos, abortar e devolver para a fila de retentativas.
  - **Erros 429 (Too Many Requests):** Interromper temporariamente e dobrar o tempo de espera antes de tentar de novo.
  - **Erros 5xx:** Repetição agendada (Retry) por um número máximo de vezes.
- **Salvamento Físico de Arquivos:**
  - Validar se a pasta do CNPJ/Data existe. Se não, criar recursivamente.
  - Tratamento para colisões de nome e verificação de disco cheio.

## 4. Integração com a API da NFS-e (Ambiente Nacional)
- O sistema consumirá os serviços descritos no [Portal Gov.br NFS-e](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica).
- O módulo backend (`main process`) fará a consulta por período e chave, obtendo os metadados.
- Chamadas para download de anexos (XML, PDF) serão geridas em background.

## 5. Padrões de Código e Entrega
- Todo código será escrito em **TypeScript**.
- Comentários didáticos devem ser amplamente utilizados em cada função, método e chamada de API. Como o código pode ser mantido por pessoas não especializadas, as explicações textuais (`// Aqui estamos fazendo X para evitar o erro Y`) são obrigatórias.
- Divisão de arquivos clara:
  - `src/main`: Código do Electron (Rotinas de Banco, HTTP, mTLS).
  - `src/renderer`: Código do React (Telas, Componentes).
  - `src/shared`: Tipagens e utilitários que transitam via IPC.
