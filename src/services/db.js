// SQLite database service.
// On Android the native SQLite engine is used; in the browser the same API
// runs on sql.js (WebAssembly) through the <jeep-sqlite> web component and
// is persisted to IndexedDB.
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';

const DB_NAME = 'expense_tracker';
const DB_VERSION = 1;
const isWeb = Capacitor.getPlatform() === 'web';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income'))
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount REAL NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  date TEXT NOT NULL,
  note TEXT DEFAULT '',
  payment_mode TEXT DEFAULT 'Cash',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

const DEFAULT_CATEGORIES = [
  ['Food', 'fastFood', '#f97316', 'expense'],
  ['Travel', 'car', '#3b82f6', 'expense'],
  ['Bills', 'receipt', '#ef4444', 'expense'],
  ['Shopping', 'cart', '#ec4899', 'expense'],
  ['Health', 'medkit', '#10b981', 'expense'],
  ['Entertainment', 'film', '#8b5cf6', 'expense'],
  ['Education', 'school', '#0ea5e9', 'expense'],
  ['Rent', 'home', '#a16207', 'expense'],
  ['Other', 'ellipsisHorizontal', '#64748b', 'expense'],
  ['Salary', 'briefcase', '#16a34a', 'income'],
  ['Pocket Money', 'wallet', '#14b8a6', 'income'],
  ['Gift', 'gift', '#d946ef', 'income'],
  ['Other Income', 'trendingUp', '#22c55e', 'income'],
];

async function initWebStore() {
  defineJeepSqlite(window);
  const el = document.createElement('jeep-sqlite');
  el.setAttribute('autoSave', 'true');
  document.body.appendChild(el);
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}

export async function initDatabase() {
  if (db) return db;
  if (isWeb) await initWebStore();

  await sqlite.checkConnectionsConsistency();
  const { result: exists } = await sqlite.isConnection(DB_NAME, false);
  db = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
  await db.open();
  await db.execute(SCHEMA);

  const { values } = await db.query('SELECT COUNT(*) AS n FROM categories');
  if (values[0].n === 0) {
    for (const row of DEFAULT_CATEGORIES) {
      await db.run('INSERT INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?)', row, false);
    }
  }
  await persist();
  return db;
}

// Web only: flush the in-memory database to IndexedDB.
async function persist() {
  if (isWeb) await sqlite.saveToStore(DB_NAME);
}

export async function query(sql, params = []) {
  const { values } = await db.query(sql, params);
  return values ?? [];
}

export async function run(sql, params = []) {
  const res = await db.run(sql, params);
  await persist();
  return res.changes;
}

// ---------- Transactions ----------

export function getTransactions() {
  return query(`
    SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    ORDER BY t.date DESC, t.id DESC`);
}

export function addTransaction(t) {
  return run(
    `INSERT INTO transactions (type, amount, category_id, date, note, payment_mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [t.type, t.amount, t.category_id, t.date, t.note, t.payment_mode, new Date().toISOString()]
  );
}

export function updateTransaction(t) {
  return run(
    `UPDATE transactions SET type = ?, amount = ?, category_id = ?, date = ?, note = ?, payment_mode = ?
     WHERE id = ?`,
    [t.type, t.amount, t.category_id, t.date, t.note, t.payment_mode, t.id]
  );
}

export function deleteTransaction(id) {
  return run('DELETE FROM transactions WHERE id = ?', [id]);
}

// ---------- Categories ----------

export function getCategories() {
  return query('SELECT * FROM categories ORDER BY type, id');
}

export function addCategory(c) {
  return run('INSERT INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?)', [
    c.name, c.icon, c.color, c.type,
  ]);
}

export async function deleteCategory(id) {
  // Keep the transactions, but move them to the matching "Other" category.
  const [cat] = await query('SELECT type FROM categories WHERE id = ?', [id]);
  const fallback = cat?.type === 'income' ? 'Other Income' : 'Other';
  await run(
    `UPDATE transactions SET category_id = (SELECT id FROM categories WHERE name = ? LIMIT 1)
     WHERE category_id = ?`,
    [fallback, id]
  );
  return run('DELETE FROM categories WHERE id = ?', [id]);
}

// ---------- Settings ----------

export async function getSettings() {
  const rows = await query('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function setSetting(key, value) {
  return run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
}

// ---------- Reports (aggregated in SQL) ----------

// month: 'YYYY-MM'
export function getCategoryTotals(month, type = 'expense') {
  return query(
    `SELECT c.name, c.color, SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = ? AND substr(t.date, 1, 7) = ?
     GROUP BY c.id
     ORDER BY total DESC`,
    [type, month]
  );
}

// Income and expense totals for each month from `fromMonth` onwards.
export function getMonthlyTotals(fromMonth) {
  return query(
    `SELECT substr(date, 1, 7) AS month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE substr(date, 1, 7) >= ?
     GROUP BY month
     ORDER BY month`,
    [fromMonth]
  );
}

export async function clearAllData() {
  await run('DELETE FROM transactions');
}
