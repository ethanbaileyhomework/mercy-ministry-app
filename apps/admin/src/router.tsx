import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { GuestsPage } from './pages/GuestsPage';
import { FoodSafetyPage } from './pages/FoodSafetyPage';
import { InventoryPage } from './pages/InventoryPage';
import { VolunteersPage } from './pages/VolunteersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/sessions', element: <SessionsPage /> },
      { path: '/guests', element: <GuestsPage /> },
      { path: '/food-safety', element: <FoodSafetyPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/volunteers', element: <VolunteersPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/announcements', element: <AnnouncementsPage /> },
    ],
  },
]);
