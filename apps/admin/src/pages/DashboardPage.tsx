import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, AlertTriangle, Power, Clock, Minus, Plus, Crown, LogOut, Sparkles } from 'lucide-react';
import { useActiveSession, formatTimeAEST, getCurrentDateAEST, getCurrentDayLabelAEST, useSessionUpdates, type Session, type VolunteerAttendance } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SessionReport } from '@/components/SessionReport';

type AttendanceWithVolunteer = VolunteerAttendance & {
  volunteers: { first_name: string; last_name: string };
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { session, setSession } = useActiveSession(supabase);
  const [attendance, setAttendance] = useState<AttendanceWithVolunteer[]>([]);
  const [whatWasServed, setWhatWasServed] = useState('');
  const [notes, setNotes] = useState('');

  // Load the most recent completed session so Re-generate is always accessible
  // even after a page refresh (when useActiveSession returns null).
  const [lastCompleted, setLastCompleted] = useState<Session | null>(null);
  useEffect(() => {
    if (session) return; // active session takes priority
    supabase
      .from('sessions')
      .select('*')
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(1)
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        setLastCompleted(data as Session);
        // Self-healing: if the last completed session has no report, auto-generate it (once only)
        if (hasCheckedReport.current) return;
        hasCheckedReport.current = true;
        const { data: report } = await supabase
          .from('session_reports')
          .select('id')
          .eq('session_id', data.id)
          .maybeSingle();
        if (!report) {
          generateReport(data.id);
        }
      });
  }, [session]);

  const { updateCounter, saveTextField } = useSessionUpdates(session, setSession, supabase);

  const loadAttendance = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('volunteer_attendance')
      .select('*, volunteers(first_name, last_name)')
      .eq('session_id', session.id)
      .is('sign_out_time', null);
    if (data) setAttendance(data as AttendanceWithVolunteer[]);
  }, [session]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // FIX #4 — auto-refresh attendance every 15s so kiosk sign-ins appear
  useEffect(() => {
    const id = setInterval(loadAttendance, 15_000);
    return () => clearInterval(id);
  }, [loadAttendance]);

  useEffect(() => {
    if (session) {
      setWhatWasServed(session.what_was_served || '');
      setNotes(session.coordinator_notes || '');
    }
  }, [session]);

  const handleStartSession = async () => {
    if (!session) {
      const today = getCurrentDateAEST();
      const { data, error } = await supabase
        .from('sessions')
        .insert({ session_date: today, status: 'active', started_at: new Date().toISOString() })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      setSession(data as Session);
      toast.success('Session started');
    } else {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', session.id);
      if (error) { toast.error(error.message); return; }
      setSession({ ...session, status: 'active', started_at: new Date().toISOString() });
      toast.success('Session started');
    }
  };

  // FIX #5 — warn about open sign-ins + FIX #6 — bulk sign-out on session end
  const handleEndSession = async () => {
    if (!session) return;

    const { data: openAttendance } = await supabase
      .from('volunteer_attendance')
      .select('id, sign_in_time, volunteers(first_name, last_name)')
      .eq('session_id', session.id)
      .is('sign_out_time', null);

    const openCount = openAttendance?.length || 0;
    const message = openCount > 0
      ? `${openCount} volunteer${openCount !== 1 ? 's' : ''} are still signed in and will be signed out automatically. End this session?`
      : 'End this session? You can still view it in History.';

    if (!confirm(message)) return;

    if (openCount > 0 && openAttendance) {
      const signOutTime = new Date().toISOString();
      const results = await Promise.allSettled(
        openAttendance.map((a) => {
          const hours = Math.round(
            ((new Date(signOutTime).getTime() - new Date(a.sign_in_time).getTime()) / 3_600_000) * 10
          ) / 10;
          return supabase
            .from('volunteer_attendance')
            .update({ sign_out_time: signOutTime, hours_served: hours })
            .eq('id', a.id)
            .then((res) => {
              if (res.error) throw res.error;
              return res;
            });
        })
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      const succeeded = openCount - failed;
      if (succeeded > 0) {
        toast.success(`Signed out ${succeeded} volunteer${succeeded !== 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.error(`${failed} volunteer sign-out${failed !== 1 ? 's' : ''} failed — please review the History page.`);
      }
    }

    const endedAt = new Date().toISOString();
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: endedAt })
      .eq('id', session.id);
    if (error) { toast.error(error.message); return; }
    setSession({ ...session, status: 'completed', ended_at: endedAt });
    toast.success('Session ended — generating report…');

    // Auto-generate AI report immediately after session ends
    generateReport(session.id);
  };

  // FIX #1 — sign out individual volunteer from admin
  const handleSignOut = async (a: AttendanceWithVolunteer) => {
    const signOutTime = new Date().toISOString();
    const hours = Math.round(
      ((new Date(signOutTime).getTime() - new Date(a.sign_in_time).getTime()) / 3_600_000) * 10
    ) / 10;
    const { error } = await supabase
      .from('volunteer_attendance')
      .update({ sign_out_time: signOutTime, hours_served: hours })
      .eq('id', a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Signed out ${a.volunteers.first_name}`);
    loadAttendance();
  };

  // FIX #2 — direct counter set (tap to type a specific number)
  const setCounter = async (field: 'people_served' | 'meals_served' | 'grocery_packs_given', value: number) => {
    if (!session) return;
    const clamped = Math.max(0, Math.min(9999, value));
    const { error } = await supabase.from('sessions').update({ [field]: clamped }).eq('id', session.id);
    if (!error) setSession({ ...session, [field]: clamped });
    else toast.error('Failed to update counter');
  };

  // FIX #10 — toast feedback on text field save
  const handleSaveTextField = async (field: 'what_was_served' | 'coordinator_notes', value: string) => {
    try {
      await saveTextField(field, value);
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!session?.started_at || session.status !== 'active') return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(session.started_at!).getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [session?.started_at, session?.status]);

  const kitchenVolunteers = attendance.filter((a) => a.area_on_day === 'kitchen');
  const hallVolunteers = attendance.filter((a) => a.area_on_day === 'hall');

  const [reportData, setReportData] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const generatingRef = useRef(false);
  const hasCheckedReport = useRef(false);

  const generateReport = async (sessionId: string) => {
    if (generatingRef.current) return; // prevent parallel calls
    generatingRef.current = true;
    const MAX_ATTEMPTS = 3;
    setGeneratingReport(true);
    toast.info('Generating AI report…');

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const invokePromise = supabase.functions.invoke('generate-session-report', {
          body: { session_id: sessionId },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Report generation timed out after 30s')), 30_000)
        );
        const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
        if (error) throw error;
        setReportData(data);
        toast.success('Report generated');
        setGeneratingReport(false);
        generatingRef.current = false;
        return;
      } catch (err: any) {
        if (attempt < MAX_ATTEMPTS) {
          const delay = attempt * 3000;
          toast.info(`Report attempt ${attempt} failed — retrying in ${delay / 1000}s…`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        let msg = err.message || 'Failed to generate report';
        try {
          if (err.context) {
            const body = await (err.context as Response).json();
            const detail = body?.detail || body?.error;
            if (detail) msg = `Report error: ${detail}`;
          }
        } catch { /* ignore parse errors */ }
        toast.error(msg, { duration: 8000 });
      }
    }
    setGeneratingReport(false);
    generatingRef.current = false;
  };

  // Whichever session to display on the completed/idle screen
  const displaySession = session?.status === 'completed' ? session : lastCompleted;

  if (!session || session.status === 'completed') {
    return (
      <div className="space-y-6">
        {reportData && <SessionReport data={reportData} onClose={() => setReportData(null)} />}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">{getCurrentDayLabelAEST()}</p>
        </div>
        <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
          <Power size={48} className="text-gray-300 dark:text-gray-600" />
          <h2 className="text-xl font-semibold">
            {session?.status === 'completed' ? 'Session Completed' : 'No Active Session'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {session?.status === 'completed'
              ? 'This session has ended. View details in History.'
              : 'Start a session to begin tracking.'}
          </p>

          {/* Show final stats from the last completed session */}
          {displaySession && (
            <>
              {!session && (
                <p className="text-xs text-gray-400 -mb-2">
                  Last session: {new Date(displaySession.session_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              )}
              <div className="grid grid-cols-3 gap-6 mt-2 text-center">
                <div>
                  <p className="text-3xl font-bold text-navy dark:text-blue-400">{displaySession.people_served ?? 0}</p>
                  <p className="text-sm text-gray-500 mt-1">People Served</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gold">{displaySession.meals_served ?? 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Meals Served</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{displaySession.grocery_packs_given ?? 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Grocery Packs</p>
                </div>
              </div>
              {displaySession.what_was_served && (
                <p className="text-sm text-gray-500 max-w-md">
                  <span className="font-medium">Served:</span> {displaySession.what_was_served}
                </p>
              )}
              <button
                onClick={() => generateReport(displaySession.id)}
                disabled={generatingReport}
                className="btn-secondary flex items-center gap-2 mt-2 disabled:opacity-60 text-sm"
              >
                <Sparkles size={15} />
                {generatingReport ? 'Generating…' : 'Generate Report'}
              </button>
            </>
          )}

          {!session && (
            <button onClick={handleStartSession} className="btn-gold text-lg px-8 py-3 mt-2">
              <Power size={20} /> Start Session
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">{getCurrentDayLabelAEST()}</p>
        </div>
        <div className="flex items-center gap-3">
          {session.status === 'active' && elapsed && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock size={14} /> {elapsed}
            </span>
          )}
          {session.status === 'draft' && (
            <button onClick={handleStartSession} className="btn-gold">
              <Power size={18} /> Start Session
            </button>
          )}
          {session.status === 'active' && (
            <button onClick={handleEndSession} className="btn-danger">
              <Power size={18} /> End Session
            </button>
          )}
        </div>
      </div>

      {/* FIX #2 — CounterCards with tap-to-type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CounterCard
          label="People Served"
          value={session.people_served}
          onIncrement={() => updateCounter('people_served', 1)}
          onDecrement={() => updateCounter('people_served', -1)}
          onSet={(v) => setCounter('people_served', v)}
          color="text-navy dark:text-blue-400"
        />
        <CounterCard
          label="Meals Served"
          value={session.meals_served}
          onIncrement={() => updateCounter('meals_served', 1)}
          onDecrement={() => updateCounter('meals_served', -1)}
          onSet={(v) => setCounter('meals_served', v)}
          color="text-gold"
        />
        <CounterCard
          label="Grocery Packs"
          value={session.grocery_packs_given}
          onIncrement={() => updateCounter('grocery_packs_given', 1)}
          onDecrement={() => updateCounter('grocery_packs_given', -1)}
          onSet={(v) => setCounter('grocery_packs_given', v)}
          color="text-green-600 dark:text-green-400"
        />
      </div>

      {/* FIX #1 — Volunteer columns with sign-out buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VolunteerColumn title="Kitchen" volunteers={kitchenVolunteers} onSignOut={handleSignOut} />
        <VolunteerColumn title="Hall" volunteers={hallVolunteers} onSignOut={handleSignOut} />
      </div>

      {/* FIX #10 — Text fields with save toast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <label className="label mb-1">What was served today?</label>
          <textarea
            value={whatWasServed}
            onChange={(e) => setWhatWasServed(e.target.value)}
            onBlur={() => handleSaveTextField('what_was_served', whatWasServed)}
            className="input min-h-[80px]"
            placeholder="e.g. Beef stew with rice, bread rolls, fruit salad..."
          />
        </div>
        <div className="card p-5">
          <label className="label mb-1">Coordinator Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleSaveTextField('coordinator_notes', notes)}
            className="input min-h-[80px]"
            placeholder="Any notes for this session..."
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate('/food-safety')} className="btn-secondary">
          <Thermometer size={18} /> Log Temperature
        </button>
        <button onClick={() => navigate('/incidents')} className="btn-secondary">
          <AlertTriangle size={18} /> Log Incident
        </button>
      </div>
    </div>
  );
}

// FIX #2 — CounterCard with tap-to-type + FIX #11 — no negatives
function CounterCard({
  label, value, onIncrement, onDecrement, onSet, color,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onSet: (val: number) => void;
  color: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const startEdit = () => { setEditVal(String(value ?? 0)); setEditing(true); };
  const commitEdit = () => {
    const n = parseInt(editVal, 10);
    if (!isNaN(n) && n >= 0) onSet(n);
    setEditing(false);
  };

  return (
    <div className="card p-5">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => { if ((value ?? 0) > 0) onDecrement(); }}
          disabled={(value ?? 0) <= 0}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800
                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg font-bold
                     active:scale-95 disabled:opacity-30"
        >
          <Minus size={20} />
        </button>

        {editing ? (
          <input
            type="number"
            min="0"
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
            className="w-24 text-center text-4xl font-bold tabular-nums bg-gray-100 dark:bg-gray-800
                       border border-gold rounded-xl py-1 focus:outline-none"
          />
        ) : (
          <span
            onClick={startEdit}
            title="Click to type a specific number"
            className={`text-4xl font-bold tabular-nums cursor-pointer hover:opacity-70 transition-opacity ${color}`}
          >
            {value ?? 0}
          </span>
        )}

        <button
          onClick={onIncrement}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-navy dark:bg-blue-900
                     hover:bg-navy/80 dark:hover:bg-blue-800 text-white transition-colors text-lg font-bold
                     active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">Click number to type</p>
    </div>
  );
}

// FIX #1 — VolunteerColumn with sign-out button per volunteer
function VolunteerColumn({
  title, volunteers, onSignOut,
}: {
  title: string;
  volunteers: AttendanceWithVolunteer[];
  onSignOut: (a: AttendanceWithVolunteer) => void;
}) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {title} ({volunteers.length})
      </h3>
      {volunteers.length === 0 ? (
        <p className="text-sm text-gray-400">No volunteers signed in</p>
      ) : (
        <div className="space-y-2">
          {volunteers.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {v.volunteers.first_name} {v.volunteers.last_name}
                </span>
                {v.is_leader_on_day && <Crown size={14} className="text-gold" />}
                <span className="text-xs text-gray-400">{formatTimeAEST(v.sign_in_time)}</span>
              </div>
              <button
                onClick={() => onSignOut(v)}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400
                           px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Sign out this volunteer"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
