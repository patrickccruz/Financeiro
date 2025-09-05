require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Importar mysql2/promise
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração do banco de dados MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then(connection => {
    console.log('Conectado ao MySQL/MariaDB');
    connection.release();
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados', err.stack);
  });

// Criar tabelas se não existirem
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);
    console.log('Tabela de usuários verificada/criada com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabela de usuários', err);
  }
})();

(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        color VARCHAR(7) DEFAULT '#CCCCCC',
        icon VARCHAR(255) DEFAULT 'Tag'
      );
    `);
    console.log('Tabela de categorias verificada/criada com sucesso');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category_id INT,
        payment_method VARCHAR(50),
        payment_method_id INT, -- Novo campo para referenciar o método de pagamento específico
        date DATE NOT NULL DEFAULT (CURRENT_DATE()),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
      );
    `);
    console.log('Tabela de transações verificada/criada com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabelas de categorias/transações', err);
  }
})();

(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        last_four VARCHAR(4),
        \`limit\` DECIMAL(10, 2),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        bank_account_id INT, -- Novo campo para referenciar a conta bancária
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
      );
    `);
    console.log('Tabela de métodos de pagamento verificada/criada com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabela de métodos de pagamento', err);
  }
})();

(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        initial_balance DECIMAL(10, 2) DEFAULT 0.00,
        current_balance DECIMAL(10, 2) DEFAULT 0.00,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('Tabela de contas bancárias verificada/criada com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabela de contas bancárias', err);
  }
})();

// Middleware para autenticação JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Se não houver token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Se o token for inválido
    req.user = user;
    next();
  });
}

