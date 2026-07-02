import { X, Printer, ChefHat, Building2, Users, Thermometer, AlertTriangle, Heart, CheckCircle, XCircle } from 'lucide-react';
import type { Session, VolunteerAttendance, FoodSafetyLog, Incident, Volunteer } from '@mercy/shared';

type AttendanceWithVol = VolunteerAttendance & {
  volunteers: Pick<Volunteer, 'first_name' | 'last_name' | 'is_leader'>
};

interface AISections {
  executiveSummary: string
  communityImpact: string
  kitchenOperations: string
  distributionOperations: string
  volunteerRecognition: string
  foodSafetyStatement: string
  incidentNotes: string | null
  lookingAhead: string
}

interface ReportData {
  session: Session
  attendance: AttendanceWithVol[]
  foodLogs: FoodSafetyLog[]
  incidents: Incident[]
  kitchenVols: AttendanceWithVol[]
  hallVols: AttendanceWithVol[]
  leaders: AttendanceWithVol[]
  totalHours: number
  passChecks: number
  failChecks: number
  durationStr: string
  aiSections: AISections
}

interface SessionReportProps {
  data: ReportData
  onClose: () => void
}

const FOOD_TYPE_LABEL: Record<string, string> = {
  hot: 'Hot Holding',
  cold: 'Cold Holding ≤5°C',
  reheat: 'Reheat ≥75°C',
  fridge: 'Fridge Storage ≤5°C',
}

