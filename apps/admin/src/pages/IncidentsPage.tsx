import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useActiveSession, formatTimeAEST, type Incident } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type IncidentRow = Incident & { volunteers: { first_name: string; last_name: string } | null };

export function IncidentsPage() {
  const { session } = useActiveSession(supabase);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low');

  const loadIncidents = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data } = await supabase
      .from('incidents')
      .select('*, volunteers(first_name, last_name)')
      .eq('session_id', session.id)
      .order('reported_at', { ascending: false });
    if (data) setIncidents(data as IncidentRow[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const { error } = await supabase.from('incidents').insert({
      session_id: session.id,
      title: title.trim(),
      description: description.trim() || null,
      severity,
      reported_at: new Date().toISOString(),
    });

    if (error) { toast.error(error.message); return; }
    toast.success('Incident logged');
    setTitle('');
    setDescription('');
    setSeverity('low');
    loadIncidents();
  };

  // FIX #3 — delete an incident
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident? This cannot be undone.')) return;
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Incident deleted');
    loadIncidents();
  };

  // Removed local formatTime — using shared formatTimeAEST for consistency
  const severityColor = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle size={24} /> Incident Log
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Record any incidents during the session</p>
      </div>

      {/* Form */}
      {session && session.status === 'active' ? (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Report Incident</h2>
          <div>
            <label className="label">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Brief description of what happened"
              required
            />
          </div>
          <div>
            <label className="label">Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Full details of the incident..."
            />
          </div>
          <div>
            <label className="label mb-2">Severity</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 py-2.5 rounded-lg font-medium capitalize transition-all ${
                    severity === s
                      ? s === 'high' ? 'bg-red-500 text-white' : s === 'medium' ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-gold" disabled={!title.trim()}>
            Log Incident
          </button>
        </form>
      ) : (
        <div className="card p-8 text-center text-gray-500">
          Start a session to log incidents.
        </div>
      )}

      {/* Incident list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No incidents recorded this session.</div>
        ) : incidents.map((inc) => (
          <div key={inc.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{inc.title}</h3>
                {inc.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{inc.description}</p>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {formatTimeAEST(inc.reported_at)}
                  {inc.volunteers && ` — ${inc.volunteers.first_name} ${inc.volunteers.last_name}`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${severityColor[inc.severity]} capitalize`}>
                  {inc.severity}
                </span>
                {/* FIX #3 — delete button */}
                <button
                  onClick={() => handleDelete(inc.id)}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete incident"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
