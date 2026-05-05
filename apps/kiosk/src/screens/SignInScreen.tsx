import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VOLUNTEER_ROLES, useActiveSession, type Volunteer, type VolunteerRole } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { SearchInput } from '@/components/ui/SearchInput';
import { NameTile } from '@/components/ui/NameTile';
import { RoleChip } from '@/components/ui/RoleChip';
import { SuccessScreen } from '@/components/ui/SuccessScreen';
import { useVolunteerSearch } from '@/hooks/useVolunteerSearch';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

type Step = 'search' | 'role' | 'success';

export function SignInScreen() {
  useIdleTimeout();
  const navigate = useNavigate();
  const { session } = useActiveSession(supabase);
  const { filtered, searchQuery, setSearchQuery, loading } = useVolunteerSearch();
  const [step, setStep] = useState<Step>('search');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectVolunteer = useCallback((volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    if (volunteer.area === 'kitchen') {
      setSelectedRole('Kitchen');
    }
    setStep('role');
  }, []);

  const handleConfirmSignIn = useCallback(async () => {
    if (!selectedVolunteer || !selectedRole || !session) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('volunteer_attendance').insert({
        session_id: session.id,
        volunteer_id: selectedVolunteer.id,
        role_on_day: selectedRole,
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
  }, [selectedVolunteer, selectedRole, session]);

  if (step === 'success' && selectedVolunteer) {
    return (
      <SuccessScreen
        title={`Welcome, ${selectedVolunteer.first_name}!`}
        subtitle={`You are signed in as ${selectedRole}. Thank you for serving tonight.`}
      />
    );
  }

  return (
    <div className="flex flex-col h-full px-8 py-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => step === 'role' ? setStep('search') : navigate('/')}
          className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-kiosk-2xl font-bold">
          {step === 'search' ? 'Sign In' : 'Select Your Role'}
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
                  subtitle={v.area ? `Area: ${v.area.charAt(0).toUpperCase() + v.area.slice(1)}` : undefined}
                  onClick={() => handleSelectVolunteer(v)}
                />
              ))
            )}
          </div>
        </>
      )}

      {step === 'role' && selectedVolunteer && (
        <>
          <p className="text-kiosk-lg text-white/70 mb-6">
            Hi {selectedVolunteer.first_name}! What role are you filling tonight?
          </p>

          <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pb-4">
            {VOLUNTEER_ROLES.map((role) => (
              <RoleChip
                key={role}
                role={role}
                selected={selectedRole === role}
                suggested={role === 'Kitchen' && selectedVolunteer.area === 'kitchen'}
                onClick={() => setSelectedRole(role)}
              />
            ))}
          </div>

          <button
            onClick={handleConfirmSignIn}
            disabled={!selectedRole || submitting}
            className="kiosk-button-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in...' : `Confirm — Sign In as ${selectedRole || '...'}`}
          </button>
        </>
      )}
    </div>
  );
}
