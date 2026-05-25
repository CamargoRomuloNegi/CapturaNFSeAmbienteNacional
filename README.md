# Captura NFS-e Ambiente Nacional

## Sobre o Projeto
Este é um aplicativo desktop (Electron + React) para escritórios de contabilidade, desenvolvido para realizar a baixa, controle e gerenciamento das Notas Fiscais de Serviço Eletrônico (NFS-e) do Ambiente Nacional.

O sistema comunica-se com a API Nacional usando certificados digitais (A1) e armazena de forma resiliente tanto os arquivos físicos (XML e PDF, organizados por pastas) quanto os metadados em um banco de dados em nuvem Supabase, garantindo acesso distribuído para o escritório.

## Como começar
Leia a documentação completa para entender a arquitetura, regras de negócio e requisitos técnicos:
- [PRD.md](./PRD.md) - Documento de Requisitos do Produto (Regras de Negócio e Funcionalidades)
- [SPEC.md](./SPEC.md) - Especificação Técnica (Arquitetura, Banco de Dados, API e Segurança)

## Principais Funcionalidades
1. **Configuração Descentralizada:** Os usuários configuram sua própria base Supabase.
2. **Uso de Certificados A1:** Leitura local e segura do arquivo `.pfx`.
3. **Resiliência e Segurança:** Fallbacks, circuit breaker, retry automático e respeito aos tempos da API do Governo.
4. **Organização em Pastas:** Criação local de pastas por CNPJ e Ano/Mês para armazenar XMLs e PDFs.
5. **Dashboard e Exportação:** Interface rica para analisar notas, eventos (cancelamentos/substituições) e exportar relatórios para Excel.

## Stack Técnica
- **Frontend:** React, TypeScript, Vite, TailwindCSS
- **Backend Embutido:** Electron (Node.js)
- **Banco de Dados:** Supabase (PostgreSQL)
