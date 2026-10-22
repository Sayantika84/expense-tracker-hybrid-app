import { createContext, useCallback, useContext, useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonInput,
  IonItem, IonLabel, IonList, IonModal, IonSegment, IonSegmentButton, IonTextarea,
  IonTitle, IonToolbar, useIonAlert, useIonToast,
} from '@ionic/react';
import { useData } from '../context/DataContext';
import { PAYMENT_MODES, formatMoney, sumBy, toDateKey, toMonthKey } from '../services/utils';
import { notifyBudget, success, tap, warning } from '../services/native';
import CategoryIcon from './CategoryIcon';

const ModalContext = createContext(() => {});

// Lets any page open the add/edit form: openTransaction() or openTransaction(tx).
export function useTransactionModal() {
  return useContext(ModalContext);
}

const emptyForm = () => ({
  id: null,
  type: 'expense',
  amount: '',
  category_id: null,
  date: toDateKey(),
  note: '',
  payment_mode: 'Cash',
});

export function TransactionModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const open = useCallback((tx = null) => {
    setForm(tx ? { ...tx, amount: String(tx.amount) } : emptyForm());
    setIsOpen(true);
  }, []);

  return (
    <ModalContext.Provider value={open}>
      {children}
      <TransactionModal isOpen={isOpen} form={form} setForm={setForm} onClose={() => setIsOpen(false)} />
    </ModalContext.Provider>
  );
}

function TransactionModal({ isOpen, form, setForm, onClose }) {
  const data = useData();
  const { categories, settings, transactions } = data;
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const visibleCategories = categories.filter((c) => c.type === form.type);

  const toast = (message, color = 'dark') =>
    presentToast({ message, color, duration: 2000, position: 'top' });

  // Warn when this expense pushes the current month past 80% or 100% of the budget.
  const checkBudget = (amount) => {
    const budget = settings.monthlyBudget;
    const month = toMonthKey();
    if (!budget || form.type !== 'expense' || !form.date.startsWith(month)) return;
    const others = transactions.filter((t) => t.date.startsWith(month) && t.id !== form.id);
    const before = sumBy(others, 'expense');
    const after = before + amount;
    const fmt = (n) => formatMoney(n, settings.currency);
    if (before < budget && after >= budget) {
      warning();
      toast(`Budget exceeded! Spent ${fmt(after)} of ${fmt(budget)}`, 'danger');
      notifyBudget('Budget exceeded', `You've spent ${fmt(after)} this month (budget ${fmt(budget)}).`);
    } else if (before < budget * 0.8 && after >= budget * 0.8) {
      warning();
      toast(`Heads up: ${Math.round((after / budget) * 100)}% of your budget used`, 'warning');
      notifyBudget('80% of budget used', `You've spent ${fmt(after)} of ${fmt(budget)} this month.`);
    }
  };

  const save = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast('Enter a valid amount', 'danger');
    if (!form.category_id) return toast('Pick a category', 'danger');

    const tx = { ...form, amount: Math.round(amount * 100) / 100, note: form.note.trim() };
    if (form.id) await data.updateTransaction(tx);
    else await data.addTransaction(tx);
    success();
    checkBudget(tx.amount);
    onClose();
  };

  const remove = () =>
    presentAlert({
      header: 'Delete transaction?',
      message: 'This cannot be undone.',
      buttons: [
        'Cancel',
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await data.deleteTransaction(form.id);
            warning();
            onClose();
          },
        },
      ],
    });

  const changeType = (type) => {
    tap();
    setForm((f) => ({ ...f, type, category_id: null }));
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{form.id ? 'Edit' : 'Add'} Transaction</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={save}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonSegment value={form.type} onIonChange={(e) => changeType(e.detail.value)}>
          <IonSegmentButton value="expense"><IonLabel>Expense</IonLabel></IonSegmentButton>
          <IonSegmentButton value="income"><IonLabel>Income</IonLabel></IonSegmentButton>
        </IonSegment>

        <div className={`amount-input ${form.type}`}>
          <span>{settings.currency}</span>
          <IonInput
            type="number"
            inputmode="decimal"
            placeholder="0"
            value={form.amount}
            onIonInput={(e) => set('amount', e.detail.value)}
            aria-label="Amount"
          />
        </div>

        <h3 className="section-label">Category</h3>
        <div className="category-grid">
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-chip ${form.category_id === c.id ? 'selected' : ''}`}
              style={{ '--chip-color': c.color }}
              onClick={() => { tap(); set('category_id', c.id); }}
            >
              <CategoryIcon icon={c.icon} color={c.color} size={44} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        <h3 className="section-label">Paid via</h3>
        <IonSegment
          className="payment-segment"
          value={form.payment_mode}
          onIonChange={(e) => set('payment_mode', e.detail.value)}
        >
          {PAYMENT_MODES.map((m) => (
            <IonSegmentButton key={m} value={m}><IonLabel>{m}</IonLabel></IonSegmentButton>
          ))}
        </IonSegment>

        <IonList inset className="form-list">
          <IonItem>
            <IonLabel>Date</IonLabel>
            <IonDatetimeButton datetime="txn-date" slot="end" />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Note"
              labelPlacement="stacked"
              placeholder="e.g. Lunch with friends"
              autoGrow
              maxlength={120}
              value={form.note}
              onIonInput={(e) => set('note', e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>

        <IonModal keepContentsMounted>
          <IonDatetime
            id="txn-date"
            presentation="date"
            max={toDateKey()}
            value={form.date}
            onIonChange={(e) => e.detail.value && set('date', String(e.detail.value).slice(0, 10))}
          />
        </IonModal>

        <IonButton expand="block" className="ion-margin-top" onClick={save}>
          {form.id ? 'Update' : 'Save'} Transaction
        </IonButton>
        {form.id && (
          <IonButton expand="block" fill="clear" color="danger" onClick={remove}>
            Delete Transaction
          </IonButton>
        )}
      </IonContent>
    </IonModal>
  );
}
