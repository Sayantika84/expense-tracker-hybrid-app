// Wrappers around Capacitor native plugins. Each one degrades gracefully
// when the app runs in a regular browser.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNative = Capacitor.isNativePlatform();

const REMINDER_ID = 1001;
const BUDGET_ALERT_ID = 1002;

// ---------- Haptics ----------

export async function tap() {
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* not supported */ }
}

export async function success() {
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* not supported */ }
}

export async function warning() {
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch { /* not supported */ }
}

// ---------- Status bar & splash ----------

export async function applySystemTheme(dark) {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#121212' : '#4f46e5' });
  } catch { /* ignore */ }
}

export async function hideSplash() {
  if (isNative) await SplashScreen.hide();
}

// ---------- Local notifications ----------

async function ensureNotificationPermission() {
  let { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions());
  return display === 'granted';
}

// time: 'HH:mm'. Returns false if permission was denied.
export async function scheduleDailyReminder(time) {
  if (!isNative) return false;
  if (!(await ensureNotificationPermission())) return false;
  const [hour, minute] = time.split(':').map(Number);
  await cancelDailyReminder();
  await LocalNotifications.schedule({
    notifications: [{
      id: REMINDER_ID,
      title: 'Expense Tracker',
      body: "Don't forget to log today's expenses 💸",
      schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
    }],
  });
  return true;
}

export async function cancelDailyReminder() {
  if (!isNative) return;
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}

export async function notifyBudget(title, body) {
  if (!isNative) return;
  try {
    if (!(await ensureNotificationPermission())) return;
    await LocalNotifications.schedule({
      notifications: [{ id: BUDGET_ALERT_ID, title, body, schedule: { at: new Date(Date.now() + 500) } }],
    });
  } catch { /* ignore */ }
}

// ---------- CSV export ----------

function toCsv(transactions) {
  const header = ['Date', 'Type', 'Category', 'Amount', 'Payment Mode', 'Note'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = transactions.map((t) =>
    [t.date, t.type, t.category_name, t.amount, t.payment_mode, t.note].map(esc).join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export async function exportCsv(transactions) {
  const csv = toCsv(transactions);
  const fileName = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;

  if (!isNative) {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: csv,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ title: 'Expense report', text: 'My expenses exported from Expense Tracker', url: uri });
}
