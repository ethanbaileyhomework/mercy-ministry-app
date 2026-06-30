import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, ExternalLink, Cloud, CloudOff,
  Eye, CheckSquare, Square, TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SessionReport } from '@/components/SessionReport';

// ── Types ────────────────────────────────────────────────────

interface AISections {
  executiveSummary: string;
  communityImpact: string;
  kitchenOperations: string;
  distributionOperations: string;
  volunteerRecognition: string;
  foodSafetyStatement: string;
  incidentNotes: string | null;
  lookingAhead: string;
}

interface ReportRow {
  id: string;
  session_id: string | null;
  session_date: string;
  created_at: string;
  ai_sections: AISections;
  report_data: any;
  google_drive_url: string | null;
}

type Period = 'week' | 'month' | 'year' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
};

function getDateBounds(period: Period): { from: string; to: string } | null {
  if (period === 'all') return null;
  const now = new Date();
  let from: Date;
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (period === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    from = new Date(now.getFullYear(), 0, 1);
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

// ── Page ─────────────────────────────────────────────────────

export function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('session_reports')
        .select('id, session_id, session_date, created_at, ai_sections, report_data, google_drive_url')
        .order('session_date', { ascending: false });
      if (error) toast.error('Failed to load reports');
      if (data) setReports(data as ReportRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const bounds = getDateBounds(period);
    if (!bounds) return reports;
    return reports.filter(r => r.session_date >= bounds.from && r.session_date < bounds.to);
  }, [reports, period]);

  // Aggregate stats for the current filter period
  const stats = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const s = r.report_data?.session;
        return {
          reports: acc.reports + 1,
          people: acc.people + (s?.people_served ?? 0),
          meals: acc.meals + (s?.meals_served ?? 0),
          packs: acc.packs + (s?.grocery_packs_given ?? 0),
          hours: Math.round((acc.hours + (r.report_data?.totalHours ?? 0)) * 10) / 10,
        };
      },
      { reports: 0, people: 0, meals: 0, packs: 0, hours: 0 }
    );
  }, [filtered]);

  // Group by YYYY-MM for month headers
  const grouped = useMemo(() => {
    const map: Record<string, ReportRow[]> = {};
    for (const r of filtered) {
      const month = r.session_date.slice(0, 7);
      if (!map[month]) map[month] = [];
      map[month].push(r);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const driveCount = reports.filter(r => r.google_drive_url).length;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id))
    );
  };

  const handleBulkExport = () => {
    const toExport = reports.filter(r => selected.has(r.id));
    if (toExport.length === 0) return;
    const html = buildCombinedHTML(toExport);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 800);
    }
  };

  return (
    <div className="space-y-6">
      {/* Full report viewer modal */}
      {viewingReport && (
        <SessionReport data={viewingReport} onClose={() => setViewingReport(null)} />
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText size={24} /> Reports Archive
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {reports.length} service report{reports.length !== 1 ? 's' : ''} saved
            {driveCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Cloud size={12} /> {driveCount} backed up to Google Drive
              </span>
            )}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setSelected(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-white dark:bg-gray-700 text-navy dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Reports', value: stats.reports, color: 'text-navy dark:text-blue-400' },
          { label: 'People Served', value: stats.people.toLocaleString(), color: 'text-navy dark:text-blue-400' },
          { label: 'Meals Served', value: stats.meals.toLocaleString(), color: 'text-gold' },
          { label: 'Grocery Packs', value: stats.packs.toLocaleString(), color: 'text-green-600 dark:text-green-400' },
          { label: 'Volunteer Hours', value: `${stats.hours}h`, color: 'text-purple-600 dark:text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Selection toolbar ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy dark:hover:text-white transition-colors"
          >
            {selected.size > 0 && selected.size === filtered.length
              ? <CheckSquare size={16} className="text-navy dark:text-gold" />
              : <Square size={16} />}
            <span>
              {selected.size === 0
                ? 'Select all'
                : selected.size === filtered.length
                  ? 'Deselect all'
                  : `${selected.size} selected`}
            </span>
          </button>
          {selected.size > 0 && (
            <button onClick={handleBulkExport} className="btn-gold text-sm flex items-center gap-2">
              <Download size={15} />
              Export {selected.size} report{selected.size !== 1 ? 's' : ''} as PDF
            </button>
          )}
        </div>
      )}

      {/* ── Report list ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 space-y-3">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <TrendingUp size={40} className="text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400">
            {reports.length === 0
              ? 'No reports yet — they are generated automatically when a session ends.'
              : `No reports for ${PERIOD_LABELS[period].toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([monthKey, monthReports]) => (
            <div key={monthKey}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {formatMonthLabel(monthKey)}
                </h2>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {monthReports.length} report{monthReports.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {monthReports.map(r => {
                  const s = r.report_data?.session;
                  const isSelected = selected.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`card p-5 flex gap-4 transition-all duration-150 ${
                        isSelected ? 'ring-2 ring-navy dark:ring-gold' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(r.id)}
                        className="mt-0.5 flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-navy dark:hover:text-gold transition-colors"
                        aria-label="Select report"
                      >
                        {isSelected
                          ? <CheckSquare size={20} className="text-navy dark:text-gold" />
                          : <Square size={20} />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold">{formatDate(r.session_date)}</h3>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                              <span>Generated {new Date(r.created_at).toLocaleDateString('en-AU')}</span>
                              {r.google_drive_url ? (
                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Cloud size={10} /> Backed up to Drive
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400">
                                  <CloudOff size={10} /> Not in Drive
                                </span>
                              )}
                            </p>
                          </div>
                          {/* Stat pills */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-navy dark:text-blue-300">
                              {s?.people_served ?? 0} people
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                              {s?.meals_served ?? 0} meals
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                              {s?.grocery_packs_given ?? 0} packs
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                              {r.report_data?.totalHours ?? 0}h
                            </span>
                          </div>
                        </div>

                        {/* AI excerpt */}
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                          {r.ai_sections?.executiveSummary}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setViewingReport(r.report_data)}
                            className="btn-secondary text-xs flex items-center gap-1.5"
                          >
                            <Eye size={13} /> View Full Report
                          </button>
                          {r.google_drive_url && (
                            <a
                              href={r.google_drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Open in Drive
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bulk PDF export: builds a standalone HTML document ───────
// All selected reports are concatenated into one printable page.

function buildCombinedHTML(reports: ReportRow[]): string {
  const reportSections = reports.map(r => {
    const s = r.report_data?.session;
    const ai = r.ai_sections;
    const date = formatDate(r.session_date);
    const totalHours = r.report_data?.totalHours ?? 0;
    const att: any[] = r.report_data?.attendance ?? [];
    const foodLogs: any[] = r.report_data?.foodLogs ?? [];

    const attRows = att.map(a => {
      const name = `${a.volunteers?.first_name || ''} ${a.volunteers?.last_name || ''}`;
      const area = a.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall';
      const leader = a.is_leader_on_day ? ' ★' : '';
      const signIn = a.sign_in_time
        ? new Date(a.sign_in_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '—';
      const signOut = a.sign_out_time
        ? new Date(a.sign_out_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '—';
      const hours = a.hours_served ? `${Math.round(a.hours_served * 10) / 10}h` : '—';
      return `<tr><td>${name}${leader}</td><td>${area}</td><td>${signIn}</td><td>${signOut}</td><td>${hours}</td></tr>`;
    }).join('');

    const tempRows = foodLogs.map(f => {
      const typeLabel: Record<string, string> = { hot: 'Hot', cold: 'Cold Hold', reheat: 'Reheat', fridge: 'Fridge' };
      const rc = f.result === 'PASS' ? '#16a34a' : '#dc2626';
      return `<tr><td>${f.food_item}</td><td>${typeLabel[f.food_type] || f.food_type}</td><td style="font-family:monospace">${f.temp_celsius}°C</td><td style="color:${rc};font-weight:700">${f.result}</td><td style="color:#6b7280;font-size:11px">${f.corrective_action || '—'}</td></tr>`;
    }).join('');

    return `
<div class="report">
  <div class="cover">
    <div class="org">MERCY MINISTRY CRANBOURNE · SERVICE REPORT</div>
    <h1>${date}</h1>
    <div class="metrics">
      <div class="metric"><div class="n">${s?.people_served ?? 0}</div><div class="l">People Served</div></div>
      <div class="metric"><div class="n">${s?.meals_served ?? 0}</div><div class="l">Meals Prepared</div></div>
      <div class="metric"><div class="n">${s?.grocery_packs_given ?? 0}</div><div class="l">Grocery Packs</div></div>
      <div class="metric"><div class="n">${totalHours}h</div><div class="l">Volunteer Hours</div></div>
    </div>
    <div class="meta">
      <span><b>Duration:</b> ${r.report_data?.durationStr ?? '—'}</span>
      <span><b>Volunteers:</b> ${att.length}</span>
      <span><b>Food Safety:</b> ${r.report_data?.passChecks ?? 0}/${(r.report_data?.passChecks ?? 0) + (r.report_data?.failChecks ?? 0)} passed</span>
    </div>
  </div>
  <div class="section"><div class="tag">Executive Summary</div><p>${ai?.executiveSummary ?? ''}</p></div>
  <div class="section"><div class="tag">Community Impact</div><p>${ai?.communityImpact ?? ''}</p></div>
  <div class="section"><div class="tag">Kitchen Operations</div><p>${ai?.kitchenOperations ?? ''}</p>${s?.what_was_served ? `<p class="note">Menu: ${s.what_was_served}</p>` : ''}</div>
  <div class="section"><div class="tag">Distribution Operations</div><p>${ai?.distributionOperations ?? ''}</p></div>
  <div class="section"><div class="tag">Volunteer Recognition</div><p>${ai?.volunteerRecognition ?? ''}</p></div>
  <div class="section"><div class="tag">Food Safety Compliance</div><p>${ai?.foodSafetyStatement ?? ''}</p>${foodLogs.length > 0 ? `<table><thead><tr><th>Food Item</th><th>Type</th><th>Temp</th><th>Result</th><th>Corrective Action</th></tr></thead><tbody>${tempRows}</tbody></table>` : ''}</div>
  ${ai?.incidentNotes ? `<div class="section"><div class="tag">Incident Notes</div><p>${ai.incidentNotes}</p></div>` : ''}
  <div class="section"><div class="tag">Attendance Register</div><table><thead><tr><th>Name</th><th>Area</th><th>Sign In</th><th>Sign Out</th><th>Hours</th></tr></thead><tbody>${attRows}</tbody></table></div>
  ${s?.coordinator_notes ? `<div class="section"><div class="tag">Coordinator Notes</div><p>${s.coordinator_notes}</p></div>` : ''}
  <div class="section"><div class="tag">Looking Ahead</div><p>${ai?.lookingAhead ?? ''}</p></div>
</div>`;
  }).join('<div class="page-break"></div>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Mercy Ministry — ${reports.length} Service Report${reports.length !== 1 ? 's' : ''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .controls{background:white;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:10}
  .controls h2{font-size:15px;font-weight:700;color:#1e293b}
  .print-btn{background:#1a1a2e;color:white;border:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
  .print-btn:hover{background:#C9A84C;color:#1a1a2e}
  .report{max-width:860px;margin:28px auto;padding:0 16px}
  .cover{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:14px;padding:36px;margin-bottom:18px;color:white}
  .org{font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:8px}
  .cover h1{font-size:23px;font-weight:800;margin-bottom:18px}
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
  .metric{background:rgba(255,255,255,.08);border-radius:10px;padding:14px;text-align:center}
  .metric .n{font-size:26px;font-weight:800;color:#C9A84C}
  .metric .l{font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
  .meta{display:flex;flex-wrap:wrap;gap:16px;font-size:11px;color:rgba(255,255,255,.5)}
  .meta b{color:rgba(255,255,255,.8)}
  .section{background:white;border-radius:10px;padding:20px;margin-bottom:12px;border:1px solid #e2e8f0}
  .tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#C9A84C;margin-bottom:7px}
  .section p{font-size:13px;line-height:1.75;color:#475569}
  .note{font-style:italic;color:#94a3b8;font-size:12px;margin-top:7px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  th{text-align:left;padding:7px 9px;background:#f8fafc;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:2px solid #e2e8f0}
  td{padding:7px 9px;border-bottom:1px solid #f1f5f9;color:#374151}
  tr:last-child td{border-bottom:none}
  .page-break{height:32px}
  @media print{
    .controls{display:none}
    body{background:white}
    .report{padding:0 8px;margin:8px auto}
    .page-break{page-break-after:always;height:0;display:block}
  }
</style>
</head>
<body>
<div class="controls">
  <h2>Mercy Ministry — ${reports.length} Service Report${reports.length !== 1 ? 's' : ''}</h2>
  <button class="print-btn" onclick="window.print()">🖨️ Save as PDF</button>
</div>
${reportSections}
</body>
</html>`;
}
