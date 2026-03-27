import { createBrowserRouter } from 'react-router-dom';
import { KioskLayout } from './components/layout/KioskLayout';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SignOutScreen } from './screens/SignOutScreen';
import { RegisterScreen } from './screens/RegisterScreen';

export const router = createBrowserRouter([
  {
    element: <KioskLayout />,
    children: [
      { path: '/', element: <WelcomeScreen /> },
      { path: '/sign-in', element: <SignInScreen /> },
      { path: '/sign-out', element: <SignOutScreen /> },
      { path: '/register', element: <RegisterScreen /> },
    ],
  },
]);
