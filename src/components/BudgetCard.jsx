import { IonCard, IonCardContent, IonProgressBar, useIonRouter } from '@ionic/react';
import { useData } from '../context/DataContext';
import { formatMoney } from '../services/utils';

export default function BudgetCard({ spent }) {
  const { settings } = useData();
  const router = useIonRouter();
  const budget = settings.monthlyBudget;
  const fmt = (n) => formatMoney(n, settings.currency);

  if (!budget) {
    return (
      <IonCard button onClick={() => router.push('/settings')} className="budget-card">
        <IonCardContent>
          <strong>Set a monthly budget</strong>
          <p>Get warned before you overspend. Tap to set one in Settings.</p>
        </IonCardContent>
      </IonCard>
    );
  }

  const ratio = spent / budget;
  const color = ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'success';
  const left = budget - spent;

  return (
    <IonCard className="budget-card">
      <IonCardContent>
        <div className="budget-row">
          <strong>Monthly budget</strong>
          <span>{fmt(spent)} / {fmt(budget)}</span>
        </div>
        <IonProgressBar value={Math.min(ratio, 1)} color={color} />
        <p className={`budget-hint ${color}`}>
          {left >= 0
            ? `${fmt(left)} left · ${Math.round(ratio * 100)}% used`
            : `Over budget by ${fmt(-left)}`}
        </p>
      </IonCardContent>
    </IonCard>
  );
}
