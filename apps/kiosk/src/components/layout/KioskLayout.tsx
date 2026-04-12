import { Outlet } from 'react-router-dom';
import { OfflineBanner } from '../ui/OfflineBanner';

export function KioskLayout() {
  return (
    <div className="h-dvh w-screen flex flex-col bg-navy overflow-hidden">
      <OfflineBanner />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
