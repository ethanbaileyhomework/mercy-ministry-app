import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, LogOut, ClipboardList, Users, Lock } from 'lucide-react';
import { getCurrentDayLabelAEST, useActiveSession, getNextTuesday, formatDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { useCoordinator } from '@/context/CoordinatorContext';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { session } = useActiveSession(supabase);
  const { lock } = useCoordinator();
  const [dateLabel, setDateLabel] = useState(getCurrentDayLabelAEST());
  const [signedInCount, setSignedInCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setDateLabel(getCurrentDayLabelAEST()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadCount = useCallback(async () => {
    if (!session?.id) { setSignedInCount(0); return; }
    const { count } = await supabase
      .from('volunteer_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .is('sign_out_time', null);
    setSignedInCount(count || 0);
  }, [session?.id]);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 10_000);
    return () => clearInterval(interval);
  }, [loadCount]);

  const sessionLabel = session?.status === 'active'
    ? 'Session Open'
    : session?.status === 'draft'
      ? 'Session Starting Soon'
      : 'No Active Session';

  return (
    <div className="flex flex-col items-center justify-between h-full px-8 py-12">
      {/* Lock button — subtle, top-right */}
      <button
        onClick={lock}
        className="absolute top-4 right-4 p-2.5 rounded-xl text-white/20 hover:bg-white/8 hover:text-white/40 transition-all active:scale-90"
        title="Lock kiosk"
      >
        <Lock size={18} />
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Heart size={48} className="text-gold" fill="#D4892A" />
        </div>
        <h1 className="text-kiosk-3xl font-bold text-white mb-2">Mercy Ministry</h1>
        <p className="text-kiosk-lg text-gold">Food Relief Outreach</p>
        <p className="text-kiosk-body text-white/60 mt-4">{dateLabel}</p>
        <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-kiosk-body font-medium
          ${session?.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${session?.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
          {sessionLabel}
        </div>

        {(!session || session.status === 'completed') && (
          <p className="mt-2 text-sm text-white/40">
            Next service: {formatDateAEST(getNextTuesday() + 'T00:00:00Z').replace(/\s\d{4}$/, '')}
          </p>
        )}

        {session?.status === 'active' && signedInCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/60 text-sm font-medium">
            <Users size={16} />
            <span className="text-gold font-bold">{signedInCount}</span> volunteer{signedInCount !== 1 ? 's' : ''} signed in
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-lg space-y-5">
        <button
          onClick={() => navigate('/sign-in')}
          className="kiosk-button-primary w-full flex items-center justify-center gap-4"
        >
          <LogIn size={32} />
          Sign In
        </button>

        <button
          onClick={() => navigate('/sign-out')}
          className="kiosk-button-outline w-full flex items-center justify-center gap-4"
        >
          <LogOut size={32} />
          Sign Out
        </button>

        {/* Service sheets — always visible when a session is active */}
        {session?.status === 'active' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/service-sheet/kitchen')}
              className="kiosk-button-secondary flex items-center justify-center gap-3"
            >
              <ClipboardList size={24} />
              <span>
                <span className="block text-sm font-normal opacity-70">Service Sheet</span>
                Kitchen
              </span>
            </button>
            <button
              onClick={() => navigate('/service-sheet/hall')}
              className="kiosk-button-secondary flex items-center justify-center gap-3"
            >
              <ClipboardList size={24} />
              <span>
                <span className="block text-sm font-normal opacity-70">Service Sheet</span>
                Hall
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
