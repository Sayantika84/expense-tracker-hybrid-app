import {
  IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonList, IonPage,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar, useIonRouter,
} from '@ionic/react';
import { add, arrowDown, arrowUp, walletOutline } from 'ionicons/icons';
import { useData } from '../context/DataContext';
import { useTransactionModal } from '../components/TransactionModal';
import TransactionItem from '../components/TransactionItem';
import BudgetCard from '../components/BudgetCard';
import { formatMoney, monthLabel, sumBy, toMonthKey } from '../services/utils';

export default function Dashboard() {
  const { transactions, settings } = useData();
  const openTransaction = useTransactionModal();
  const router = useIonRouter();

  const month = toMonthKey();
  const thisMonth = transactions.filter((t) => t.date.startsWith(month));
  const income = sumBy(thisMonth, 'income');
  const expense = sumBy(thisMonth, 'expense');
  const balance = sumBy(transactions, 'income') - sumBy(transactions, 'expense');
  const fmt = (n) => formatMoney(n, settings.currency);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Expense Tracker</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={(e) => setTimeout(() => e.detail.complete(), 400)}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="balance-card">
          <p className="greeting">{greeting} 👋</p>
          <p className="label">Total balance</p>
          <h1>{fmt(balance)}</h1>
          <div className="balance-split">
            <div>
              <span className="pill income"><IonIcon icon={arrowDown} /></span>
              <div>
                <small>Income · {monthLabel(month, 'short')}</small>
                <strong>{fmt(income)}</strong>
              </div>
            </div>
            <div>
              <span className="pill expense"><IonIcon icon={arrowUp} /></span>
              <div>
                <small>Expense · {monthLabel(month, 'short')}</small>
                <strong>{fmt(expense)}</strong>
              </div>
            </div>
          </div>
        </div>

        <BudgetCard spent={expense} />

        <div className="section-header">
          <h3>Recent transactions</h3>
          {transactions.length > 5 && (
            <IonButton fill="clear" size="small" onClick={() => router.push('/transactions')}>
              See all
            </IonButton>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={walletOutline} />
            <p>No transactions yet.<br />Tap <strong>+</strong> to add your first one.</p>
          </div>
        ) : (
          <IonList inset>
            {transactions.slice(0, 5).map((tx) => (
              <TransactionItem key={tx.id} tx={tx} showDate onClick={() => openTransaction(tx)} />
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
