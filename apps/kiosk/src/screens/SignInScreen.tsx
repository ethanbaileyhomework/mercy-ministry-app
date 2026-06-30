import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useActiveSession, type Volunteer } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { SearchInput } from '@/components/ui/SearchInput';
import { NameTile } from '@/components/ui/NameTile';
import { SuccessScreen } from '@/components/ui/SuccessScreen';
import { useVolunteerSearch } from '@/hooks/useVolunteerSearch';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

const AREAS = [
  { value: 'hall', label: 'Hall' },
  { value: 'kitchen', label: 'Kitchen' },
] as const;

type Step = 'search' | 'area' | 'success';

export function SignInScreen() {
  useIdleTimeout();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useActiveSession(supabase);
  const { filtered, searchQuery, setSearchQuery, loading } = useVolunteerSearch();
  const [step, setStep] = useState<Step>('search');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('hall');
  const [isLeader, setIsLeader] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectVolunteer = useCallback((volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setSelectedArea(volunteer.area);
    setIsLeader(volunteer.is_leader);
    setStep('area');
  }, []);

  const handleConfirmSignIn = useCallback(async () => {
    if (!selectedVolunteer || !session) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('volunteer_attendance').insert({
        session_id: session.id,
        volunteer_id: selectedVolunteer.id,
        area_on_day: selectedArea,
        is_leader_on_day: isLeader,
        sign_in_time: new Date().toISOString(),
      });

      if (error) throw error;
      setStep('success');
    } catch (err) {
      console.error('Sign-in failed:', err);
      alert('Sign-in failed. Please try again or ask the coordinator for help.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedVolunteer, selectedArea, isLeader, session]);

  if (step === 'success' && selectedVolunteer) {
    return (
      <SuccessScreen
        title={`Welcome, ${selectedVolunteer.first_name}!`}
        subtitle={`You are signed in for ${selectedArea}. Thank you for serving tonight.`}
      />
    );
  }

  if (!sessionLoading && !session) {
    return (
      <div className="flex flex-col h-full px-8 py-8 items-center justify-center text-center">
        <p className="text-kiosk-xl text-white mb-4">No active session today</p>
        <p className="text-kiosk-body text-white/60 mb-8">Ask the coordinator to start a session in the admin app.</p>
        <button onClick={() => navigate('/')} className="kiosk-button-outline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => step === 'area' ? setStep('search') : navigate('/')}
          className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-kiosk-2xl font-bold">
          {step === 'search' ? 'Sign In' : 'Confirm Your Area'}
        </h1>
      </div>

      {step === 'search' && (
        <>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Type your name..."
          />

          <div className="flex-1 overflow-y-auto mt-6 space-y-3 pb-4">
            {loading ? (
              <p className="text-center text-white/50 text-kiosk-body py-12">Loading volunteers...</p>
            ) : searchQuery && filtered.length === 0 ? (
              <p className="text-center text-white/50 text-kiosk-body py-12">
                No volunteers found. Are you new? Go back and tap "Register Here".
              </p>
            ) : (
              filtered.map((v) => (
                <NameTile
                  key={v.id}
                  firstName={v.first_name}
                  lastName={v.last_name}
                  subtitle={`Area: ${v.area.charAt(0).toUpperCase() + v.area.slice(1)}`}
                  onClick={() => handleSelectVolunteer(v)}
                />
              ))
            )}
          </div>
        </>
      )}

      {step === 'area' && selectedVolunteer && (
        <>
          <p className="text-kiosk-lg text-white/70 mb-6">
            Hi {selectedVolunteer.first_name}! Where are you serving tonight?
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {AREAS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setSelectedArea(a.value)}
                className={`rounded-2xl py-8 text-kiosk-xl font-semibold transition-colors ${
                  selectedArea === a.value
                    ? 'bg-gold text-navy'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleConfirmSignIn}
            disabled={submitting}
            className="kiosk-button-primary w-full mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in...' : `Confirm — Sign In for ${selectedArea.charAt(0).toUpperCase() + selectedArea.slice(1)}`}
          </button>
        </>
      )}
    </div>
  );
}
