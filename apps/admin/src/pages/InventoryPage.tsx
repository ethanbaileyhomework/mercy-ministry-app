import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { INVENTORY_CATEGORIES, INVENTORY_UNITS, TRANSACTION_TYPES, type InventoryItem, type InventoryTransaction, inventoryItemSchema, inventoryTransactionSchema } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [itemForm, setItemForm] = useState({ item_name: '', category: '', unit: '', minimum_threshold: '', storage_location: '' });
  const [txForm, setTxForm] = useState({ item_id: '', transaction_type: 'donation_in', quantity: '', donor_name: '', expiry_date: '', notes: '' });

  const loadData = useCallback(async () => {
    const [itemRes, txRes] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('is_active', true).order('item_name'),
      supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (itemRes.data) setItems(itemRes.data as InventoryItem[]);
    if (txRes.data) setTransactions(txRes.data as InventoryTransaction[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = inventoryItemSchema.safeParse({
      ...itemForm,
      category: itemForm.category || null,
      unit: itemForm.unit || null,
      minimum_threshold: itemForm.minimum_threshold ? parseFloat(itemForm.minimum_threshold) : null,
      storage_location: itemForm.storage_location || null,
    });
    if (!parsed.success) { alert('Invalid data'); return; }
    const { error } = await supabase.from('inventory_items').insert(parsed.data);
    if (error) { alert(error.message); return; }
    setShowAddItem(false);
    setItemForm({ item_name: '', category: '', unit: '', minimum_threshold: '', storage_location: '' });
    loadData();
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find((i) => i.id === txForm.item_id);
    const parsed = inventoryTransactionSchema.safeParse({
      ...txForm,
      quantity: parseFloat(txForm.quantity),
      unit: item?.unit || null,
      donor_name: txForm.donor_name || null,
      expiry_date: txForm.expiry_date || null,
      notes: txForm.notes || null,
    });
    if (!parsed.success) { alert('Invalid data'); return; }
    const { error } = await supabase.from('inventory_transactions').insert(parsed.data);
    if (error) { alert(error.message); return; }
    setShowTransaction(false);
    setTxForm({ item_id: '', transaction_type: 'donation_in', quantity: '', donor_name: '', expiry_date: '', notes: '' });
    loadData();
  };

  const getStockColor = (item: InventoryItem) => {
    if (!item.minimum_threshold) return 'text-green-600';
    if (item.current_quantity <= item.minimum_threshold) return 'text-red-600';
    if (item.current_quantity <= item.minimum_threshold * 2) return 'text-amber-600';
    return 'text-green-600';
  };

  const TX_LABELS: Record<string, string> = {
    donation_in: 'Donation In', distribution_out: 'Distribution Out', waste: 'Waste', adjustment: 'Adjustment',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTransaction(!showTransaction)} className="btn-gold"><ArrowDown size={18} /> Record Transaction</button>
          <button onClick={() => setShowAddItem(!showAddItem)} className="btn-secondary"><Plus size={18} /> Add Item</button>
        </div>
      </div>

      {showAddItem && (
        <form onSubmit={handleAddItem} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Add Inventory Item</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div><label className="label">Name *</label><input type="text" value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })} className="input" required /></div>
            <div><label className="label">Category</label><select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} className="input"><option value="">—</option>{INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></div>
            <div><label className="label">Unit</label><select value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} className="input"><option value="">—</option>{INVENTORY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="label">Min Threshold</label><input type="number" step="0.01" value={itemForm.minimum_threshold} onChange={(e) => setItemForm({ ...itemForm, minimum_threshold: e.target.value })} className="input" /></div>
            <div><label className="label">Location</label><input type="text" value={itemForm.storage_location} onChange={(e) => setItemForm({ ...itemForm, storage_location: e.target.value })} className="input" /></div>
          </div>
          <div className="flex gap-2"><button type="submit" className="btn-gold">Add Item</button><button type="button" onClick={() => setShowAddItem(false)} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {showTransaction && (
        <form onSubmit={handleTransaction} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Record Transaction</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><label className="label">Item *</label><select value={txForm.item_id} onChange={(e) => setTxForm({ ...txForm, item_id: e.target.value })} className="input" required><option value="">Select item</option>{items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}</select></div>
            <div><label className="label">Type *</label><select value={txForm.transaction_type} onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })} className="input">{TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{TX_LABELS[t]}</option>)}</select></div>
            <div><label className="label">Quantity *</label><input type="number" step="0.01" min="0.01" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} className="input" required /></div>
            <div><label className="label">Donor Name</label><input type="text" value={txForm.donor_name} onChange={(e) => setTxForm({ ...txForm, donor_name: e.target.value })} className="input" placeholder="If donation" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Expiry Date</label><input type="date" value={txForm.expiry_date} onChange={(e) => setTxForm({ ...txForm, expiry_date: e.target.value })} className="input" /></div>
            <div><label className="label">Notes</label><input type="text" value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} className="input" /></div>
          </div>
          <div className="flex gap-2"><button type="submit" className="btn-gold">Save Transaction</button><button type="button" onClick={() => setShowTransaction(false)} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {/* Stock level cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? <p className="col-span-full text-center text-gray-500 py-8">Loading...</p> :
          items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <Package size={18} className="text-gray-400" />
                {item.minimum_threshold && item.current_quantity <= item.minimum_threshold && (
                  <AlertTriangle size={16} className="text-red-500" />
                )}
              </div>
              <h3 className="font-medium text-sm">{item.item_name}</h3>
              <div className={`text-2xl font-bold mt-1 ${getStockColor(item)}`}>
                {item.current_quantity} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
              </div>
              {item.minimum_threshold && (
                <div className="text-xs text-gray-500 mt-1">Min: {item.minimum_threshold}</div>
              )}
              {item.storage_location && (
                <div className="text-xs text-gray-400 mt-1">{item.storage_location}</div>
              )}
            </div>
          ))
        }
      </div>

      {/* Transaction history */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions recorded yet.</p>
          ) : transactions.slice(0, 20).map((tx) => {
            const item = items.find((i) => i.id === tx.item_id);
            const isIn = tx.transaction_type === 'donation_in' || tx.transaction_type === 'adjustment';
            return (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  {isIn ? <ArrowDown size={16} className="text-green-500" /> : <ArrowUp size={16} className="text-red-500" />}
                  <div>
                    <div className="text-sm font-medium">{item?.item_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{TX_LABELS[tx.transaction_type]}{tx.donor_name ? ` — ${tx.donor_name}` : ''}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                  {isIn ? '+' : '-'}{tx.quantity} {tx.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
