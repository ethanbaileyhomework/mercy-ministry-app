import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useActiveSession, REFERRAL_SOURCES, type GuestRecord, guestRecordSchema } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function GuestsPage() {
  const { session } = useActiveSession(supabase);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    first_name: '', family_size: 1, adults: 1, children: 0,
    meals_received: 1, grocery_pack_received: false,
    dietary_notes: '', is_new_guest: false, referral_source: '',
  });

  const loadGuests = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data } = await supabase
      .from('guest_records')
      .select('*')
      .eq('session_id', session.id)
      .order('registered_at', { ascending: false });
    if (data) setGuests(data as GuestRecord[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { loadGuests(); }, [loadGuests]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // Get next registration number
    const { data: regData } = await supabase.rpc('next_guest_registration_number', { p_session_id: session.id });
    const regNum = (regData as string) || `G${String(guests.length + 1).padStart(3, '0')}`;

    const payload = {
      session_id: session.id,
      registration_number: regNum,
      first_name: form.first_name.trim() || null,
      family_size: form.family_size,
      adults: form.adults,
      children: form.children,
      meals_received: form.meals_received,
      grocery_pack_received: form.grocery_pack_received,
      dietary_notes: form.dietary_notes.trim() || null,
      is_new_guest: form.is_new_guest,
      referral_source: form.referral_source || null,
    };

    const parsed = guestRecordSchema.safeParse(payload);
    if (!parsed.success) { alert('Invalid data'); return; }

    const { error } = await supabase.from('guest_records').insert(parsed.data);
    if (error) { alert(error.message); return; }

    setShowAdd(false);
    setForm({ first_name: '', family_size: 1, adults: 1, children: 0, meals_received: 1, grocery_pack_received: false, dietary_notes: '', is_new_guest: false, referral_source: '' });
    loadGuests();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guest Registration</h1>
          {session && <p className="text-sm text-gray-500 dark:text-gray-400">{guests.length} guests this session</p>}
        </div>
        {session?.status === 'active' && (
          <button onClick={() => setShowAdd(!showAdd)} className="btn-gold">
            <Plus size={18} /> Add Guest
          </button>
        )}
      </div>

      {showAdd && session && (
        <form onSubmit={handleAdd} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Quick Add Guest</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Name (optional)</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" placeholder="Anonymous" />
            </div>
            <div>
              <label className="label">Family Size</label>
              <input type="number" min={1} value={form.family_size} onChange={(e) => {
                const v = parseInt(e.target.value) || 1;
                setForm({ ...form, family_size: v, meals_received: v });
              }} className="input" />
            </div>
            <div>
              <label className="label">Adults</label>
              <input type="number" min={0} value={form.adults} onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 0 })} className="input" />
            </div>
            <div>
              <label className="label">Children</label>
              <input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Meals</label>
              <input type="number" min={0} value={form.meals_received} onChange={(e) => setForm({ ...form, meals_received: parseInt(e.target.value) || 0 })} className="input" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.grocery_pack_received} onChange={(e) => setForm({ ...form, grocery_pack_received: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm">Grocery Pack</span>
              </label>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_new_guest} onChange={(e) => setForm({ ...form, is_new_guest: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm">New Guest</span>
              </label>
            </div>
            <div>
              <label className="label">Referral Source</label>
              <select value={form.referral_source} onChange={(e) => setForm({ ...form, referral_source: e.target.value })} className="input">
                <option value="">—</option>
                {REFERRAL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Dietary Notes</label>
            <input type="text" value={form.dietary_notes} onChange={(e) => setForm({ ...form, dietary_notes: e.target.value })} className="input" placeholder="e.g. Halal, Nut allergy" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold">Register Guest</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium">#</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Family</th>
              <th className="text-left px-4 py-3 font-medium">Meals</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Grocery</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Dietary</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : guests.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No guests registered yet.</td></tr>
            ) : guests.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-500">{g.registration_number}</td>
                <td className="px-4 py-3">{g.first_name || 'Anonymous'}</td>
                <td className="px-4 py-3">{g.adults}A + {g.children}C ({g.family_size})</td>
                <td className="px-4 py-3">{g.meals_received}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{g.grocery_pack_received ? 'Yes' : '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500">{g.dietary_notes || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{g.is_new_guest ? <span className="badge-active">New</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
