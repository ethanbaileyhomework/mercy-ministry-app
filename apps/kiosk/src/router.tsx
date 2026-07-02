import { createBrowserRouter, Navigate } from 'react-router-dom';
import { KioskLayout } from './components/layout/KioskLayout';
import { Suspense, lazy } from 'react';

const WelcomeScreen = lazy(() => import('./screens/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const SignInScreen = lazy(() => import('./screens/SignInScreen').then(m => ({ default: m.SignInScreen })));
const SignOutScreen = lazy(() => import('./screens/SignOutScreen').then(m => ({ default: m.SignOutScreen })));
const ServiceSheetScreen = lazy(() => import('./screens/ServiceSheetScreen').then(m => ({ default: m.ServiceSheetScreen })));

const fallback = <div className="flex items-center justify-center h-full"><p className="text-white/40">Loading...</p></div>;

export const router = createBrowserRouter([
  {
    element: <KioskLayout />,
    children: [
      { path: '/', element: <Suspense fallback={fallback}><WelcomeScreen /></Suspense> },
      { path: '/sign-in', element: <Suspense fallback={fallback}><SignInScreen /></Suspense> },
      { path: '/sign-out', element: <Suspense fallback={fallback}><SignOutScreen /></Suspense> },
      // Area-specific service sheets — :area is 'kitchen' or 'hall'
      { path: '/service-sheet/:area', element: <Suspense fallback={fallback}><ServiceSheetScreen /></Suspense> },
      // Legacy /service-sheet → redirect to kitchen (leader sign-in now goes directly to area)
      { path: '/service-sheet', element: <Navigate to="/service-sheet/kitchen" replace /> },
      { path: '/register', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
