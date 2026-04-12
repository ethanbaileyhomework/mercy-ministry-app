import { useState, useEffect, useCallback } from 'react';
import { Plus, Thermometer, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useActiveSession, FOOD_CATEGORIES, evaluateTemperature, formatTimeAEST, type FoodSafetyLog, type FoodCategory, foodSafetyLogSchema } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function FoodSafetyPage() {
  const { session } = useActiveSession(supabase);
  const [logs, setLogs] = useState<FoodSafetyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    food_item: '', food_category: '' as string, temp_celsius: '',
    corrective_action: '', probe_id: '', notes: '',
  });
  const [previewResult, setPreviewResult] = useState<'PASS' | 'FAIL' | 'ADVISORY' | null>(null);

  const loadLogs = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data } = await supabase
      .from('food_safety_logs')
      .select('*')
      .eq('session_id', session.id)
      .order('check_time', { ascending: false });
    if (data) setLogs(data as FoodSafetyLog[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Live preview of pass/fail as user types
  useEffect(() => {
    const temp = parseFloat(form.temp_celsius);
    if (!isNaN(temp) && form.food_category) {
      setPreviewResult(evaluateTemperature(temp, form.food_category as FoodCategory));
    } else {
      setPreviewResult(null);
    }
  }, [form.temp_celsius, form.food_category]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // Require corrective action if FAIL
    if (previewResult === 'FAIL' && !form.corrective_action.trim()) {
      alert('Corrective action is required for a FAIL result.');
      return;
    }

    const payload = {
      session_id: session.id,
      food_item: form.food_item.trim(),
      food_category: (form.food_category || null) as FoodCategory | null,
      temp_celsius: form.temp_celsius ? parseFloat(form.temp_celsius) : null,
      check_time: new Date().toISOString(),
      corrective_action: form.corrective_action.trim() || null,
      probe_id: form.probe_id.trim() || null,
      notes: form.notes.trim() || null,
    };

    const parsed = foodSafetyLogSchema.safeParse(payload);
    if (!parsed.success) { alert('Invalid data'); return; }

    const { error } = await supabase.from('food_safety_logs').insert(parsed.data);
    if (error) { alert(error.message); return; }

    setShowAdd(false);
    setForm({ food_item: '', food_category: '', temp_celsius: '', corrective_action: '', probe_id: '', notes: '' });
    setPreviewResult(null);
    loadLogs();
  };

  const resultIcon = (result: string | null) => {
    if (result === 'PASS') return <CheckCircle size={16} className="text-green-600" />;
    if (result === 'FAIL') return <XCircle size={16} className="text-red-600" />;
    return <AlertTriangle size={16} className="text-amber-600" />;
  };

  const CATEGORY_LABELS: Record<string, string> = {
    hot_meal: 'Hot Meal (must be >= 60°C)',
    cold_item: 'Cold Item (must be <= 5°C)',
    dairy: 'Dairy (must be <= 5°C)',
    produce: 'Produce (must be <= 5°C)',
    packaged: 'Packaged (advisory only)',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Food Safety Logger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Victorian Food Act 1984 compliant temperature logging</p>
        </div>
        {session?.status === 'active' && (
          <button onClick={() => setShowAdd(!showAdd)} className="btn-gold">
            <Plus size={18} /> Log Temperature
          </button>
        )}
      </div>

      {showAdd && session && (
        <form onSubmit={handleAdd} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Thermometer size={20} /> Temperature Check
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Food Item *</label>
              <input type="text" value={form.food_item} onChange={(e) => setForm({ ...form, food_item: e.target.value })} className="input" placeholder="e.g. Beef Stew" required />
            </div>
            <div>
              <label className="label">Category *</label>
              <select value={form.food_category} onChange={(e) => setForm({ ...form, food_category: e.target.value })} className="input" required>
                <option value="">Select category</option>
                {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Temperature (°C) *</label>
              <input type="number" step="0.1" value={form.temp_celsius} onChange={(e) => setForm({ ...form, temp_celsius: e.target.value })} className="input" placeholder="e.g. 72.5" required />
            </div>
          </div>

          {/* Live result preview */}
          {previewResult && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
              previewResult === 'PASS' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' :
              previewResult === 'FAIL' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' :
              'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
            }`}>
              {resultIcon(previewResult)}
              <span className="font-semibold">{previewResult}</span>
              {previewResult === 'FAIL' && <span className="text-sm">— Corrective action required below</span>}
            </div>
          )}

          {/* Corrective action (visible on FAIL) */}
          {previewResult === 'FAIL' && (
            <div>
              <label className="label text-red-600 dark:text-red-400">Corrective Action Required *</label>
              <textarea value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} className="input min-h-[80px]" placeholder="Describe the corrective action taken..." required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Probe ID</label>
              <input type="text" value={form.probe_id} onChange={(e) => setForm({ ...form, probe_id: e.target.value })} className="input" placeholder="e.g. PROBE-01" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" placeholder="Optional notes" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-gold">Save Temperature Check</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">Food Item</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Temp °C</th>
              <th className="text-left px-4 py-3 font-medium">Result</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Probe</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Corrective Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No temperature checks recorded yet.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">{formatTimeAEST(log.check_time)}</td>
                <td className="px-4 py-3 font-medium">{log.food_item}</td>
                <td className="px-4 py-3 text-gray-500">{log.food_category?.replace('_', ' ')}</td>
                <td className="px-4 py-3">{log.temp_celsius}°C</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    {resultIcon(log.pass_fail)}
                    <span className={`badge-${log.pass_fail?.toLowerCase()}`}>{log.pass_fail}</span>
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500">{log.probe_id || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500 truncate max-w-xs">{log.corrective_action || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
