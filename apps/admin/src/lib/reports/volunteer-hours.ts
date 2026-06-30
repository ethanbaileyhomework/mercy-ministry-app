import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ReportParams {
  supabase: SupabaseClient;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel';
}

export async function generate({ supabase, dateFrom, dateTo }: ReportParams) {
  const { data: attendance } = await supabase
    .from('volunteer_attendance')
    .select('volunteer_id, hours_served, area_on_day, sessions!inner(session_date), volunteers!inner(first_name, last_name)')
    .gte('sessions.session_date', dateFrom)
    .lte('sessions.session_date', dateTo)
    .not('hours_served', 'is', null);

  if (!attendance || attendance.length === 0) {
    alert('No attendance records found in the selected date range.');
    return;
  }

  // Aggregate by volunteer
  const byVolunteer: Record<string, { name: string; hours: number; sessions: number }> = {};
  for (const a of attendance) {
    const vol = a.volunteers as Record<string, string>;
    const vid = a.volunteer_id as string;
    if (!byVolunteer[vid]) {
      byVolunteer[vid] = { name: `${vol.first_name} ${vol.last_name}`, hours: 0, sessions: 0 };
    }
    byVolunteer[vid].hours += (a.hours_served as number) || 0;
    byVolunteer[vid].sessions++;
  }

  const sorted = Object.values(byVolunteer).sort((a, b) => b.hours - a.hours);

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(27, 58, 92);
  doc.text('Mercy Ministry', 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(201, 168, 76);
  doc.text('Volunteer Hours Report', 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${dateFrom} to ${dateTo}`, 14, 38);

  autoTable(doc, {
    startY: 45,
    head: [['Volunteer', 'Sessions', 'Total Hours', 'Avg Hours/Session']],
    body: sorted.map((v) => [
      v.name,
      String(v.sessions),
      v.hours.toFixed(1),
      (v.hours / v.sessions).toFixed(1),
    ]),
    headStyles: { fillColor: [27, 58, 92] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9 },
  });

  const totalHours = sorted.reduce((sum, v) => sum + v.hours, 0);
  const finalY = (doc as unknown as Record<string, number>).lastAutoTable?.finalY || 100;
  doc.setFontSize(11);
  doc.setTextColor(27, 58, 92);
  doc.text(`Total Volunteers: ${sorted.length}`, 14, finalY + 15);
  doc.text(`Total Hours: ${totalHours.toFixed(1)}`, 14, finalY + 22);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Mercy Ministry Food Relief Outreach — Cranbourne, VIC', 14, 285);

  doc.save(`volunteer-hours-${dateFrom}-to-${dateTo}.pdf`);
}
