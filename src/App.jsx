import { useEffect } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  IonApp, IonIcon, IonLabel, IonRouterOutlet, IonSpinner, IonTabBar, IonTabButton, IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, list, pieChart, settings as settingsIcon } from 'ionicons/icons';

import { DataProvider, useData } from './context/DataContext';
import { TransactionModalProvider } from './components/TransactionModal';
import { hideSplash } from './services/native';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

setupIonicReact();

function Tabs() {
  return (
    <IonReactRouter>
      <TransactionModalProvider>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/home" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="transactions" href="/transactions">
              <IonIcon icon={list} />
              <IonLabel>Transactions</IonLabel>
            </IonTabButton>
            <IonTabButton tab="reports" href="/reports">
              <IonIcon icon={pieChart} />
              <IonLabel>Reports</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settingsIcon} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </TransactionModalProvider>
    </IonReactRouter>
  );
}

function Shell() {
  const { ready, error } = useData();

  useEffect(() => {
    if (ready || error) hideSplash();
  }, [ready, error]);

  if (error) {
    return (
      <div className="boot-screen">
        <h2>Could not open the database</h2>
        <p>{error}</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="boot-screen">
        <IonSpinner name="crescent" />
      </div>
    );
  }
  return <Tabs />;
}

export default function App() {
  return (
    <IonApp>
      <DataProvider>
        <Shell />
      </DataProvider>
    </IonApp>
  );
}