export function SessionReport({ data, onClose }: SessionReportProps) {
  const { session, foodLogs, incidents, kitchenVols, hallVols, totalHours, passChecks, failChecks, durationStr, aiSections } = data;

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })

  const formatShortTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })

  const generatedAt = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  } as any)

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #mercy-report, #mercy-report * { visibility: visible; }
          #mercy-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        @page { margin: 15mm; size: A4; }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-6 px-4 no-print">
        <div className="w-full max-w-4xl">

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3 no-print">
            <p className="text-white/60 text-sm">Auto-generated after session end · Review before sharing</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy rounded-lg font-bold text-sm hover:bg-gold/90 transition-colors"
              >
                <Printer size={16} /> Save as PDF
              </button>
              <button onClick={onClose} className="p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Report Document ── */}
          <div id="mercy-report" className="bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden font-sans">

            {/* ── Cover Header ── */}
            <div className="bg-gray-950 text-white px-10 py-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Heart size={28} className="text-yellow-400" fill="#facc15" />
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight leading-none">Mercy Ministry</h1>
                      <p className="text-gray-400 text-sm mt-0.5">Cranbourne Food Relief Outreach · Cranbourne, VIC</p>
                    </div>
                  </div>
                  <h2 className="text-yellow-400 text-lg font-semibold mt-4">Service Report</h2>
                  <p className="text-white text-2xl font-bold mt-1">{formatDate(session.session_date)}</p>
                </div>

                <div className="text-right text-sm shrink-0">
                  {session.started_at && (
                    <div className="mb-1">
                      <span className="text-gray-400">Start </span>
                      <span className="font-semibold">{formatShortTime(session.started_at)}</span>
                    </div>
                  )}
                  {session.ended_at && (
                    <div className="mb-1">
                      <span className="text-gray-400">End </span>
                      <span className="font-semibold">{formatShortTime(session.ended_at)}</span>
                    </div>
                  )}
                  <div className="mt-2 text-yellow-400 font-bold">{durationStr}</div>
                  <div className="mt-3 text-gray-500 text-xs">
                    Report generated<br />{generatedAt}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Impact Metrics Bar ── */}
            <div className="grid grid-cols-4 border-b border-gray-200">
              <MetricCell value={session.people_served ?? 0} label="People Served" accent="blue" />
              <MetricCell value={session.meals_served ?? 0} label="Meals Prepared" accent="red" />
              <MetricCell value={session.grocery_packs_given ?? 0} label="Grocery Packs" accent="green" />
              <MetricCell value={`${totalHours}h`} label={`Volunteer Hours (${data.attendance.length} people)`} accent="gold" />
            </div>

            <div className="px-10 py-8 space-y-8">

              {/* ── Executive Summary ── */}
              <section>
                <SectionLabel>Executive Summary</SectionLabel>
                <p className="text-gray-800 leading-relaxed text-base">{aiSections.executiveSummary}</p>
              </section>

              {/* ── Community Impact ── */}
              <section className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <SectionLabel icon="💙">Community Impact</SectionLabel>
                <p className="text-gray-800 leading-relaxed">{aiSections.communityImpact}</p>
              </section>

              {/* ── Operations: Kitchen + Hall ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Kitchen */}
                <section className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-red-600 text-white px-5 py-3 flex items-center gap-2">
                    <ChefHat size={18} />
                    <span className="font-bold text-sm uppercase tracking-wide">Kitchen Operations</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-gray-700 text-sm leading-relaxed">{aiSections.kitchenOperations}</p>
                    {session.what_was_served && (
                      <div className="bg-red-50 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Menu</p>
                        <p className="text-sm text-gray-800">{session.what_was_served}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Team ({kitchenVols.length})</p>
                      <div className="space-y-1.5">
                        {kitchenVols.map((v) => (
                          <VolRow key={v.id} vol={v} />
                        ))}
                        {kitchenVols.length === 0 && <p className="text-xs text-gray-400">No records</p>}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Hall */}
                <section className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-600 text-white px-5 py-3 flex items-center gap-2">
                    <Building2 size={18} />
                    <span className="font-bold text-sm uppercase tracking-wide">Hall Distribution</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-gray-700 text-sm leading-relaxed">{aiSections.distributionOperations}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-blue-700">{session.people_served ?? 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">People Through Door</p>
                      </div>
                      <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-green-700">{session.grocery_packs_given ?? 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Grocery Packs Given</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Team ({hallVols.length})</p>
                      <div className="space-y-1.5">
                        {hallVols.map((v) => (
                          <VolRow key={v.id} vol={v} />
                        ))}
                        {hallVols.length === 0 && <p className="text-xs text-gray-400">No records</p>}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* ── Volunteer Recognition ── */}
              <section>
                <SectionLabel icon="🙌">Volunteer Recognition</SectionLabel>
                <p className="text-gray-800 leading-relaxed">{aiSections.volunteerRecognition}</p>
              </section>

              {/* ── Food Safety ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel icon={<Thermometer size={16} className="text-orange-500" />}>
                    Food Safety & Compliance
                  </SectionLabel>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-600 font-semibold">
                      <CheckCircle size={14} /> {passChecks} Pass
                    </span>
                    {failChecks > 0 && (
                      <span className="flex items-center gap-1 text-red-600 font-semibold">
                        <XCircle size={14} /> {failChecks} Fail
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">{aiSections.foodSafetyStatement}</p>

                {foodLogs.length > 0 ? (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200">
                        <Th>Food Item</Th>
                        <Th>Check Type</Th>
                        <Th>Temp (°C)</Th>
                        <Th>Time</Th>
                        <Th>Result</Th>
                        <Th>Action Taken</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodLogs.map((f) => (
                        <tr key={f.id} className="border-b border-gray-100">
                          <Td>{f.food_item}</Td>
                          <Td>{FOOD_TYPE_LABEL[f.food_type] ?? f.food_type}</Td>
                          <Td className="font-mono">{f.temp_celsius}°C</Td>
                          <Td>{formatTime(f.logged_at)}</Td>
                          <Td>
                            <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                              f.result === 'PASS'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {f.result === 'PASS' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {f.result}
                            </span>
                          </Td>
                          <Td className="text-gray-500">{f.corrective_action ?? '—'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400 italic">No temperature checks recorded for this session.</p>
                )}
              </section>

              {/* ── Incidents ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel icon={<AlertTriangle size={16} className="text-amber-500" />}>
                    Incident Report
                  </SectionLabel>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    incidents.length === 0
                      ? 'bg-green-100 text-green-700'
                      : incidents.some(i => i.severity === 'high')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {incidents.length === 0 ? 'No Incidents' : `${incidents.length} Incident${incidents.length !== 1 ? 's' : ''}`}
                  </span>
                </div>

                {aiSections.incidentNotes && (
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">{aiSections.incidentNotes}</p>
                )}

                {incidents.length > 0 ? (
                  <div className="space-y-3">
                    {incidents.map((i) => (
                      <div key={i.id} className={`rounded-xl border-l-4 p-4 ${
                        i.severity === 'high'
                          ? 'border-red-500 bg-red-50'
                          : i.severity === 'medium'
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-400 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm">{i.title}</p>
                            {i.description && <p className="text-gray-600 text-sm mt-1">{i.description}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                              i.severity === 'high' ? 'bg-red-200 text-red-800'
                              : i.severity === 'medium' ? 'bg-amber-200 text-amber-800'
                              : 'bg-gray-200 text-gray-700'
                            }`}>{i.severity}</span>
                            <p className="text-xs text-gray-400 mt-1">{formatTime(i.reported_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No incidents were recorded during this service.</p>
                )}
              </section>

              {/* ── Attendance Register ── */}
              <section>
                <SectionLabel icon={<Users size={16} className="text-gray-500" />}>
                  Volunteer Attendance Register
                </SectionLabel>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <Th>Name</Th>
                      <Th>Area</Th>
                      <Th>Role</Th>
                      <Th>Sign In</Th>
                      <Th>Sign Out</Th>
                      <Th>Hours</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendance.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100">
                        <Td className="font-medium">
                          {a.volunteers?.first_name} {a.volunteers?.last_name}
                        </Td>
                        <Td>
                          <span className={`text-xs font-semibold ${a.area_on_day === 'kitchen' ? 'text-red-600' : 'text-blue-600'}`}>
                            {a.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall'}
                          </span>
                        </Td>
                        <Td>{a.is_leader_on_day ? 'Leader' : 'Volunteer'}</Td>
                        <Td>{a.sign_in_time ? formatShortTime(a.sign_in_time) : '—'}</Td>
                        <Td className={!a.sign_out_time ? 'text-amber-500' : ''}>
                          {a.sign_out_time ? formatShortTime(a.sign_out_time) : 'Not signed out'}
                        </Td>
                        <Td className="font-mono">{a.hours_served ? `${a.hours_served}h` : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                      <Td colSpan={5}>Total volunteer hours contributed</Td>
                      <Td className="font-mono font-bold">{totalHours}h</Td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              {/* ── Coordinator Notes ── */}
              {session.coordinator_notes && (
                <section>
                  <SectionLabel>Coordinator Notes</SectionLabel>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 px-6 py-4">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{session.coordinator_notes}</p>
                  </div>
                </section>
              )}

              {/* ── Looking Ahead ── */}
              <section className="bg-gray-950 text-white rounded-xl px-8 py-6">
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">Looking Ahead</p>
                <p className="text-gray-300 leading-relaxed">{aiSections.lookingAhead}</p>
              </section>

            </div>

            {/* ── Footer ── */}
            <div className="border-t border-gray-200 px-10 py-4 flex items-center justify-between text-xs text-gray-400">
              <span>Mercy Ministry Cranbourne · ABN/Org details here · Confidential</span>
              <span>Generated {generatedAt}</span>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────

function MetricCell({ value, label, accent }: { value: number | string; label: string; accent: string }) {
  const color = accent === 'blue' ? 'text-blue-700' : accent === 'red' ? 'text-red-700' : accent === 'green' ? 'text-green-700' : 'text-yellow-600'
  const bg = accent === 'blue' ? 'bg-blue-50' : accent === 'red' ? 'bg-red-50' : accent === 'green' ? 'bg-green-50' : 'bg-yellow-50'
  return (
    <div className={`${bg} px-6 py-5 text-center border-r border-gray-200 last:border-r-0`}>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode | string }) {
  return (
    <h3 className="flex items-center gap-2 font-bold text-gray-900 text-base mb-3 pb-2 border-b-2 border-gray-100">
      {icon && <span className="text-base">{icon}</span>}
      {children}
    </h3>
  )
}

function VolRow({ vol }: { vol: any }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
      <span className="font-medium">
        {vol.volunteers?.first_name} {vol.volunteers?.last_name}
        {vol.is_leader_on_day && <span className="ml-1.5 text-xs font-bold text-yellow-600">LEADER</span>}
      </span>
      <span className="text-gray-400 text-xs font-mono">
        {vol.hours_served ? `${vol.hours_served}h` : vol.sign_out_time ? '—' : 'open'}
      </span>
    </div>
  )
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide ${className}`}>{children}</th>
}

function Td({ children, className = '', colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={`px-3 py-2.5 text-gray-700 ${className}`} colSpan={colSpan}>{children}</td>
}
