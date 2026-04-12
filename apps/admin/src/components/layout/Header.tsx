import { Menu, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { Session } from '@mercy/shared';

interface HeaderProps {
  onMenuClick: () => void;
  session: Session | null;
  volunteerCount?: number;
  guestCount?: number;
}

export function Header({ onMenuClick, session, volunteerCount = 0, guestCount = 0 }: HeaderProps) {
  const { user, role, signOut } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();

  const statusColor = {
    active: 'bg-green-500',
    draft: 'bg-amber-500',
    completed: 'bg-navy-400',
    cancelled: 'bg-red-500',
  }[session?.status || 'draft'] || 'bg-gray-400';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2">
            <Menu size={20} />
          </button>

          {/* Session status indicator */}
          {session && (
            <div className="flex items-center gap-3 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor} ${session.status === 'active' ? 'animate-pulse' : ''}`} />
              <span className="font-medium capitalize">{session.status}</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="text-gray-600 dark:text-gray-400">{volunteerCount} volunteers</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="text-gray-600 dark:text-gray-400">{guestCount} guests</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="btn-ghost p-2 rounded-lg"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                {user.email}
                {role && <span className="ml-1 text-xs text-gold">({role})</span>}
              </span>
              <button onClick={signOut} className="btn-ghost p-2 rounded-lg" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
