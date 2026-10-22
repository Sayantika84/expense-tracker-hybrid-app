import { IonButton, IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { monthLabel, shiftMonth, toMonthKey } from '../services/utils';

export default function MonthSwitcher({ month, onChange }) {
  const isCurrent = month >= toMonthKey();
  return (
    <div className="month-switcher">
      <IonButton fill="clear" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <IonIcon slot="icon-only" icon={chevronBack} />
      </IonButton>
      <span>{monthLabel(month)}</span>
      <IonButton
        fill="clear"
        disabled={isCurrent}
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
      >
        <IonIcon slot="icon-only" icon={chevronForward} />
      </IonButton>
    </div>
  );
}
