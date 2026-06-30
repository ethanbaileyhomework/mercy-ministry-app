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
  // Fetch sessions in range
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .gte('session_date', dateFrom)
    .lte('session_date', dateTo)
    .eq('status', 'completed')
    .order('session_date', { ascending: false });

  if (!sessions || sessions.length === 0) {
    alert('No completed sessions found in the selected date range.');
    return;
  }

  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(27, 58, 92); // Navy
  doc.text('Mercy Ministry', 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(201, 168, 76); // Gold
  doc.text('Session Summary Report', 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${dateFrom} to ${dateTo}`, 14, 38);

  // Summary table
  const tableData = sessions.map((s: Record<string, unknown>) => [
    s.session_date as string,
    s.status as string,
    String(s.people_served ?? '—'),
    String(s.meals_served ?? '—'),
    String(s.grocery_packs_given ?? '—'),
    (s.coordinator_notes as string)?.slice(0, 40) || '—',
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Status', 'Guests', 'Meals', 'Grocery Packs', 'Notes']],
    body: tableData,
    headStyles: { fillColor: [27, 58, 92] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9 },
  });

  // Totals
  const totals = sessions.reduce(
    (acc: Record<string, number>, s: Record<string, unknown>) => ({
      guests: acc.guests + ((s.people_served as number) || 0),
      meals: acc.meals + ((s.meals_served as number) || 0),
      packs: acc.packs + ((s.grocery_packs_given as number) || 0),
    }),
    { guests: 0, meals: 0, packs: 0 }
  );

  const finalY = (doc as unknown as Record<string, number>).lastAutoTable?.finalY || 100;
  doc.setFontSize(11);
  doc.setTextColor(27, 58, 92);
  doc.text(`Total Sessions: ${sessions.length}`, 14, finalY + 15);
  doc.text(`Total Guests: ${totals.guests}`, 14, finalY + 22);
  doc.text(`Total Meals: ${totals.meals}`, 14, finalY + 29);
  doc.text(`Total Grocery Packs: ${totals.packs}`, 14, finalY + 36);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Mercy Ministry Food Relief Outreach — Cranbourne, VIC', 14, 285);
  doc.text(`Generated ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}`, 14, 290);

  doc.save(`session-summary-${dateFrom}-to-${dateTo}.pdf`);
}
