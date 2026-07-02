import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Suspense, lazy } from 'react';
import { PageSkeleton } from './components/ui/Skeleton';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FoodSafetyPage = lazy(() => import('./pages/FoodSafetyPage').then(m => ({ default: m.FoodSafetyPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const VolunteersPage = lazy(() => import('./pages/VolunteersPage').then(m => ({ default: m.VolunteersPage })));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage').then(m => ({ default: m.IncidentsPage })));
const RawDataPage = lazy(() => import('./pages/RawDataPage').then(m => ({ default: m.RawDataPage })));
const WebsiteContentPage = lazy(() => import('./pages/WebsiteContentPage').then(m => ({ default: m.WebsiteContentPage })));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Suspense fallback={<PageSkeleton />}><DashboardPage /></Suspense> },
      { path: '/food-safety', element: <Suspense fallback={<PageSkeleton />}><FoodSafetyPage /></Suspense> },
      { path: '/history', element: <Suspense fallback={<PageSkeleton />}><HistoryPage /></Suspense> },
      { path: '/reports', element: <Suspense fallback={<PageSkeleton />}><ReportsPage /></Suspense> },
      { path: '/volunteers', element: <Suspense fallback={<PageSkeleton />}><VolunteersPage /></Suspense> },
      { path: '/incidents', element: <Suspense fallback={<PageSkeleton />}><IncidentsPage /></Suspense> },
      { path: '/raw-data', element: <Suspense fallback={<PageSkeleton />}><RawDataPage /></Suspense> },
      { path: '/website-content', element: <Suspense fallback={<PageSkeleton />}><WebsiteContentPage /></Suspense> },
    ],
  },
]);
