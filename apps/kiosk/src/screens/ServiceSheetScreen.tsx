import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList, Thermometer, AlertTriangle, FileText, Home,
  Plus, Minus, CheckCircle, LogOut, Users, Crown, Lock,
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

const CHECK_IDS = ['start', '1hr', 'end'] as const;
type CheckId = (typeof CHECK_IDS)[number];

const CHECKS: { id: CheckId; label: string; sublabel: string; cold: boolean }[] = [
  { id: 'start', label: 'Start of Service', sublabel: 'Before guests arrive — all equipment', cold: true },
  { id: '1hr',   label: '1-Hour Check',     sublabel: 'Hot equipment only',                  cold: false },
  { id: 'end',   label: 'End of Service',   sublabel: 'Before packing down — all equipment', cold: true },
];

const HOT_EQUIP = [
  { key: 'pw', label: 'Pie Warmer', emoji: '🥧', foodType: 'hot' as const },
  { key: 'bm', label: 'Bain Marie', emoji: '🍲', foodType: 'hot' as const },
];

const COLD_EQUIP = [
  { key: 'fridge',  label: 'Fridge',        emoji: '🧊', foodType: 'fridge'  as const, threshold: '≤ 5°C'   },
  { key: 'freezer', label: 'Chest Freezer', emoji: '❄️', foodType: 'frozen'  as const, threshold: '≤ −15°C' },
];

