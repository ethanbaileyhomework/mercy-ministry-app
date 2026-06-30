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
  const { data: logs } = await supabase
    .from('food_safety_logs')
    .select('*, sessions!inner(session_date), volunteers(first_name, last_name)')
    .gte('sessions.session_date', dateFrom)
    .lte('sessions.session_date', dateTo)
    .order('logged_at', { ascending: false });

  if (!logs || logs.length === 0) {
    alert('No food safety logs found in the selected date range.');
    return;
  }

  const doc = new jsPDF('landscape');

  doc.setFontSize(20);
  doc.setTextColor(27, 58, 92);
  doc.text('Mercy Ministry', 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(201, 168, 76);
  doc.text('Food Safety Audit Report', 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${dateFrom} to ${dateTo} — Victorian Food Act 1984 Compliance`, 14, 38);

  const tableData = logs.map((l: Record<string, unknown>) => {
    const session = l.sessions as Record<string, string>;
    const vol = l.volunteers as Record<string, string> | null;
    return [
      session?.session_date || '—',
      l.food_item as string,
      (l.food_type as string)?.replace('_', ' ') || '—',
      l.temp_celsius ? `${l.temp_celsius}°C` : '—',
      (l.result as string) || '—',
      l.probe_id || '—',
      vol ? `${vol.first_name} ${vol.last_name}` : '—',
      (l.corrective_action as string)?.slice(0, 30) || '—',
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Food Item', 'Category', 'Temp', 'Result', 'Probe', 'Logged By', 'Corrective Action']],
    body: tableData,
    headStyles: { fillColor: [27, 58, 92] },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { fontStyle: 'bold' },
    },
    didParseCell: (data: Record<string, unknown>) => {
      const cell = data.cell as Record<string, unknown>;
      if (data.section === 'body' && data.column?.index === 4) {
        const text = (cell.text as string[])?.[0];
        if (text === 'FAIL') cell.styles = { ...cell.styles, textColor: [220, 38, 38] };
        else if (text === 'PASS') cell.styles = { ...cell.styles, textColor: [22, 163, 74] };
      }
    },
  });

  // Summary
  const passCount = logs.filter((l: Record<string, unknown>) => l.result === 'PASS').length;
  const failCount = logs.filter((l: Record<string, unknown>) => l.result === 'FAIL').length;
  const passRate = logs.length > 0 ? ((passCount / logs.length) * 100).toFixed(1) : '0';

  const finalY = (doc as unknown as Record<string, number>).lastAutoTable?.finalY || 100;
  doc.setFontSize(11);
  doc.setTextColor(27, 58, 92);
  doc.text(`Total Checks: ${logs.length} | Pass: ${passCount} | Fail: ${failCount} | Pass Rate: ${passRate}%`, 14, finalY + 15);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Mercy Ministry Food Relief Outreach — Cranbourne, VIC — Food Act 1984 (Vic) Compliance Record', 14, 200);

  doc.save(`food-safety-audit-${dateFrom}-to-${dateTo}.pdf`);
}
