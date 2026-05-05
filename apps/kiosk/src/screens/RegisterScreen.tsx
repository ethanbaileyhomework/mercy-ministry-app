import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { useActiveSession } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { SuccessScreen } from '@/components/ui/SuccessScreen';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

type Step = 1 | 2 | 3 | 'success';

const AREAS = [
  { value: 'hall', label: 'Hall' },
  { value: 'kitchen', label: 'Kitchen' },
] as const;
type Area = (typeof AREAS)[number]['value'];

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  area: Area;
  pin: string;
  wwcc_number: string;
  wwcc_expiry: string;
}

const INITIAL_FORM: FormData = {
  first_name: '',
  last_name: '',
  phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  area: 'hall',
  pin: '',
  wwcc_number: '',
  wwcc_expiry: '',
};

export function RegisterScreen() {
  useIdleTimeout();
  const navigate = useNavigate();
  const { session } = useActiveSession(supabase);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [newVolName, setNewVolName] = useState('');

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generatePin = useCallback(() => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setForm((prev) => ({ ...prev, pin }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const { data: volunteer, error: volError } = await supabase
        .from('volunteers')
        .insert({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          emergency_contact_name: form.emergency_contact_name.trim() || null,
          emergency_contact_phone: form.emergency_contact_phone.trim() || null,
          area: form.area,
          pin: form.pin,
          wwcc_number: form.wwcc_number.trim() || null,
          wwcc_expiry: form.wwcc_expiry || null,
        })
        .select()
        .single();

      if (volError) throw volError;

      if (session && volunteer) {
        await supabase.from('volunteer_attendance').insert({
          session_id: session.id,
          volunteer_id: volunteer.id,
          role_on_day: form.area === 'kitchen' ? 'Kitchen' : 'Hosting',
          sign_in_time: new Date().toISOString(),
        });
      }

      setNewVolName(form.first_name);
      setStep('success');
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed. Please try again or ask the coordinator.');
    } finally {
      setSubmitting(false);
    }
  }, [form, session]);

  if (step === 'success') {
    return (
      <SuccessScreen
        title={`Welcome to the team, ${newVolName}!`}
        subtitle="You've been registered and signed in. Thank you for volunteering!"
      />
    );
  }

  const canProceed1 = form.first_name.trim() && form.last_name.trim();
  const canProceed3 = /^\d{4}$/.test(form.pin);

  return (
    <div className="flex flex-col h-full px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            if (step === 1) navigate('/');
            else setStep((step - 1) as Step);
          }}
          className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
        <div>
          <h1 className="text-kiosk-2xl font-bold">New Volunteer</h1>
          <p className="text-kiosk-body text-white/60">Step {step} of 3</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= (step as number) ? 'bg-gold' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-kiosk-body text-white/70 mb-2">First Name *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                autoFocus
                autoComplete="off"
                className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5
                           text-kiosk-xl text-white placeholder-white/40
                           focus:outline-none focus:border-gold/60"
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label className="block text-kiosk-body text-white/70 mb-2">Last Name *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                autoComplete="off"
                className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5
                           text-kiosk-xl text-white placeholder-white/40
                           focus:outline-none focus:border-gold/60"
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <label className="block text-kiosk-body text-white/70 mb-2">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                autoComplete="off"
                className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5
                           text-kiosk-xl text-white placeholder-white/40
                           focus:outline-none focus:border-gold/60"
                placeholder="0400 000 000"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-kiosk-body text-white/70">
              In case of emergency, who should we contact?
            </p>
            <div>
              <label className="block text-kiosk-body text-white/70 mb-2">Contact Name</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                autoFocus
                autoComplete="off"
                className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5
                           text-kiosk-xl text-white placeholder-white/40
                           focus:outline-none focus:border-gold/60"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-kiosk-body text-white/70 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                autoComplete="off"
                className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5
                           text-kiosk-xl text-white placeholder-white/40
                           focus:outline-none focus:border-gold/60"
                placeholder="0400 000 000"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            {/* Area selection */}
            <div>
              <p className="text-kiosk-body text-white/70 mb-4">Where will you mainly be serving?</p>
              <div className="grid grid-cols-2 gap-4">
                {AREAS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => updateField('area', a.value)}
                    className={`rounded-2xl py-6 text-kiosk-lg font-semibold transition-colors ${
                      form.area === a.value
                        ? 'bg-gold text-navy'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PIN creation */}
            <div>
              <p className="text-kiosk-body text-white/70 mb-4">
                Choose a 4-digit PIN — you'll use this to sign in and out.
              </p>
              <div className="flex gap-4 items-center">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin}
                  onChange={(e) => updateField('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoComplete="off"
                  className="w-36 bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5
                             text-kiosk-xl text-white text-center font-mono tracking-[0.5em]
                             placeholder-white/30 focus:outline-none focus:border-gold/60"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={generatePin}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white
                             rounded-2xl px-5 py-4 text-kiosk-body transition-colors"
                >
                  <RefreshCw size={20} /> Generate one for me
                </button>
              </div>
              {form.pin && form.pin.length === 4 && (
                <p className="mt-3 text-kiosk-body text-gold/80">
                  Your PIN is <span className="font-mono font-bold tracking-widest">{form.pin}</span> — remember it!
                </p>
              )}
            </div>

            {/* WWCC (optional) */}
            <div className="pt-2 border-t border-white/10">
              <p className="text-kiosk-body text-white/50 mb-4">
                Working With Children Check (if applicable)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">WWCC Number</label>
                  <input
                    type="text"
                    value={form.wwcc_number}
                    onChange={(e) => updateField('wwcc_number', e.target.value)}
                    autoComplete="off"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3
                               text-kiosk-body text-white placeholder-white/30
                               focus:outline-none focus:border-gold/60"
                    placeholder="WWC1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.wwcc_expiry}
                    onChange={(e) => updateField('wwcc_expiry', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3
                               text-kiosk-body text-white
                               focus:outline-none focus:border-gold/60"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation button */}
      <div className="pt-6">
        {step < 3 ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={step === 1 && !canProceed1}
            className="kiosk-button-primary w-full flex items-center justify-center gap-3
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ArrowRight size={28} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canProceed3}
            className="kiosk-button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        )}
      </div>
    </div>
  );
}
