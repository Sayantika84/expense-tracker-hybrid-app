import { IonItem, IonLabel, IonNote } from '@ionic/react';
import { formatMoney } from '../services/utils';
import { useData } from '../context/DataContext';
import CategoryIcon from './CategoryIcon';

export default function TransactionItem({ tx, onClick, showDate = false }) {
  const { settings } = useData();
  const sign = tx.type === 'expense' ? '−' : '+';

  return (
    <IonItem button detail={false} onClick={onClick} className="tx-item">
      <CategoryIcon icon={tx.category_icon} color={tx.category_color} slot="start" />
      <IonLabel>
        <h2>{tx.category_name ?? 'Uncategorised'}</h2>
        <p>
          {tx.note || tx.payment_mode}
          {showDate && ` · ${tx.date}`}
        </p>
      </IonLabel>
      <IonNote slot="end" className={`tx-amount ${tx.type}`}>
        {sign}{formatMoney(tx.amount, settings.currency)}
      </IonNote>
    </IonItem>
  );
}
