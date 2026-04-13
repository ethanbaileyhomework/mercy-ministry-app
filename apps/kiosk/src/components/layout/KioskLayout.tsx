import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Heart, Lock, Delete } from 'lucide-react';
import { useActiveSession } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { OfflineBanner } from '../ui/OfflineBanner';
import { ErrorBoundary } from '../ErrorBoundary';
import { useCoordinator } from '@/context/CoordinatorContext';

// ─── Full-screen lock wall ────────────────────────────────────────────────────
// Rendered instead of the normal kiosk UI when isScreenLocked is true.
// There is NO dismiss/close button — the user must enter the correct PIN.
function LockScreen() {
  const { tryUnlock } = useCoordinator();
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);

  const handleDigit = (d: string) => {
    const next = digits + d;
    if (next.length < 4) {
      setDigits(next);
      return;
    }
    // 4th digit entered — evaluate immediately
    const success = tryUnlock(next);
    if (!success) {
      setShake(true);
      setTimeout(() => {
        setDigits('');
        setShake(false);
      }, 600);
    }
    // On success the parent re-renders because isScreenLocked becomes false
  };

  const handleDelete = () => setDigits((d) => d.slice(0, -1));

  const pad: string[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  return (
    <div className="h-dvh w-screen flex flex-col items-center justify-center bg-navy text-white select-none">
      {/* Branding */}
      <Heart size={52} className="text-gold mb-5" fill="#D4892A" />
      <h1 className="text-kiosk-2xl font-bold mb-1">Mercy Ministry</h1>
      <p className="text-white/40 text-kiosk-body mb-10 flex items-center gap-2">
        <Lock size={16} />
        Screen locked
      </p>

      {/* PIN dots */}
      <div className={`flex justify-center gap-5 mb-8 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < digits.length ? 'bg-gold border-gold scale-110' : 'border-white/25'
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="space-y-3 w-64">
        {pad.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-3">
            {row.map((key, ci) => {
              if (key === '') return <div key={ci} />;
              if (key === 'del') {
                return (
                  <button
                    key={ci}
                    onClick={handleDelete}
                    disabled={digits.length === 0}
                    className="h-16 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center
                               active:scale-90 transition-all disabled:opacity-30"
                  >
                    <Delete size={22} className="text-white/60" />
                  </button>
                );
              }
              return (
                <button
                  key={ci}
                  onClick={() => handleDigit(key)}
                  disabled={digits.length >= 4}
                  className="h-16 rounded-xl bg-white/8 border border-white/10 text-kiosk-xl font-bold
                             active:scale-90 active:bg-gold/20 active:border-gold/30 transition-all
                             disabled:opacity-50"
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-white/25">Enter coordinator PIN to unlock</p>
    </div>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────
export function KioskLayout() {
  const { isScreenLocked, lock } = useCoordinator();
  const { session } = useActiveSession(supabase);
  const [signedInCount, setSignedInCount] = useState<number | null>(null);

  // Poll signed-in count when session is completed
  useEffect(() => {
    if (!session?.id || session.status !== 'completed') {
      setSignedInCount(null);
      return;
    }
    const check = async () => {
      const { count } = await supabase
        .from('volunteer_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .is('sign_out_time', null);
      setSignedInCount(count ?? 0);
    };
    check();
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [session?.id, session?.status]);

  // Auto-lock 30s after session ended + everyone signed out
  useEffect(() => {
    if (session?.status !== 'completed' || signedInCount !== 0) return;
    const timer = setTimeout(lock, 30_000);
    return () => clearTimeout(timer);
  }, [session?.status, signedInCount, lock]);

  // When screen-locked, show only the PIN wall — nothing behind it is rendered.
  if (isScreenLocked) {
    return <LockScreen />;
  }

  return (
    <div className="h-dvh w-screen flex flex-col bg-navy overflow-hidden text-white">
      <OfflineBanner />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
