import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Crown } from 'lucide-react';
import { useActiveSession, formatHoursMinutes, getCurrentDateAEST, getNextTuesday, formatDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { SuccessScreen } from '@/components/ui/SuccessScreen';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarning } from '@/components/ui/IdleWarning';

type Step = 'search' | 'confirm-end' | 'success';

interface SignedInVolunteer {
  attendance_id: string;
  volunteer_id: string;
  first_name: string;
  last_name: string;
  is_leader: boolean;
  area_on_day: string;
  sign_in_time: string;
}

export function SignOutScreen() {
  const { warningVisible, countdown, dismiss } = useIdleTimeout();
  const navigate = useNavigate();
  const { session, setSession } = useActiveSession(supabase);
  const [step, setStep] = useState<Step>('search');
  const [volunteerName, setVolunteerName] = useState('');
  const [hoursServed, setHoursServed] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [signedInVols, setSignedInVols] = useState<SignedInVolunteer[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);
  const [todaySessionId, setTodaySessionId] = useState<string | null>(null);

  // Find today's session (any status — people might need to sign out after session ends)
  useEffect(() => {
    async function findSession() {
      const today = getCurrentDateAEST();
      const { data } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_date', today)
        .limit(1)
        .single();
      if (data) setTodaySessionId(data.id);
      else setLoadingVols(false);
    }
    findSession();
  }, []);

  // Load currently signed-in volunteers
  const loadSignedIn = useCallback(async () => {
    if (!todaySessionId) return;
    setLoadingVols(true);
    const { data } = await supabase
      .from('volunteer_attendance')
      .select('id, volunteer_id, area_on_day, sign_in_time, is_leader_on_day, volunteers(first_name, last_name, is_leader)')
      .eq('session_id', todaySessionId)
      .is('sign_out_time', null);
    if (data) {
      setSignedInVols(data.map((a: any) => ({
        attendance_id: a.id,
        volunteer_id: a.volunteer_id,
        first_name: a.volunteers?.first_name,
        last_name: a.volunteers?.last_name,
        is_leader: a.volunteers?.is_leader,
        area_on_day: a.area_on_day,
        sign_in_time: a.sign_in_time,
      })));
    }
    setLoadingVols(false);
  }, [todaySessionId]);

  useEffect(() => {
    if (todaySessionId) loadSignedIn();
  }, [todaySessionId, loadSignedIn]);

  const filtered = searchText.trim()
    ? signedInVols.filter((v) =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  const handleSignOut = useCallback(async (vol: SignedInVolunteer) => {
    setError(null);
    setSubmitting(true);

    try {
      const now = new Date();
      const { error: updateError } = await supabase
        .from('volunteer_attendance')
        .update({ sign_out_time: now.toISOString() })
        .eq('id', vol.attendance_id);

      if (updateError) throw updateError;

      const signInTime = new Date(vol.sign_in_time);
      const hours = (now.getTime() - signInTime.getTime()) / (1000 * 60 * 60);
      const rounded = Math.round(hours * 100) / 100;

      setVolunteerName(vol.first_name);
      setHoursServed(formatHoursMinutes(rounded));

      // Remove from list
      setSignedInVols((prev) => prev.filter((v) => v.attendance_id !== vol.attendance_id));

      if (vol.is_leader) {
        setStep('confirm-end');
      } else {
        setStep('success');
      }
    } catch (err) {
      console.error('Sign-out failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleEndSession = async (shouldEnd: boolean) => {
    if (shouldEnd && session) {
      await supabase
        .from('sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', session.id);
      setSession({ ...session, status: 'completed', ended_at: new Date().toISOString() });
    }
    setStep('success');
  };

  if (step === 'success') {
    return (
      <SuccessScreen
        title={`Thanks, ${volunteerName}!`}
        subtitle={`You were here for ${hoursServed}. See you ${formatDateAEST(getNextTuesday() + 'T00:00:00Z').replace(/\s\d{4}$/, '')}!`}
      />
    );
  }

  if (step === 'confirm-end') {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8">
        <h2 className="text-kiosk-2xl font-bold mb-4">End Tonight&apos;s Session?</h2>
        <p className="text-kiosk-lg text-white/70 mb-10 text-center">
          You were here for {hoursServed}.<br />
          Are you the last leader leaving?
        </p>
        <div className="w-full max-w-lg grid grid-cols-2 gap-6">
          <button
            onClick={() => handleEndSession(true)}
            className="h-[120px] rounded-2xl bg-gold text-navy text-kiosk-xl font-bold
                       active:scale-95 transition-all duration-150 select-none"
          >
            Yes, End Session
          </button>
          <button
            onClick={() => handleEndSession(false)}
            className="h-[120px] rounded-2xl bg-white/10 border-2 border-white/15 text-kiosk-xl font-bold
                       active:scale-95 transition-all duration-150 select-none"
          >
            No, Keep Open
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-8 py-6">
      {warningVisible && <IdleWarning countdown={countdown} onDismiss={dismiss} />}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={32} />
          </button>
          <h1 className="text-kiosk-2xl font-bold">Sign Out</h1>
        </div>
        {/* Live count */}
        <div className="px-4 py-2 rounded-full bg-white/10 text-sm font-medium">
          <span className="text-gold font-bold">{signedInVols.length}</span>
          <span className="text-white/50"> signed in</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            autoFocus
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setError(null); }}
            placeholder="Type your name to sign out..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4
                       text-kiosk-body text-white placeholder-white/30
                       focus:outline-none focus:border-gold/50"
          />
        </div>

        {error && (
          <p className="text-red-400 text-kiosk-body mb-3 text-center font-medium">{error}</p>
        )}

        {/* Signed-in volunteer list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loadingVols ? (
            <p className="text-center text-white/30 py-8">Loading...</p>
          ) : !todaySessionId ? (
            <p className="text-center text-white/30 py-8">No session today.</p>
          ) : !searchText.trim() ? (
            <p className="text-center text-white/30 py-8">
              Start typing your name to sign out
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/30 py-8">
              No match — make sure you&apos;re signed in
            </p>
          ) : (
            filtered.map((v) => (
              <VolunteerSignOutButton key={v.attendance_id} vol={v} onSignOut={handleSignOut} disabled={submitting} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Separate component with its own confirm state
function VolunteerSignOutButton({
  vol,
  onSignOut,
  disabled,
}: {
  vol: SignedInVolunteer;
  onSignOut: (v: SignedInVolunteer) => void;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-gold/10 border border-gold/30 rounded-xl">
        <div className="flex-1">
          <p className="text-kiosk-body font-semibold text-gold">
            Sign out {vol.first_name} {vol.last_name}?
          </p>
        </div>
        <button
          onClick={() => onSignOut(vol)}
          disabled={disabled}
          className="px-6 py-3 rounded-xl bg-gold text-navy font-bold text-sm
                     active:scale-95 transition-all disabled:opacity-50"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-6 py-3 rounded-xl bg-white/10 font-bold text-sm
                     active:scale-95 transition-all"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="w-full flex items-center justify-between px-5 py-4
                 bg-white/5 border border-white/10 rounded-xl
                 active:scale-[0.98] active:bg-gold/10 active:border-gold/30
                 hover:border-white/20 transition-all disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-10 rounded-full ${vol.area_on_day === 'kitchen' ? 'bg-red-400' : 'bg-blue-400'}`} />
        <div className="text-left">
          <p className="text-kiosk-body font-semibold flex items-center gap-2">
            {vol.first_name} {vol.last_name}
            {vol.is_leader && <Crown size={16} className="text-gold" />}
          </p>
          <p className="text-sm text-white/40">
            {vol.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall'}
            {vol.is_leader && ' · Leader'}
          </p>
        </div>
      </div>
    </button>
  );
}
