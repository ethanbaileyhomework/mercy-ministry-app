import { createContext, useContext, useState, type ReactNode } from 'react';

const COORDINATOR_PIN = import.meta.env.VITE_COORDINATOR_PIN || '3638';
const LOCK_KEY = 'mercy_kiosk_locked';

interface CoordinatorContextValue {
  isScreenLocked: boolean;
  lock: () => void;
  tryUnlock: (pin: string) => boolean;
}

const CoordinatorContext = createContext<CoordinatorContextValue | null>(null);

export function CoordinatorProvider({ children }: { children: ReactNode }) {
  // Default is LOCKED — coordinator must enter PIN to open the kiosk for the evening.
  const [isScreenLocked, setIsScreenLocked] = useState(
    () => localStorage.getItem(LOCK_KEY) !== '0'
  );

  const lock = () => {
    localStorage.removeItem(LOCK_KEY);
    setIsScreenLocked(true);
  };

  const tryUnlock = (pin: string): boolean => {
    if (pin === COORDINATOR_PIN) {
      localStorage.setItem(LOCK_KEY, '0');
      setIsScreenLocked(false);
      return true;
    }
    return false;
  };

  return (
    <CoordinatorContext.Provider value={{ isScreenLocked, lock, tryUnlock }}>
      {children}
    </CoordinatorContext.Provider>
  );
}

export function useCoordinator() {
  const ctx = useContext(CoordinatorContext);
  if (!ctx) throw new Error('useCoordinator must be used inside CoordinatorProvider');
  return ctx;
}
