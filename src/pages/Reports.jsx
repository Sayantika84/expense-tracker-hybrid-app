import { useEffect, useState } from 'react';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon,
  IonItem, IonLabel, IonList, IonNote, IonPage, IonProgressBar, IonTitle, IonToolbar,
} from '@ionic/react';
import { pieChartOutline } from 'ionicons/icons';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import MonthSwitcher from '../components/MonthSwitcher';
import { getCategoryTotals, getMonthlyTotals } from '../services/db';
import { formatMoney, monthLabel, shiftMonth, toMonthKey } from '../services/utils';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Reports() {
  const { settings, version } = useData();
  const [month, setMonth] = useState(toMonthKey());
  const [byCategory, setByCategory] = useState([]);
  const [monthly, setMonthly] = useState([]);

  // Last 6 months ending at the selected month.
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));

  useEffect(() => {
    getCategoryTotals(month).then(setByCategory);
    getMonthlyTotals(months[0]).then(setMonthly);
    // `version` changes after every DB write, so charts stay in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, version]);

  const fmt = (n) => formatMoney(n, settings.currency);
  const totalSpent = byCategory.reduce((s, c) => s + c.total, 0);
  const textColor = settings.darkMode ? '#d4d4d8' : '#52525b';
  const gridColor = settings.darkMode ? '#3f3f46' : '#e4e4e7';

  const doughnutData = {
    labels: byCategory.map((c) => c.name),
    datasets: [{
      data: byCategory.map((c) => c.total),
      backgroundColor: byCategory.map((c) => c.color),
      borderWidth: 2,
      borderColor: settings.darkMode ? '#1e1e1e' : '#ffffff',
    }],
  };

  const monthRow = (m) => monthly.find((r) => r.month === m) ?? { income: 0, expense: 0 };
  const barData = {
    labels: months.map((m) => monthLabel(m, 'short')),
    datasets: [
      { label: 'Income', data: months.map((m) => monthRow(m).income), backgroundColor: '#16a34a', borderRadius: 6 },
      { label: 'Expense', data: months.map((m) => monthRow(m).expense), backgroundColor: '#ef4444', borderRadius: 6 },
    ],
  };

  const tooltip = { callbacks: { label: (ctx) => `${ctx.dataset.label || ctx.label}: ${fmt(ctx.parsed.y ?? ctx.parsed)}` } };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reports</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MonthSwitcher month={month} onChange={setMonth} />

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Spending by category</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {byCategory.length === 0 ? (
              <div className="empty-state small">
                <IonIcon icon={pieChartOutline} />
                <p>No expenses in {monthLabel(month)}.</p>
              </div>
            ) : (
              <div className="chart-box doughnut">
                <Doughnut
                  data={doughnutData}
                  options={{
                    cutout: '68%',
                    plugins: { legend: { display: false }, tooltip },
                    maintainAspectRatio: false,
                  }}
                />
                <div className="doughnut-center">
                  <small>Spent</small>
                  <strong>{fmt(totalSpent)}</strong>
                </div>
              </div>
            )}
          </IonCardContent>
          {byCategory.length > 0 && (
            <IonList lines="none">
              {byCategory.map((c) => (
                <IonItem key={c.name}>
                  <span className="legend-dot" slot="start" style={{ background: c.color }} />
                  <IonLabel>
                    <h3>{c.name}</h3>
                    <IonProgressBar value={c.total / totalSpent} style={{ '--progress-background': c.color }} />
                  </IonLabel>
                  <IonNote slot="end" className="legend-value">
                    {fmt(c.total)}
                    <small>{Math.round((c.total / totalSpent) * 100)}%</small>
                  </IonNote>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Last 6 months</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="chart-box">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: textColor } }, tooltip },
                  scales: {
                    x: { ticks: { color: textColor }, grid: { display: false } },
                    y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
                  },
                }}
              />
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