function TempsTab({ session }: { session: Session }) {
  const slotKey = `mercy-slots-${session.id}`;

  const [slotLabels, setSlotLabels] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(slotKey);
      return saved ? JSON.parse(saved) : { pw: ['', '', '', ''], bm: ['', '', '', ''] };
    } catch { return { pw: ['', '', '', ''], bm: ['', '', '', ''] }; }
  });

  // Flat maps keyed by `${checkId}:${equipKey}:${slotIndex}`
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Set<CheckId>>(new Set());
  const [saving, setSaving] = useState<CheckId | null>(null);
  const [existingLogs, setExistingLogs] = useState<FoodSafetyLog[]>([]);

  useEffect(() => {
    supabase
      .from('food_safety_logs')
      .select('*')
      .eq('session_id', session.id)
      .order('logged_at')
      .then(({ data }) => {
        if (!data) return;
        setExistingLogs(data as FoodSafetyLog[]);
        const done = new Set<CheckId>();
        for (const id of CHECK_IDS) {
          if (data.some((l) => l.probe_id === `check:${id}`)) done.add(id);
        }
        setCompleted(done);
      });
  }, [session.id]);

  const getT = (cid: CheckId, eq: string, slot: number | string) => temps[`${cid}:${eq}:${slot}`] ?? '';
  const setT = (cid: CheckId, eq: string, slot: number | string, v: string) =>
    setTemps((p) => ({ ...p, [`${cid}:${eq}:${slot}`]: v }));
  const getC = (cid: CheckId, eq: string, slot: number | string) => corrections[`${cid}:${eq}:${slot}`] ?? '';
  const setC = (cid: CheckId, eq: string, slot: number | string, v: string) =>
    setCorrections((p) => ({ ...p, [`${cid}:${eq}:${slot}`]: v }));

  const updateSlotLabel = (equipKey: string, idx: number, val: string) => {
    const next = { ...slotLabels, [equipKey]: slotLabels[equipKey].map((s, i) => (i === idx ? val : s)) };
    setSlotLabels(next);
    try { localStorage.setItem(slotKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const handleSave = async (checkId: CheckId, includesCold: boolean) => {
    setSaving(checkId);
    const now = new Date().toISOString();
    const rows: object[] = [];

    for (const equip of HOT_EQUIP) {
      for (let i = 0; i < 4; i++) {
        const tv = getT(checkId, equip.key, i);
        if (!tv) continue;
        const t = parseFloat(tv);
        if (isNaN(t)) continue;
        const result = evaluateTemperature(t, equip.foodType);
        const corrective = getC(checkId, equip.key, i).trim();
        if (result === 'FAIL' && !corrective) continue;
        rows.push({
          session_id: session.id,
          food_item: `${equip.label} – ${slotLabels[equip.key][i] || `Slot ${i + 1}`}`,
          food_type: equip.foodType,
          temp_celsius: t,
          result,
          corrective_action: result === 'FAIL' ? corrective : null,
          probe_id: `check:${checkId}`,
          logged_at: now,
        });
      }
    }

    if (includesCold) {
      for (const cold of COLD_EQUIP) {
        const tv = getT(checkId, cold.key, 0);
        if (!tv) continue;
        const t = parseFloat(tv);
        if (isNaN(t)) continue;
        const result = evaluateTemperature(t, cold.foodType);
        const corrective = getC(checkId, cold.key, 0).trim();
        if (result === 'FAIL' && !corrective) continue;
        rows.push({
          session_id: session.id,
          food_item: cold.label,
          food_type: cold.foodType,
          temp_celsius: t,
          result,
          corrective_action: result === 'FAIL' ? corrective : null,
          probe_id: `check:${checkId}`,
          logged_at: now,
        });
      }
    }

    if (rows.length > 0) {
      await supabase.from('food_safety_logs').insert(rows);
      setExistingLogs((prev) => [
        ...prev,
        ...(rows as FoodSafetyLog[]),
      ]);
    }
    setCompleted((prev) => new Set([...prev, checkId]));
    setSaving(null);
  };

  const activeCheck = CHECK_IDS.find((id) => !completed.has(id)) ?? 'end';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-kiosk-lg font-bold flex items-center gap-2">
          <Thermometer size={22} className="text-gold" /> Temp Checks
        </h2>
        <span className="text-xs text-white/30">
          {completed.size}/3 complete
        </span>
      </div>
      <p className="text-xs text-white/30">
        Hot equipment: 3 checks · Fridge &amp; freezer: start &amp; end only
      </p>

      {CHECKS.map(({ id, label, sublabel, cold: includesCold }) => {
        const isDone = completed.has(id);
        const isActive = !isDone && id === activeCheck;
        const checkLogs = existingLogs.filter((l) => l.probe_id === `check:${id}`);
        const failCount = checkLogs.filter((l) => l.result === 'FAIL').length;

        return (
          <div
            key={id}
            className={`rounded-2xl border transition-all ${
              isDone
                ? 'border-green-500/30 bg-green-500/5'
                : isActive
                  ? 'border-gold/40 bg-white/5'
                  : 'border-white/10 bg-white/3 opacity-40'
            }`}
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2.5">
                  {isDone
                    ? <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                    : isActive
                      ? <div className="w-5 h-5 rounded-full border-2 border-gold animate-pulse flex-shrink-0" />
                      : <div className="w-5 h-5 rounded-full border-2 border-white/20 flex-shrink-0" />
                  }
                  <span className={`font-bold text-kiosk-body ${isDone ? 'text-green-300' : isActive ? 'text-white' : 'text-white/40'}`}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-white/30 mt-0.5 ml-7">{sublabel}</p>
              </div>
              {isDone && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400 font-medium">{checkLogs.length} saved</span>
                  {failCount > 0 && (
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold">
                      {failCount} FAIL
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Expanded form */}
            {isActive && (
              <div className="px-5 pb-5 space-y-6">
                <p className="text-xs text-white/30 italic -mt-2">
                  Tap a slot name to label it (e.g. &quot;Beef Pies&quot;) — saves for tonight
                </p>

                {/* Hot equipment */}
                {HOT_EQUIP.map((equip) => (
                  <div key={equip.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{equip.emoji}</span>
                      <span className="font-bold text-white">{equip.label}</span>
                      <span className="text-xs text-red-300 bg-red-500/10 px-2 py-0.5 rounded ml-auto">≥ 60°C</span>
                    </div>
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((i) => {
                        const tv = getT(id, equip.key, i);
                        const parsed = parseFloat(tv);
                        const result = tv && !isNaN(parsed) ? evaluateTemperature(parsed, equip.foodType) : null;
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={slotLabels[equip.key][i]}
                                onChange={(e) => updateSlotLabel(equip.key, i, e.target.value)}
                                placeholder={`Slot ${i + 1}`}
                                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                                           text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30"
                              />
                              <input
                                type="number"
                                step="0.1"
                                inputMode="decimal"
                                value={tv}
                                onChange={(e) => setT(id, equip.key, i, e.target.value)}
                                placeholder="°C"
                                className="w-[90px] bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                                           text-center font-bold text-white placeholder-white/25
                                           focus:outline-none focus:border-gold/50"
                              />
                              {result && (
                                <span className={`w-14 text-center text-xs font-bold py-2.5 rounded-lg flex-shrink-0 ${
                                  result === 'PASS' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {result}
                                </span>
                              )}
                            </div>
                            {result === 'FAIL' && (
                              <input
                                type="text"
                                value={getC(id, equip.key, i)}
                                onChange={(e) => setC(id, equip.key, i, e.target.value)}
                                placeholder="Corrective action taken (required for FAIL)..."
                                className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5
                                           text-sm text-white placeholder-red-300/40 focus:outline-none focus:border-red-400"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Cold storage */}
                {includesCold && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🌡️</span>
                      <span className="font-bold text-white">Cold Storage</span>
                    </div>
                    <div className="space-y-2">
                      {COLD_EQUIP.map((cold) => {
                        const tv = getT(id, cold.key, 0);
                        const parsed = parseFloat(tv);
                        const result = tv && !isNaN(parsed) ? evaluateTemperature(parsed, cold.foodType) : null;
                        return (
                          <div key={cold.key} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cold.emoji}</span>
                              <span className="flex-1 text-sm text-white/80 font-medium">{cold.label}</span>
                              <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">{cold.threshold}</span>
                              <input
                                type="number"
                                step="0.1"
                                inputMode="decimal"
                                value={tv}
                                onChange={(e) => setT(id, cold.key, 0, e.target.value)}
                                placeholder="°C"
                                className="w-[90px] bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                                           text-center font-bold text-white placeholder-white/25
                                           focus:outline-none focus:border-gold/50"
                              />
                              {result && (
                                <span className={`w-14 text-center text-xs font-bold py-2.5 rounded-lg flex-shrink-0 ${
                                  result === 'PASS' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {result}
                                </span>
                              )}
                            </div>
                            {result === 'FAIL' && (
                              <input
                                type="text"
                                value={getC(id, cold.key, 0)}
                                onChange={(e) => setC(id, cold.key, 0, e.target.value)}
                                placeholder="Corrective action taken (required for FAIL)..."
                                className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5
                                           text-sm text-white placeholder-red-300/40 focus:outline-none focus:border-red-400"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleSave(id, includesCold)}
                  disabled={saving === id}
                  className="w-full py-4 rounded-xl bg-gold text-navy text-kiosk-body font-bold
                             active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving === id ? 'Saving...' : `Save ${label} ✓`}
                </button>
              </div>
            )}
          </div>
        );
      })}
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
