import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, LogOut, UserPlus } from 'lucide-react';
import { getCurrentDayLabelAEST, useActiveSession, type Announcement } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { session } = useActiveSession(supabase);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dateLabel, setDateLabel] = useState(getCurrentDayLabelAEST());

  useEffect(() => {
    // Update date every minute
    const interval = setInterval(() => setDateLabel(getCurrentDayLabelAEST()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadAnnouncements() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('display_on_kiosk', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setAnnouncements(data as Announcement[]);
    }
    loadAnnouncements();
  }, []);

  const sessionLabel = session?.status === 'active'
    ? 'Tuesday Evening — Session Open'
    : session?.status === 'draft'
      ? 'Session Starting Soon'
      : 'No Active Session';

  return (
    <div className="flex flex-col items-center justify-between h-full px-8 py-12">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Heart size={48} className="text-gold" fill="#C9A84C" />
        </div>
        <h1 className="text-kiosk-3xl font-bold text-white mb-2">Mercy Ministry</h1>
        <p className="text-kiosk-lg text-gold">Food Relief Outreach</p>
        <p className="text-kiosk-body text-white/60 mt-4">{dateLabel}</p>
        <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-kiosk-body font-medium
          ${session?.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${session?.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
          {sessionLabel}
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="w-full max-w-lg space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-kiosk-body font-semibold text-gold">{a.title}</h3>
              {a.body && <p className="text-base text-white/70 mt-1">{a.body}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-lg space-y-4">
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

        <button
          onClick={() => navigate('/register')}
          className="kiosk-button-secondary w-full flex items-center justify-center gap-4 text-kiosk-lg"
        >
          <UserPlus size={28} />
          First Time? Register Here
        </button>
      </div>
    </div>
  );
}
