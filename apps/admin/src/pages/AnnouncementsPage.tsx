import { useState, useEffect, useCallback } from 'react';
import { Plus, Megaphone, Trash2, Monitor } from 'lucide-react';
import { type Announcement, formatDateTimeAEST, announcementSchema } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', display_on_kiosk: false, expires_at: '' });

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (data) setAnnouncements(data as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = announcementSchema.safeParse({
      ...form,
      body: form.body || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    if (!parsed.success) { alert('Invalid data'); return; }
    const { error } = await supabase.from('announcements').insert(parsed.data);
    if (error) { alert(error.message); return; }
    setShowAdd(false);
    setForm({ title: '', body: '', display_on_kiosk: false, expires_at: '' });
    loadAnnouncements();
  };

  const handleToggleActive = async (ann: Announcement) => {
    await supabase.from('announcements').update({ is_active: !ann.is_active }).eq('id', ann.id);
    loadAnnouncements();
  };

  const handleDelete = async (ann: Announcement) => {
    if (!confirm(`Delete announcement "${ann.title}"?`)) return;
    await supabase.from('announcements').delete().eq('id', ann.id);
    loadAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus size={18} /> New Announcement
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Announcement</h2>
          <div>
            <label className="label">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Body</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input min-h-[80px]" />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.display_on_kiosk} onChange={(e) => setForm({ ...form, display_on_kiosk: e.target.checked })} className="w-4 h-4 rounded" />
              <Monitor size={16} /> Show on Kiosk
            </label>
            <div>
              <label className="label">Expires</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold">Create</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-gray-500">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No announcements yet.</div>
        ) : announcements.map((ann) => (
          <div key={ann.id} className={`card p-5 ${!ann.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone size={16} className="text-gold" />
                  <h3 className="font-semibold">{ann.title}</h3>
                  {ann.display_on_kiosk && (
                    <span className="badge bg-navy-100 text-navy-700 dark:bg-navy-900/30 dark:text-navy-300">
                      <Monitor size={12} className="mr-1" /> Kiosk
                    </span>
                  )}
                  {!ann.is_active && <span className="badge-draft">Inactive</span>}
                </div>
                {ann.body && <p className="text-sm text-gray-600 dark:text-gray-400">{ann.body}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  Created {formatDateTimeAEST(ann.created_at)}
                  {ann.expires_at && ` — Expires ${formatDateTimeAEST(ann.expires_at)}`}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleToggleActive(ann)} className="btn-ghost text-xs px-2 py-1">
                  {ann.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(ann)} className="btn-ghost text-xs px-2 py-1 text-red-500">
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
