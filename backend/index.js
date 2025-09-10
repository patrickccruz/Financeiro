require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Importar mysql2/promise
const bcryptjs = require('bcryptjs'); // Usar bcryptjs
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs'); // Adicionar esta linha
const { sendEmail } = require('./services/emailService'); // Importar serviço de e-mail
const { generateAndSendMonthlyReport } = require('./services/reportService'); // Importar serviço de relatório

const app = express();
app.use(express.json());
app.use(cors());

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

async function initializeDatabaseAndTables() {
  let tempConnection;
  try {
    // 1. Conectar ao servidor MySQL sem um banco de dados específico para criar o DB se não existir
    tempConnection = await mysql.createConnection({
      ...poolConfig,
      database: null, // Conecta sem especificar um DB
    });

    console.log(`Verificando/Criando banco de dados: ${process.env.DB_NAME}`);
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Banco de dados ${process.env.DB_NAME} verificado/criado.`);

    await tempConnection.end(); // Fechar a conexão temporária

    // 2. Criar o pool principal com o banco de dados especificado
    pool = mysql.createPool({
      ...poolConfig,
      database: process.env.DB_NAME, // Agora o DB deve existir
    });

    // Testar a conexão do pool principal
    await pool.getConnection()
      .then(connection => {
        console.log('Conectado ao MySQL/MariaDB com o banco de dados principal.');
        connection.release();
      })
      .catch(err => {
        console.error('Erro ao conectar ao banco de dados principal:', err.stack);
        process.exit(1); // Encerrar se não conseguir conectar ao DB principal
      });

    // 3. Criar tabelas dentro do banco de dados (ignorando a instrução CREATE DATABASE)
    const createTablesSql = fs.readFileSync('./sql/create_tables.sql', 'utf8');
    // Remove a instrução CREATE DATABASE do script SQL, pois já foi tratada
    const createTablesOnlySql = createTablesSql.replace(/DROP DATABASE IF EXISTS financeiro_db;/i, '').replace(/CREATE DATABASE IF NOT EXISTS financeiro_db;/i, '').trim();
    const sqlCommands = createTablesOnlySql.split(';').filter(command => command.trim() !== '');

    for (const command of sqlCommands) {
      if (command.trim() !== '') {
        await pool.execute(command);
      }
    }
    console.log('Todas as tabelas verificadas/criadas com sucesso');

  } catch (err) {
    console.error('Erro durante a inicialização do banco de dados e tabelas:', err);
    if (tempConnection) {
      await tempConnection.end();
    }
    process.exit(1); // Encerrar o processo em caso de erro crítico
  }
}

// Chamar a função de inicialização ao iniciar o servidor
initializeDatabaseAndTables().then(() => {
  module.exports.pool = pool; // Exportar o pool após a inicialização
});

// Funções auxiliares para calcular recorrências
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

// Função auxiliar para gerar ocorrências futuras de dívidas recorrentes
function generateFutureDebts(baseDebts, projectionMonths = 12, filterStartDate = null, filterEndDate = null) {
  let allDebts = [...baseDebts];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar para o início do dia

  const maxFutureDate = addMonths(today, projectionMonths);
  maxFutureDate.setHours(23, 59, 59, 999); // Normalizar para o fim do dia

  for (const originalDebt of baseDebts) {
    if (originalDebt.recurrence_type !== 'none' && originalDebt.status === 'pending') {
      let currentDate = new Date(originalDebt.due_date);
      currentDate.setHours(0, 0, 0, 0); // Normalizar para o início do dia

      // Se a dívida original já venceu, pular para a próxima ocorrência futura
      while (currentDate < today) {
        let nextCandidateDate;
        if (originalDebt.recurrence_type === 'monthly') {
          nextCandidateDate = addMonths(currentDate, 1);
        } else if (originalDebt.recurrence_type === 'custom') {
          switch (originalDebt.recurrence_unit) {
            case 'day': nextCandidateDate = addDays(currentDate, originalDebt.recurrence_interval); break;
            case 'week': nextCandidateDate = addDays(currentDate, originalDebt.recurrence_interval * 7); break;
            case 'month': nextCandidateDate = addMonths(currentDate, originalDebt.recurrence_interval); break;
            case 'year': nextCandidateDate = addYears(currentDate, originalDebt.recurrence_interval); break;
            default: nextCandidateDate = addMonths(currentDate, 1); break; // Fallback
          }
        } else if (originalDebt.recurrence_type === 'installments') {
          // Dívidas parceladas geram ocorrências futuras se houver parcelas restantes
          if (originalDebt.paid_installments < originalDebt.installments) {
            // Para parcelas, cada nova "ocorrência" é um pagamento futuro.
            // A data de vencimento da próxima parcela é geralmente um mês após a anterior
            nextCandidateDate = addMonths(currentDate, 1); 
          } else {
            break; // Todas as parcelas foram pagas ou projetadas
          }
        } else {
          break; // Não é recorrente ou tipo desconhecido
        }

        if (nextCandidateDate && nextCandidateDate >= today) {
          currentDate = nextCandidateDate;
          break; // Encontrou a primeira ocorrência futura
        } else if (nextCandidateDate) {
          currentDate = nextCandidateDate;
        } else {
          break;
        }
      }
      
      // Gerar ocorrências futuras a partir da currentDate ajustada
      while (currentDate <= maxFutureDate) {
        if (originalDebt.recurrence_type === 'installments') {
          // Para parcelas, geramos até o número total de parcelas
          if (originalDebt.paid_installments + (allDebts.filter(d => d.original_debt_id === originalDebt.id).length) >= originalDebt.installments) {
            break; // Já geramos todas as parcelas futuras
          }
        }

        const futureDebt = { ...originalDebt };
        futureDebt.id = `debt-recurring-${originalDebt.id}-${currentDate.getTime()}`; // ID único para ocorrência gerada
        futureDebt.original_debt_id = originalDebt.id; // Referência à dívida original
        futureDebt.due_date = currentDate.toISOString().split('T')[0];
        futureDebt.is_generated_recurring = true; // Flag
        futureDebt.status = 'pending'; // Ocorrência futura é sempre pendente
        allDebts.push(futureDebt);

        let nextDate;
        if (originalDebt.recurrence_type === 'monthly') {
          nextDate = addMonths(currentDate, 1);
        } else if (originalDebt.recurrence_type === 'custom') {
          switch (originalDebt.recurrence_unit) {
            case 'day': nextDate = addDays(currentDate, originalDebt.recurrence_interval); break;
            case 'week': nextDate = addDays(currentDate, originalDebt.recurrence_interval * 7); break;
            case 'month': nextDate = addMonths(currentDate, originalDebt.recurrence_interval); break;
            case 'year': nextDate = addYears(currentDate, originalDebt.recurrence_interval); break;
            default: nextDate = addMonths(currentDate, 1); break;
          }
        } else if (originalDebt.recurrence_type === 'installments') {
          nextDate = addMonths(currentDate, 1); // Próxima parcela um mês depois
        } else {
          break; // Tipo de recorrência desconhecido ou não recorrente
        }
        currentDate = nextDate;
      }
    }
  }

  // Aplicar filtros de data se fornecidos
  const finalFilteredDebts = allDebts.filter(debt => {
    const debtDate = new Date(debt.due_date);
    debtDate.setHours(0, 0, 0, 0);
    const isWithinDateRange = (!filterStartDate || debtDate >= new Date(filterStartDate)) &&
                              (!filterEndDate || debtDate <= new Date(filterEndDate));
    return isWithinDateRange;
  });

  return finalFilteredDebts;
}

// Função auxiliar para gerar ocorrências futuras de transações recorrentes
function generateFutureRecurringTransactions(baseTransactions, projectionMonths = 12, filterStartDate = null, filterEndDate = null) {
  let allTransactions = [...baseTransactions];
  const today = new Date();
  const maxFutureDate = addMonths(today, projectionMonths); // Projetar N meses no futuro

  for (const originalTransaction of baseTransactions) {
    if (originalTransaction.is_recurring) {
      let currentDate = new Date(originalTransaction.date);

      // Avançar currentDate até a primeira ocorrência futura a partir de hoje
      // ou, se a transação original for no futuro, usar a data original como ponto de partida
      if (currentDate < today) {
        let tempDate = new Date(currentDate);
        let foundNext = false;
        while (tempDate <= maxFutureDate && (!originalTransaction.recurrence_end_date || tempDate <= new Date(originalTransaction.recurrence_end_date))) {
          let nextCandidateDate;
          switch (originalTransaction.frequency) {
            case "weekly": nextCandidateDate = addDays(tempDate, 7); break;
            case "monthly": nextCandidateDate = addMonths(tempDate, 1); break;
            case "annually": nextCandidateDate = addYears(tempDate, 1); break;
            case "custom": nextCandidateDate = addMonths(tempDate, 1); break; // Fallback
            default: nextCandidateDate = addMonths(tempDate, 1); break;
          }
          if (nextCandidateDate > today) {
            currentDate = nextCandidateDate;
            foundNext = true;
            break;
          }
          tempDate = nextCandidateDate;
        }
        if (!foundNext) {
          continue; // Nenhuma ocorrência futura para esta transação recorrente dentro do período máximo
        }
      } else if (currentDate > maxFutureDate) {
        continue; // A transação original já está além do período de projeção
      }

      // Gerar ocorrências futuras a partir da currentDate ajustada
      while (currentDate <= maxFutureDate && (!originalTransaction.recurrence_end_date || currentDate <= new Date(originalTransaction.recurrence_end_date))) {
        const futureTransaction = { ...originalTransaction };
        futureTransaction.id = `recurring-${originalTransaction.id}-${currentDate.getTime()}`; // ID único
        futureTransaction.date = currentDate.toISOString().split('T')[0];
        futureTransaction.is_generated_recurring = true; // Flag
        allTransactions.push(futureTransaction);

        let nextDate;
        switch (originalTransaction.frequency) {
          case "weekly": nextDate = addDays(currentDate, 7); break;
          case "monthly": nextDate = addMonths(currentDate, 1); break;
          case "annually": nextDate = addYears(currentDate, 1); break;
          case "custom": nextDate = addMonths(currentDate, 1); break; // Fallback
          default: nextDate = addMonths(currentDate, 1); break;
        }
        currentDate = nextDate;
      }
    }
  }

  // Aplicar filtros de data se fornecidos
  const finalFilteredTransactions = allTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const isWithinDateRange = (!filterStartDate || transactionDate >= new Date(filterStartDate)) &&
                              (!filterEndDate || transactionDate <= new Date(filterEndDate));
    return isWithinDateRange;
  });

  return finalFilteredTransactions;
}

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
    // const [existingUsers] = await pool.execute('SELECT id FROM users LIMIT 1');
    // if (existingUsers.length > 0) {
    //   return res.status(403).json({ message: 'O registro de novos usuários está desativado. Já existe um usuário no sistema.' });
    // }

    const hashedPassword = await bcryptjs.hash(password, 10);

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

    const isPasswordValid = await bcryptjs.compare(password, user.password);

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
  const { startDate, endDate } = req.query;

  try {
    // 1. Obter todas as transações base do usuário (reais e recorrentes originais)
    const [baseTransactions] = await pool.execute(
      'SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, pm.name as payment_method_name, pm.last_four as payment_method_last_four, ba.name as bank_account_name, t.is_recurring, t.frequency, t.recurrence_end_date, t.custom_recurrence_interval FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id WHERE t.user_id = ? ORDER BY t.date DESC',
      [userId]
    );

    // 2. Gerar ocorrências futuras de transações recorrentes e aplicar filtros de data
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 12, startDate, endDate);

    // 3. Ordenar todas as transações por data
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(allTransactions);
  } catch (error) {
    console.error('Erro detalhado ao buscar transações:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Adicionar nova transação
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { description, amount, type, category_id, payment_method, payment_method_id, date, is_recurring, frequency, recurrence_end_date, custom_recurrence_interval } = req.body; // Adicionado campos de recorrência
  try {
    const [result] = await pool.execute(
      'INSERT INTO transactions (user_id, description, amount, type, category_id, payment_method, payment_method_id, date, is_recurring, frequency, recurrence_end_date, custom_recurrence_interval) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', // Adicionado campos de recorrência
      [userId, description, amount, type, category_id || null, payment_method || null, payment_method_id || null, date, is_recurring || false, frequency || null, recurrence_end_date || null, custom_recurrence_interval || null]
    );

    // Buscar as configurações de notificação do usuário
    const [userSettings] = await pool.execute(
      'SELECT email_transactions FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    const notificationsEnabled = userSettings[0]?.email_transactions === 1; // MySQL BOOLEAN é 1 ou 0

    if (notificationsEnabled) {
      // Buscar o username do usuário para o e-mail
      const [userRows] = await pool.execute('SELECT username FROM users WHERE id = ?', [userId]);
      const userEmail = userRows[0] ? `${userRows[0].username}@example.com` : `user${userId}@example.com`; // Placeholder
      
      const subject = 'Nova Transação Registrada';
      const htmlContent = `
        <h1>Nova Transação em sua Conta Financeira</h1>
        <p>Olá,</p>
        <p>Uma nova transação foi registrada em sua conta:</p>
        <ul>
          <li><strong>Descrição:</strong> ${description}</li>
          <li><strong>Valor:</strong> R$ ${parseFloat(amount).toFixed(2)}</li>
          <li><strong>Tipo:</strong> ${type === 'income' ? 'Receita' : 'Despesa'}</li>
          <li><strong>Data:</strong> ${new Date(date).toLocaleDateString('pt-BR')}</li>
        </ul>
        <p>Obrigado!</p>
      `;

      sendEmail(userEmail, subject, htmlContent);
    }

    res.status(201).json({ id: result.insertId, user_id: userId, description, amount, type, category_id, payment_method, payment_method_id, date, is_recurring, frequency, recurrence_end_date, custom_recurrence_interval }); // Retorna todos os campos, incluindo recorrência
  } catch (error) {
    console.error('Erro ao adicionar transação:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Atualizar transação
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { description, amount, type, category_id, payment_method, payment_method_id, date, is_recurring, frequency, recurrence_end_date, custom_recurrence_interval } = req.body; // Adicionado campos de recorrência
  try {
    const [result] = await pool.execute(
      'UPDATE transactions SET description = ?, amount = ?, type = ?, category_id = ?, payment_method = ?, payment_method_id = ?, date = ?, is_recurring = ?, frequency = ?, recurrence_end_date = ?, custom_recurrence_interval = ? WHERE id = ? AND user_id = ?', // Atualiza campos de recorrência
      [description, amount, type, category_id, payment_method, payment_method_id, date, is_recurring, frequency, recurrence_end_date, custom_recurrence_interval, id, userId]
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
    // Obter todas as transações (reais e recorrentes originais)
    const [baseTransactions] = await pool.execute(
      'SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, pm.name as payment_method_name, pm.last_four as payment_method_last_four FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id WHERE t.user_id = ?',
      [userId]
    );

    // Gerar ocorrências futuras de transações recorrentes
    // Para o financial-overview, podemos projetar um período razoável (ex: 3 meses para frente)
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 3); // Projetar 3 meses

    // Filtrar transações para o mês/ano atual para os cálculos mensais
    const currentMonthTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() + 1 === currentMonth && transactionDate.getFullYear() === currentYear;
    });

    // Calcular totais a partir de allTransactions (para saldo total)
    const totalBalance = allTransactions.reduce((sum, t) => {
      const amount = parseFloat(t.amount);
      return sum + (t.type === 'income' ? amount : -amount);
    }, 0);

    // Calcular para o mês atual a partir de currentMonthTransactions
    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const creditCardDebt = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.payment_method === 'credit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Novo: Somar o limite de todos os cartões de crédito do usuário (isso não muda com recorrência)
    const [totalCreditLimitResult] = await pool.execute(
      'SELECT SUM(`max_credit_limit`) as total_credit_limit FROM payment_methods WHERE user_id = ? AND type = \'credit\' AND is_active = TRUE',
      [userId]
    );

    const [bankAccountsResult] = await pool.execute(
      'SELECT SUM(initial_balance) as total_initial_balance, SUM(current_balance) as total_current_balance FROM bank_accounts WHERE user_id = ?',
      [userId]
    );

    const totalCreditLimit = parseFloat(totalCreditLimitResult[0].total_credit_limit || 0);
    const availableCredit = totalCreditLimit - creditCardDebt;
    const totalInitialBalance = parseFloat(bankAccountsResult[0].total_initial_balance || 0);
    const totalCurrentBalance = parseFloat(bankAccountsResult[0].total_current_balance || 0); // Isso precisaria de uma lógica mais complexa para refletir recorrências futuras

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
    // 1. Obter todas as transações base para o período
    const [baseTransactions] = await pool.execute(
      'SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?',
      [userId]
    );

    // 2. Gerar ocorrências futuras de transações recorrentes dentro do período do relatório
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 12, dateFromStr, dateToStr);

    // Filtrar as transações para o período específico, garantindo que as reais também sejam consideradas
    const transactionsForPeriod = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= dateFrom && transactionDate <= dateTo;
    });

    // Total de Transações
    const totalTransactions = transactionsForPeriod.length;

    // Maior Gasto
    const highestExpense = transactionsForPeriod
      .filter(t => t.type === 'expense')
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0] || null;
    
    const highestExpenseFormatted = highestExpense ? { amount: parseFloat(highestExpense.amount), description: highestExpense.description, category_name: highestExpense.category_name } : null;

    // Categoria Dominante (baseado em despesas)
    const expenseCategories = transactionsForPeriod.filter(t => t.type === 'expense');
    const categoryTotals = expenseCategories.reduce((acc, t) => {
        acc[t.category_name] = (acc[t.category_name] || 0) + parseFloat(t.amount);
        return acc;
    }, {});

    let dominantCategory = null;
    let maxAmount = 0;
    for (const categoryName in categoryTotals) {
        if (categoryTotals[categoryName] > maxAmount) {
            maxAmount = categoryTotals[categoryName];
            dominantCategory = { name: categoryName, total_amount: maxAmount };
        }
    }
    const dominantCategoryFormatted = dominantCategory ? { name: dominantCategory.name, percentage: parseFloat(dominantCategory.total_amount) } : null;

    // Método Preferido
    const paymentMethodCounts = transactionsForPeriod.reduce((acc, t) => {
        acc[t.payment_method] = (acc[t.payment_method] || 0) + 1;
        return acc;
    }, {});

    let preferredPaymentMethod = null;
    let maxCount = 0;
    for (const method in paymentMethodCounts) {
        if (paymentMethodCounts[method] > maxCount) {
            maxCount = paymentMethodCounts[method];
            preferredPaymentMethod = method;
        }
    }

    res.json({
      totalTransactions,
      highestExpense: highestExpenseFormatted,
      dominantCategory: dominantCategoryFormatted,
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
    // 1. Obter todas as transações base para o usuário
    const [baseTransactions] = await pool.execute(
      'SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?',
      [userId]
    );

    // 2. Gerar ocorrências futuras de transações recorrentes e aplicar filtros de data
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 12, dateFromStr, dateToStr);

    // 3. Filtrar despesas para o período e calcular os totais por categoria
    const expensesByCategory = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryName = t.category_name || 'Sem Categoria';
        if (!acc[categoryName]) {
          acc[categoryName] = { category: categoryName, total_amount: 0, color: t.category_color || '#CCCCCC' };
        }
        acc[categoryName].total_amount += parseFloat(t.amount);
        return acc;
      }, {});

    const result = Object.values(expensesByCategory).map(item => ({...item, amount: parseFloat(item.total_amount)}));
    result.sort((a, b) => b.amount - a.amount);

    res.json(result);
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

  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];

  try {
    // 1. Obter todas as transações base para o usuário
    const [baseTransactions] = await pool.execute(
      'SELECT t.* FROM transactions t WHERE t.user_id = ?',
      [userId]
    );

    // 2. Gerar ocorrências futuras de transações recorrentes e aplicar filtros de data
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 12, dateFromStr, dateToStr);

    // 3. Calcular as tendências mensais a partir de allTransactions
    const monthlyDataMap = allTransactions.reduce((acc, t) => {
      const transactionDate = new Date(t.date);
      const monthString = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!acc[monthString]) {
        acc[monthString] = { income: 0, expense: 0 };
      }

      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        acc[monthString].income += amount;
      } else if (t.type === 'expense') {
        acc[monthString].expense += amount;
      }
      return acc;
    }, {});

    // Preencher meses ausentes para ter uma série contínua no gráfico
    const result = [];
    let current = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1);
    while (current <= dateTo) {
      const monthString = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
      const data = monthlyDataMap[monthString] || { income: 0, expense: 0 };
      result.push({ month: monthString, income: data.income, expense: data.expense });
      current.setMonth(current.getMonth() + 1);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao obter tendências mensais:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
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
    // 1. Obter todas as transações base para o usuário
    const [baseTransactions] = await pool.execute(
      'SELECT t.* FROM transactions t WHERE t.user_id = ?',
      [userId]
    );

    // 2. Gerar ocorrências futuras de transações recorrentes e aplicar filtros de data
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 12, dateFromStr, dateToStr);

    // 3. Contar os métodos de pagamento a partir de allTransactions
    const paymentMethodCounts = allTransactions.reduce((acc, t) => {
      acc[t.payment_method] = (acc[t.payment_method] || 0) + 1;
      return acc;
    }, {});

    const result = Object.entries(paymentMethodCounts).map(([method, count]) => ({
      method,
      count,
    }));

    result.sort((a, b) => b.count - a.count);

    res.json(result);
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
    // 1. Obter todas as transações base para o usuário
    const [baseTransactions] = await pool.execute(
      'SELECT t.* FROM transactions t WHERE t.user_id = ?',
      [userId]
    );

    // 2. Gerar ocorrências futuras de transações recorrentes e aplicar filtros de data
    const allTransactions = generateFutureRecurringTransactions(baseTransactions, 12, dateFromStr, dateToStr);

    // 3. Filtrar transações para o período e calcular os totais
    const transactionsForPeriod = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= dateFrom && transactionDate <= dateTo;
    });

    const totalIncome = transactionsForPeriod
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = transactionsForPeriod
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

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
      'SELECT id, type, name, last_four, `max_credit_limit`, is_active, is_default, bank_account_id FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, name',
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
      'INSERT INTO payment_methods (user_id, type, name, last_four, `max_credit_limit`, is_active, is_default, bank_account_id) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)', // Adicionado bank_account_id
      [userId, type, name, last_four, limit, is_default, bank_account_id]
    );

    const newPaymentMethodId = result.insertId;

    // Removida a lógica de criação de transação de receita para saldo inicial de débito

    const [newMethod] = await pool.execute('SELECT id, type, name, last_four, `credit_limit`, is_active, is_default, bank_account_id FROM payment_methods WHERE id = ?', [newPaymentMethodId]);
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
      'UPDATE payment_methods SET type = ?, name = ?, last_four = ?, `max_credit_limit` = ?, is_active = ?, is_default = ?, bank_account_id = ? WHERE id = ? AND user_id = ?', // Adicionado bank_account_id
      [type, name, last_four, limit, is_active, is_default, bank_account_id, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Método de pagamento não encontrado ou você não tem permissão para editá-lo.' });
    }

    // Removida a lógica de ajustar o saldo do usuário

    const [updatedMethod] = await pool.execute('SELECT id, type, name, last_four, `credit_limit`, is_active, is_default, bank_account_id FROM payment_methods WHERE id = ?', [id]);
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
        'INSERT INTO transactions (user_id, description, amount, type, payment_method, payment_method_id, category_id, bank_account_id, date) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)', // Ajustado category_id para NULL
        [userId, `Saldo inicial da conta ${name}`, parseFloat(initial_balance), 'income', 'bank_account', newBankAccountId, new Date()] // Ajustado para corresponder à nova query
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

// Atualizar conta bancária
app.put('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { name, initial_balance, is_default } = req.body; // Removido current_balance do destructuring

  try {
    // 1. Obter dados da conta existente
    const [existingAccounts] = await pool.execute(
      'SELECT name, initial_balance, current_balance FROM bank_accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingAccounts.length === 0) {
      return res.status(404).json({ message: 'Conta bancária não encontrada ou você não tem permissão para editá-la.' });
    }

    const oldAccountName = existingAccounts[0].name;
    const oldInitialBalance = parseFloat(existingAccounts[0].initial_balance);
    const newInitialBalance = parseFloat(initial_balance); // Garantir que é um número

    // 2. Lógica is_default
    if (is_default) {
      await pool.execute(
        'UPDATE bank_accounts SET is_default = FALSE WHERE user_id = ? AND is_default = TRUE AND id != ?',
        [userId, id]
      );
    }

    // 3. Atualizar initial_balance e transactions de "Saldo Inicial"
    if (newInitialBalance !== oldInitialBalance) {
      // Deletar transação de saldo inicial antiga (se existir)
      await pool.execute(
        'DELETE FROM transactions WHERE user_id = ? AND bank_account_id = ? AND description = ? AND type = \'income\'',
        [userId, id, `Saldo inicial da conta ${oldAccountName}`]
      );

      // Criar nova transação de saldo inicial (se o novo initial_balance for maior que zero)
      if (newInitialBalance > 0) {
        await pool.execute(
          'INSERT INTO transactions (user_id, description, amount, type, payment_method, payment_method_id, category_id, bank_account_id, date) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)',
          [userId, `Saldo inicial da conta ${name}`, newInitialBalance, 'income', 'bank_account', id, new Date()]
        );
      }
    }

    // 4. Recalcular current_balance
    // Somar todas as transações (incluindo o saldo inicial ajustado) para esta conta
    const [balanceCalcResult] = await pool.execute(
      'SELECT SUM(CASE WHEN type = \'income\' THEN amount ELSE -amount END) as calculated_balance FROM transactions WHERE user_id = ? AND bank_account_id = ?',
      [userId, id]
    );
    const newCurrentBalance = parseFloat(balanceCalcResult[0].calculated_balance || 0);

    // 5. Executar UPDATE final na tabela bank_accounts
    const [result] = await pool.execute(
      'UPDATE bank_accounts SET name = ?, initial_balance = ?, current_balance = ?, is_default = ? WHERE id = ? AND user_id = ?',
      [name, newInitialBalance, newCurrentBalance, is_default, id, userId]
    );

    if (result.affectedRows === 0) {
      // Isso teoricamente não deveria acontecer aqui, pois já verificamos a existência acima
      return res.status(404).json({ message: 'Conta bancária não encontrada ou você não tem permissão para editá-la.' });
    }

    // 6. Retornar conta atualizada
    const [updatedAccount] = await pool.execute('SELECT id, name, initial_balance, current_balance, is_default FROM bank_accounts WHERE id = ?', [id]);
    res.json(updatedAccount[0]);
  } catch (error) {
    console.error('Erro ao atualizar conta bancária:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Deletar conta bancária
app.delete('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    // Opcional: Você pode querer verificar se existem transações associadas a esta conta
    // e decidir se deve impedir a exclusão, reatribuir transações ou excluí-las em cascata.
    // Para simplificar, estamos permitindo a exclusão em cascata (ON DELETE SET NULL) nas transações e métodos de pagamento.

    const [result] = await pool.execute(
      'DELETE FROM bank_accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Conta bancária não encontrada ou você não tem permissão para deletá-la.' });
    }

    res.json({ message: 'Conta bancária deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar conta bancária:', error);
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
    const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha atual incorreta.' });
    }

    // Fazer hash da nova senha
    const hashedNewPassword = await bcryptjs.hash(newPassword, 10);

    // Atualizar a senha no banco de dados
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

    res.json({ message: 'Senha atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota para apagar a conta do usuário e todos os dados associados
app.delete('/api/profile/delete', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'A senha é obrigatória para apagar a conta.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Iniciar transação

    // 1. Verificar a senha do usuário
    const [rows] = await connection.execute('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      await connection.rollback();
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      await connection.rollback();
      return res.status(401).json({ message: 'Senha incorreta.' });
    }

    // 2. Excluir dados relacionados ao usuário em ordem de dependência
    // Excluir transações
    await connection.execute('DELETE FROM transactions WHERE user_id = ?', [userId]);
    // Excluir métodos de pagamento
    await connection.execute('DELETE FROM payment_methods WHERE user_id = ?', [userId]);
    // Excluir contas bancárias
    await connection.execute('DELETE FROM bank_accounts WHERE user_id = ?', [userId]);
    // Excluir categorias (se a relação for ON DELETE CASCADE ou se não houver dependência de outras tabelas)
    // await connection.execute('DELETE FROM categories WHERE user_id = ?', [userId]);
    // Finalmente, excluir o usuário
    // await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit(); // Confirmar transação
    res.json({ message: 'Dados financeiros e categorias do usuário foram apagados com sucesso. A conta de usuário foi mantida.' });
  } catch (error) {
    if (connection) {
      await connection.rollback(); // Reverter transação em caso de erro
    }
    console.error('Erro ao apagar conta do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao apagar a conta.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// NOVO: Rota para obter notificações do usuário
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const nowStr = now.toISOString().split('T')[0];
    const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // 1. Obter despesas futuras (contas a vencer) do módulo de transações
    const [allUserTransactions] = await pool.execute(
      'SELECT * FROM transactions WHERE user_id = ?',
      [userId]
    );
    const recurringFutureTransactions = generateFutureRecurringTransactions(allUserTransactions, 1, nowStr, thirtyDaysFromNowStr)
      .filter(t => t.type === 'expense' && new Date(t.date) >= now && new Date(t.date) <= thirtyDaysFromNow);
    
    const [baseFutureExpenses] = await pool.execute(
      'SELECT id, description, amount, date, type FROM transactions WHERE user_id = ? AND type = \'expense\' AND date BETWEEN ? AND ?',
      [userId, nowStr, thirtyDaysFromNowStr]
    );

    const combinedExpenses = [...baseFutureExpenses, ...recurringFutureTransactions.filter(t => !baseFutureExpenses.some(fe => fe.id === t.id && fe.date === t.date))];

    const generatedExpenseNotifications = combinedExpenses.map(exp => ({
      id: `expense-${exp.id}-${new Date(exp.date).getTime()}`,
      type: 'conta',
      message: `Conta: ${exp.description} de R$ ${parseFloat(exp.amount).toFixed(2)} vence em ${new Date(exp.date).toLocaleDateString('pt-BR')}`,
      dueDate: exp.date,
      is_read: false, // Será atualizado com base nas notificações persistidas
    }));

    // 2. Obter dívidas futuras (a vencer) do módulo de dívidas
    const [userDebts] = await pool.execute(
      'SELECT id, description, amount, due_date, recurrence_type, recurrence_interval, recurrence_unit, installments, paid_installments FROM debts WHERE user_id = ? AND status = \'pending\'',
      [userId]
    );

    const futureDebts = generateFutureDebts(userDebts, 1, nowStr, thirtyDaysFromNowStr)
      .filter(d => new Date(d.due_date) >= now && new Date(d.due_date) <= thirtyDaysFromNow);

    const generatedDebtNotifications = futureDebts.map(debt => ({
      id: `debt-${debt.id}-${new Date(debt.due_date).getTime()}`,
      type: 'divida',
      message: `Dívida: ${debt.description} de R$ ${parseFloat(debt.amount).toFixed(2)} vence em ${new Date(debt.due_date).toLocaleDateString('pt-BR')}`,
      dueDate: debt.due_date,
      is_read: false, // Será atualizado com base nas notificações persistidas
    }));

    // 3. Obter TODAS as notificações existentes na tabela 'notifications' para o usuário
    const [allPersistedNotifications] = await pool.execute(
      'SELECT id, type, message, due_date, is_read, created_at FROM notifications WHERE user_id = ?',
      [userId]
    );

    // Criar um mapa para lookup rápido do status de leitura das notificações persistidas
    const persistedReadStatusMap = new Map();
    allPersistedNotifications.forEach(notif => {
      // Para todas as notificações persistidas, criar uma chave baseada no conteúdo.
      // Esta chave precisa corresponder à chave gerada para as notificações dinâmicas.
      const key = `${notif.type}-${notif.message}-${notif.due_date}`;
      persistedReadStatusMap.set(key, notif.is_read);
    });

    // 4. Aplicar o status de leitura das notificações persistidas às notificações geradas
    const finalGeneratedNotifications = [...generatedExpenseNotifications, ...generatedDebtNotifications].map(notif => {
      const key = `${notif.type}-${notif.message}-${notif.dueDate}`;
      // Se a notificação gerada tiver uma correspondência persistida e estiver marcada como lida
      if (persistedReadStatusMap.has(key) && persistedReadStatusMap.get(key) === 1) {
        return { ...notif, is_read: true };
      }
      return notif; // Caso contrário, mantém is_read: false (ou o padrão)
    });

    // 5. Filtrar notificações persistidas para incluir apenas as não lidas e que não são duplicatas de geradas dinamicamente
    const uniquePersistedNotifications = allPersistedNotifications.filter(notif => {
      // Excluir notificações persistidas que já foram geradas e tiveram seu status ajustado
      const generatedKey = `${notif.type}-${notif.message}-${notif.due_date}`;
      const isGeneratedAndHandled = finalGeneratedNotifications.some(gn => 
        `${gn.type}-${gn.message}-${gn.dueDate}` === generatedKey
      );
      return !isGeneratedAndHandled && notif.is_read === 0; // Incluir apenas as não lidas e não tratadas como geradas
    });
    
    // 6. Combinar todas as notificações e filtrar apenas as não lidas para o frontend
    const allNotifications = [...finalGeneratedNotifications, ...uniquePersistedNotifications];
    const finalNotifications = allNotifications.filter(notif => notif.is_read === false).sort((a, b) => {
        const dateA = new Date(a.dueDate || a.created_at);
        const dateB = new Date(b.dueDate || b.created_at);
        return dateA.getTime() - dateB.getTime(); // Ordenar por data mais próxima primeiro
    });

    res.json(finalNotifications);
  } catch (error) {
    // console.error('Erro ao buscar notificações:', error); // Removido console.error
    res.status(500).json({ message: 'Erro interno do servidor ao buscar notificações.' });
  }
});

// NOVO: Rota para marcar notificações como lidas
app.post('/api/notifications/mark-as-read', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({ message: 'IDs de notificação são obrigatórios.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Iniciar transação

    for (const notificationId of notificationIds) {
      if (notificationId.startsWith('expense-')) {
        const parts = notificationId.split('-');
        const originalTransactionId = parts[1];
        const dueDateTimestamp = parts[2]; // O timestamp é o terceiro componente

        // Obter detalhes da transação original
        const [transactionRows] = await connection.execute(
          'SELECT id, description, amount, date, type FROM transactions WHERE id = ? AND user_id = ?',
          [originalTransactionId, userId]
        );

        if (transactionRows.length > 0) {
          const transaction = transactionRows[0];
          const notificationMessage = `Conta: ${transaction.description} de R$ ${parseFloat(transaction.amount).toFixed(2)} vence em ${new Date(parseInt(dueDateTimestamp)).toLocaleDateString('pt-BR')}`;
          const notificationType = 'conta';
          const notificationDueDate = new Date(parseInt(dueDateTimestamp)).toISOString().split('T')[0];

          // Verificar se esta notificação já existe na tabela 'notifications'
          const [existingNotification] = await connection.execute(
            'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND message = ? AND due_date = ?',
            [userId, notificationType, notificationMessage, notificationDueDate]
          );

          if (existingNotification.length > 0) {
            // Se existir, apenas atualize como lida
            await connection.execute(
              'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
              [existingNotification[0].id, userId]
            );
          } else {
            // Se não existir, insira como lida
            await connection.execute(
              'INSERT INTO notifications (user_id, type, message, due_date, is_read, created_at) VALUES (?, ?, ?, ?, TRUE, NOW())',
              [userId, notificationType, notificationMessage, notificationDueDate]
            );
          }
        }
      } else if (notificationId.startsWith('debt-')) {
        const parts = notificationId.split('-');
        const originalDebtId = parts[1];
        const dueDateTimestamp = parts[2];

        // Obter detalhes da dívida original
        const [debtRows] = await connection.execute(
          'SELECT id, description, amount, due_date FROM debts WHERE id = ? AND user_id = ?',
          [originalDebtId, userId]
        );

        if (debtRows.length > 0) {
          const debt = debtRows[0];
          const notificationMessage = `Dívida: ${debt.description} de R$ ${parseFloat(debt.amount).toFixed(2)} vence em ${new Date(parseInt(dueDateTimestamp)).toLocaleDateString('pt-BR')}`;
          const notificationType = 'divida';
          const notificationDueDate = new Date(parseInt(dueDateTimestamp)).toISOString().split('T')[0];

          // Verificar se esta notificação já existe na tabela 'notifications'
          const [existingNotification] = await connection.execute(
            'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND message = ? AND due_date = ?',
            [userId, notificationType, notificationMessage, notificationDueDate]
          );

          if (existingNotification.length > 0) {
            // Se existir, apenas atualize como lida
            await connection.execute(
              'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
              [existingNotification[0].id, userId]
            );
          } else {
            // Se não existir, insira como lida
            await connection.execute(
              'INSERT INTO notifications (user_id, type, message, due_date, is_read, created_at) VALUES (?, ?, ?, ?, TRUE, NOW())',
              [userId, notificationType, notificationMessage, notificationDueDate]
            );
          }
        }
      } else {
        // Para IDs que já existem na tabela 'notifications' (não gerados dinamicamente)
        await connection.execute(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id = ?',
          [userId, notificationId]
        );
      }
    }

    await connection.commit(); // Confirmar transação
    res.json({ message: 'Notificações marcadas como lidas com sucesso.' });
  } catch (error) {
    if (connection) {
      await connection.rollback(); // Reverter transação em caso de erro
    }
    // console.error('Erro ao marcar notificações como lidas:', error); // Removido console.error
    res.status(500).json({ message: 'Erro interno do servidor ao marcar notificações como lidas.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// NOVO: Rotas para Configurações de Notificação do Usuário (CRUD)
app.get('/api/notifications/settings', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const [rows] = await pool.execute(
      'SELECT email_transactions, email_reports, push_transactions, push_budget_alerts, sms_alerts, debt_alert_value, debt_alert_unit FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      // Retornar valores padrão se não houver configurações salvas
      res.json({
        email_transactions: true,
        email_reports: true,
        push_transactions: false,
        push_budget_alerts: true,
        sms_alerts: false,
        debt_alert_value: 7,
        debt_alert_unit: 'day',
      });
    }
  } catch (error) {
    console.error('Erro ao buscar configurações de notificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar configurações de notificação.' });
  }
});

app.post('/api/notifications/settings', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { emailTransactions, emailReports, pushTransactions, pushBudgetAlerts, smsAlerts, debtAlertValue, debtAlertUnit } = req.body;

  try {
    const [existingSettings] = await pool.execute(
      'SELECT id FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );

    if (existingSettings.length > 0) {
      // Atualizar configurações existentes
      await pool.execute(
        `UPDATE user_notification_settings SET
          email_transactions = ?,
          email_reports = ?,
          push_transactions = ?,
          push_budget_alerts = ?,
          sms_alerts = ?,
          debt_alert_value = ?,
          debt_alert_unit = ?
        WHERE user_id = ?`,
        [emailTransactions, emailReports, pushTransactions, pushBudgetAlerts, smsAlerts, debtAlertValue, debtAlertUnit, userId]
      );
      res.json({ message: 'Configurações de notificação atualizadas com sucesso.' });
    } else {
      // Inserir novas configurações
      await pool.execute(
        `INSERT INTO user_notification_settings (
          user_id, email_transactions, email_reports, push_transactions, push_budget_alerts, sms_alerts, debt_alert_value, debt_alert_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, emailTransactions, emailReports, pushTransactions, pushBudgetAlerts, smsAlerts, debtAlertValue, debtAlertUnit]
      );
      res.status(201).json({ message: 'Configurações de notificação salvas com sucesso.' });
    }
  } catch (error) {
    console.error('Erro ao salvar configurações de notificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao salvar configurações de notificação.' });
  }
});

