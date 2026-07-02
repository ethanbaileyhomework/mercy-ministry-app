import { useState, useEffect } from 'react';
import { Download, BarChart2, Calendar } from 'lucide-react';
import { type Session, formatDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

type Period = 'week' | 'month' | 'year' | 'all';

interface SessionWithHours extends Session {
  totalHours: number;
  volunteerCount: number;
}

function startOf(period: Period): string | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }
  if (period === 'year') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  }
  return null;
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Last 7 days',
  month: 'Last month',
  year: 'Last year',
  all: 'All time',
};

export function RawDataPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [sessions, setSessions] = useState<SessionWithHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = startOf(period);

      let q = supabase
        .from('sessions')
        .select('*')
        .eq('status', 'completed')
        .order('session_date', { ascending: false });

      if (from) q = q.gte('session_date', from);

      const { data: sessData } = await q;
      if (!sessData) { setLoading(false); return; }

      const { data: attData } = await supabase
        .from('volunteer_attendance')
        .select('session_id, hours_served')
        .in('session_id', sessData.map((s) => s.id));

      const hoursBySession: Record<string, { hours: number; count: number }> = {};
      (attData ?? []).forEach((a: { session_id: string; hours_served: number | null }) => {
        if (!hoursBySession[a.session_id]) hoursBySession[a.session_id] = { hours: 0, count: 0 };
        hoursBySession[a.session_id].hours += a.hours_served ?? 0;
        hoursBySession[a.session_id].count += 1;
      });

      setSessions(
        (sessData as Session[]).map((s) => ({
          ...s,
          totalHours: hoursBySession[s.id]?.hours ?? 0,
          volunteerCount: hoursBySession[s.id]?.count ?? 0,
        }))
      );
      setLoading(false);
    }
    load();
  }, [period]);

  const totals = sessions.reduce(
    (acc, s) => ({
      services: acc.services + 1,
      people: acc.people + (s.people_served ?? 0),
      meals: acc.meals + (s.meals_served ?? 0),
      packs: acc.packs + (s.grocery_packs_given ?? 0),
      hours: acc.hours + s.totalHours,
    }),
    { services: 0, people: 0, meals: 0, packs: 0, hours: 0 }
  );

  const handleExport = () => {
    const rows = sessions.map((s) => ({
      Date: formatDateAEST(s.session_date + 'T00:00:00Z'),
      'People Served': s.people_served ?? 0,
      'Meals Served': s.meals_served ?? 0,
      'Grocery Packs': s.grocery_packs_given ?? 0,
      'Volunteer Hours': parseFloat(s.totalHours.toFixed(2)),
      Volunteers: s.volunteerCount,
      'What Was Served': s.what_was_served ?? '',
      Notes: s.coordinator_notes ?? '',
    }));

    const totalsRow = {
      Date: `TOTAL (${PERIOD_LABELS[period]})`,
      'People Served': totals.people,
      'Meals Served': totals.meals,
      'Grocery Packs': totals.packs,
      'Volunteer Hours': parseFloat(totals.hours.toFixed(2)),
      Volunteers: 0,
      'What Was Served': '',
      Notes: '',
    };

    const ws = XLSX.utils.json_to_sheet([...rows, {} as typeof rows[0], totalsRow as typeof rows[0]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Raw Data');
    XLSX.writeFile(wb, `mercy-ministry-raw-data-${period}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 size={24} className="text-gold" />
          <h1 className="text-2xl font-bold">Raw Data</h1>
        </div>
        <button onClick={handleExport} disabled={sessions.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
          <Download size={16} /> Export to Excel
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-navy text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Services Held', value: totals.services, icon: Calendar },
          { label: 'People Seen', value: totals.people.toLocaleString() },
          { label: 'Meals Served', value: totals.meals.toLocaleString() },
          { label: 'Grocery Packs', value: totals.packs.toLocaleString() },
          { label: 'Volunteer Hours', value: totals.hours.toFixed(1) },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-navy dark:text-gold">{loading ? '…' : value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Session table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">People</th>
              <th className="text-left px-4 py-3 font-medium">Meals</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Packs</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Vol. Hours</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Volunteers</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No completed sessions in this period.</td></tr>
            ) : sessions.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">{formatDateAEST(s.session_date + 'T00:00:00Z')}</td>
                <td className="px-4 py-3">{s.people_served ?? '—'}</td>
                <td className="px-4 py-3">{s.meals_served ?? '—'}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{s.grocery_packs_given ?? '—'}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{s.totalHours > 0 ? s.totalHours.toFixed(1) : '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{s.volunteerCount > 0 ? s.volunteerCount : '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500 truncate max-w-xs">{s.coordinator_notes || '—'}</td>
              </tr>
            ))}
          </tbody>
          {!loading && sessions.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 font-semibold">
              <tr>
                <td className="px-4 py-3">Totals</td>
                <td className="px-4 py-3">{totals.people}</td>
                <td className="px-4 py-3">{totals.meals}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{totals.packs}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{totals.hours.toFixed(1)}</td>
                <td className="px-4 py-3 hidden md:table-cell"></td>
                <td className="px-4 py-3 hidden lg:table-cell"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
