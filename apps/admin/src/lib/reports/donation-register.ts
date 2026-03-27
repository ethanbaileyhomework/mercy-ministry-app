import * as XLSX from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ReportParams {
  supabase: SupabaseClient;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel';
}

export async function generate({ supabase, dateFrom, dateTo }: ReportParams) {
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select('*, inventory_items(item_name, unit)')
    .eq('transaction_type', 'donation_in')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .order('created_at', { ascending: false });

  if (!transactions || transactions.length === 0) {
    alert('No donations found in the selected date range.');
    return;
  }

  const rows = transactions.map((t: Record<string, unknown>) => {
    const item = t.inventory_items as Record<string, string>;
    return {
      'Date': (t.created_at as string).split('T')[0],
      'Item': item?.item_name || 'Unknown',
      'Quantity': t.quantity,
      'Unit': item?.unit || t.unit || '—',
      'Donor': t.donor_name || '—',
      'Expiry Date': t.expiry_date || '—',
      'Notes': t.notes || '—',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donation Register');

  // Auto column widths
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r: Record<string, unknown>) => String(r[key] || '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `donation-register-${dateFrom}-to-${dateTo}.xlsx`);
}
