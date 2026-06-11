import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { hashPassword, generateToken } from '../utils/crypto';
import { User, UserSession, seedDefaultDataForUser } from '../database/db';

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const db = useSQLiteContext();

  const autoBackupUserData = async (userId: number) => {
    try {
      if (Platform.OS === 'web') return; // FileSystem not supported on Web browser local storage

      const wallets = await db.getAllAsync('SELECT * FROM wallets WHERE user_id = ?;', [userId]);
      const transactions = await db.getAllAsync('SELECT * FROM transactions WHERE user_id = ?;', [userId]);
      const budgets = await db.getAllAsync('SELECT * FROM budgets WHERE user_id = ?;', [userId]);

      const backupData = {
        wallets,
        transactions,
        budgets,
        exported_at: new Date().toISOString(),
        user_id: userId
      };

      const dir = `${FileSystem.documentDirectory}backups/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const path = `${dir}auto-backup-user-${userId}-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(backupData, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log('Login auto-backup saved to:', path);
    } catch (error) {
      console.error('Failed to create auto-backup on login:', error);
    }
  };

  const verifySession = async () => {
    try {
      const session = await db.getFirstAsync<UserSession>(
        'SELECT user_id, token, created_at, last_active_at FROM user_sessions LIMIT 1;'
      );

      if (!session) {
        return null;
      }

      const now = Date.now();
      const isExpired24h = now - session.created_at > SESSION_LIFETIME_MS;
      const isExpired2h = now - session.last_active_at > INACTIVITY_TIMEOUT_MS;

      if (isExpired24h || isExpired2h) {
        // Clear expired session
        await db.runAsync('DELETE FROM user_sessions WHERE user_id = ?;', [session.user_id]);
        return null;
      }

      // Session is valid, update last_active_at to now
      await db.runAsync('UPDATE user_sessions SET last_active_at = ? WHERE user_id = ?;', [now, session.user_id]);

      const foundUser = await db.getFirstAsync<User>(
        'SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1;',
        [session.user_id]
      );

      return foundUser || null;
    } catch (error) {
      console.error('Failed to verify session:', error);
      return null;
    }
  };

  // Load persisted session on app startup
  useEffect(() => {
    async function loadSession() {
      try {
        const activeUser = await verifySession();
        if (activeUser) {
          setUser(activeUser);
          // Perform auto backup on app startup if session was restored
          await autoBackupUserData(activeUser.id);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [db]);

  // Listen to AppState changes to handle inactivity detection
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setIsLoading(true);
        const activeUser = await verifySession();
        setUser(activeUser);
        setIsLoading(false);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (user) {
          try {
            await db.runAsync(
              'UPDATE user_sessions SET last_active_at = ? WHERE user_id = ?;',
              [Date.now(), user.id]
            );
          } catch (err) {
            console.error('Failed to update session activity timestamp:', err);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [db, user]);

  const signIn = async (username: string, password: string) => {
    try {
      const trimmedUsername = username.trim().toLowerCase();
      const pwdHash = hashPassword(password);

      const foundUser = await db.getFirstAsync<User>(
        'SELECT id, username, email, created_at FROM users WHERE (username = ? OR email = ?) AND password_hash = ? LIMIT 1;',
        [trimmedUsername, trimmedUsername, pwdHash]
      );

      if (!foundUser) {
        return { success: false, error: 'Invalid username or password' };
      }

      const token = generateToken();
      const now = Date.now();

      // Clear any existing sessions
      await db.runAsync('DELETE FROM user_sessions;');

      // Insert new session token record
      await db.runAsync(
        'INSERT OR REPLACE INTO user_sessions (user_id, token, created_at, last_active_at) VALUES (?, ?, ?, ?);',
        [foundUser.id, token, now, now]
      );

      // Create an automatic JSON backup of this user's data on login
      await autoBackupUserData(foundUser.id);

      setUser(foundUser);
      return { success: true };
    } catch (error: any) {
      console.error('Sign In Error:', error);
      return { success: false, error: error?.message || 'An unexpected error occurred during login' };
    }
  };

  const signUp = async (username: string, email: string, password: string) => {
    try {
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedEmail = email.trim().toLowerCase();
      
      if (trimmedUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Check if username already exists
      const usernameExists = await db.getFirstAsync<User>(
        'SELECT id FROM users WHERE username = ? LIMIT 1;',
        [trimmedUsername]
      );
      if (usernameExists) {
        return { success: false, error: 'Username is already taken' };
      }

      // Check if email already exists
      const emailExists = await db.getFirstAsync<User>(
        'SELECT id FROM users WHERE email = ? LIMIT 1;',
        [trimmedEmail]
      );
      if (emailExists) {
        return { success: false, error: 'Email is already registered' };
      }

      const pwdHash = hashPassword(password);

      // Insert new user
      const result = await db.runAsync(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?);',
        [trimmedUsername, trimmedEmail, pwdHash]
      );

      const newUserId = result.lastInsertRowId;

      // Seed default wallets, budgets, and sample transactions
      await seedDefaultDataForUser(db, newUserId);

      // Fetch the full registered user details to set as active session
      const newUserObj = await db.getFirstAsync<User>(
        'SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1;',
        [newUserId]
      );

      if (!newUserObj) {
        return { success: false, error: 'Registration failed to retrieve new user account' };
      }

      const token = generateToken();
      const now = Date.now();

      // Clear any existing sessions
      await db.runAsync('DELETE FROM user_sessions;');

      // Insert new session token record
      await db.runAsync(
        'INSERT OR REPLACE INTO user_sessions (user_id, token, created_at, last_active_at) VALUES (?, ?, ?, ?);',
        [newUserObj.id, token, now, now]
      );

      // Create an automatic JSON backup of this user's data on sign up
      await autoBackupUserData(newUserObj.id);

      setUser(newUserObj);
      return { success: true };
    } catch (error: any) {
      console.error('Sign Up Error:', error);
      return { success: false, error: error?.message || 'An unexpected error occurred during registration' };
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await db.runAsync('DELETE FROM user_sessions WHERE user_id = ?;', [user.id]);
      } else {
        await db.runAsync('DELETE FROM user_sessions;');
      }
      setUser(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
