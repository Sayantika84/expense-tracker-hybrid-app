import { useState } from 'react';
import {
  IonButton, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonInput, IonItem,
  IonLabel, IonList, IonListHeader, IonModal, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonTitle,
  IonToggle, IonToolbar, useIonAlert, useIonToast,
} from '@ionic/react';
import {
  addCircleOutline, cashOutline, downloadOutline, informationCircleOutline, moonOutline,
  notificationsOutline, trashOutline, walletOutline,
} from 'ionicons/icons';
import { useData } from '../context/DataContext';
import CategoryIcon from '../components/CategoryIcon';
import { CATEGORY_COLORS, CATEGORY_ICONS, CURRENCIES } from '../services/utils';
import {
  cancelDailyReminder, exportCsv, isNative, scheduleDailyReminder, success, tap,
} from '../services/native';

export default function Settings() {
  const data = useData();
  const { settings, setSetting, categories, transactions } = data;
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();
  const [budget, setBudget] = useState(settings.monthlyBudget || '');
  const [categoryType, setCategoryType] = useState('expense');
  const [newCategory, setNewCategory] = useState(null);

  const toast = (message, color = 'dark') =>
    presentToast({ message, color, duration: 2000, position: 'top' });

  const saveBudget = async () => {
    const value = Math.max(0, parseFloat(budget) || 0);
    await setSetting('monthlyBudget', value);
    success();
    toast(value ? 'Budget saved' : 'Budget removed', 'success');
  };

  const toggleReminder = async (enabled) => {
    if (enabled) {
      if (!isNative) return toast('Reminders work in the Android app', 'warning');
      const ok = await scheduleDailyReminder(settings.reminderTime);
      if (!ok) return toast('Notification permission denied', 'danger');
      toast(`Reminder set for ${settings.reminderTime} every day`, 'success');
    } else {
      await cancelDailyReminder();
    }
    await setSetting('reminderEnabled', enabled);
  };

  const changeReminderTime = async (value) => {
    if (!value) return;
    const time = String(value).slice(11, 16) || String(value).slice(0, 5);
    await setSetting('reminderTime', time);
    if (settings.reminderEnabled) await scheduleDailyReminder(time);
  };

  const exportData = async () => {
    if (transactions.length === 0) return toast('Nothing to export yet');
    try {
      await exportCsv(transactions);
    } catch (e) {
      if (!String(e?.message).toLowerCase().includes('cancel')) toast('Export failed', 'danger');
    }
  };

  const confirmClear = () =>
    presentAlert({
      header: 'Clear all transactions?',
      message: 'Every transaction will be permanently deleted. Categories and settings are kept.',
      buttons: [
        'Cancel',
        {
          text: 'Delete all',
          role: 'destructive',
          handler: async () => {
            await data.clearAllData();
            toast('All transactions deleted');
          },
        },
      ],
    });

  const confirmDeleteCategory = (c) =>
    presentAlert({
      header: `Delete "${c.name}"?`,
      message: 'Its transactions will move to the "Other" category.',
      buttons: [
        'Cancel',
        { text: 'Delete', role: 'destructive', handler: () => data.deleteCategory(c.id) },
      ],
    });

  const saveCategory = async () => {
    const name = newCategory.name.trim();
    if (!name) return toast('Enter a category name', 'danger');
    await data.addCategory({ ...newCategory, name, type: categoryType });
    success();
    setNewCategory(null);
  };

  const reminderIso = `2000-01-01T${settings.reminderTime}:00`;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonListHeader><IonLabel>Money</IonLabel></IonListHeader>
          <IonItem>
            <IonIcon icon={cashOutline} slot="start" />
            <IonSelect
              label="Currency"
              interface="action-sheet"
              value={settings.currency}
              onIonChange={(e) => setSetting('currency', e.detail.value)}
            >
              {CURRENCIES.map((c) => (
                <IonSelectOption key={c.symbol} value={c.symbol}>{c.label}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonIcon icon={walletOutline} slot="start" />
            <IonInput
              label={`Monthly budget (${settings.currency})`}
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              placeholder="e.g. 10000"
              value={budget}
              onIonInput={(e) => setBudget(e.detail.value)}
            />
            <IonButton slot="end" fill="clear" onClick={saveBudget}>Save</IonButton>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader><IonLabel>Preferences</IonLabel></IonListHeader>
          <IonItem>
            <IonIcon icon={moonOutline} slot="start" />
            <IonToggle
              checked={settings.darkMode}
              onIonChange={(e) => { tap(); setSetting('darkMode', e.detail.checked); }}
            >
              Dark mode
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonIcon icon={notificationsOutline} slot="start" />
            <IonToggle checked={settings.reminderEnabled} onIonChange={(e) => toggleReminder(e.detail.checked)}>
              Daily reminder
            </IonToggle>
          </IonItem>
          {settings.reminderEnabled && (
            <IonItem>
              <IonLabel>Remind me at</IonLabel>
              <IonDatetimeButton datetime="reminder-time" slot="end" />
            </IonItem>
          )}
        </IonList>

        <IonModal keepContentsMounted>
          <IonDatetime
            id="reminder-time"
            presentation="time"
            value={reminderIso}
            onIonChange={(e) => changeReminderTime(e.detail.value)}
          />
        </IonModal>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Categories</IonLabel>
            <IonButton onClick={() => setNewCategory({ name: '', icon: 'cart', color: CATEGORY_COLORS[0] })}>
              <IonIcon icon={addCircleOutline} slot="start" /> Add
            </IonButton>
          </IonListHeader>
          <IonItem lines="none">
            <IonSegment value={categoryType} onIonChange={(e) => setCategoryType(e.detail.value)}>
              <IonSegmentButton value="expense"><IonLabel>Expense</IonLabel></IonSegmentButton>
              <IonSegmentButton value="income"><IonLabel>Income</IonLabel></IonSegmentButton>
            </IonSegment>
          </IonItem>
          {categories
            .filter((c) => c.type === categoryType)
            .map((c) => {
              // The fallback categories receive transactions from deleted ones, so keep them.
              const isFallback = c.name === 'Other' || c.name === 'Other Income';
              return (
                <IonItem key={c.id}>
                  <CategoryIcon icon={c.icon} color={c.color} size={34} slot="start" />
                  <IonLabel>{c.name}</IonLabel>
                  {!isFallback && (
                    <IonButton
                      slot="end"
                      fill="clear"
                      color="medium"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => confirmDeleteCategory(c)}
                    >
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonButton>
                  )}
                </IonItem>
              );
            })}
        </IonList>

        <IonList inset>
          <IonListHeader><IonLabel>Data</IonLabel></IonListHeader>
          <IonItem button onClick={exportData}>
            <IonIcon icon={downloadOutline} slot="start" />
            <IonLabel>
              Export to CSV
              <p>{isNative ? 'Share via WhatsApp, Gmail, Drive…' : 'Download a .csv file'}</p>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={confirmClear}>
            <IonIcon icon={trashOutline} slot="start" color="danger" />
            <IonLabel color="danger">Clear all transactions</IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonItem lines="none">
            <IonIcon icon={informationCircleOutline} slot="start" />
            <IonLabel>
              Expense Tracker v1.0
              <p>Hybrid app · React + Ionic + Capacitor + SQLite</p>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonModal isOpen={!!newCategory} onDidDismiss={() => setNewCategory(null)} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
          {newCategory && (
            <IonContent className="ion-padding">
              <h2>New {categoryType} category</h2>
              <IonItem>
                <IonInput
                  label="Name"
                  labelPlacement="stacked"
                  placeholder="e.g. Groceries"
                  maxlength={20}
                  value={newCategory.name}
                  onIonInput={(e) => setNewCategory((c) => ({ ...c, name: e.detail.value ?? '' }))}
                />
              </IonItem>
              <h3 className="section-label">Icon</h3>
              <div className="icon-grid">
                {Object.keys(CATEGORY_ICONS).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`icon-option ${newCategory.icon === key ? 'selected' : ''}`}
                    onClick={() => setNewCategory((c) => ({ ...c, icon: key }))}
                  >
                    <CategoryIcon icon={key} color={newCategory.color} size={40} />
                  </button>
                ))}
              </div>
              <h3 className="section-label">Color</h3>
              <div className="color-grid">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    className={`color-option ${newCategory.color === color ? 'selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => setNewCategory((c) => ({ ...c, color }))}
                  />
                ))}
              </div>
              <IonButton expand="block" className="ion-margin-top" onClick={saveCategory}>
                Add category
              </IonButton>
            </IonContent>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
