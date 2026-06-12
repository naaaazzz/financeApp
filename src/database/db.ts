import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'tracker.db';

// --- TypeScript Models ---
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  password_hash: string;
  password_plaintext?: string | null;
  created_at: string;
}

export type WalletType = 'cash' | 'bank' | 'card';

export interface Wallet {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  type: WalletType;
  created_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: number;
  user_id: number;
  wallet_id: number;
  to_wallet_id?: number | null; // for transfer transactions
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string; // ISO 8601 string: YYYY-MM-DDTHH:mm:ss.sssZ
  receipt_image_path?: string | null;
  created_at: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category: string;
  amount: number;
  period: string; // 'monthly' | 'yearly'
  created_at: string;
}

export interface UserSession {
  user_id: number;
  token: string;
  created_at: number; // Unix timestamp in ms
  last_active_at: number; // Unix timestamp in ms
}

// --- Schema Initialization ---
export async function initializeDatabase(db: SQLiteDatabase) {
  try {
    // Enable Write-Ahead Logging (WAL) for faster performance and concurrent read/writes
    await db.execAsync('PRAGMA journal_mode = WAL;');
    
    // Enable Foreign Key support
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Users table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        password_plaintext TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add phone column to users table if it doesn't exist (e.g. for existing local installs)
    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN phone TEXT;');
    } catch (error) {
      // Column may already exist, ignore error
    }
    try {
      await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);');
    } catch (error) {
      // Index may already exist, ignore error
    }

    // Migration: Add password_plaintext column to users table if it doesn't exist
    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN password_plaintext TEXT;');
    } catch (error) {
      // Column may already exist, ignore error
    }

    // Wallets table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0.0,
        type TEXT NOT NULL DEFAULT 'cash',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Transactions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        wallet_id INTEGER NOT NULL,
        to_wallet_id INTEGER,
        type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        receipt_image_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
      );
    `);

    // Budgets table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT NOT NULL DEFAULT 'monthly',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, category)
      );
    `);

    // User Sessions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        user_id INTEGER PRIMARY KEY,
        token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('SQLite database schema initialized successfully.');
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
}

// --- Data Seeding helper ---
export async function seedDefaultDataForUser(db: SQLiteDatabase, userId: number) {
  try {
    // 1. Seed Default Wallets
    const wallets = [
      { name: 'Cash', balance: 0, type: 'cash' },
      { name: 'Bank Account', balance: 0, type: 'bank' },
      { name: 'Credit Card', balance: 0, type: 'card' }
    ];

    for (const w of wallets) {
      await db.runAsync(
        'INSERT INTO wallets (user_id, name, balance, type) VALUES (?, ?, ?, ?);',
        [userId, w.name, w.balance, w.type]
      );
    }

    // 2. Seed Default Budgets
    const budgets = [
      { category: 'Food & Dining', amount: 400 },
      { category: 'Shopping', amount: 200 },
      { category: 'Transportation', amount: 100 },
      { category: 'Entertainment', amount: 150 }
    ];

    for (const b of budgets) {
      await db.runAsync(
        'INSERT INTO budgets (user_id, category, amount, period) VALUES (?, ?, ?, ?);',
        [userId, b.category, b.amount, 'monthly']
      );
    }

    console.log(`Default wallets and budgets seeded with 0 balance for user ID: ${userId}`);
  } catch (error) {
    console.error('Error seeding default user data:', error);
  }
}
