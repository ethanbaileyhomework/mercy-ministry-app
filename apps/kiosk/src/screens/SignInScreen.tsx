import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Crown } from 'lucide-react';
import { useActiveSession, getCurrentDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { SuccessScreen } from '@/components/ui/SuccessScreen';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarning } from '@/components/ui/IdleWarning';

type Step = 'search' | 'confirm' | 'area' | 'success';

interface VolunteerInfo {
  id: string;
  first_name: string;
  last_name: string;
  is_leader: boolean;
  area: 'kitchen' | 'hall';
}

export function SignInScreen() {
  const { warningVisible, countdown, dismiss } = useIdleTimeout();
  const navigate = useNavigate();
  const { session, setSession } = useActiveSession(supabase);
  const [step, setStep] = useState<Step>('search');
  const [volunteer, setVolunteer] = useState<VolunteerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [allVolunteers, setAllVolunteers] = useState<VolunteerInfo[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);
  const [signedInCount, setSignedInCount] = useState(0);

  // Load all active volunteers on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('volunteers')
        .select('id, first_name, last_name, is_leader, area')
        .eq('is_active', true)
        .order('first_name');
      if (data) setAllVolunteers(data as VolunteerInfo[]);
      setLoadingVols(false);
    }
    load();
  }, []);

  // Live signed-in count — poll every 15s so coordinator can spot forgotten sign-outs
  useEffect(() => {
    async function fetchCount() {
      const today = getCurrentDateAEST();
      const { data: todaySession } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_date', today)
        .limit(1)
        .single();
      if (!todaySession) return;
      const { count } = await supabase
        .from('volunteer_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', todaySession.id)
        .is('sign_out_time', null);
      setSignedInCount(count ?? 0);
    }
    fetchCount();
    const id = setInterval(fetchCount, 15_000);
    return () => clearInterval(id);
  }, []);

  // Only show volunteers when typing
  const filtered = searchText.trim()
    ? allVolunteers.filter((v) =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  const ensureSession = useCallback(async () => {
    if (session && session.status !== 'completed') return session;

    const today = getCurrentDateAEST();

    // Step 1: Check for any currently active session.
    // The uniq_one_active_session constraint means there's at most one.
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (activeSession) {
      setSession(activeSession);
      return activeSession;
    }

    // Step 2: Check for today's session (might be draft or completed — reactivate it).
    const { data: todaySession } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_date', today)
      .limit(1)
      .single();

    if (todaySession) {
      if (todaySession.status !== 'active') {
        await supabase
          .from('sessions')
          .update({ status: 'active', ended_at: null })
          .eq('id', todaySession.id);
        todaySession.status = 'active';
        todaySession.ended_at = null;
      }
      setSession(todaySession);
      return todaySession;
    }

    // Step 3: No active or today session — create a fresh one.
    const { data, error } = await supabase
      .from('sessions')
      .insert({ session_date: today, status: 'active', started_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    setSession(data);
    return data;
  }, [session, setSession]);

  const handleSelectVolunteer = useCallback(async (vol: VolunteerInfo) => {
    setError(null);
    setSubmitting(true);

    try {
      // Ensure session exists (leader auto-creates)
      const currentSession = await ensureSession();
      if (!currentSession) {
        setError('Could not start session. Please try again.');
        setSubmitting(false);
        return;
      }

      // Check if already signed in
      const { data: existing } = await supabase
        .from('volunteer_attendance')
        .select('id')
        .eq('session_id', currentSession.id)
        .eq('volunteer_id', vol.id)
        .is('sign_out_time', null)
        .limit(1);

      if (existing && existing.length > 0) {
        setError(`${vol.first_name}, you're already signed in!`);
        setSubmitting(false);
        return;
      }

      setVolunteer(vol);
      setStep('confirm');
    } catch (err) {
      console.error('Volunteer lookup failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [ensureSession]);

  const handleAreaSelect = useCallback(async (area: 'kitchen' | 'hall') => {
    if (!volunteer) return;
    setSubmitting(true);

    try {
      const currentSession = session || (await ensureSession());
      if (!currentSession) throw new Error('No session');

      const { error: insertError } = await supabase.from('volunteer_attendance').insert({
        session_id: currentSession.id,
        volunteer_id: volunteer.id,
        area_on_day: area,
        is_leader_on_day: volunteer.is_leader,
        sign_in_time: new Date().toISOString(),
      });

      if (insertError) {
        // 23505 = unique_violation: volunteer already has a row this session (signed out and back)
        // Re-open their attendance record instead of failing
        if (insertError.code === '23505') {
          const { error: updateError } = await supabase
            .from('volunteer_attendance')
            .update({
              sign_in_time: new Date().toISOString(),
              sign_out_time: null,
              area_on_day: area,
            })
            .eq('session_id', currentSession.id)
            .eq('volunteer_id', volunteer.id);
          if (updateError) throw updateError;
        } else {
          throw insertError;
        }
      }

      // Leaders go straight to their area's service sheet
      if (volunteer.is_leader) {
        navigate(`/service-sheet/${area}`, { replace: true });
        return;
      }
      setStep('success');
    } catch (err) {
      console.error('Sign-in failed:', err);
      setError('Sign-in failed. Please try again.');
      setStep('search');
    } finally {
      setSubmitting(false);
    }
  }, [volunteer, session, ensureSession, navigate]);

  if (step === 'success' && volunteer) {
    return (
      <SuccessScreen
        title={`Welcome, ${volunteer.first_name}!`}
        subtitle="Thank you for serving tonight."
      />
    );
  }

  return (
    <div className="flex flex-col h-full px-8 py-6">
      {warningVisible && <IdleWarning countdown={countdown} onDismiss={dismiss} />}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => (step === 'area' || step === 'confirm') ? (setStep('search'), setError(null)) : navigate('/')}
          className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-kiosk-2xl font-bold flex-1">Sign In</h1>
        {signedInCount > 0 && (
          <div className="px-4 py-2 rounded-full bg-white/10 text-sm font-medium">
            <span className="text-gold font-bold">{signedInCount}</span>
            <span className="text-white/50"> signed in</span>
          </div>
        )}
      </div>

      {step === 'search' && (
        <div className="flex-1 flex flex-col">
          {/* Search box */}
          <div className="relative mb-4">
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              autoFocus
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setError(null); }}
              placeholder="Type your name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4
                         text-kiosk-body text-white placeholder-white/30
                         focus:outline-none focus:border-gold/50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-kiosk-body mb-3 text-center font-medium">{error}</p>
          )}

          {/* Volunteer list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingVols ? (
              <p className="text-center text-white/30 py-8">Loading volunteers...</p>
            ) : !searchText.trim() ? (
              <p className="text-center text-white/30 py-8">
                Start typing your name to sign in
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/30 py-8">
                No volunteers match that name
              </p>
            ) : (
              filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVolunteer(v)}
                  disabled={submitting}                  aria-label={`Select ${v.first_name} ${v.last_name} for ${v.area} area`}                  className="w-full flex items-center justify-between px-5 py-4
                             bg-white/5 border border-white/10 rounded-xl
                             active:scale-[0.98] active:bg-gold/10 active:border-gold/30
                             hover:border-white/20 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full ${v.area === 'kitchen' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <div className="text-left">
                      <p className="text-kiosk-body font-semibold flex items-center gap-2">
                        {v.first_name} {v.last_name}
                        {v.is_leader && <Crown size={16} className="text-gold" />}
                      </p>
                      <p className="text-sm text-white/40">
                        {v.area === 'kitchen' ? 'Kitchen' : 'Hall'}
                        {v.is_leader && ' · Leader'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {step === 'confirm' && volunteer && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-kiosk-lg text-white/50 mb-4">Is this you?</p>
          <p className="text-kiosk-2xl font-bold text-gold mb-2">
            {volunteer.first_name} {volunteer.last_name}
          </p>
          <p className="text-kiosk-body text-white/50 mb-10">
            {volunteer.area === 'kitchen' ? 'Kitchen' : 'Hall'}
            {volunteer.is_leader && ' �� Leader'}
          </p>
          <div className="w-full max-w-lg grid grid-cols-2 gap-6">
            <button
              onClick={() => setStep('area')}
              className="h-[100px] rounded-2xl bg-gold text-navy text-kiosk-xl font-bold
                         active:scale-95 transition-all duration-150 select-none"
            >
              {"That's me!"}
            </button>
            <button
              onClick={() => { setStep('search'); setVolunteer(null); }}
              className="h-[100px] rounded-2xl bg-white/10 border-2 border-white/15 text-kiosk-xl font-bold
                         active:scale-95 transition-all duration-150 select-none"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {step === 'area' && volunteer && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-kiosk-xl mb-2">
            Hi <span className="font-bold text-gold">{volunteer.first_name}</span>!
          </p>
          <p className="text-kiosk-lg text-white/70 mb-10">Where are you serving tonight?</p>

          <div className="w-full max-w-lg grid grid-cols-2 gap-6">
            <button
              onClick={() => handleAreaSelect('kitchen')}
              disabled={submitting}
              className="h-[160px] rounded-2xl bg-white/10 border-2 border-white/15
                         text-kiosk-xl font-bold
                         active:scale-95 active:bg-gold/20 active:border-gold
                         hover:border-white/30 transition-all duration-150
                         disabled:opacity-50 select-none
                         flex flex-col items-center justify-center gap-3"
            >
              <span className="text-4xl">🍳</span>
              Kitchen
            </button>

            <button
              onClick={() => handleAreaSelect('hall')}
              disabled={submitting}
              className="h-[160px] rounded-2xl bg-white/10 border-2 border-white/15
                         text-kiosk-xl font-bold
                         active:scale-95 active:bg-gold/20 active:border-gold
                         hover:border-white/30 transition-all duration-150
                         disabled:opacity-50 select-none
                         flex flex-col items-center justify-center gap-3"
            >
              <span className="text-4xl">🏠</span>
              Hall
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
