import { useState, useEffect } from 'react';
import { Search, UserCheck, AlertTriangle, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { type Volunteer, formatDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

const AREAS = [
  { value: 'hall', label: 'Hall' },
  { value: 'kitchen', label: 'Kitchen' },
];

const BLANK_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  area: 'hall',
  is_leader: false,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  wwcc_number: '',
  wwcc_expiry: '',
  notes: '',
};

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { total_hours: number; session_count: number }>>({});

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('volunteers')
        .select('*')
        .eq('is_active', true)
        .order('first_name');
      if (data) setVolunteers(data as Volunteer[]);

      const { data: att } = await supabase
        .from('volunteer_attendance')
        .select('volunteer_id, hours_served');

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
    const matchesSearch = !search || `${v.first_name} ${v.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesArea = !areaFilter || v.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const wwccAlerts = volunteers.filter((v) =>
    v.wwcc_expiry && new Date(v.wwcc_expiry) <= ninetyDays && new Date(v.wwcc_expiry) >= now
  );

  const handleDeactivate = async (vol: Volunteer) => {
    if (!confirm(`Deactivate ${vol.first_name} ${vol.last_name}? Their attendance history will be preserved.`)) return;
    await supabase.from('volunteers').update({ is_active: false }).eq('id', vol.id);
    setVolunteers(volunteers.filter((v) => v.id !== vol.id));
  };

  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSubmitting(true);

    const { data, error } = await supabase
      .from('volunteers')
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        area: form.area,
        is_leader: form.is_leader,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        wwcc_number: form.wwcc_number.trim() || null,
        wwcc_expiry: form.wwcc_expiry || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    setAddSubmitting(false);

    if (error) {
      setAddError(error.message);
      return;
    }

    setVolunteers((prev) => [...prev, data as Volunteer].sort((a, b) => a.first_name.localeCompare(b.first_name)));
    setForm(BLANK_FORM);
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Volunteer Management</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{volunteers.length} active volunteers</span>
          <button onClick={() => { setShowAdd(!showAdd); setAddError(''); setForm(BLANK_FORM); }} className="btn-primary">
            <Plus size={18} /> Add Volunteer
          </button>
        </div>
      </div>

      {/* Add Volunteer form */}
      {showAdd && (
        <form onSubmit={handleAddVolunteer} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Volunteer</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" required autoComplete="off" />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" required autoComplete="off" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" autoComplete="off" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" autoComplete="off" />
            </div>
            <div>
              <label className="label">Area *</label>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="input" required>
                {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                id="is_leader"
                type="checkbox"
                checked={form.is_leader}
                onChange={(e) => setForm({ ...form, is_leader: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_leader" className="text-sm font-medium">Leader</label>
            </div>
            <div>
              <label className="label">Emergency Contact Name</label>
              <input type="text" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} className="input" autoComplete="off" />
            </div>
            <div>
              <label className="label">Emergency Contact Phone</label>
              <input type="tel" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} className="input" autoComplete="off" />
            </div>
            <div>
              <label className="label">WWCC Number</label>
              <input type="text" value={form.wwcc_number} onChange={(e) => setForm({ ...form, wwcc_number: e.target.value })} className="input" autoComplete="off" />
            </div>
            <div>
              <label className="label">WWCC Expiry</label>
              <input type="date" value={form.wwcc_expiry} onChange={(e) => setForm({ ...form, wwcc_expiry: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[80px]" />
            </div>
          </div>

          {addError && <p className="text-sm text-red-600">{addError}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={addSubmitting} className="btn-primary disabled:opacity-50">
              {addSubmitting ? 'Adding...' : 'Add Volunteer'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setAddError(''); setForm(BLANK_FORM); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* WWCC Alerts */}
      {wwccAlerts.length > 0 && (
        <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <h3 className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300 mb-2">
            <AlertTriangle size={18} /> WWCC Expiry Alerts
          </h3>
          <div className="space-y-1">
            {wwccAlerts.map((v) => (
              <p key={v.id} className="text-sm text-amber-700 dark:text-amber-400">
                {v.first_name} {v.last_name} — WWCC expires {formatDateAEST(v.wwcc_expiry + 'T00:00:00Z')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Search volunteers..." />
        </div>
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="input w-auto">
          <option value="">All Areas</option>
          {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      {/* Volunteer list */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No volunteers found.</div>
          ) : filtered.map((v) => {
            const stats = attendanceMap[v.id] || { total_hours: 0, session_count: 0 };
            const isExpanded = expandedId === v.id;

            return (
              <div key={v.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck size={18} className="text-navy dark:text-navy-300" />
                    <div>
                      <div className="font-medium text-sm">
                        {v.first_name} {v.last_name}
                        {v.is_leader && <span className="ml-2 text-xs bg-gold/20 text-gold-700 dark:text-gold px-1.5 py-0.5 rounded">Leader</span>}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{v.area}</div>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-gray-500">Phone:</span> {v.phone || '—'}</div>
                      <div><span className="text-gray-500">Email:</span> {v.email || '—'}</div>
                      <div><span className="text-gray-500">Emergency:</span> {v.emergency_contact_name || '—'} {v.emergency_contact_phone ? `(${v.emergency_contact_phone})` : ''}</div>
                      {v.wwcc_number && <div><span className="text-gray-500">WWCC:</span> {v.wwcc_number} (exp: {v.wwcc_expiry || '—'})</div>}
                      {v.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {v.notes}</div>}
                    </div>
                    <div className="mt-3">
                      <button onClick={() => handleDeactivate(v)} className="text-xs text-red-600 hover:underline">Deactivate volunteer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
