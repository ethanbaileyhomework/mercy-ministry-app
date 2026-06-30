import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, UserPlus, ChevronDown, ChevronUp, AlertTriangle, Crown, Edit3, X, Clock } from 'lucide-react';
import { formatDateAEST, formatTimeAEST, getCurrentDateAEST, type Volunteer } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  area_on_day: string;
  is_leader_on_day: boolean;
  sign_in_time: string;
  sign_out_time: string | null;
  hours_served: number | null;
  sessions: { session_date: string } | null;
}

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { total_hours: number; session_count: number }>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [signedInIds, setSignedInIds] = useState<Set<string>>(new Set());

  // Form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    area: 'hall' as 'kitchen' | 'hall', is_leader: false,
    wwcc_number: '', wwcc_expiry: '', notes: '',
  });

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', phone: '', email: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      area: 'hall', is_leader: false, wwcc_number: '', wwcc_expiry: '', notes: '',
    });
    setEditingId(null);
  };

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('volunteers').select('*').order('first_name');
      if (data) setVolunteers(data as Volunteer[]);

      // Check who's currently signed in today
      const today = getCurrentDateAEST();
      const { data: todaySession } = await supabase.from('sessions').select('id').eq('session_date', today).limit(1).single();
      if (todaySession) {
        const { data: signedIn } = await supabase
          .from('volunteer_attendance')
          .select('volunteer_id')
          .eq('session_id', todaySession.id)
          .is('sign_out_time', null);
        if (signedIn) setSignedInIds(new Set(signedIn.map((a) => a.volunteer_id as string)));
      }

      const { data: att } = await supabase.from('volunteer_attendance').select('volunteer_id, hours_served');
      if (att) {
        const map: Record<string, { total_hours: number; session_count: number }> = {};
        for (const a of att) {
          const vid = a.volunteer_id as string;
          if (!map[vid]) map[vid] = { total_hours: 0, session_count: 0 };
          map[vid].session_count++;
          map[vid].total_hours += (a.hours_served as number) || 0;
        }
        setAttendanceMap(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = volunteers.filter((v) => {
    if (!search) return true;
    return `${v.first_name} ${v.last_name}`.toLowerCase().includes(search.toLowerCase());
  });

  const activeVolunteers = filtered.filter((v) => v.is_active);
  const inactiveVolunteers = filtered.filter((v) => !v.is_active);

  const [historyMap, setHistoryMap] = useState<Record<string, AttendanceRecord[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  // Use a ref to read latest historyMap inside the callback without making it a dep.
  // This prevents a new loadHistory function being created every time historyMap updates,
  // which would re-trigger the useEffect and cause unnecessary repeated calls.
  const historyMapRef = useRef(historyMap);
  useEffect(() => { historyMapRef.current = historyMap; }, [historyMap]);

  const loadHistory = useCallback(async (volunteerId: string) => {
    if (historyMapRef.current[volunteerId]) return;
    setLoadingHistory(volunteerId);
    const { data } = await supabase
      .from('volunteer_attendance')
      .select('id, area_on_day, is_leader_on_day, sign_in_time, sign_out_time, hours_served, sessions(session_date)')
      .eq('volunteer_id', volunteerId)
      .order('sign_in_time', { ascending: false })
      .limit(20);
    if (data) setHistoryMap((prev) => ({ ...prev, [volunteerId]: data as unknown as AttendanceRecord[] }));
    setLoadingHistory(null);
  }, []); // stable — reads latest map via ref, no historyMap dep needed

  // Load history when expanding
  useEffect(() => {
    if (expandedId) loadHistory(expandedId);
  }, [expandedId, loadHistory]);

  // WWCC expiring within 90 days
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const wwccAlerts = volunteers.filter((v) =>
    v.is_active && v.wwcc_expiry && new Date(v.wwcc_expiry) <= ninetyDays && new Date(v.wwcc_expiry) >= now
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      area: form.area,
      is_leader: form.is_leader,
      wwcc_number: form.wwcc_number.trim() || null,
      wwcc_expiry: form.wwcc_expiry || null,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from('volunteers').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      setVolunteers(volunteers.map((v) => v.id === editingId ? { ...v, ...payload } : v));
      toast.success('Volunteer updated');
    } else {
      const { data, error } = await supabase.from('volunteers').insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      setVolunteers([...volunteers, data as Volunteer]);
      toast.success('Volunteer added');
    }
    resetForm();
    setShowAddForm(false);
  };

  const startEdit = (v: Volunteer) => {
    setForm({
      first_name: v.first_name, last_name: v.last_name,
      phone: v.phone || '', email: v.email || '',
      emergency_contact_name: v.emergency_contact_name || '',
      emergency_contact_phone: v.emergency_contact_phone || '',
      area: v.area, is_leader: v.is_leader,
      wwcc_number: v.wwcc_number || '', wwcc_expiry: v.wwcc_expiry || '',
      notes: v.notes || '',
    });
    setEditingId(v.id);
    setShowAddForm(true);
    // Scroll form into view after render
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleToggleActive = async (vol: Volunteer) => {
    const newActive = !vol.is_active;
    const action = newActive ? 'reactivate' : 'deactivate';
    if (!confirm(`${newActive ? 'Reactivate' : 'Deactivate'} ${vol.first_name} ${vol.last_name}?`)) return;
    await supabase.from('volunteers').update({ is_active: newActive }).eq('id', vol.id);
    setVolunteers(volunteers.map((v) => v.id === vol.id ? { ...v, is_active: newActive } : v));
    toast.success(`Volunteer ${action}d`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Volunteers</h1>
        <button onClick={() => { resetForm(); setShowAddForm(!showAddForm); }} className="btn-gold">
          <UserPlus size={18} /> Add Volunteer
        </button>
      </div>

      {/* WWCC Alerts */}
      {wwccAlerts.length > 0 && (
        <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <h3 className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300 mb-2">
            <AlertTriangle size={18} /> WWCC Expiry Alerts
          </h3>
          {wwccAlerts.map((v) => (
            <p key={v.id} className="text-sm text-amber-700 dark:text-amber-400">
              {v.first_name} {v.last_name} — expires {v.wwcc_expiry}
            </p>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <form ref={formRef} onSubmit={handleSave} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Volunteer' : 'New Volunteer'}</h2>
            <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="btn-ghost p-1"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Area *</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, area: 'kitchen' })}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${form.area === 'kitchen' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  Kitchen
                </button>
                <button type="button" onClick={() => setForm({ ...form, area: 'hall' })}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${form.area === 'hall' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  Hall
                </button>
              </div>
            </div>
            <div>
              <label className="label">Emergency Contact Name</label>
              <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Emergency Contact Phone</label>
              <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} className="input" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_leader} onChange={(e) => setForm({ ...form, is_leader: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300" />
                <span className="text-sm font-medium">Leader</span>
              </label>
            </div>
            <div>
              <label className="label">WWCC Number</label>
              <input value={form.wwcc_number} onChange={(e) => setForm({ ...form, wwcc_number: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">WWCC Expiry</label>
              <input type="date" value={form.wwcc_expiry} onChange={(e) => setForm({ ...form, wwcc_expiry: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
            </div>
          </div>
          <button type="submit" className="btn-gold">{editingId ? 'Update Volunteer' : 'Add Volunteer'}</button>
        </form>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Search by name or PIN..." />
      </div>

      {/* Volunteer List */}
      <div className="card overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="px-4 py-3 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /><div className="space-y-1.5 flex-1"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /><div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></div></div>)}</div>
        ) : activeVolunteers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No volunteers found.</div>
        ) : activeVolunteers.map((v) => {
          const stats = attendanceMap[v.id] || { total_hours: 0, session_count: 0 };
          const isExpanded = expandedId === v.id;
          return (
            <div key={v.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${v.area === 'kitchen' ? 'bg-red-400' : 'bg-blue-400'}`} />
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {v.first_name} {v.last_name}
                      {v.is_leader && <Crown size={14} className="text-gold" />}
                      {signedInIds.has(v.id) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          SIGNED IN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {v.area === 'kitchen' ? 'Kitchen' : 'Hall'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium">{Math.round(stats.total_hours * 10) / 10}h</div>
                    <div className="text-xs text-gray-500">{stats.session_count} sessions</div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Phone:</span> {v.phone || '—'}</div>
                    <div><span className="text-gray-500">Email:</span> {v.email || '—'}</div>
                    <div><span className="text-gray-500">Emergency:</span> {v.emergency_contact_name || '—'} {v.emergency_contact_phone ? `(${v.emergency_contact_phone})` : ''}</div>
                    {v.wwcc_number && <div><span className="text-gray-500">WWCC:</span> {v.wwcc_number} (exp: {v.wwcc_expiry || '—'})</div>}
                    {v.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {v.notes}</div>}
                  </div>
                  {/* Attendance History */}
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <Clock size={12} /> Recent Attendance
                    </h4>
                    {loadingHistory === v.id ? (
                      <p className="text-xs text-gray-400">Loading...</p>
                    ) : (historyMap[v.id] || []).length === 0 ? (
                      <p className="text-xs text-gray-400">No attendance records yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {(historyMap[v.id] || []).map((rec) => (
                          <div key={rec.id} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rec.sessions ? formatDateAEST(rec.sessions.session_date + 'T00:00:00Z').split(',')[0] : '—'}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                rec.area_on_day === 'kitchen' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {rec.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall'}
                              </span>
                              {rec.is_leader_on_day && <Crown size={10} className="text-gold" />}
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                              <span>{formatTimeAEST(rec.sign_in_time)}{rec.sign_out_time ? ` - ${formatTimeAEST(rec.sign_out_time)}` : ' (open)'}</span>
                              {rec.hours_served != null && <span className="font-medium">{Math.round(rec.hours_served * 10) / 10}h</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-3">
                    <button onClick={() => startEdit(v)} className="text-xs text-navy dark:text-blue-400 hover:underline flex items-center gap-1">
                      <Edit3 size={12} /> Edit
                    </button>
                    <button onClick={() => handleToggleActive(v)} className="text-xs text-red-600 hover:underline">
                      Deactivate
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inactive volunteers */}
      {inactiveVolunteers.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">Inactive ({inactiveVolunteers.length})</h2>
          <div className="card overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 opacity-60">
            {inactiveVolunteers.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{v.first_name} {v.last_name}</span>
                <button onClick={() => handleToggleActive(v)} className="text-xs text-green-600 hover:underline">Reactivate</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
