import { useState, useEffect, useCallback } from 'react';
import { Thermometer, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useActiveSession, evaluateTemperature, formatTimeAEST, type FoodSafetyLog } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function FoodSafetyPage() {
  const { session } = useActiveSession(supabase);
  const [logs, setLogs] = useState<(FoodSafetyLog & { volunteers?: { first_name: string; last_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [foodItem, setFoodItem] = useState('');
  const [foodType, setFoodType] = useState<'hot' | 'cold' | 'reheat' | 'fridge' | ''>('');
  const [tempStr, setTempStr] = useState('');
  const [probeId, setProbeId] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  const temp = tempStr ? parseFloat(tempStr) : null;
  const previewResult = temp !== null && !isNaN(temp) && foodType
    ? evaluateTemperature(temp, foodType)
    : null;

  const loadLogs = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data } = await supabase
      .from('food_safety_logs')
      .select('*, volunteers(first_name, last_name)')
      .eq('session_id', session.id)
      .order('logged_at', { ascending: false });
    if (data) setLogs(data as typeof logs);
    setLoading(false);
  }, [session]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const resetForm = () => {
    setFoodItem('');
    setFoodType('');
    setTempStr('');
    setProbeId('');
    setCorrectiveAction('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !foodType || temp === null) return;

    const result = evaluateTemperature(temp, foodType);

    if (result === 'FAIL' && !correctiveAction.trim()) {
      toast.error('Corrective action is required for a FAIL result');
      return;
    }

    const { error } = await supabase.from('food_safety_logs').insert({
      session_id: session.id,
      food_item: foodItem.trim(),
      food_type: foodType,
      temp_celsius: temp,
      result,
      corrective_action: result === 'FAIL' ? correctiveAction.trim() : null,
      probe_id: probeId.trim() || null,
      logged_at: new Date().toISOString(),
    });

    if (error) { toast.error(error.message); return; }
    toast.success(`Temperature logged: ${result}`);
    resetForm();
    loadLogs();
  };

  // FIX #3 — delete a food safety log
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this temperature log? This cannot be undone.')) return;
    const { error } = await supabase.from('food_safety_logs').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Log deleted');
    loadLogs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Thermometer size={24} /> Food Safety Logger
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Victorian Food Act 1984 compliant temperature logging
        </p>
      </div>

      {/* Log form */}
      {session && session.status === 'active' && (
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Temperature Check</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Food Item *</label>
              <input
                type="text"
                value={foodItem}
                onChange={(e) => setFoodItem(e.target.value)}
                className="input"
                placeholder="e.g. Beef Stew"
                required
              />
            </div>
            <div>
              <label className="label">Probe ID (optional)</label>
              <input
                type="text"
                value={probeId}
                onChange={(e) => setProbeId(e.target.value)}
                className="input"
                placeholder="e.g. PROBE-01"
              />
            </div>
          </div>

          {/* Food type buttons */}
          <div>
            <label className="label mb-2">Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { value: 'hot', label: "Hot Holding \u2265 60\u00B0C", activeClass: 'bg-red-500 text-white shadow-lg' },
                { value: 'cold', label: "Cold Holding \u2264 5\u00B0C", activeClass: 'bg-blue-500 text-white shadow-lg' },
                { value: 'reheat', label: "Reheat \u2265 75\u00B0C", activeClass: 'bg-orange-500 text-white shadow-lg' },
                { value: 'fridge', label: "Fridge Storage \u2264 5\u00B0C", activeClass: 'bg-cyan-500 text-white shadow-lg' },
              ] as const).map(({ value, label, activeClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFoodType(value)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    foodType === value
                      ? activeClass
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Victorian Food Act 1984 — Danger zone: 5°C to 60°C. Reheated food must reach 75°C.
            </p>
          </div>

          {/* Temperature input */}
          <div>
            <label className="label">Temperature (°C) *</label>
            <input
              type="number"
              step="0.1"
              min="-50"
              max="300"
              value={tempStr}
              onChange={(e) => setTempStr(e.target.value)}
              className="input text-2xl font-bold text-center py-3"
              placeholder="0.0"
              required
            />
          </div>

          {/* Live result preview */}
          {previewResult && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border-2 text-lg font-semibold ${
              previewResult === 'PASS'
                ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
            }`}>
              {previewResult === 'PASS' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              {previewResult}
              {previewResult === 'FAIL' && (
                <span className="text-sm font-normal ml-2">— Corrective action required</span>
              )}
            </div>
          )}

          {/* Corrective action (FAIL only) */}
          {previewResult === 'FAIL' && (
            <div>
              <label className="label text-red-600 dark:text-red-400">Corrective Action Required *</label>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                className="input min-h-[80px]"
                placeholder="Describe the corrective action taken..."
                required
              />
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-gold" disabled={!foodItem || !foodType || !tempStr}>
              Save Temperature Check
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Clear
            </button>
          </div>
        </form>
      )}

      {(!session || session.status !== 'active') && (
        <div className="card p-8 text-center text-gray-500">
          Start a session to log temperatures.
        </div>
      )}

      {/* Today's logs table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm">Today&apos;s Temperature Logs</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">Food Item</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Temp</th>
              <th className="text-left px-4 py-3 font-medium">Result</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Logged By</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Corrective Action</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No temperature checks recorded yet.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">{formatTimeAEST(log.logged_at)}</td>
                <td className="px-4 py-3 font-medium">{log.food_item}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    {
                      hot: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      reheat: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      fridge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
                    }[log.food_type]
                  }`}>
                    {{ hot: 'Hot', cold: 'Cold', reheat: 'Reheat', fridge: 'Fridge' }[log.food_type]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{log.temp_celsius}°C</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                    log.result === 'PASS'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {log.result === 'PASS' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {log.result}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                  {log.volunteers ? `${log.volunteers.first_name} ${log.volunteers.last_name}` : '—'}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500 truncate max-w-xs">
                  {log.corrective_action || '—'}
                </td>
                {/* FIX #3 — delete button */}
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete log"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
