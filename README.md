# Gerenciador Financeiro Pessoal

Este projeto é uma aplicação web completa para gerenciamento de finanças pessoais, desenvolvida com Next.js (frontend) e Node.js com Express.js (backend), utilizando MySQL/MariaDB como banco de dados.

## 🚀 Visão Geral do Projeto

O objetivo principal é fornecer uma plataforma intuitiva para que os usuários possam:
- Registrar-se e fazer login com segurança.
- Visualizar um dashboard com um resumo financeiro (saldo total, receitas e despesas mensais, dívidas de cartão de crédito).
- Gerenciar suas transações (receitas e despesas) com detalhes como descrição, valor, tipo, método de pagamento, categoria e data.
- Consultar relatórios financeiros detalhados, incluindo gastos por categoria, tendências mensais de receitas/despesas e uso de métodos de pagamento.
- Configurar seus métodos de pagamento e atualizar seu perfil de usuário.

## ✨ Tecnologias Utilizadas

### Frontend
- **Next.js (React):** Framework para construção da interface de usuário.
- **TypeScript:** Linguagem de programação para tipagem estática.
- **Tailwind CSS:** Framework CSS para estilização rápida e responsiva.
- **Recharts:** Biblioteca de gráficos para visualização de dados nos relatórios.
- **Lucide-React:** Biblioteca de ícones.
- **Zustand:** Para gerenciamento de estado (se aplicável, mas a versão atual pode usar `useState` e `useEffect`).
- **`next/navigation`:** Para roteamento no Next.js.

### Backend
- **Node.js:** Ambiente de execução JavaScript.
- **Express.js:** Framework web para Node.js, para construção das APIs RESTful.
- **MySQL/MariaDB:** Sistema de gerenciamento de banco de dados relacional.
- **`mysql2/promise`:** Driver MySQL para Node.js com suporte a Promises.
- **`dotenv`:** Para carregar variáveis de ambiente de um arquivo `.env`.
- **`bcrypt`:** Para hashing e verificação de senhas.
- **`jsonwebtoken` (JWT):** Para autenticação baseada em tokens.
- **`cors`:** Middleware para habilitar o Cross-Origin Resource Sharing.

## ⚙️ Pré-requisitos

Antes de iniciar o projeto, certifique-se de ter instalado:
- **Node.js** (versão 18 ou superior recomendada)
- **npm** (gerenciador de pacotes do Node.js)
- **XAMPP** (ou qualquer outro ambiente que inclua Apache e MySQL/MariaDB)

## 📦 Configuração do Ambiente

Siga os passos abaixo para configurar e executar o projeto.

### 1. Backend

#### 1.1. Configuração do Banco de Dados (MySQL/MariaDB com XAMPP)

1.  **Inicie o XAMPP:** Abra o painel de controle do XAMPP e inicie os serviços **Apache** e **MySQL**.
2.  **Acesse o phpMyAdmin:** Abra seu navegador e vá para `http://localhost/phpmyadmin`.
3.  **Crie o Banco de Dados:**
    *   No phpMyAdmin, clique em "New" (Novo) no menu lateral esquerdo.
    *   No campo "Database name" (Nome do banco de dados), digite `financeiro_db` e clique em "Create" (Criar).
    *   As tabelas (`users`, `categories`, `transactions`, `payment_methods`) serão criadas automaticamente pelo backend quando ele for iniciado pela primeira vez.

#### 1.2. Configuração do Projeto Backend

1.  **Navegue até a pasta `backend`:**
    ```bash
    cd Financeiro/backend
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Crie o arquivo `.env`:** Na pasta `backend`, crie um arquivo chamado `.env` e adicione as seguintes variáveis (ajuste conforme a sua configuração do MySQL no XAMPP):
    ```env
    PORT=5000
    DB_USER=root
    DB_HOST=localhost
    DB_NAME=financeiro_db
    DB_PASSWORD=
    DB_PORT=3306
    JWT_SECRET=seu_segredo_jwt_muito_seguro # Altere para uma string segura e complexa
    ```
    *   **`DB_USER`**: Geralmente `root` para XAMPP.
    *   **`DB_PASSWORD`**: Geralmente vazio para XAMPP.
    *   **`DB_PORT`**: Padrão `3306` para MySQL.
    *   **`JWT_SECRET`**: Essencial para a segurança da sua aplicação. **Não use "teste" em produção!**

4.  **Inicie o servidor backend:**
    ```bash
    node index.js
    ```
    Você deverá ver mensagens no terminal indicando que o servidor está rodando na porta 5000 e que as tabelas foram verificadas/criadas.

### 2. Frontend

1.  **Navegue até a raiz do projeto `Financeiro`:**
    ```bash
    cd Financeiro
    ```
    (Se você estiver na pasta `backend`, volte um diretório: `cd ..`)

2.  **Instale as dependências do frontend:**
    ```bash
    npm install
    ```
3.  **Inicie a aplicação frontend:**
    ```bash
    npm run dev
    ```
    A aplicação será iniciada e estará acessível em `http://localhost:3000`.

