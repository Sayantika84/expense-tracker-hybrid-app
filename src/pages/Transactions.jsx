import { useMemo, useState } from 'react';
import {
  IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItemDivider, IonItemGroup,
  IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonPage, IonSearchbar,
  IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast,
} from '@ionic/react';
import { add, searchOutline, trash } from 'ionicons/icons';
import { useData } from '../context/DataContext';
import { useTransactionModal } from '../components/TransactionModal';
import TransactionItem from '../components/TransactionItem';
import MonthSwitcher from '../components/MonthSwitcher';
import { dateLabel, formatMoney, sumBy, toMonthKey } from '../services/utils';
import { warning } from '../services/native';

export default function Transactions() {
  const { transactions, categories, settings, deleteTransaction, addTransaction } = useData();
  const openTransaction = useTransactionModal();
  const [presentToast] = useIonToast();

  const [month, setMonth] = useState(toMonthKey());
  const [type, setType] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        t.date.startsWith(month) &&
        (type === 'all' || t.type === type) &&
        (categoryId === 'all' || t.category_id === categoryId) &&
        (!q ||
          t.note?.toLowerCase().includes(q) ||
          t.category_name?.toLowerCase().includes(q) ||
          String(t.amount).includes(q))
    );
  }, [transactions, month, type, categoryId, search]);

  // Group into { date: [tx, ...] } — the list is already sorted newest first.
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  const fmt = (n) => formatMoney(n, settings.currency);

  const remove = async (tx) => {
    await deleteTransaction(tx.id);
    warning();
    presentToast({
      message: 'Transaction deleted',
      duration: 3000,
      position: 'bottom',
      buttons: [{ text: 'Undo', handler: () => addTransaction(tx) }],
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Transactions</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="Search notes, category, amount"
            debounce={200}
            value={search}
            onIonInput={(e) => setSearch(e.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <MonthSwitcher month={month} onChange={setMonth} />

        <div className="filters">
          <IonSegment value={type} onIonChange={(e) => { setType(e.detail.value); setCategoryId('all'); }}>
            <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="expense"><IonLabel>Expense</IonLabel></IonSegmentButton>
            <IonSegmentButton value="income"><IonLabel>Income</IonLabel></IonSegmentButton>
          </IonSegment>
          <IonSelect
            label="Category"
            interface="action-sheet"
            value={categoryId}
            onIonChange={(e) => setCategoryId(e.detail.value)}
          >
            <IonSelectOption value="all">All categories</IonSelectOption>
            {categories
              .filter((c) => type === 'all' || c.type === type)
              .map((c) => (
                <IonSelectOption key={c.id} value={c.id}>{c.name}</IonSelectOption>
              ))}
          </IonSelect>
        </div>

        <div className="summary-strip">
          <div><small>Income</small><strong className="income">{fmt(sumBy(filtered, 'income'))}</strong></div>
          <div><small>Expense</small><strong className="expense">{fmt(sumBy(filtered, 'expense'))}</strong></div>
          <div><small>Count</small><strong>{filtered.length}</strong></div>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={searchOutline} />
            <p>No transactions match these filters.</p>
          </div>
        ) : (
          <IonList>
            {groups.map(([date, txs]) => (
              <IonItemGroup key={date}>
                <IonItemDivider sticky>
                  <IonLabel>{dateLabel(date)}</IonLabel>
                  <IonLabel slot="end" className="divider-total">
                    {fmt(sumBy(txs, 'income') - sumBy(txs, 'expense'))}
                  </IonLabel>
                </IonItemDivider>
                {txs.map((tx) => (
                  <IonItemSliding key={tx.id}>
                    <TransactionItem tx={tx} onClick={() => openTransaction(tx)} />
                    <IonItemOptions side="end" onIonSwipe={() => remove(tx)}>
                      <IonItemOption color="danger" expandable onClick={() => remove(tx)}>
                        <IonIcon slot="icon-only" icon={trash} />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))}
              </IonItemGroup>
            ))}
          </IonList>
        )}

        <div className="fab-spacer" />
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => openTransaction()} aria-label="Add transaction">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
}
