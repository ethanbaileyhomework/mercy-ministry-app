import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useActiveSession, formatHoursMinutes, type Volunteer, type VolunteerAttendance } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { SearchInput } from '@/components/ui/SearchInput';
import { NameTile } from '@/components/ui/NameTile';
import { SuccessScreen } from '@/components/ui/SuccessScreen';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

interface SignedInVolunteer extends Volunteer {
  attendance_id: string;
  role_on_day: string;
  sign_in_time: string;
}

export function SignOutScreen() {
  useIdleTimeout();
  const navigate = useNavigate();
  const { session } = useActiveSession(supabase);
  const [signedIn, setSignedIn] = useState<SignedInVolunteer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVolunteer, setSelectedVolunteer] = useState<SignedInVolunteer | null>(null);
  const [hoursServed, setHoursServed] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!session) return;

    async function loadSignedIn() {
      const { data, error } = await supabase
        .from('volunteer_attendance')
        .select('id, volunteer_id, role_on_day, sign_in_time, volunteers(first_name, last_name, area, email, phone)')
        .eq('session_id', session!.id)
        .is('sign_out_time', null);

      if (error) {
        console.error('Failed to load attendance:', error);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((a: Record<string, unknown>) => {
        const vol = a.volunteers as Record<string, unknown>;
        return {
          id: a.volunteer_id as string,
          attendance_id: a.id as string,
          first_name: vol.first_name as string,
          last_name: vol.last_name as string,
          role_on_day: a.role_on_day as string,
          sign_in_time: a.sign_in_time as string,
          area: vol.area as string,
          email: vol.email as string | null,
          phone: vol.phone as string | null,
          pin: '',
          is_leader: false,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          is_active: true,
          wwcc_number: null,
          wwcc_expiry: null,
          notes: null,
          created_at: '',
        } satisfies SignedInVolunteer;
      });

      setSignedIn(mapped);
      setLoading(false);
    }

    loadSignedIn();
  }, [session]);

  const filtered = searchQuery.trim()
    ? signedIn.filter(
        (v) =>
          v.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.last_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : signedIn;

  const handleSelect = useCallback((vol: SignedInVolunteer) => {
    setSelectedVolunteer(vol);
    const now = new Date();
    const signIn = new Date(vol.sign_in_time);
    const hours = (now.getTime() - signIn.getTime()) / (1000 * 60 * 60);
    setHoursServed(formatHoursMinutes(Math.round(hours * 100) / 100));
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    if (!selectedVolunteer) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('volunteer_attendance')
        .update({ sign_out_time: new Date().toISOString() })
        .eq('id', selectedVolunteer.attendance_id);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('Sign-out failed:', err);
      alert('Sign-out failed. Please try again or ask the coordinator.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedVolunteer]);

  if (success && selectedVolunteer) {
    return (
      <SuccessScreen
        title={`Thanks, ${selectedVolunteer.first_name}!`}
        subtitle={`You served ${hoursServed} tonight. See you next week!`}
      />
    );
  }

  return (
    <div className="flex flex-col h-full px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => selectedVolunteer ? setSelectedVolunteer(null) : navigate('/')}
          className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-kiosk-2xl font-bold">Sign Out</h1>
      </div>

      {!selectedVolunteer ? (
        <>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Type your name..."
          />

          <div className="flex-1 overflow-y-auto mt-6 space-y-3 pb-4">
            {loading ? (
              <p className="text-center text-white/50 text-kiosk-body py-12">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/50 text-kiosk-body py-12">
                {searchQuery ? 'No matching volunteers currently signed in.' : 'No volunteers currently signed in.'}
              </p>
            ) : (
              filtered.map((v) => (
                <NameTile
                  key={v.attendance_id}
                  firstName={v.first_name}
                  lastName={v.last_name}
                  subtitle={`Signed in as ${v.role_on_day}`}
                  onClick={() => handleSelect(v)}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-kiosk-xl mb-2">
            Signing out <span className="font-bold text-gold">{selectedVolunteer.first_name} {selectedVolunteer.last_name}</span>
          </p>
          <p className="text-kiosk-lg text-white/60 mb-8">
            You served {hoursServed} today
          </p>

          <div className="w-full max-w-md space-y-4">
            <button
              onClick={handleConfirmSignOut}
              disabled={submitting}
              className="kiosk-button-primary w-full disabled:opacity-50"
            >
              {submitting ? 'Signing out...' : 'Confirm Sign Out'}
            </button>
            <button
              onClick={() => setSelectedVolunteer(null)}
              className="kiosk-button-outline w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
