import {
  fastFood, car, receipt, cart, medkit, film, school, home, ellipsisHorizontal,
  briefcase, wallet, gift, trendingUp, cafe, airplane, fitness, phonePortrait,
  paw, shirt, construct, cash, card, bus, beer,
} from 'ionicons/icons';

// Icons available for categories, stored in the DB by name.
export const CATEGORY_ICONS = {
  fastFood, car, receipt, cart, medkit, film, school, home, ellipsisHorizontal,
  briefcase, wallet, gift, trendingUp, cafe, airplane, fitness, phonePortrait,
  paw, shirt, construct, cash, card, bus, beer,
};

export const CATEGORY_COLORS = [
  '#f97316', '#3b82f6', '#ef4444', '#ec4899', '#10b981', '#8b5cf6',
  '#0ea5e9', '#a16207', '#64748b', '#16a34a', '#14b8a6', '#d946ef',
];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Card'];

export const CURRENCIES = [
  { symbol: '₹', locale: 'en-IN', label: 'Indian Rupee (₹)' },
  { symbol: '$', locale: 'en-US', label: 'US Dollar ($)' },
  { symbol: '€', locale: 'de-DE', label: 'Euro (€)' },
  { symbol: '£', locale: 'en-GB', label: 'British Pound (£)' },
];

export function formatMoney(amount, symbol = '₹') {
  const { locale } = CURRENCIES.find((c) => c.symbol === symbol) ?? CURRENCIES[0];
  const value = Number(amount || 0);
  const n = Math.abs(value).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? '−' : ''}${symbol}${n}`;
}

const pad = (n) => String(n).padStart(2, '0');

// Local date as 'YYYY-MM-DD' (toISOString would shift it to UTC).
export function toDateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(monthKey, style = 'long') {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
  });
}

export function dateLabel(dateKey) {
  const today = toDateKey();
  const yesterday = toDateKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function sumBy(list, type) {
  return list.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
}
