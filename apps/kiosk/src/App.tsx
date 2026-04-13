import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@mercy/shared';
import { router } from './router';
import { CoordinatorProvider } from './context/CoordinatorContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CoordinatorProvider>
          <RouterProvider router={router} />
        </CoordinatorProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
