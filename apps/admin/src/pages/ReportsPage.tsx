import { useState } from 'react';
import { FileText, Download, Table } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  formats: ('pdf' | 'excel')[];
  audience: string;
}

const REPORTS: ReportConfig[] = [
  { id: 'session-summary', name: 'Session Summary', description: 'Volunteers, guest count, meals, grocery packs, food safety pass rate', formats: ['pdf'], audience: 'Leadership' },
  { id: 'monthly-impact', name: 'Monthly Impact', description: 'Aggregate sessions: total people served, total volunteer hours, trends', formats: ['pdf', 'excel'], audience: 'Leadership / Church' },
  { id: 'volunteer-hours', name: 'Volunteer Hours', description: 'Individual hours per volunteer for any date range', formats: ['pdf'], audience: 'Volunteer Recognition' },
  { id: 'food-safety-audit', name: 'Food Safety Audit', description: 'All temp checks, pass/fail rates, corrective actions taken', formats: ['pdf'], audience: 'Compliance' },
  { id: 'donation-register', name: 'Donation Register', description: 'All donations received, donor names, quantities, expiry dates', formats: ['excel'], audience: 'Treasurer / Audit' },
  { id: 'guest-trends', name: 'Guest Trends', description: 'Week-on-week guest counts, family sizes, new vs returning', formats: ['pdf'], audience: 'Leadership' },
  { id: 'volunteer-register', name: 'Volunteer Register', description: 'Full volunteer list with WWCC numbers and emergency contacts', formats: ['pdf'], audience: 'Insurance / WHS' },
  { id: 'stock-inventory', name: 'Stock Inventory', description: 'Current stock levels and transaction history', formats: ['excel'], audience: 'Coordinator' },
];

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState<string | null>(null);

  const reportModules: Record<string, () => Promise<{ generate: (params: { supabase: typeof import('@/lib/supabase').supabase; dateFrom: string; dateTo: string; format: string }) => Promise<void> }>> = {
    'session-summary': () => import('@/lib/reports/session-summary'),
    'volunteer-hours': () => import('@/lib/reports/volunteer-hours'),
    'food-safety-audit': () => import('@/lib/reports/food-safety-audit'),
    'donation-register': () => import('@/lib/reports/donation-register'),
    'stock-inventory': () => import('@/lib/reports/stock-inventory'),
  };

  const handleGenerate = async (reportId: string, format: 'pdf' | 'excel') => {
    setGenerating(reportId);
    try {
      const loader = reportModules[reportId];
      if (!loader) {
        alert(`Report "${reportId}" is not yet implemented. Coming soon.`);
        return;
      }
      const module = await loader();
      await module.generate({ supabase, dateFrom, dateTo, format });
    } catch (err) {
      console.error(`Failed to generate ${reportId}:`, err);
      alert(`Failed to generate report. Please try again.`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reporting Centre</h1>

      {/* Date range */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {REPORTS.map((report) => (
          <div key={report.id} className="card p-5 flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <FileText size={20} className="text-navy dark:text-navy-300 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{report.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-3">Audience: {report.audience}</div>
            <div className="mt-auto flex gap-2">
              {report.formats.includes('pdf') && (
                <button
                  onClick={() => handleGenerate(report.id, 'pdf')}
                  disabled={generating === report.id}
                  className="btn-primary text-xs py-1.5 px-3 flex-1"
                >
                  <Download size={14} /> PDF
                </button>
              )}
              {report.formats.includes('excel') && (
                <button
                  onClick={() => handleGenerate(report.id, 'excel')}
                  disabled={generating === report.id}
                  className="btn-secondary text-xs py-1.5 px-3 flex-1"
                >
                  <Table size={14} /> Excel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
