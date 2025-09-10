const { sendEmail } = require('./emailService');
// const pool = require('../index').pool; // Remover esta linha ou comentar

async function generateAndSendMonthlyReport(dbPool, userId, userEmail, month, year) {
  try {
    // 1. Obter dados financeiros do usuário para o mês e ano especificados
    const [transactions] = await dbPool.execute(
      'SELECT description, amount, type, date, category_name FROM transactions WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?',
      [userId, month, year]
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory = {};

    transactions.forEach(t => {
      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        totalIncome += amount;
      } else if (t.type === 'expense') {
        totalExpense += amount;
        // Se category_id for um número, podemos buscar o nome da categoria
        // Por simplicidade, para este relatório, usaremos a descrição da transação se a categoria real não for facilmente acessível
        const categoryName = t.category_name || t.description; // Precisa ter category_name na query inicial para ser ideal
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + amount;
      }
    });

    // 2. Formatar os dados em um relatório HTML
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const reportMonth = monthNames[month]; // Ajustar para o índice do array

    let categorySummary = '';
    for (const category in expenseByCategory) {
      categorySummary += `<li>${category}: R$ ${expenseByCategory[category].toFixed(2)}</li>`;
    }

    const htmlContent = `
      <h1>Relatório Financeiro Mensal - ${reportMonth}/${year}</h1>
      <p>Olá,</p>
      <p>Aqui está seu resumo financeiro para ${reportMonth} de ${year}:</p>
      <ul>
        <li><strong>Receita Total:</strong> R$ ${totalIncome.toFixed(2)}</li>
        <li><strong>Despesa Total:</strong> R$ ${totalExpense.toFixed(2)}</li>
        <li><strong>Saldo Líquido:</strong> R$ ${(totalIncome - totalExpense).toFixed(2)}</li>
      </ul>
      
      <h2>Detalhes das Despesas por Categoria:</h2>
      ${categorySummary ? `<ul>${categorySummary}</ul>` : '<p>Nenhuma despesa categorizada neste mês.</p>'}
      
      <p>Obrigado por usar nossos serviços!</p>
    `;

    // 3. Enviar o e-mail
    const subject = `Seu Relatório Financeiro Mensal - ${reportMonth}/${year}`;
    const emailSent = await sendEmail(userEmail, subject, htmlContent);

    if (emailSent) {
      console.log(`Relatório mensal enviado com sucesso para ${userEmail}`);
    } else {
      console.error(`Falha ao enviar relatório mensal para ${userEmail}`);
    }

    return emailSent;
  } catch (error) {
    console.error("Erro ao gerar e enviar relatório mensal:", error);
    return false;
  }
}

module.exports = { generateAndSendMonthlyReport };