// Rotas para Dívidas (CRUD)

// Adicionar nova dívida
app.post('/api/debts', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { description, amount, due_date, recurrence_type, recurrence_interval, recurrence_unit, installments, comments, tags } = req.body; // Adicionado comments e tags

  try {
    const [result] = await pool.execute(
      'INSERT INTO debts (user_id, description, amount, due_date, recurrence_type, recurrence_interval, recurrence_unit, installments, comments, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', // Adicionado comments e tags
      [userId, description, amount, due_date, recurrence_type || 'none', recurrence_interval, recurrence_unit, installments, comments || null, tags || null]
    );
    res.status(201).json({ id: result.insertId, user_id: userId, description, amount, due_date, recurrence_type, recurrence_interval, recurrence_unit, installments, status: 'pending', comments, tags }); // Retorna todos os campos
  } catch (error) {
    console.error('Erro ao adicionar dívida:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Obter todas as dívidas para o usuário autenticado
app.get('/api/debts', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { month, year, week } = req.query; // NOVO: Parâmetros de filtro
  
  try {
    // Obter todas as dívidas pendentes do usuário para verificar o status
    const [pendingDebts] = await pool.execute(
      'SELECT id, due_date FROM debts WHERE user_id = ? AND status = \'pending\'',
      [userId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar para o início do dia

    for (const debt of pendingDebts) {
      const dueDate = new Date(debt.due_date);
      dueDate.setHours(0, 0, 0, 0); // Normalizar para o início do dia

      if (dueDate < today) {
        // A dívida está atrasada, atualizar o status
        await pool.execute(
          'UPDATE debts SET status = \'overdue\' WHERE id = ?',
          [debt.id]
        );
      }
    }

    // Agora, buscar todas as dívidas com os filtros e os status atualizados
    let query = 'SELECT id, description, amount, due_date, status, recurrence_type, recurrence_interval, recurrence_unit, installments, paid_installments, comments, tags FROM debts WHERE user_id = ?';
    const queryParams = [userId];

    if (year) {
      query += ' AND YEAR(due_date) = ?';
      queryParams.push(parseInt(year));
    }
    if (month) {
      query += ' AND MONTH(due_date) = ?';
      queryParams.push(parseInt(month));
    }
    if (week && year) { // Week faz mais sentido com o ano
      query += ' AND WEEK(due_date, 1) = ? AND YEAR(due_date) = ?'; // WEEK(date, 1) para semana começando no domingo
      queryParams.push(parseInt(week));
      queryParams.push(parseInt(year));
    }

    query += ' ORDER BY due_date ASC';

    const [rows] = await pool.execute(
      query,
      queryParams
    );

    // Gerar dívidas recorrentes futuras e combinar com as do banco de dados
    const allDebts = generateFutureDebts(rows, 12, null, null);

    // Garantir que as dívidas geradas não substituam as dívidas reais no mesmo dia, se existirem
    const uniqueDebts = new Map();
    allDebts.forEach(debt => {
        // Use uma chave única para cada dívida, preferindo a real sobre a gerada se houver conflito
        const key = `${debt.original_debt_id || debt.id}-${debt.due_date}`;
        if (!uniqueDebts.has(key) || !debt.is_generated_recurring) {
            uniqueDebts.set(key, debt);
        }
    });

    res.json(Array.from(uniqueDebts.values()));
  } catch (error) {
    console.error('Erro ao buscar dívidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Obter uma dívida específica
app.get('/api/debts/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  try {
    const [rows] = await pool.execute(
      'SELECT id, description, amount, due_date, status, recurrence_type, recurrence_interval, recurrence_unit, installments, paid_installments, comments, tags FROM debts WHERE id = ? AND user_id = ?', // Adicionado comments e tags
      [id, userId]
    );
    const debt = rows[0];
    if (!debt) {
      return res.status(404).json({ message: 'Dívida não encontrada ou você não tem permissão para visualizá-la.' });
    }
    res.json(debt);
  } catch (error) {
    console.error('Erro ao buscar dívida:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Atualizar dívida
app.put('/api/debts/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const updates = req.body; // Obter todos os campos do corpo da requisição

  try {
    const setClauses = [];
    const queryParams = [];

    // Construir dinamicamente as cláusulas SET e os parâmetros da query
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        // Ignorar id, user_id na atualização
        if (key === 'id' || key === 'user_id') continue;

        setClauses.push(`${key} = ?`);
        // Certificar-se de que `undefined` seja tratado como `null` para o banco de dados.
        queryParams.push(updates[key] === undefined ? null : updates[key]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar foi fornecido.' });
    }

    const updateQuery = `UPDATE debts SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
    const finalQueryParams = [...queryParams, id, userId];

    const [result] = await pool.execute(updateQuery, finalQueryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Dívida não encontrada ou você não tem permissão para editá-la.' });
    }

    const [updatedRows] = await pool.execute('SELECT id, description, amount, due_date, status, recurrence_type, recurrence_interval, recurrence_unit, installments, paid_installments, comments, tags FROM debts WHERE id = ?', [id]);
    res.json(updatedRows[0]);
  } catch (error) {
    console.error('Erro ao atualizar dívida:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Deletar dívida
app.delete('/api/debts/:id', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM debts WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Dívida não encontrada ou você não tem permissão para deletá-la.' });
    }
    res.json({ message: 'Dívida deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar dívida:', error);
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

// NOVO: Rota para acionar manualmente o envio de relatórios mensais
app.get('/api/notifications/send-monthly-report', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  try {
    // Para o relatório mensal, vamos gerar para o mês anterior
    const today = new Date();
    const targetMonth = today.getMonth(); // Mês atual é 0-11, então este é o mês anterior quando chamado no início do mês
    const targetYear = today.getFullYear();

    // Obter todos os usuários para enviar relatórios
    const [users] = await pool.execute('SELECT id, username FROM users');

    for (const user of users) {
      const [settings] = await pool.execute(
        'SELECT email_reports FROM user_notification_settings WHERE user_id = ?',
        [user.id]
      );
      const reportEnabled = settings[0]?.email_reports === 1;

      if (reportEnabled) {
        const userEmail = `${user.username}@example.com`; // Usar username como placeholder para email
        await generateAndSendMonthlyReport(pool, user.id, userEmail, targetMonth, targetYear);
      }
    }

    res.json({ message: 'Solicitação de envio de relatórios mensais processada. Verifique os logs para detalhes.' });
  } catch (error) {
    console.error('Erro ao acionar o envio de relatórios mensais:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao acionar relatórios mensais.' });
  }
});
