import * as XLSX from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ReportParams {
  supabase: SupabaseClient;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel';
}

export async function generate({ supabase }: ReportParams) {
  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('is_active', true)
    .order('item_name');

  if (!items || items.length === 0) {
    alert('No inventory items found.');
    return;
  }

  const rows = items.map((i: Record<string, unknown>) => ({
    'Item': i.item_name,
    'Category': (i.category as string)?.replace('_', ' ') || '—',
    'Current Quantity': i.current_quantity,
    'Unit': i.unit || '—',
    'Min Threshold': i.minimum_threshold || '—',
    'Status': (i.current_quantity as number) <= ((i.minimum_threshold as number) || 0) ? 'LOW' : 'OK',
    'Storage Location': i.storage_location || '—',
    'Last Updated': (i.last_updated as string)?.split('T')[0] || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Inventory');

  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r: Record<string, unknown>) => String(r[key] || '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `stock-inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
}
