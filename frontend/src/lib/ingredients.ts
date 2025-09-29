import { supabase } from './supabase';

export type IngredientRow = {
  id: number;
  name: string;
  created_by: string | null;
};

export async function searchIngredients(q: string) {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id,name,created_by')
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(50);
  if (error) throw error;
  return data as IngredientRow[];
}

export async function createIngredient(name: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ name, created_by: uid })
    .select('id,name,created_by')
    .single();
  if (error) throw error;
  return data as IngredientRow;
}

export async function deleteIngredient(id: number) {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw error;
}
