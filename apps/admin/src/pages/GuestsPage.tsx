import { useState, useEffect } from 'react';
import { Plus, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { type Session, formatDateAEST } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

interface GuestRecord {
  id: string;
  session_id: string;
  registration_number: string | null;
  first_name: string | null;
  family_size: number | null;
  adults: number | null;
  children: number | null;
  meals_received: number | null;
  grocery_pack_received: boolean | null;
  dietary_notes: string | null;
  is_new_guest: boolean | null;
  referral_source: string | null;
  registered_at: string | null;
}

const REFERRAL_SOURCES = ['Walk-in', 'Church referral', 'Social worker', 'Friend/family', 'Other'];

const emptyForm = {
  first_name: '',
  family_size: 1,
  adults: 1,
  children: 0,
  meals_received: 1,
  grocery_pack_received: false,
  dietary_notes: '',
  is_new_guest: false,
  referral_source: '',
};

export function GuestsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [guests, setGuests] = useState<Record<string, GuestRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<string | null>(null); // session id
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [sessRes, guestRes] = await Promise.all([
        supabase.from('sessions').select('*').order('session_date', { ascending: false }).limit(50),
        supabase.from('guest_records').select('*').order('registered_at', { ascending: false }),
      ]);
      if (sessRes.data) setSessions(sessRes.data as Session[]);
      if (guestRes.data) {
        const bySession: Record<string, GuestRecord[]> = {};
        (guestRes.data as GuestRecord[]).forEach((g) => {
          if (!bySession[g.session_id]) bySession[g.session_id] = [];
          bySession[g.session_id].push(g);
        });
        setGuests(bySession);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent, sessionId: string) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from('guest_records')
      .insert({
        session_id: sessionId,
        first_name: form.first_name || null,
        family_size: form.family_size,
        adults: form.adults,
        children: form.children,
        meals_received: form.meals_received,
        grocery_pack_received: form.grocery_pack_received,
        dietary_notes: form.dietary_notes || null,
        is_new_guest: form.is_new_guest,
        referral_source: form.referral_source || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) { alert(error.message); return; }
    setGuests((prev) => ({
      ...prev,
      [sessionId]: [data as GuestRecord, ...(prev[sessionId] ?? [])],
    }));
    setShowAdd(null);
    setForm(emptyForm);
  };

  const sessionTotals = (sessionId: string) => {
    const list = guests[sessionId] ?? [];
    return {
      count: list.length,
      people: list.reduce((s, g) => s + (g.family_size ?? 1), 0),
      meals: list.reduce((s, g) => s + (g.meals_received ?? 0), 0),
      packs: list.filter((g) => g.grocery_pack_received).length,
      newGuests: list.filter((g) => g.is_new_guest).length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users size={24} className="text-gold" />
        <h1 className="text-2xl font-bold">Raw Data</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-4">Guest intake records per service session</p>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No sessions yet.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const totals = sessionTotals(s.id);
            const isOpen = expandedId === s.id;
            const isAdding = showAdd === s.id;
            const list = guests[s.id] ?? [];

            return (
              <div key={s.id} className="card overflow-hidden">
                {/* Session header row */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatDateAEST(s.session_date + 'T00:00:00Z')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : s.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{totals.count} guests · {totals.people} people · {totals.meals} meals · {totals.packs} packs</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {/* Add guest form */}
                    {isAdding ? (
                      <form onSubmit={(e) => handleAdd(e, s.id)} className="p-4 bg-gray-50 dark:bg-gray-800/40 space-y-3">
                        <h3 className="text-sm font-semibold">Add Guest Record</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="label text-xs">First Name</label>
                            <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input py-1.5 text-sm" placeholder="Optional" />
                          </div>
                          <div>
                            <label className="label text-xs">Family Size</label>
                            <input type="number" min={1} value={form.family_size} onChange={(e) => setForm({ ...form, family_size: parseInt(e.target.value) || 1 })} className="input py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="label text-xs">Adults</label>
                            <input type="number" min={0} value={form.adults} onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 0 })} className="input py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="label text-xs">Children</label>
                            <input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })} className="input py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="label text-xs">Meals Received</label>
                            <input type="number" min={0} value={form.meals_received} onChange={(e) => setForm({ ...form, meals_received: parseInt(e.target.value) || 0 })} className="input py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="label text-xs">Referral Source</label>
                            <select value={form.referral_source} onChange={(e) => setForm({ ...form, referral_source: e.target.value })} className="input py-1.5 text-sm">
                              <option value="">—</option>
                              {REFERRAL_SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.grocery_pack_received} onChange={(e) => setForm({ ...form, grocery_pack_received: e.target.checked })} className="rounded" />
                            Grocery pack received
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.is_new_guest} onChange={(e) => setForm({ ...form, is_new_guest: e.target.checked })} className="rounded" />
                            New guest
                          </label>
                        </div>
                        <div>
                          <label className="label text-xs">Dietary Notes</label>
                          <input type="text" value={form.dietary_notes} onChange={(e) => setForm({ ...form, dietary_notes: e.target.value })} className="input py-1.5 text-sm" placeholder="Allergies, requirements…" />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-gold py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Add Guest'}</button>
                          <button type="button" onClick={() => { setShowAdd(null); setForm(emptyForm); }} className="btn-secondary py-1.5 text-sm">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="px-4 py-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800/40">
                        <span className="text-xs text-gray-500">{list.length === 0 ? 'No guest records for this session' : `${totals.newGuests} new guest${totals.newGuests !== 1 ? 's' : ''}`}</span>
                        <button onClick={() => setShowAdd(s.id)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                          <Plus size={12} /> Add Guest
                        </button>
                      </div>
                    )}

                    {/* Guest records table */}
                    {list.length > 0 && (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">#</th>
                            <th className="text-left px-4 py-2 font-medium">Name</th>
                            <th className="text-left px-4 py-2 font-medium">Family</th>
                            <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Adults</th>
                            <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Children</th>
                            <th className="text-left px-4 py-2 font-medium">Meals</th>
                            <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Pack</th>
                            <th className="text-left px-4 py-2 font-medium hidden md:table-cell">New</th>
                            <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Referral</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                          {list.map((g) => (
                            <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="px-4 py-2 text-gray-400">{g.registration_number ?? '—'}</td>
                              <td className="px-4 py-2">{g.first_name ?? '—'}</td>
                              <td className="px-4 py-2">{g.family_size ?? '—'}</td>
                              <td className="px-4 py-2 hidden sm:table-cell">{g.adults ?? '—'}</td>
                              <td className="px-4 py-2 hidden sm:table-cell">{g.children ?? '—'}</td>
                              <td className="px-4 py-2">{g.meals_received ?? '—'}</td>
                              <td className="px-4 py-2 hidden md:table-cell">{g.grocery_pack_received ? '✓' : '—'}</td>
                              <td className="px-4 py-2 hidden md:table-cell">{g.is_new_guest ? '✓' : '—'}</td>
                              <td className="px-4 py-2 hidden lg:table-cell text-gray-500">{g.referral_source ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
