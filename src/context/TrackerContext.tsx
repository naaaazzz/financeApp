import { useSQLiteContext } from "expo-sqlite";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    Budget,
    Transaction,
    TransactionType,
    Wallet,
    WalletType,
} from "../database/db";
import { useAuth } from "./AuthContext";

interface TrackerContextType {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  isLoading: boolean;
  addTransaction: (params: {
    walletId: number;
    toWalletId?: number | null;
    type: TransactionType;
    amount: number;
    category: string;
    description?: string;
    date: string;
    receiptImagePath?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteTransaction: (
    id: number,
  ) => Promise<{ success: boolean; error?: string }>;
  updateTransaction: (
    id: number,
    params: {
      walletId: number;
      toWalletId?: number | null;
      type: TransactionType;
      amount: number;
      category: string;
      description?: string;
      date: string;
      receiptImagePath?: string | null;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  addWallet: (
    name: string,
    balance: number,
    type: WalletType,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteWallet: (id: number) => Promise<{ success: boolean; error?: string }>;
  addOrUpdateBudget: (
    category: string,
    amount: number,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteBudget: (id: number) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
}

const TrackerContext = createContext<TrackerContextType | null>(null);

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error("useTracker must be used within a TrackerProvider");
  }
  return context;
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const db = useSQLiteContext();
  const { user } = useAuth();

  const refreshData = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setWallets([]);
      setBudgets([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch wallets
      const fetchedWallets = await db.getAllAsync<Wallet>(
        "SELECT * FROM wallets WHERE user_id = ? ORDER BY name ASC;",
        [user.id],
      );
      setWallets(fetchedWallets);

      // Fetch transactions
      const fetchedTransactions = await db.getAllAsync<Transaction>(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC;",
        [user.id],
      );
      setTransactions(fetchedTransactions);

      // Fetch budgets
      const fetchedBudgets = await db.getAllAsync<Budget>(
        "SELECT * FROM budgets WHERE user_id = ? ORDER BY category ASC;",
        [user.id],
      );
      setBudgets(fetchedBudgets);
    } catch (error) {
      console.error("Error fetching tracker data from SQLite:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db, user]);

  // Load user data on startup or when the user changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addWallet = async (name: string, balance: number, type: WalletType) => {
    if (!user) return { success: false, error: "User not logged in" };
    try {
      // Create wallet with zero balance then add an initial transaction to record opening balance
      const res = await db.runAsync(
        "INSERT INTO wallets (user_id, name, balance, type) VALUES (?, ?, ?, ?);",
        [user.id, name, 0.0, type],
      );

      const newWalletId = res.lastInsertRowId;

      // If an initial balance was provided, record it as an 'income' transaction
      if (balance && balance > 0) {
        // Use the existing addTransaction logic to ensure balances are updated consistently
        const txResult = await addTransaction({
          walletId: newWalletId,
          type: "income",
          amount: balance,
          category: "Opening Balance",
          description: "Initial deposit",
          date: new Date().toISOString(),
        });

        if (!txResult.success) {
          // If transaction failed, delete wallet to avoid partial state
          await db.runAsync(
            "DELETE FROM wallets WHERE id = ? AND user_id = ?;",
            [newWalletId, user.id],
          );
          return {
            success: false,
            error:
              txResult.error || "Failed to create wallet with opening balance",
          };
        }
      }

      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Add Wallet Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to add wallet",
      };
    }
  };

  const deleteWallet = async (id: number) => {
    if (!user) return { success: false, error: "User not logged in" };
    try {
      await db.runAsync("DELETE FROM wallets WHERE id = ? AND user_id = ?;", [
        id,
        user.id,
      ]);
      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Delete Wallet Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete wallet",
      };
    }
  };

  const addTransaction = async (params: {
    walletId: number;
    toWalletId?: number | null;
    type: TransactionType;
    amount: number;
    category: string;
    description?: string;
    date: string;
    receiptImagePath?: string | null;
  }) => {
    if (!user) return { success: false, error: "User not logged in" };

    const {
      walletId,
      toWalletId,
      type,
      amount,
      category,
      description,
      date,
      receiptImagePath,
    } = params;

    try {
      // Wrap in a SQLite transaction block to guarantee balance updating logic
      await db.withExclusiveTransactionAsync(async (txn) => {
        // 1. Insert transaction
        await txn.runAsync(
          `INSERT INTO transactions (user_id, wallet_id, to_wallet_id, type, amount, category, description, date, receipt_image_path)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            user.id,
            walletId,
            toWalletId || null,
            type,
            amount,
            category,
            description || null,
            date,
            receiptImagePath || null,
          ],
        );

        // 2. Adjust wallet balances
        if (type === "expense") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [amount, walletId, user.id],
          );
        } else if (type === "income") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [amount, walletId, user.id],
          );
        } else if (type === "transfer") {
          if (!toWalletId) {
            throw new Error(
              "Destination wallet is required for transfer transactions",
            );
          }
          // Subtract from source wallet
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [amount, walletId, user.id],
          );
          // Add to destination wallet
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [amount, toWalletId, user.id],
          );
        }
      });

      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Add Transaction Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to add transaction",
      };
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!user) return { success: false, error: "User not logged in" };

    try {
      // Fetch details of transaction first to revert changes
      const tx = await db.getFirstAsync<Transaction>(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1;",
        [id, user.id],
      );

      if (!tx) {
        return { success: false, error: "Transaction not found" };
      }

      await db.withExclusiveTransactionAsync(async (txn) => {
        // Revert wallet balance adjustments
        if (tx.type === "expense") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [tx.amount, tx.wallet_id, user.id],
          );
        } else if (tx.type === "income") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [tx.amount, tx.wallet_id, user.id],
          );
        } else if (tx.type === "transfer") {
          if (tx.to_wallet_id) {
            // Revert subtraction from source wallet
            await txn.runAsync(
              "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
              [tx.amount, tx.wallet_id, user.id],
            );
            // Revert addition to destination wallet
            await txn.runAsync(
              "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
              [tx.amount, tx.to_wallet_id, user.id],
            );
          }
        }

        // Delete the transaction
        await txn.runAsync(
          "DELETE FROM transactions WHERE id = ? AND user_id = ?;",
          [id, user.id],
        );
      });

      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Delete Transaction Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete transaction",
      };
    }
  };

  const updateTransaction = async (
    id: number,
    params: {
      walletId: number;
      toWalletId?: number | null;
      type: TransactionType;
      amount: number;
      category: string;
      description?: string;
      date: string;
      receiptImagePath?: string | null;
    }
  ) => {
    if (!user) return { success: false, error: "User not logged in" };

    const {
      walletId,
      toWalletId,
      type,
      amount,
      category,
      description,
      date,
      receiptImagePath,
    } = params;

    try {
      // Fetch details of the old transaction first to revert changes
      const oldTx = await db.getFirstAsync<Transaction>(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1;",
        [id, user.id],
      );

      if (!oldTx) {
        return { success: false, error: "Transaction not found" };
      }

      await db.withExclusiveTransactionAsync(async (txn) => {
        // 1. REVERT OLD TRANSACTION BALANCE CHANGES
        if (oldTx.type === "expense") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [oldTx.amount, oldTx.wallet_id, user.id],
          );
        } else if (oldTx.type === "income") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [oldTx.amount, oldTx.wallet_id, user.id],
          );
        } else if (oldTx.type === "transfer" && oldTx.to_wallet_id) {
          // Revert subtraction from source wallet
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [oldTx.amount, oldTx.wallet_id, user.id],
          );
          // Revert addition to destination wallet
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [oldTx.amount, oldTx.to_wallet_id, user.id],
          );
        }

        // 2. UPDATE TRANSACTION RECORD
        await txn.runAsync(
          `UPDATE transactions 
           SET wallet_id = ?, to_wallet_id = ?, type = ?, amount = ?, category = ?, description = ?, date = ?, receipt_image_path = ?
           WHERE id = ? AND user_id = ?;`,
          [
            walletId,
            toWalletId || null,
            type,
            amount,
            category,
            description || null,
            date,
            receiptImagePath || null,
            id,
            user.id,
          ],
        );

        // 3. APPLY NEW TRANSACTION BALANCE CHANGES
        if (type === "expense") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [amount, walletId, user.id],
          );
        } else if (type === "income") {
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [amount, walletId, user.id],
          );
        } else if (type === "transfer") {
          if (!toWalletId) {
            throw new Error("Destination wallet is required for transfer transactions");
          }
          // Subtract from source wallet
          await txn.runAsync(
            "UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?;",
            [amount, walletId, user.id],
          );
          // Add to destination wallet
          await txn.runAsync(
            "UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?;",
            [amount, toWalletId, user.id],
          );
        }
      });

      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Update Transaction Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to update transaction",
      };
    }
  };

  const addOrUpdateBudget = async (category: string, amount: number) => {
    if (!user) return { success: false, error: "User not logged in" };
    try {
      // SQLite Upsert command using user_id + category uniqueness constraint
      await db.runAsync(
        `INSERT INTO budgets (user_id, category, amount, period) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, category) 
         DO UPDATE SET amount = excluded.amount;`,
        [user.id, category, amount, "monthly"],
      );
      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Add/Update Budget Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to update budget",
      };
    }
  };

  const deleteBudget = async (id: number) => {
    if (!user) return { success: false, error: "User not logged in" };
    try {
      await db.runAsync("DELETE FROM budgets WHERE id = ? AND user_id = ?;", [
        id,
        user.id,
      ]);
      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Delete Budget Error:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete budget",
      };
    }
  };

  return (
    <TrackerContext.Provider
      value={{
        transactions,
        wallets,
        budgets,
        isLoading,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        addWallet,
        deleteWallet,
        addOrUpdateBudget,
        deleteBudget,
        refreshData,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
}