## 🚀 Funcionalidades

### Autenticação
-   **Registro (Signup):** Crie novas contas de usuário.
-   **Login:** Acesse a aplicação com suas credenciais.
-   **Proteção de Rotas:** Páginas como Dashboard, Transações, Relatórios e Configurações são protegidas por autenticação JWT.

### Dashboard
-   Visão geral das finanças: saldo total, receitas e despesas do mês, dívidas de cartão de crédito.
-   Transações recentes.
-   Botões de ações rápidas para adicionar receitas ou despesas.

### Transações
-   Lista completa de todas as transações.
-   Filtragem por descrição, categoria, método de pagamento, tipo (receita/despesa) e período de data.
-   Adição de novas transações.
-   Exclusão de transações existentes.

### Relatórios
-   **Resumo Financeiro:** Cartões com total de transações, maior gasto, categoria dominante e método de pagamento preferido.
-   **Gráficos:**
    -   Gastos por Categoria (gráfico de pizza).
    -   Tendências Mensais de Receitas e Despesas (gráfico de linha).
    -   Uso por Método de Pagamento (gráfico de barras).
    -   Visão Geral do Orçamento (saldo inicial, total de receitas/despesas, orçamento total).
-   Filtro por período (últimos 7 dias, 30 dias, 3 meses, etc.).

### Configurações
-   **Métodos de Pagamento:** Gerencie seus cartões de crédito/débito, dinheiro e PIX. Adicione, edite, ative/desative e defina um método padrão.
-   **Perfil:** Atualize seu nome de usuário.
-   **Notificações:** (Atualmente com funcionalidade mockada no frontend, sem integração com backend).

## 📂 Estrutura do Projeto

```
Financeiro/
├── app/                  # Páginas do Next.js (Dashboard, Login, Relatórios, etc.)
│   ├── api/              # Rotas de API internas do Next.js (se houver, não usadas aqui)
│   ├── dashboard/
│   ├── login/
│   ├── reports/
│   ├── settings/
│   ├── transactions/
│   └── layout.tsx        # Layout global da aplicação
├── components/           # Componentes React reutilizáveis (formulários, gráficos, modals, etc.)
│   ├── charts/           # Componentes específicos para gráficos de relatório
│   ├── ui/               # Componentes Shadcn/ui (botões, cards, etc.)
│   ├── add-transaction-modal.tsx
│   ├── dashboard-layout.tsx
│   ├── financial-overview.tsx
│   ├── login-form.tsx
│   ├── payment-methods-settings.tsx
│   ├── profile-settings.tsx
│   ├── quick-actions.tsx
│   ├── recent-transactions.tsx
│   └── transactions-list.tsx
├── public/               # Ativos estáticos
├── backend/              # Projeto Node.js com Express (servidor API)
│   ├── index.js          # Ponto de entrada do servidor, rotas e lógica do banco de dados
│   ├── .env              # Variáveis de ambiente do backend
│   └── package.json      # Dependências do backend
├── .env.example          # Exemplo de arquivo .env para o backend
├── globals.css           # Estilos globais
├── next.config.mjs       # Configuração do Next.js
├── package.json          # Dependências do frontend
├── postcss.config.mjs
├── README.md             # Este arquivo
├── tailwind.config.ts
├── tsconfig.json
└── v0.json
```

## 📜 Scripts Disponíveis

Na raiz do projeto (`Financeiro/`):
-   `npm run dev`: Inicia o servidor de desenvolvimento do Next.js.
-   `npm run build`: Compila a aplicação Next.js para produção.
-   `npm start`: Inicia a aplicação Next.js em modo de produção (após `npm run build`).
-   `npm lint`: Executa o linter do Next.js.

Na pasta `backend/`:
-   `node index.js`: Inicia o servidor Express do backend.

## 💡 Próximos Passos (Sugestões)

-   **Sistema de Orçamento por Categoria:** Implementar a definição de orçamentos específicos para cada categoria e acompanhar o gasto em relação a eles.
-   **Edição de Transações:** Adicionar a funcionalidade de editar transações existentes (a API `PUT /api/transactions/:id` já existe no backend).
-   **Exportação de Dados:** Permitir que os usuários exportem seus dados financeiros.
-   **Recuperação de Senha:** Implementar um fluxo de recuperação de senha.
-   **Testes:** Adicionar testes unitários e de integração para frontend e backend.
-   **Melhoria na UI/UX:** Refinar a interface e a experiência do usuário.
-   **Autenticação Avançada:** Implementar autenticação com provedores externos (Google, GitHub, etc.).

---
Feito com ❤️ e a ajuda de Cursor.
