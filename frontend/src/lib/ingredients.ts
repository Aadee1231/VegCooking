// src/lib/ingredients.ts
import { supabase } from './supabase';

export type IngredientRow = { id: number; name: string; created_by: string | null };

export async function searchIngredients(q: string): Promise<IngredientRow[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id,name,created_by')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(50);
  if (error) throw error;
  return (data ?? []) as any;
}

// Create-or-get globally: relies on the SQL function we created
export async function createIngredient(name: string): Promise<IngredientRow> {
  const { data, error } = await supabase
    .rpc('create_or_get_ingredient', { p_name: name });
  if (error) throw error;
  return data as any;
}

export async function deleteIngredient(id: number): Promise<void> {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw error;
}
