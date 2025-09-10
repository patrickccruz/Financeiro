DROP DATABASE IF EXISTS financeiro_db;

CREATE DATABASE IF NOT EXISTS financeiro_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#CCCCCC',
  icon VARCHAR(255) DEFAULT 'Tag'
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  initial_balance DECIMAL(10, 2) DEFAULT 0.00,
  current_balance DECIMAL(10, 2) DEFAULT 0.00,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  last_four VARCHAR(4),
  max_credit_limit DECIMAL(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  bank_account_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category_id INT,
  payment_method VARCHAR(50),
  payment_method_id INT,
  bank_account_id INT,
  date DATE NOT NULL DEFAULT (CURRENT_DATE()),
  is_recurring BOOLEAN DEFAULT FALSE,
  frequency VARCHAR(50) DEFAULT NULL,
  recurrence_end_date DATE DEFAULT NULL,
  custom_recurrence_interval VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  due_date DATETIME,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue
  recurrence_type VARCHAR(50) DEFAULT 'none', -- none, monthly, custom, installments
  recurrence_interval INT DEFAULT NULL, -- e.g., 1 for every month, 2 for every two months
  recurrence_unit VARCHAR(50) DEFAULT NULL, -- day, week, month, year
  installments INT DEFAULT NULL, -- Total number of installments
  paid_installments INT DEFAULT 0, -- Number of installments already paid
  comments TEXT DEFAULT NULL, -- NOVO: Campo para comentários sobre a dívida
  tags VARCHAR(255) DEFAULT NULL, -- NOVO: Campo para tags/etiquetas (JSON string ou CSV, vamos começar com CSV simples)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  email_transactions BOOLEAN DEFAULT TRUE,
  email_reports BOOLEAN DEFAULT TRUE,
  push_transactions BOOLEAN DEFAULT FALSE,
  push_budget_alerts BOOLEAN DEFAULT TRUE,
  sms_alerts BOOLEAN DEFAULT FALSE,
  debt_alert_value INT DEFAULT 7,
  debt_alert_unit VARCHAR(50) DEFAULT 'day',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);