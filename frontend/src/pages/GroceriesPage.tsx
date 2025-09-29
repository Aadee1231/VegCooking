import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { startOfWeek, addDays, fmtISODate } from '../lib/date';

type GroceryRow = {
  ingredient_id: number;
  ingredient_name: string;
  unit_code: string | null;
  total_quantity: number | null;
};

export default function GroceriesPage() {
  const [start, setStart] = useState<Date>(() => startOfWeek(new Date()));
  const [end, setEnd] = useState<Date>(() => addDays(startOfWeek(new Date()), 6));
  const [items, setItems] = useState<GroceryRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_grocery_list_for_range', {
          d1: fmtISODate(start),
          d2: fmtISODate(end)
        });
      if (error) throw error;
      setItems(data as any);
    } catch (e: any) {
      alert(e.message ?? 'Failed to load groceries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ display:'grid', gap:12 }}>
      <h2>Groceries</h2>

      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <label>
          Start:{' '}
          <input type="date" value={fmtISODate(start)} onChange={e => setStart(new Date(e.target.value))} />
        </label>
        <label>
          End:{' '}
          <input type="date" value={fmtISODate(end)} onChange={e => setEnd(new Date(e.target.value))} />
        </label>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      {items.length === 0 ? (
        <p style={{ opacity:.7 }}>No groceries for this range. Add meal plan items with recipes.</p>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', borderBottom:'1px solid #eee', padding:'6px 0' }}>Ingredient</th>
              <th style={{ textAlign:'right', borderBottom:'1px solid #eee', padding:'6px 0' }}>Qty</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #eee', padding:'6px 0' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.ingredient_id}>
                <td style={{ padding:'6px 0' }}>{it.ingredient_name}</td>
                <td style={{ padding:'6px 0', textAlign:'right' }}>{it.total_quantity ?? ''}</td>
                <td style={{ padding:'6px 0' }}>{it.unit_code ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
