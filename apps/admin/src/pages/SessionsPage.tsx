import { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { type Session, type Volunteer, getCurrentDateAEST, formatDateAEST, sessionSchema } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ session_date: getCurrentDateAEST(), coordinator_id: '', session_notes: '' });

  useEffect(() => {
    async function load() {
      const [sessRes, volRes] = await Promise.all([
        supabase.from('sessions').select('*').order('session_date', { ascending: false }).limit(50),
        supabase.from('volunteers').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ]);
      if (sessRes.data) setSessions(sessRes.data as Session[]);
      if (volRes.data) setVolunteers(volRes.data as Volunteer[]);
      setLoading(false);
    }
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = sessionSchema.safeParse({
      ...form,
      coordinator_id: form.coordinator_id || null,
      status: 'draft',
    });
    if (!parsed.success) { alert('Invalid form data'); return; }

    const { data, error } = await supabase.from('sessions').insert(parsed.data).select().single();
    if (error) { alert(error.message); return; }
    setSessions([data as Session, ...sessions]);
    setShowCreate(false);
    setForm({ session_date: getCurrentDateAEST(), coordinator_id: '', session_notes: '' });
  };

  const statusBadge = (status: string) => {
    const cls = { draft: 'badge-draft', active: 'badge-active', completed: 'badge-completed', cancelled: 'badge-cancelled' }[status] || 'badge-draft';
    return <span className={cls}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          <Plus size={18} /> New Session
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create New Session</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Coordinator</label>
              <select value={form.coordinator_id} onChange={(e) => setForm({ ...form, coordinator_id: e.target.value })} className="input">
                <option value="">Select coordinator</option>
                {volunteers.map((v) => <option key={v.id} value={v.id}>{v.first_name} {v.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" value={form.session_notes} onChange={(e) => setForm({ ...form, session_notes: e.target.value })} className="input" placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold">Create Session</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Guests</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Meals</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Grocery Packs</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No sessions yet. Create your first one above.</td></tr>
            ) : sessions.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  {formatDateAEST(s.session_date + 'T00:00:00Z')}
                </td>
                <td className="px-4 py-3">{statusBadge(s.status)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{s.total_guests_served}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{s.total_meals_served}</td>
                <td className="px-4 py-3 hidden md:table-cell">{s.total_grocery_packs}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500 truncate max-w-xs">{s.session_notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
