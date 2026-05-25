# Product Requirements Document (PRD)

## 1. Visão Geral do Produto
O **Captura NFS-e Ambiente Nacional** é um aplicativo desktop projetado para simplificar e automatizar a obtenção de Notas Fiscais de Serviço Eletrônico (NFS-e) do portal Nacional. O foco é atender escritórios de contabilidade que necessitam gerenciar um grande volume de notas emitidas para múltiplos clientes.

## 2. Objetivos
- **Autonomia:** O sistema é instalado na máquina do cliente, rodando localmente (Desktop App) e permitindo processos em background sem os limites de tempo de plataformas na nuvem (ex: Vercel).
- **Flexibilidade:** Permitir configuração de um banco de dados Supabase para onde os metadados serão exportados, facilitando a consulta remota e relatórios consolidados.
- **Segurança:** Manter o certificado digital (A1) exclusivamente na máquina do usuário, sem trafegá-lo em servidores de terceiros.
- **Rastreabilidade:** Organizar fisicamente arquivos baixados (XML e PDF) no disco local, além de gerar logs sobre sucesso ou falhas nos downloads.
- **Análise de Dados:** Prover uma interface para resumir dados e exportá-los analiticamente para o Excel.

## 3. Público-Alvo
- **Contadores e Escritórios de Contabilidade.**
- **Gestores Financeiros** de empresas.
- Usuários não-técnicos: a interface deve ser intuitiva, do tipo "Next, Next, Finish", guiando nas configurações mais complexas (como conectar ao banco Supabase).

## 4. Funcionalidades Core (MVP)
1. **Tela de Configuração de Banco de Dados:**
   - Input para URL e Anon Key do Supabase.
   - Botão para testar conexão.
   - Script embutido que cria as tabelas automaticamente se não existirem (Onboarding do banco de dados).
2. **Gerenciamento de Certificado:**
   - Seleção de arquivo `.pfx` ou `.p12` na máquina local.
   - Input de senha em memória (não salvar na base de dados).
3. **Módulo de Sincronização:**
   - Configuração de período (Data Início, Data Fim).
   - Botão de iniciar download de NFS-e e eventos associados.
   - Painel com progresso em tempo real, status e fila de erros.
4. **Armazenamento Físico e Estruturado:**
   - Download de XML e PDFs organizados em pastas: `Meus Documentos / NFS-e / {CNPJ} / {ANO_MES} /`.
5. **Dashboard Analítico:**
   - Grid/Tabela de visualização das notas cadastradas no Supabase.
   - Abas para Resumo e Detalhamento.
   - Botão de exportação para Excel, com parametrização básica de quais colunas exportar.

## 5. Requisitos Não-Funcionais
- **Disponibilidade:** A operação deve rodar em background no PC do usuário e ser capaz de se recuperar de falhas temporárias de rede (retry, fallback).
- **Segurança:** Comunicações com a API da NFS-e via mTLS. A senha do certificado digital não pode ser exposta ou armazenada no banco.
- **Desempenho:** Respeitar rigidamente os limites de requisições por minuto impostos pela API do governo para evitar bloqueios temporários (throttling).
