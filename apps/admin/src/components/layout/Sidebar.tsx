import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Thermometer, Clock, Users, AlertTriangle, Heart, X, FileText, Database, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/food-safety', icon: Thermometer, label: 'Food Safety' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/volunteers', icon: Users, label: 'Volunteers' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/raw-data', icon: Database, label: 'Raw Data' },
  { to: '/website-content', icon: Globe, label: 'Website Editor' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-dvh w-64 bg-navy dark:bg-gray-950 text-white',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Heart size={24} className="text-gold" fill="#C9A84C" />
            <div>
              <h1 className="font-bold text-lg">Mercy Ministry</h1>
              <p className="text-xs text-white/50">Admin Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-gold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/40">
          Cranbourne, VIC
        </div>
      </aside>
    </>
  );
}
