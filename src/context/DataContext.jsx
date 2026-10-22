import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as db from '../services/db';
import { applySystemTheme } from '../services/native';

const DataContext = createContext(null);

const DEFAULT_SETTINGS = {
  currency: '₹',
  monthlyBudget: '0',
  darkMode: 'false',
  reminderEnabled: 'false',
  reminderTime: '21:00',
};

export function DataProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Bumped after every write so pages running their own SQL queries reload.
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    const [txs, cats, stored] = await Promise.all([
      db.getTransactions(),
      db.getCategories(),
      db.getSettings(),
    ]);
    setTransactions(txs);
    setCategories(cats);
    setSettings({ ...DEFAULT_SETTINGS, ...stored });
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    db.initDatabase()
      .then(refresh)
      .then(() => setReady(true))
      .catch((e) => {
        console.error(e);
        setError(e.message || String(e));
      });
  }, [refresh]);

  const darkMode = settings.darkMode === 'true';
  useEffect(() => {
    document.documentElement.classList.toggle('ion-palette-dark', darkMode);
    applySystemTheme(darkMode);
  }, [darkMode]);

  // Wraps a DB write so the UI reloads afterwards.
  const mutate = useCallback(
    (fn) => async (...args) => {
      const result = await fn(...args);
      await refresh();
      return result;
    },
    [refresh]
  );

  const value = {
    ready,
    error,
    version,
    transactions,
    categories,
    settings: {
      ...settings,
      monthlyBudget: Number(settings.monthlyBudget) || 0,
      darkMode,
      reminderEnabled: settings.reminderEnabled === 'true',
    },
    addTransaction: mutate(db.addTransaction),
    updateTransaction: mutate(db.updateTransaction),
    deleteTransaction: mutate(db.deleteTransaction),
    addCategory: mutate(db.addCategory),
    deleteCategory: mutate(db.deleteCategory),
    setSetting: mutate(db.setSetting),
    clearAllData: mutate(db.clearAllData),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
