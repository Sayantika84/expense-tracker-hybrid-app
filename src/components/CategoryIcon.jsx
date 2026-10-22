import { IonIcon } from '@ionic/react';
import { pricetag } from 'ionicons/icons';
import { CATEGORY_ICONS } from '../services/utils';

export default function CategoryIcon({ icon, color = '#64748b', size = 40, slot }) {
  return (
    <div
      className="category-icon"
      slot={slot}
      style={{ background: `${color}22`, color, width: size, height: size }}
    >
      <IonIcon icon={CATEGORY_ICONS[icon] ?? pricetag} />
    </div>
  );
}
