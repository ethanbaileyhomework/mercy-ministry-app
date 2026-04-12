import { useState, useEffect } from 'react';
import { Search, UserCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { VOLUNTEER_ROLES, type Volunteer, formatDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { total_hours: number; session_count: number }>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('volunteers')
        .select('*')
        .eq('is_active', true)
        .order('first_name');
      if (data) setVolunteers(data as Volunteer[]);

      // Get attendance summary
      const { data: att } = await supabase
        .from('volunteer_attendance')
        .select('volunteer_id, hours_calculated');

      if (att) {
        const map: Record<string, { total_hours: number; session_count: number }> = {};
        for (const a of att) {
          const vid = a.volunteer_id as string;
          if (!map[vid]) map[vid] = { total_hours: 0, session_count: 0 };
          map[vid].session_count++;
          map[vid].total_hours += (a.hours_calculated as number) || 0;
        }
        setAttendanceMap(map);
      }

      setLoading(false);
    }
    load();
  }, []);

  const filtered = volunteers.filter((v) => {
    const matchesSearch = !search || `${v.first_name} ${v.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || v.preferred_roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  // WWCC expiring within 90 days
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Volunteer Management</h1>
        <span className="text-sm text-gray-500">{volunteers.length} active volunteers</span>
      </div>

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
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-auto">
          <option value="">All Roles</option>
          {VOLUNTEER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
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
                      <div className="font-medium text-sm">{v.first_name} {v.last_name}</div>
                      <div className="text-xs text-gray-500">{v.preferred_roles.join(', ') || 'No preferred roles'}</div>
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
                      <div><span className="text-gray-500">Onboarded:</span> {v.onboarded_date ? formatDateAEST(v.onboarded_date + 'T00:00:00Z') : '—'}</div>
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
