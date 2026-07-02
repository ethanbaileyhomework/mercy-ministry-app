import { useState, useEffect } from 'react';
import { Save, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ContentRow {
  key: string;
  value: string;
  label: string;
  page: string;
  sort_order: number;
}

const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  about: 'About',
  contact: 'Contact',
  donate: 'Donate',
  gethelp: 'Get Help',
  nav: 'Navigation',
  footer: 'Footer',
};

export function WebsiteContentPage() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    supabase
      .from('website_content')
      .select('key, value, label, page, sort_order')
      .order('page')
      .order('sort_order')
      .then(({ data }) => {
        if (data) {
          setRows(data as ContentRow[]);
          const initial: Record<string, string> = {};
          (data as ContentRow[]).forEach((r) => { initial[r.key] = r.value ?? ''; });
          setEdits(initial);
        }
        setLoading(false);
      });
  }, []);

  const pages = [...new Set(rows.map((r) => r.page))].sort((a, b) => {
    const order = ['home', 'about', 'contact', 'donate', 'gethelp', 'nav', 'footer'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const pageRows = rows.filter((r) => r.page === activeTab);

  const handleSave = async (key: string) => {
    setSaving((s) => ({ ...s, [key]: true }));
    const { error } = await supabase
      .from('website_content')
      .update({ value: edits[key], updated_at: new Date().toISOString() })
      .eq('key', key);
    setSaving((s) => ({ ...s, [key]: false }));
    if (error) {
      alert('Save failed: ' + error.message);
    } else {
      setSaved((s) => ({ ...s, [key]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
      setRows((prev) => prev.map((r) => r.key === key ? { ...r, value: edits[key] } : r));
    }
  };

  const handleSavePage = async () => {
    const keys = pageRows.map((r) => r.key);
    await Promise.all(keys.map((k) => handleSave(k)));
  };

  const isDirty = (key: string) => {
    const original = rows.find((r) => r.key === key)?.value ?? '';
    return edits[key] !== original;
  };

  const pageHasDirty = pageRows.some((r) => isDirty(r.key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe size={24} className="text-gold" />
          <h1 className="text-2xl font-bold">Website Content</h1>
        </div>
        {pageHasDirty && (
          <button onClick={handleSavePage} className="btn-gold flex items-center gap-2">
            <Save size={16} /> Save Page
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading content…</div>
      ) : (
        <>
          {/* Page tabs */}
          <div className="flex flex-wrap gap-2">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => setActiveTab(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === page
                    ? 'bg-navy text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {PAGE_LABELS[page] ?? page}
              </button>
            ))}
          </div>

          {/* Content fields */}
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-semibold">{PAGE_LABELS[activeTab] ?? activeTab} Page</h2>
            {pageRows.length === 0 ? (
              <p className="text-gray-500 text-sm">No content items for this page.</p>
            ) : (
              pageRows.map((row) => {
                const isLong = (row.value?.length ?? 0) > 80 || row.key.includes('body') || row.key.includes('description') || row.key.includes('text');
                return (
                  <div key={row.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="label">{row.label || row.key}</label>
                      {isDirty(row.key) && (
                        <button
                          onClick={() => handleSave(row.key)}
                          disabled={saving[row.key]}
                          className="text-xs text-gold hover:text-gold/80 font-medium disabled:opacity-50"
                        >
                          {saving[row.key] ? 'Saving…' : saved[row.key] ? 'Saved ✓' : 'Save'}
                        </button>
                      )}
                      {saved[row.key] && !isDirty(row.key) && (
                        <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                      )}
                    </div>
                    {isLong ? (
                      <textarea
                        value={edits[row.key] ?? ''}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        className="input resize-y min-h-[80px]"
                        rows={3}
                      />
                    ) : (
                      <input
                        type="text"
                        value={edits[row.key] ?? ''}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        className="input"
                      />
                    )}
                    <p className="text-xs text-gray-400 font-mono">{row.key}</p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
