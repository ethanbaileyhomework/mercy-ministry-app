import { useState, useEffect } from 'react';
import { Clock, Download, ChevronDown, ChevronUp, Users, Thermometer, AlertTriangle, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Session, VolunteerAttendance, FoodSafetyLog, Incident } from '@mercy/shared';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SessionReport } from '@/components/SessionReport';

type AttendanceRow = VolunteerAttendance & { volunteers: { first_name: string; last_name: string } };
type FoodLogRow = FoodSafetyLog & { volunteers: { first_name: string; last_name: string } | null };
type IncidentRow = Incident & { volunteers: { first_name: string; last_name: string } | null };

type SessionDetail = {
  attendance: AttendanceRow[];
  foodLogs: FoodLogRow[];
  incidents: IncidentRow[];
};

export function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null); // session id being generated

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: false });
      if (data) setSessions(data as Session[]);
      setLoading(false);
    }
    load();
  }, []);

  const toggleSession = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setLoadingDetail(true); // FIX #15

    const [attRes, foodRes, incRes] = await Promise.all([
      supabase.from('volunteer_attendance').select('*, volunteers(first_name, last_name)').eq('session_id', id).order('sign_in_time'),
      supabase.from('food_safety_logs').select('*, volunteers(first_name, last_name)').eq('session_id', id).order('logged_at'),
      supabase.from('incidents').select('*, volunteers(first_name, last_name)').eq('session_id', id).order('reported_at'),
    ]);

    setDetail({
      attendance: (attRes.data || []) as AttendanceRow[],
      foodLogs: (foodRes.data || []) as FoodLogRow[],
      incidents: (incRes.data || []) as IncidentRow[],
    });
    setLoadingDetail(false);
  };

  const exportToExcel = async () => {
    toast.info('Generating Excel export...');

    const [sessRes, attRes, foodRes, incRes] = await Promise.all([
      supabase.from('sessions').select('*').order('session_date', { ascending: false }),
      supabase.from('volunteer_attendance').select('*, volunteers(first_name, last_name)').order('sign_in_time'),
      supabase.from('food_safety_logs').select('*, volunteers(first_name, last_name)').order('logged_at'),
      supabase.from('incidents').select('*, volunteers(first_name, last_name)').order('reported_at'),
    ]);

    const allSessions = (sessRes.data || []) as Session[];
    const allAttendance = (attRes.data || []) as AttendanceRow[];
    const allFoodLogs = (foodRes.data || []) as FoodLogRow[];
    const allIncidents = (incRes.data || []) as IncidentRow[];

    const sessionDateMap: Record<string, string> = {};
    allSessions.forEach((s) => { sessionDateMap[s.id] = s.session_date; });

    const sessRows = allSessions.map((s) => ({
      'Date': s.session_date,
      'Status': s.status,
      'People Served': s.people_served,
      'Meals Served': s.meals_served,
      'Grocery Packs': s.grocery_packs_given,
      'What Was Served': s.what_was_served || '',
      'Notes': s.coordinator_notes || '',
    }));

    const attRows = allAttendance.map((a) => ({
      'Date': sessionDateMap[a.session_id] || '',
      'First Name': a.volunteers?.first_name || '',
      'Last Name': a.volunteers?.last_name || '',
      'Area': a.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall',
      'Leader': a.is_leader_on_day ? 'Yes' : 'No',
      'Sign In': a.sign_in_time ? new Date(a.sign_in_time).toLocaleTimeString('en-AU') : '',
      // FIX #14 — show "(not signed out)" instead of blank
      'Sign Out': a.sign_out_time ? new Date(a.sign_out_time).toLocaleTimeString('en-AU') : '(not signed out)',
      'Hours': a.hours_served || '',
    }));

    const foodRows = allFoodLogs.map((f) => ({
      'Date': sessionDateMap[f.session_id] || '',
      'Food Item': f.food_item,
      'Type': { hot: 'Hot', cold: 'Cold', reheat: 'Reheat', fridge: 'Fridge' }[f.food_type] || f.food_type,
      'Temperature (°C)': f.temp_celsius,
      'Result': f.result,
      'Probe ID': f.probe_id || '',
      'Corrective Action': f.corrective_action || '',
      'Logged By': f.volunteers ? `${f.volunteers.first_name} ${f.volunteers.last_name}` : '',
      'Time': f.logged_at ? new Date(f.logged_at).toLocaleTimeString('en-AU') : '',
    }));

    const incRows = allIncidents.map((i) => ({
      'Date': sessionDateMap[i.session_id] || '',
      'Title': i.title,
      'Description': i.description || '',
      'Severity': i.severity,
      'Reported By': i.volunteers ? `${i.volunteers.first_name} ${i.volunteers.last_name}` : '',
      'Time': i.reported_at ? new Date(i.reported_at).toLocaleTimeString('en-AU') : '',
    }));

    const wb = XLSX.utils.book_new();
    const addSheet = (name: string, rows: Record<string, unknown>[]) => {
      if (rows.length === 0) rows = [{}];
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] || '').length)) + 2,
      }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet('Sessions', sessRows);
    addSheet('Attendance', attRows);
    addSheet('Food Safety', foodRows);
    addSheet('Incidents', incRows);

    XLSX.writeFile(wb, `mercy-ministry-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported!');
  };

  const exportSingleSession = (s: Session, d: SessionDetail) => {
    const wb = XLSX.utils.book_new();
    const addSheet = (name: string, rows: Record<string, unknown>[]) => {
      if (rows.length === 0) rows = [{}];
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] || '').length)) + 2,
      }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet('Summary', [{
      'Date': s.session_date,
      'Status': s.status,
      'People Served': s.people_served,
      'Meals Served': s.meals_served,
      'Grocery Packs': s.grocery_packs_given,
      'What Was Served': s.what_was_served || '',
      'Notes': s.coordinator_notes || '',
      'Volunteers': d.attendance.length,
      'Temp Checks': d.foodLogs.length,
      'Incidents': d.incidents.length,
    }]);

    addSheet('Attendance', d.attendance.map((a) => ({
      'First Name': a.volunteers?.first_name || '',
      'Last Name': a.volunteers?.last_name || '',
      'Area': a.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall',
      'Leader': a.is_leader_on_day ? 'Yes' : 'No',
      'Sign In': a.sign_in_time ? new Date(a.sign_in_time).toLocaleTimeString('en-AU') : '',
      // FIX #14 — consistent "(not signed out)" label in exports
      'Sign Out': a.sign_out_time ? new Date(a.sign_out_time).toLocaleTimeString('en-AU') : '(not signed out)',
      'Hours': a.hours_served || '',
    })));

    addSheet('Food Safety', d.foodLogs.map((f) => ({
      'Food Item': f.food_item,
      'Type': { hot: 'Hot', cold: 'Cold', reheat: 'Reheat', fridge: 'Fridge' }[f.food_type] || f.food_type,
      'Temperature (°C)': f.temp_celsius,
      'Result': f.result,
      'Probe ID': f.probe_id || '',
      'Corrective Action': f.corrective_action || '',
      'Logged By': f.volunteers ? `${f.volunteers.first_name} ${f.volunteers.last_name}` : '',
      'Time': f.logged_at ? new Date(f.logged_at).toLocaleTimeString('en-AU') : '',
    })));

    addSheet('Incidents', d.incidents.map((i) => ({
      'Title': i.title,
      'Description': i.description || '',
      'Severity': i.severity,
      'Reported By': i.volunteers ? `${i.volunteers.first_name} ${i.volunteers.last_name}` : '',
      'Time': i.reported_at ? new Date(i.reported_at).toLocaleTimeString('en-AU') : '',
    })));

    XLSX.writeFile(wb, `mercy-ministry-${s.session_date}.xlsx`);
    toast.success(`Exported session ${s.session_date}`);
  };

  const generateReport = async (sessionId: string) => {
    setGeneratingReport(sessionId);
    toast.info('Generating AI report…');
    try {
      const invokePromise = supabase.functions.invoke('generate-session-report', {
        body: { session_id: sessionId },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Report generation timed out after 30s')), 30_000)
      );
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
      if (error) throw error;
      setReportData(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  // FIX #7 — inclusive end date (was accidentally correct but clarified)
  const filtered = sessions.filter((s) => {
    if (dateFrom && s.session_date < dateFrom) return false;
    if (dateTo && s.session_date > dateTo) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* AI Report modal */}
      {reportData && (
        <SessionReport data={reportData} onClose={() => setReportData(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock size={24} /> History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Past sessions and full export</p>
        </div>
        <button onClick={exportToExcel} className="btn-gold">
          <Download size={18} /> Export All to Excel
        </button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500 dark:text-gray-400">Filter:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="input text-sm w-auto"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="input text-sm w-auto"
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gold hover:underline">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-2">
              <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {sessions.length === 0 ? 'No sessions recorded yet.' : 'No sessions match your date filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            return (
              <div key={s.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleSession(s.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left"
                >
                  <div>
                    <div className="font-semibold">{s.session_date}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                      <span>{s.people_served} people</span>
                      <span>{s.meals_served} meals</span>
                      <span>{s.grocery_packs_given} packs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge-${s.status}`}>{s.status}</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-5">
                    {/* FIX #15 — loading state while detail fetches */}
                    {loadingDetail ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : detail ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => generateReport(s.id)}
                            disabled={generatingReport === s.id}
                            className="btn-gold text-xs flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <Sparkles size={14} />
                            {generatingReport === s.id ? 'Generating…' : 'AI Report'}
                          </button>
                          <button
                            onClick={() => exportSingleSession(s, detail)}
                            className="btn-secondary text-xs"
                          >
                            <Download size={14} /> Export This Session
                          </button>
                        </div>

                        {s.what_was_served && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">What was served</h4>
                            <p className="text-sm">{s.what_was_served}</p>
                          </div>
                        )}
                        {s.coordinator_notes && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h4>
                            <p className="text-sm">{s.coordinator_notes}</p>
                          </div>
                        )}

                        {/* Volunteers */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                            <Users size={14} /> Volunteers ({detail.attendance.length})
                          </h4>
                          {detail.attendance.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {detail.attendance.map((a) => (
                                <div key={a.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                                  <span>
                                    {a.volunteers.first_name} {a.volunteers.last_name}
                                    <span className={`ml-2 text-xs ${a.area_on_day === 'kitchen' ? 'text-red-500' : 'text-blue-500'}`}>
                                      {a.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall'}
                                    </span>
                                  </span>
                                  {/* FIX #14 — show "(not signed out)" instead of blank */}
                                  <span className={`text-xs ${a.sign_out_time ? 'text-gray-500' : 'text-amber-500'}`}>
                                    {a.hours_served ? `${a.hours_served}h` : a.sign_out_time ? '—' : '(not signed out)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-gray-400">No attendance records</p>}
                        </div>

                        {/* Temp Logs */}
                        {detail.foodLogs.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                              <Thermometer size={14} /> Temperature Logs ({detail.foodLogs.length})
                            </h4>
                            <div className="space-y-1">
                              {detail.foodLogs.map((f) => (
                                <div key={f.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                                  <span>{f.food_item} ({f.food_type}) — {f.temp_celsius}°C</span>
                                  <span className={f.result === 'PASS' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{f.result}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Incidents */}
                        {detail.incidents.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                              <AlertTriangle size={14} /> Incidents ({detail.incidents.length})
                            </h4>
                            <div className="space-y-1">
                              {detail.incidents.map((i) => (
                                <div key={i.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                                  <div className="font-medium">
                                    {i.title}
                                    <span className={`text-xs ml-2 ${i.severity === 'high' ? 'text-red-500' : i.severity === 'medium' ? 'text-amber-500' : 'text-gray-500'}`}>
                                      ({i.severity})
                                    </span>
                                  </div>
                                  {i.description && <p className="text-gray-500 text-xs mt-1">{i.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
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
