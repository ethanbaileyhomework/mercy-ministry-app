import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList, Thermometer, AlertTriangle, FileText, Home,
  Plus, Minus, CheckCircle, XCircle, LogOut, Users, Crown, Lock,
} from 'lucide-react';
import {
  useActiveSession,
  evaluateTemperature,
  formatTimeAEST,
  getCurrentDayLabelAEST,
  type Session,
  type VolunteerAttendance,
  type FoodSafetyLog,
  type Incident,
} from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { useCoordinator } from '@/context/CoordinatorContext';

type Area = 'kitchen' | 'hall';
type KitchenTab = 'service' | 'temps' | 'incidents' | 'notes';
type HallTab = 'service' | 'incidents' | 'notes';

type AttendanceWithVol = VolunteerAttendance & {
  volunteers: { first_name: string; last_name: string };
};

// ─── Main Screen ──────────────────────────────────────────
export function ServiceSheetScreen() {
  const navigate = useNavigate();
  const { area } = useParams<{ area: string }>();
  const { session, setSession, loading } = useActiveSession(supabase);
  const { lock } = useCoordinator();

  const resolvedArea: Area = area === 'hall' ? 'hall' : 'kitchen';

  const [kitchenTab, setKitchenTab] = useState<KitchenTab>('service');
  const [hallTab, setHallTab] = useState<HallTab>('service');

  // If session ended or doesn't exist (and we're done loading), go home
  useEffect(() => {
    if (!loading && (!session || session.status === 'completed')) {
      navigate('/', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-kiosk-body">Loading service sheet...</p>
      </div>
    );
  }

  if (!session || session.status === 'completed') return null;

  const handleEndSession = async () => {
    if (!confirm('End tonight\'s session? Volunteers can still sign out afterwards.')) return;
    const endedAt = new Date().toISOString();
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: endedAt })
      .eq('id', session.id);
    if (error) {
      alert('Failed to end session. Please try again.');
      return;
    }
    setSession({ ...session, status: 'completed', ended_at: endedAt });
    navigate('/', { replace: true });
  };

  const areaLabel = resolvedArea === 'kitchen' ? 'Kitchen' : 'Hall';
  const areaColour = resolvedArea === 'kitchen' ? 'text-red-300' : 'text-blue-300';

  // Kitchen has 4 tabs, Hall has 3 (no Temps)
  const kitchenTabs: { id: KitchenTab; label: string; icon: React.ReactNode }[] = [
    { id: 'service', label: 'Service', icon: <ClipboardList size={22} /> },
    { id: 'temps', label: 'Temps', icon: <Thermometer size={22} /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle size={22} /> },
    { id: 'notes', label: 'Notes', icon: <FileText size={22} /> },
  ];

  const hallTabs: { id: HallTab; label: string; icon: React.ReactNode }[] = [
    { id: 'service', label: 'Service', icon: <ClipboardList size={22} /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle size={22} /> },
    { id: 'notes', label: 'Notes', icon: <FileText size={22} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl bg-white/10 active:scale-90 active:bg-white/20 transition-all"
            title="Back to Home"
          >
            <Home size={22} />
          </button>
          <div>
            <h1 className="text-kiosk-xl font-bold">
              <span className={areaColour}>{areaLabel}</span> Service Sheet
            </h1>
            <p className="text-sm text-white/50">{getCurrentDayLabelAEST()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Active
          </div>
          {/* Lock screen without ending the session */}
          <button
            onClick={lock}
            className="p-2.5 rounded-xl bg-white/8 border border-white/10 text-white/50 text-sm
                       active:scale-90 transition-all hover:bg-white/15 hover:text-white/70"
            title="Lock screen"
          >
            <Lock size={18} />
          </button>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-bold
                       active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut size={16} /> End Session
          </button>
        </div>
      </div>

      {/* Tab Content — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {resolvedArea === 'kitchen' ? (
          <>
            {kitchenTab === 'service' && <KitchenServiceTab session={session} setSession={setSession} />}
            {kitchenTab === 'temps' && <TempsTab session={session} />}
            {kitchenTab === 'incidents' && <IncidentsTab session={session} />}
            {kitchenTab === 'notes' && <NotesTab session={session} setSession={setSession} area="kitchen" />}
          </>
        ) : (
          <>
            {hallTab === 'service' && <HallServiceTab session={session} setSession={setSession} />}
            {hallTab === 'incidents' && <IncidentsTab session={session} />}
            {hallTab === 'notes' && <NotesTab session={session} setSession={setSession} area="hall" />}
          </>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className={`grid ${resolvedArea === 'kitchen' ? 'grid-cols-4' : 'grid-cols-3'} border-t border-white/10 bg-navy-700`}>
        {resolvedArea === 'kitchen'
          ? kitchenTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setKitchenTab(t.id)}
                className={`flex flex-col items-center gap-1 py-4 min-h-[60px] justify-center transition-colors ${
                  kitchenTab === t.id ? 'text-gold' : 'text-white/40 active:text-white/70'
                }`}
              >
                {t.icon}
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))
          : hallTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setHallTab(t.id)}
                className={`flex flex-col items-center gap-1 py-4 min-h-[60px] justify-center transition-colors ${
                  hallTab === t.id ? 'text-gold' : 'text-white/40 active:text-white/70'
                }`}
              >
                {t.icon}
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))
        }
      </div>
    </div>
  );
}

// ─── KITCHEN SERVICE TAB ──────────────────────────────────
function KitchenServiceTab({ session, setSession }: { session: Session; setSession: (s: Session) => void }) {
  const [attendance, setAttendance] = useState<AttendanceWithVol[]>([]);
  const [whatServed, setWhatServed] = useState(session.what_was_served || '');

  const loadAttendance = useCallback(async () => {
    const { data } = await supabase
      .from('volunteer_attendance')
      .select('*, volunteers(first_name, last_name)')
      .eq('session_id', session.id)
      .eq('area_on_day', 'kitchen')
      .is('sign_out_time', null);
    if (data) setAttendance(data as AttendanceWithVol[]);
  }, [session.id]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  useEffect(() => {
    const interval = setInterval(loadAttendance, 15_000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  const clamp = (n: number) => Math.max(0, Math.min(9999, n));
  const [counterPending, setCounterPending] = useState(false);

  const updateCounter = async (delta: number) => {
    if (counterPending) return;
    setCounterPending(true);
    const current = session.meals_served || 0;
    const newVal = clamp(current + delta);
    const { error } = await supabase.from('sessions').update({ meals_served: newVal }).eq('id', session.id);
    if (!error) setSession({ ...session, meals_served: newVal });
    setCounterPending(false);
  };

  const setCounter = async (value: number) => {
    if (counterPending) return;
    setCounterPending(true);
    const clamped = clamp(value);
    const { error } = await supabase.from('sessions').update({ meals_served: clamped }).eq('id', session.id);
    if (!error) setSession({ ...session, meals_served: clamped });
    setCounterPending(false);
  };

  const saveWhatServed = async () => {
    const val = whatServed.trim() || null;
    await supabase.from('sessions').update({ what_was_served: val }).eq('id', session.id);
    setSession({ ...session, what_was_served: val });
  };

  return (
    <div className="space-y-6">
      <TapCounter
        label="Meals Served"
        value={session.meals_served}
        onTap={updateCounter}
        onSet={setCounter}
        disabled={counterPending}
      />

      <div>
        <label className="text-sm text-white/50 mb-1 block">What was served tonight?</label>
        <textarea
          value={whatServed}
          onChange={(e) => setWhatServed(e.target.value)}
          onBlur={saveWhatServed}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-kiosk-body text-white
                     placeholder-white/30 focus:outline-none focus:border-gold/50 min-h-[70px] resize-none"
          placeholder="e.g. Beef stew with rice, bread rolls, fruit salad..."
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-white/50" />
          <span className="text-sm text-white/50 font-medium">Kitchen Volunteers ({attendance.length})</span>
        </div>
        <VolunteerList volunteers={attendance} />
      </div>
    </div>
  );
}

// ─── HALL SERVICE TAB ─────────────────────────────────────
function HallServiceTab({ session, setSession }: { session: Session; setSession: (s: Session) => void }) {
  const [attendance, setAttendance] = useState<AttendanceWithVol[]>([]);

  const loadAttendance = useCallback(async () => {
    const { data } = await supabase
      .from('volunteer_attendance')
      .select('*, volunteers(first_name, last_name)')
      .eq('session_id', session.id)
      .eq('area_on_day', 'hall')
      .is('sign_out_time', null);
    if (data) setAttendance(data as AttendanceWithVol[]);
  }, [session.id]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  useEffect(() => {
    const interval = setInterval(loadAttendance, 15_000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  const clamp = (n: number) => Math.max(0, Math.min(9999, n));
  const [pendingField, setPendingField] = useState<string | null>(null);

  const updateCounter = async (field: 'people_served' | 'grocery_packs_given', delta: number) => {
    if (pendingField) return;
    setPendingField(field);
    const current = session[field] || 0;
    const newVal = clamp(current + delta);
    const { error } = await supabase.from('sessions').update({ [field]: newVal }).eq('id', session.id);
    if (!error) setSession({ ...session, [field]: newVal });
    setPendingField(null);
  };

  const setCounter = async (field: 'people_served' | 'grocery_packs_given', value: number) => {
    if (pendingField) return;
    setPendingField(field);
    const clamped = clamp(value);
    const { error } = await supabase.from('sessions').update({ [field]: clamped }).eq('id', session.id);
    if (!error) setSession({ ...session, [field]: clamped });
    setPendingField(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <TapCounter
          label="People Seen"
          value={session.people_served}
          onTap={(d) => updateCounter('people_served', d)}
          onSet={(v) => setCounter('people_served', v)}
          disabled={pendingField !== null}
        />
        <TapCounter
          label="Grocery Packs"
          value={session.grocery_packs_given}
          onTap={(d) => updateCounter('grocery_packs_given', d)}
          onSet={(v) => setCounter('grocery_packs_given', v)}
          disabled={pendingField !== null}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-white/50" />
          <span className="text-sm text-white/50 font-medium">Hall Volunteers ({attendance.length})</span>
        </div>
        <VolunteerList volunteers={attendance} />
      </div>
    </div>
  );
}

// ─── TEMPS TAB (Kitchen only) ─────────────────────────────
function TempsTab({ session }: { session: Session }) {
  const [logs, setLogs] = useState<(FoodSafetyLog & { volunteers?: { first_name: string } | null })[]>([]);
  const [foodItem, setFoodItem] = useState('');
  const [foodType, setFoodType] = useState<'hot' | 'cold' | 'reheat' | 'fridge' | ''>('');
  const [tempStr, setTempStr] = useState('');
  const [probeId, setProbeId] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [saving, setSaving] = useState(false);

  const temp = tempStr ? parseFloat(tempStr) : null;
  const preview = temp !== null && !isNaN(temp) && foodType
    ? evaluateTemperature(temp, foodType)
    : null;

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from('food_safety_logs')
      .select('*, volunteers(first_name)')
      .eq('session_id', session.id)
      .order('logged_at', { ascending: false });
    if (data) setLogs(data as typeof logs);
  }, [session.id]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const resetForm = () => {
    setFoodItem(''); setFoodType(''); setTempStr(''); setProbeId(''); setCorrectiveAction('');
  };

  const handleSave = async () => {
    if (!foodType || temp === null || !foodItem.trim()) return;
    const result = evaluateTemperature(temp, foodType);
    if (result === 'FAIL' && !correctiveAction.trim()) return;

    setSaving(true);
    await supabase.from('food_safety_logs').insert({
      session_id: session.id,
      food_item: foodItem.trim(),
      food_type: foodType,
      temp_celsius: temp,
      result,
      corrective_action: result === 'FAIL' ? correctiveAction.trim() : null,
      probe_id: probeId.trim() || null,
      logged_at: new Date().toISOString(),
    });
    resetForm();
    loadLogs();
    setSaving(false);
  };

  const typeButtons: { value: 'hot' | 'cold' | 'reheat' | 'fridge'; label: string; active: string }[] = [
    { value: 'hot', label: "Hot \u2265 60\u00B0C", active: 'bg-red-500' },
    { value: 'cold', label: "Cold Hold \u2264 5\u00B0C", active: 'bg-blue-500' },
    { value: 'reheat', label: "Reheat \u2265 75\u00B0C", active: 'bg-orange-500' },
    { value: 'fridge', label: "Fridge \u2264 5\u00B0C", active: 'bg-cyan-600' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-kiosk-lg font-bold flex items-center gap-2">
        <Thermometer size={24} className="text-gold" /> Temperature Log
      </h2>

      <div className="grid grid-cols-4 gap-2">
        {typeButtons.map((t) => (
          <button
            key={t.value}
            onClick={() => setFoodType(t.value)}
            className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              foodType === t.value
                ? `${t.active} text-white shadow-lg`
                : 'bg-white/5 border border-white/10 text-white/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={foodItem}
          onChange={(e) => setFoodItem(e.target.value)}
          placeholder="Food item (e.g. Beef Stew)"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-kiosk-body text-white
                     placeholder-white/30 focus:outline-none focus:border-gold/50"
        />
        <input
          type="number"
          step="0.1"
          value={tempStr}
          onChange={(e) => setTempStr(e.target.value)}
          placeholder="Temp \u00B0C"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-kiosk-lg text-white text-center font-bold
                     placeholder-white/30 focus:outline-none focus:border-gold/50"
        />
      </div>

      <input
        type="text"
        value={probeId}
        onChange={(e) => setProbeId(e.target.value)}
        placeholder="Probe ID (optional, e.g. PROBE-01)"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white
                   placeholder-white/30 focus:outline-none focus:border-gold/50"
      />

      {preview && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-kiosk-body font-bold ${
          preview === 'PASS'
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {preview === 'PASS' ? <CheckCircle size={28} /> : <XCircle size={28} />}
          {preview}
        </div>
      )}

      {preview === 'FAIL' && (
        <textarea
          value={correctiveAction}
          onChange={(e) => setCorrectiveAction(e.target.value)}
          placeholder="Corrective action taken (REQUIRED for FAIL)..."
          className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-kiosk-body text-white
                     placeholder-red-300/50 focus:outline-none focus:border-red-400 min-h-[70px] resize-none"
        />
      )}

      <button
        onClick={handleSave}
        disabled={!foodItem.trim() || !foodType || temp === null || saving || (preview === 'FAIL' && !correctiveAction.trim())}
        className="w-full py-4 rounded-xl bg-gold text-navy text-kiosk-body font-bold
                   active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
      >
        {saving ? 'Saving...' : 'Save Temperature Check'}
      </button>

      {logs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-white/40 font-medium mt-2">Today&apos;s Logs ({logs.length})</h3>
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  { hot: 'bg-red-500/30 text-red-300', cold: 'bg-blue-500/30 text-blue-300',
                    reheat: 'bg-orange-500/30 text-orange-300', fridge: 'bg-cyan-500/30 text-cyan-300' }[log.food_type]
                }`}>
                  {{ hot: 'HOT', cold: 'COLD', reheat: 'REHEAT', fridge: 'FRIDGE' }[log.food_type]}
                </span>
                <span className="text-sm font-medium">{log.food_item}</span>
                <span className="text-sm text-white/40 font-mono">{log.temp_celsius}{"\u00B0C"}</span>
              </div>
              <div className="flex items-center gap-2">
                {log.result === 'PASS'
                  ? <CheckCircle size={18} className="text-green-400" />
                  : <XCircle size={18} className="text-red-400" />}
                <span className="text-xs text-white/30">{formatTimeAEST(log.logged_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INCIDENTS TAB ────────────────────────────────────────
function IncidentsTab({ session }: { session: Session }) {
  const [incidents, setIncidents] = useState<(Incident & { volunteers?: { first_name: string } | null })[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [saving, setSaving] = useState(false);

  const loadIncidents = useCallback(async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*, volunteers(first_name)')
      .eq('session_id', session.id)
      .order('reported_at', { ascending: false });
    if (data) setIncidents(data as typeof incidents);
  }, [session.id]);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('incidents').insert({
      session_id: session.id,
      title: title.trim(),
      description: description.trim() || null,
      severity,
      reported_at: new Date().toISOString(),
    });
    setTitle(''); setDescription(''); setSeverity('low');
    loadIncidents();
    setSaving(false);
  };

  const severityButtons: { value: 'low' | 'medium' | 'high'; label: string; active: string }[] = [
    { value: 'low', label: 'Low', active: 'bg-yellow-500' },
    { value: 'medium', label: 'Medium', active: 'bg-orange-500' },
    { value: 'high', label: 'High', active: 'bg-red-500' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-kiosk-lg font-bold flex items-center gap-2">
        <AlertTriangle size={24} className="text-gold" /> Incident Report
      </h2>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What happened?"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-kiosk-body text-white
                   placeholder-white/30 focus:outline-none focus:border-gold/50"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-kiosk-body text-white
                   placeholder-white/30 focus:outline-none focus:border-gold/50 min-h-[80px] resize-none"
      />

      <div>
        <label className="text-sm text-white/50 mb-2 block">Severity</label>
        <div className="grid grid-cols-3 gap-3">
          {severityButtons.map((s) => (
            <button
              key={s.value}
              onClick={() => setSeverity(s.value)}
              className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                severity === s.value
                  ? `${s.active} text-white shadow-lg`
                  : 'bg-white/5 border border-white/10 text-white/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!title.trim() || saving}
        className="w-full py-4 rounded-xl bg-gold text-navy text-kiosk-body font-bold
                   active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
      >
        {saving ? 'Saving...' : 'Save Incident'}
      </button>

      {incidents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-white/40 font-medium mt-2">Tonight&apos;s Incidents ({incidents.length})</h3>
          {incidents.map((inc) => (
            <div key={inc.id} className="bg-white/5 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{inc.title}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  { low: 'bg-yellow-500/30 text-yellow-300', medium: 'bg-orange-500/30 text-orange-300', high: 'bg-red-500/30 text-red-300' }[inc.severity]
                }`}>
                  {inc.severity.toUpperCase()}
                </span>
              </div>
              {inc.description && <p className="text-xs text-white/40">{inc.description}</p>}
              <p className="text-xs text-white/30 mt-1">{formatTimeAEST(inc.reported_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NOTES TAB ────────────────────────────────────────────
function NotesTab({ session, setSession, area }: { session: Session; setSession: (s: Session) => void; area: Area }) {
  const [notes, setNotes] = useState(session.coordinator_notes || '');

  const saveNotes = async () => {
    const val = notes.trim() || null;
    await supabase.from('sessions').update({ coordinator_notes: val }).eq('id', session.id);
    setSession({ ...session, coordinator_notes: val });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-kiosk-lg font-bold flex items-center gap-2">
        <FileText size={24} className="text-gold" /> Coordinator Notes
      </h2>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Any notes for tonight's service..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-kiosk-body text-white
                   placeholder-white/30 focus:outline-none focus:border-gold/50 min-h-[160px] resize-none"
      />

      <button
        onClick={saveNotes}
        className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white text-kiosk-body font-semibold
                   active:scale-95 transition-all"
      >
        Save Notes
      </button>

      {/* Tonight's Summary */}
      <div className="bg-white/5 rounded-xl p-5 space-y-3">
        <h3 className="text-sm text-white/50 font-medium uppercase tracking-wider">Tonight&apos;s Summary</h3>
        <div className={`grid gap-4 text-center ${area === 'kitchen' ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {area === 'kitchen' ? (
            <div>
              <p className="text-kiosk-xl font-bold text-gold">{session.meals_served ?? 0}</p>
              <p className="text-xs text-white/40">Meals Served</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-kiosk-xl font-bold text-gold">{session.people_served ?? 0}</p>
                <p className="text-xs text-white/40">People</p>
              </div>
              <div>
                <p className="text-kiosk-xl font-bold text-gold">{session.grocery_packs_given ?? 0}</p>
                <p className="text-xs text-white/40">Grocery Packs</p>
              </div>
            </>
          )}
        </div>
        {area === 'kitchen' && session.what_was_served && (
          <p className="text-sm text-white/60">
            <span className="text-white/40">Served: </span>{session.what_was_served}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────
function TapCounter({ label, value, onTap, onSet, disabled = false }: {
  label: string;
  value: number;
  onTap: (delta: number) => void;
  onSet: (val: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const startEdit = () => {
    if (disabled) return;
    setEditVal(String(value));
    setEditing(true);
  };

  const commitEdit = () => {
    const num = parseInt(editVal, 10);
    if (!isNaN(num) && num >= 0) onSet(num);
    setEditing(false);
  };

  return (
    <div className={`bg-white/5 rounded-xl p-4 text-center transition-opacity ${disabled ? 'opacity-60' : ''}`}>
      <p className="text-xs text-white/40 mb-2">{label}</p>

      {editing ? (
        <input
          type="number"
          min="0"
          autoFocus
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
          className="w-full text-center text-kiosk-2xl font-bold text-gold bg-white/10 border border-gold/40
                     rounded-lg py-1 mb-3 focus:outline-none focus:border-gold"
        />
      ) : (
        <p
          onClick={startEdit}
          className="text-kiosk-2xl font-bold text-gold tabular-nums mb-3 cursor-pointer
                     hover:bg-white/5 rounded-lg py-1 transition-colors"
          title="Tap to type a number"
        >
          {value ?? 0}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => { if (!disabled) onTap(-1); }}
          disabled={disabled}
          className="flex-1 h-12 rounded-lg bg-white/10 flex items-center justify-center
                     active:scale-90 active:bg-white/20 transition-all disabled:active:scale-100"
        >
          <Minus size={20} />
        </button>
        <button
          onClick={() => { if (!disabled) onTap(1); }}
          disabled={disabled}
          className="flex-1 h-12 rounded-lg bg-gold/20 text-gold flex items-center justify-center
                     active:scale-90 active:bg-gold/30 transition-all disabled:active:scale-100"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

function VolunteerList({ volunteers }: { volunteers: AttendanceWithVol[] }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      {volunteers.length === 0 ? (
        <p className="text-xs text-white/20">None signed in</p>
      ) : (
        <div className="space-y-1.5">
          {volunteers.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-sm">
              {v.is_leader_on_day && <Crown size={12} className="text-gold" />}
              <span>{v.volunteers.first_name} {v.volunteers.last_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