// Rota de registro de usuário
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verificar se já existe algum usuário no banco de dados
    const [existingUsers] = await pool.execute('SELECT id FROM users LIMIT 1');
    if (existingUsers.length > 0) {
      return res.status(403).json({ message: 'O registro de novos usuários está desativado. Já existe um usuário no sistema.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    const user = { id: result.insertId, username };
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'Usuário registrado com sucesso', token, user: { id: user.id, username: user.username } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { // Erro de violação de chave única (usuário já existe)
      return res.status(400).json({ message: 'Nome de usuário já existe.' });
    }
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota de login de usuário
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login bem-sucedido', token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota protegida de exemplo
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Dados protegidos acessados com sucesso', user: req.user });
});

// Rotas para Categorias (CRUD)

// Obter todas as categorias
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, color, icon FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Adicionar nova categoria
app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name, color, icon } = req.body;
  try {
    const [result] = await pool.execute('INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)', [name, color || '#CCCCCC', icon || 'Tag']);
    res.status(201).json({ id: result.insertId, name, color: color || '#CCCCCC', icon: icon || 'Tag' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { // Unique violation
      return res.status(400).json({ message: 'Categoria com este nome já existe.' });
    }
    console.error('Erro ao adicionar categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Atualizar categoria
app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, color, icon } = req.body;
  try {
    const [result] = await pool.execute(
      'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
      [name, color || '#CCCCCC', icon || 'Tag', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }
    const [updatedRows] = await pool.execute('SELECT id, name, color, icon FROM categories WHERE id = ?', [id]);
    res.json(updatedRows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { // Unique violation
      return res.status(400).json({ message: 'Categoria com este nome já existe.' });
    }
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Deletar categoria
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }
    res.json({ message: 'Categoria deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rotas para Transações (CRUD)

// Obter todas as transações para o usuário autenticado
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const [rows] = await pool.execute(
      'SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, pm.name as payment_method_name, pm.last_four as payment_method_last_four FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id WHERE t.user_id = ? ORDER BY t.date DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro detalhado ao buscar transações:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Adicionar nova transação
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { description, amount, type, category_id, payment_method, payment_method_id, date } = req.body; // Adicionado payment_method_id
  try {
    const [result] = await pool.execute(
      'INSERT INTO transactions (user_id, description, amount, type, category_id, payment_method, payment_method_id, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', // Adicionado payment_method_id
      [userId, description, amount, type, category_id, payment_method, payment_method_id, date]
    );
    res.status(201).json({ id: result.insertId, user_id: userId, description, amount, type, category_id, payment_method, payment_method_id, date }); // Retorna payment_method_id
  } catch (error) {
    console.error('Erro ao adicionar transação:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Atualizar transação
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { description, amount, type, category_id, payment_method, payment_method_id, date } = req.body; // Adicionado payment_method_id
  try {
    const [result] = await pool.execute(
      'UPDATE transactions SET description = ?, amount = ?, type = ?, category_id = ?, payment_method = ?, payment_method_id = ?, date = ? WHERE id = ? AND user_id = ?', // Atualiza payment_method_id
      [description, amount, type, category_id, payment_method, payment_method_id, date, id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Transação não encontrada ou você não tem permissão para editá-la.' });
    }
    const [updatedRows] = await pool.execute('SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, pm.name as payment_method_name, pm.last_four as payment_method_last_four FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id WHERE t.id = ?', [id]);
    res.json(updatedRows[0]);
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Deletar transação
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Transação não encontrada ou você não tem permissão para deletá-la.' });
    }
    res.json({ message: 'Transação deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para obter visão geral financeira
app.get('/api/financial-overview', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  try {
    const [totalBalanceResult] = await pool.execute(
      'SELECT SUM(CASE WHEN type = \'income\' THEN amount ELSE -amount END) as total_balance FROM transactions WHERE user_id = ?',
      [userId]
    );

    const [monthlyIncomeResult] = await pool.execute(
      'SELECT SUM(amount) as monthly_income FROM transactions WHERE user_id = ? AND type = \'income\' AND MONTH(date) = ? AND YEAR(date) = ?',
      [userId, currentMonth, currentYear]
    );

    const [monthlyExpensesResult] = await pool.execute(
      'SELECT SUM(amount) as monthly_expenses FROM transactions WHERE user_id = ? AND type = \'expense\' AND MONTH(date) = ? AND YEAR(date) = ?',
      [userId, currentMonth, currentYear]
    );

    const [creditCardDebtResult] = await pool.execute(
      'SELECT SUM(amount) as credit_card_debt FROM transactions WHERE user_id = ? AND type = \'expense\' AND payment_method = \'credit\' AND MONTH(date) = ? AND YEAR(date) = ?',
      [userId, currentMonth, currentYear]
    );

    // Novo: Somar o limite de todos os cartões de crédito do usuário
    const [totalCreditLimitResult] = await pool.execute(
      'SELECT SUM(`limit`) as total_credit_limit FROM payment_methods WHERE user_id = ? AND type = \'credit\' AND is_active = TRUE',
      [userId]
    );

    const [bankAccountsResult] = await pool.execute(
      'SELECT SUM(initial_balance) as total_initial_balance, SUM(current_balance) as total_current_balance FROM bank_accounts WHERE user_id = ?',
      [userId]
    );

    const totalBalance = parseFloat(totalBalanceResult[0].total_balance || 0);
    const monthlyIncome = parseFloat(monthlyIncomeResult[0].monthly_income || 0);
    const monthlyExpenses = parseFloat(monthlyExpensesResult[0].monthly_expenses || 0);
    const creditCardDebt = parseFloat(creditCardDebtResult[0].credit_card_debt || 0);
    const totalCreditLimit = parseFloat(totalCreditLimitResult[0].total_credit_limit || 0);
    const availableCredit = totalCreditLimit - creditCardDebt;
    const totalInitialBalance = parseFloat(bankAccountsResult[0].total_initial_balance || 0);
    const totalCurrentBalance = parseFloat(bankAccountsResult[0].total_current_balance || 0);

    res.json({
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      creditCardDebt,
      totalCreditLimit, // Adicionado ao retorno
      availableCredit, // Adicionado ao retorno
      totalInitialBalance, // Adicionado ao retorno
      totalCurrentBalance, // Adicionado ao retorno
    });
  } catch (error) {
    console.error('Erro ao obter visão geral financeira:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para obter o resumo dos relatórios
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { period } = req.query;

  console.log('Requisição para /api/reports/summary. userId: ', userId, ' Period: ', period);

  let dateFrom = new Date();
  let dateTo = new Date();

  switch (period) {
    case 'last-7-days':
      dateFrom.setDate(dateTo.getDate() - 7);
      break;
    case 'last-30-days':
      dateFrom.setDate(dateTo.getDate() - 30);
      break;
    case 'last-3-months':
      dateFrom.setMonth(dateTo.getMonth() - 3);
      break;
    case 'last-6-months':
      dateFrom.setMonth(dateTo.getMonth() - 6);
      break;
    case 'last-year':
      dateFrom.setFullYear(dateTo.getFullYear() - 1);
      break;
    default:
      dateFrom.setDate(dateTo.getDate() - 30); // Padrão: últimos 30 dias
      break;
  }

  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];

  try {
    // Total de Transações
    const [totalTransactionsResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND date BETWEEN ? AND ?',
      [userId, dateFromStr, dateToStr]
    );

    // Maior Gasto
    const [highestExpenseResult] = await pool.execute(
      'SELECT description, amount, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE user_id = ? AND type = \'expense\' AND date BETWEEN ? AND ? ORDER BY amount DESC LIMIT 1',
      [userId, dateFromStr, dateToStr]
    );

    // Categoria Dominante
    const [dominantCategoryResult] = await pool.execute(
      'SELECT c.name as category_name, COUNT(*) as count, SUM(t.amount) as total_amount FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE user_id = ? AND type = \'expense\' AND date BETWEEN ? AND ? GROUP BY c.name ORDER BY total_amount DESC LIMIT 1',
      [userId, dateFromStr, dateToStr]
    );

    // Método Preferido
    const [preferredPaymentMethodResult] = await pool.execute(
      'SELECT payment_method, COUNT(*) as count FROM transactions WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY payment_method ORDER BY count DESC LIMIT 1',
      [userId, dateFromStr, dateToStr]
    );

    const totalTransactions = totalTransactionsResult[0].total || 0;
    const highestExpense = highestExpenseResult[0] ? { amount: parseFloat(highestExpenseResult[0].amount), description: highestExpenseResult[0].description, category_name: highestExpenseResult[0].category_name } : null;
    const dominantCategory = dominantCategoryResult[0] ? { name: dominantCategoryResult[0].category_name, percentage: parseFloat(dominantCategoryResult[0].total_amount || 0) } : null; // Percentagem será calculada no frontend
    const preferredPaymentMethod = preferredPaymentMethodResult[0] ? preferredPaymentMethodResult[0].payment_method : null;

    res.json({
      totalTransactions,
      highestExpense,
      dominantCategory,
      preferredPaymentMethod,
    });
  } catch (error) {
    console.error('Erro detalhado ao obter resumo de relatórios:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para Despesas por Categoria
app.get('/api/reports/expenses-by-category', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { period } = req.query;

  let dateFrom = new Date();
  let dateTo = new Date();

  switch (period) {
    case 'last-7-days':
      dateFrom.setDate(dateTo.getDate() - 7);
      break;
    case 'last-30-days':
      dateFrom.setDate(dateTo.getDate() - 30);
      break;
    case 'last-3-months':
      dateFrom.setMonth(dateTo.getMonth() - 3);
      break;
    case 'last-6-months':
      dateFrom.setMonth(dateTo.getMonth() - 6);
      break;
    case 'last-year':
      dateFrom.setFullYear(dateTo.getFullYear() - 1);
      break;
    default:
      dateFrom.setDate(dateTo.getDate() - 30); // Padrão: últimos 30 dias
      break;
  }

  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];

  try {
    const [rows] = await pool.execute(
      'SELECT c.name as category, c.color as category_color, SUM(t.amount) as total_amount FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = \'expense\' AND t.date BETWEEN ? AND ? GROUP BY c.name, c.color ORDER BY total_amount DESC',
      [userId, dateFromStr, dateToStr]
    );

    res.json(rows.map((row) => ({ category: row.category || 'Sem Categoria', amount: parseFloat(row.total_amount), color: row.category_color || '#CCCCCC' })));
  } catch (error) {
    console.error('Erro ao obter despesas por categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para Tendências Mensais (Receitas e Despesas)
app.get('/api/reports/monthly-trends', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { period } = req.query;

  let dateFrom = new Date();
  let dateTo = new Date();

  switch (period) {
    case 'last-3-months':
      dateFrom.setMonth(dateTo.getMonth() - 3);
      break;
    case 'last-6-months':
      dateFrom.setMonth(dateTo.getMonth() - 6);
      break;
    case 'last-year':
      dateFrom.setFullYear(dateTo.getFullYear() - 1);
      break;
    default:
      dateFrom.setMonth(dateTo.getMonth() - 3); // Padrão: últimos 3 meses
      break;
  }

  // Para tendências mensais, precisamos de dados por mês dentro do período
  const [monthlyDataResult] = await pool.execute(
    `SELECT
      DATE_FORMAT(date, '%Y-%m') as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ? AND date BETWEEN ? AND ?
    GROUP BY month
    ORDER BY month`,
    [userId, dateFrom.toISOString().split('T')[0], dateTo.toISOString().split('T')[0]]
  );

  // Preencher meses ausentes para ter uma série contínua no gráfico
  const trendDataMap = new Map();
  monthlyDataResult.forEach((row) => {
    trendDataMap.set(row.month, { income: parseFloat(row.income), expense: parseFloat(row.expense) });
  });

  const result = [];
  let current = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1);
  while (current <= dateTo) {
    const monthString = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
    const data = trendDataMap.get(monthString) || { income: 0, expense: 0 };
    result.push({ month: monthString, income: data.income, expense: data.expense });
    current.setMonth(current.getMonth() + 1);
  }

  res.json(result);
});

// Rota para Gráfico de Métodos de Pagamento
app.get('/api/reports/payment-methods', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { period } = req.query;

  let dateFrom = new Date();
  let dateTo = new Date();

  switch (period) {
    case 'last-7-days':
      dateFrom.setDate(dateTo.getDate() - 7);
      break;
    case 'last-30-days':
      dateFrom.setDate(dateTo.getDate() - 30);
      break;
    case 'last-3-months':
      dateFrom.setMonth(dateTo.getMonth() - 3);
      break;
    case 'last-6-months':
      dateFrom.setMonth(dateTo.getMonth() - 6);
      break;
    case 'last-year':
      dateFrom.setFullYear(dateTo.getFullYear() - 1);
      break;
    default:
      dateFrom.setDate(dateTo.getDate() - 30); // Padrão: últimos 30 dias
      break;
  }

  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];

  try {
    const [rows] = await pool.execute(
      'SELECT payment_method, COUNT(*) as count FROM transactions WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY payment_method ORDER BY count DESC',
      [userId, dateFromStr, dateToStr]
    );

    res.json(rows.map((row) => ({ method: row.payment_method, count: row.count })));
  } catch (error) {
    console.error('Erro ao obter dados de métodos de pagamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para Visão Geral do Orçamento
app.get('/api/reports/budget-overview', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { period } = req.query;

  let dateFrom = new Date();
  let dateTo = new Date();

  switch (period) {
    case 'last-7-days':
      dateFrom.setDate(dateTo.getDate() - 7);
      break;
    case 'last-30-days':
      dateFrom.setDate(dateTo.getDate() - 30);
      break;
    case 'last-3-months':
      dateFrom.setMonth(dateTo.getMonth() - 3);
      break;
    case 'last-6-months':
      dateFrom.setMonth(dateTo.getMonth() - 6);
      break;
    case 'last-year':
      dateFrom.setFullYear(dateTo.getFullYear() - 1);
      break;
    default:
      dateFrom.setDate(dateTo.getDate() - 30); // Padrão: últimos 30 dias
      break;
  }

  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];

  try {
    const [incomeResult] = await pool.execute(
      'SELECT SUM(amount) as total_income FROM transactions WHERE user_id = ? AND type = \'income\' AND date BETWEEN ? AND ?',
      [userId, dateFromStr, dateToStr]
    );

    const [expenseResult] = await pool.execute(
      'SELECT SUM(amount) as total_expense FROM transactions WHERE user_id = ? AND type = \'expense\' AND date BETWEEN ? AND ?',
      [userId, dateFromStr, dateToStr]
    );

    const totalIncome = parseFloat(incomeResult[0].total_income || 0);
    const totalExpense = parseFloat(expenseResult[0].total_expense || 0);

    // Placeholder para Saldo Inicial e Orçamento Definido
    const initialBalance = 1000.00; // Valor fixo para simulação
    const budgetAmount = 2000.00; // Valor fixo para simulação

    res.json({
      initialBalance,
      totalIncome,
      totalExpense,
      budgetAmount,
    });
  } catch (error) {
    console.error('Erro ao obter visão geral do orçamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rotas para Métodos de Pagamento (CRUD)

// Obter todos os métodos de pagamento para o usuário autenticado
app.get('/api/payment-methods', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const [rows] = await pool.execute(
      'SELECT id, type, name, last_four, `limit`, is_active, is_default, bank_account_id FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, name',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar métodos de pagamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Adicionar novo método de pagamento
app.post('/api/payment-methods', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { type, name, last_four, limit, is_default, bank_account_id } = req.body; // Adicionado bank_account_id

  try {
    // Se o novo método for definido como padrão, desativar o padrão atual do usuário
    if (is_default) {
      await pool.execute(
        'UPDATE payment_methods SET is_default = FALSE WHERE user_id = ? AND is_default = TRUE AND type = ?',
        [userId, type]
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO payment_methods (user_id, type, name, last_four, `limit`, is_active, is_default, bank_account_id) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)', // Adicionado bank_account_id
      [userId, type, name, last_four, limit, is_default, bank_account_id]
    );

    const newPaymentMethodId = result.insertId;

    // Removida a lógica de criação de transação de receita para saldo inicial de débito

    const [newMethod] = await pool.execute('SELECT id, type, name, last_four, `limit`, is_active, is_default, bank_account_id FROM payment_methods WHERE id = ?', [newPaymentMethodId]);
    res.status(201).json(newMethod[0]);
  } catch (error) {
    console.error('Erro ao adicionar método de pagamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Atualizar método de pagamento
app.put('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { type, name, last_four, limit, is_active, is_default, bank_account_id } = req.body; // Adicionado bank_account_id

  try {
    // Removida a lógica de obter saldo anterior

    // Se o método está sendo definido como padrão, desativar o padrão atual do usuário
    if (is_default) {
      await pool.execute(
        'UPDATE payment_methods SET is_default = FALSE WHERE user_id = ? AND is_default = TRUE AND type = ? AND id != ?',
        [userId, type, id]
      );
    }

    const [result] = await pool.execute(
      'UPDATE payment_methods SET type = ?, name = ?, last_four = ?, `limit` = ?, is_active = ?, is_default = ?, bank_account_id = ? WHERE id = ? AND user_id = ?', // Adicionado bank_account_id
      [type, name, last_four, limit, is_active, is_default, bank_account_id, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Método de pagamento não encontrado ou você não tem permissão para editá-lo.' });
    }

    // Removida a lógica de ajustar o saldo do usuário

    const [updatedMethod] = await pool.execute('SELECT id, type, name, last_four, `limit`, is_active, is_default, bank_account_id FROM payment_methods WHERE id = ?', [id]);
    res.json(updatedMethod[0]);
  } catch (error) {
    console.error('Erro ao atualizar método de pagamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Deletar método de pagamento
app.delete('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    // Removida a lógica de remover o saldo do usuário antes de deletar

    const [result] = await pool.execute(
      'DELETE FROM payment_methods WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Método de pagamento não encontrado ou você não tem permissão para deletá-lo.' });
    }

    res.json({ message: 'Método de pagamento deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar método de pagamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rotas para Contas Bancárias (CRUD)

// Adicionar nova conta bancária
app.post('/api/bank-accounts', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { name, initial_balance, is_default } = req.body;

  try {
    // Se a nova conta for definida como padrão, desativar o padrão atual do usuário
    if (is_default) {
      await pool.execute(
        'UPDATE bank_accounts SET is_default = FALSE WHERE user_id = ? AND is_default = TRUE',
        [userId]
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO bank_accounts (user_id, name, initial_balance, current_balance, is_default) VALUES (?, ?, ?, ?, ?)',
      [userId, name, initial_balance || 0, initial_balance || 0, is_default]
    );

    const newBankAccountId = result.insertId;

    // Se houver saldo inicial, criar uma transação de receita
    if (initial_balance && parseFloat(initial_balance) > 0) {
      await pool.execute(
        'INSERT INTO transactions (user_id, description, amount, type, payment_method, payment_method_id, category_id, date) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)', // payment_method_id deve ser NULL
        [userId, 'Saldo inicial da conta bancária', parseFloat(initial_balance), 'income', 'bank_account', null, new Date()]
      );
    }

    const [newAccount] = await pool.execute('SELECT id, name, initial_balance, current_balance, is_default FROM bank_accounts WHERE id = ?', [newBankAccountId]);
    res.status(201).json(newAccount[0]);
  } catch (error) {
    console.error('Erro ao adicionar conta bancária:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Obter todas as contas bancárias para o usuário autenticado
app.get('/api/bank-accounts', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const [rows] = await pool.execute('SELECT id, name, initial_balance, current_balance, is_default FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, name', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar contas bancárias:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rotas para Perfil do Usuário

// Obter perfil do usuário autenticado
app.get('/api/profile', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const [rows] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [userId]);
    const userProfile = rows[0];

    if (!userProfile) {
      return res.status(404).json({ message: 'Perfil do usuário não encontrado.' });
    }
    res.json(userProfile);
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Atualizar perfil do usuário (apenas username por enquanto)
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { username } = req.body;

  try {
    const [result] = await pool.execute(
      'UPDATE users SET username = ? WHERE id = ?',
      [username, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Perfil do usuário não encontrado.' });
    }

    const [updatedUser] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Perfil atualizado com sucesso', user: updatedUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Nome de usuário já existe.' });
    }
    console.error('Erro ao atualizar perfil do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para alterar a senha do usuário
app.put('/api/profile/change-password', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' });
  }

  try {
    // Obter a senha hash atual do usuário
    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Comparar a senha atual fornecida com a senha hash no banco de dados
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha atual incorreta.' });
    }

    // Fazer hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar a senha no banco de dados
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

    res.json({ message: 'Senha atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API Financeiro funcionando!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
