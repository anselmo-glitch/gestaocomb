// Integração opcional para produção.
// O app roda em modo local para validação. Para usar Supabase, aplique /supabase/schema.sql
// e substitua este repositório por chamadas autenticadas com RLS ativo.

export async function createSupabaseClient(config) {
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error("Supabase não configurado.");
  }
  const module = await import("https://esm.sh/@supabase/supabase-js@2");
  return module.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export async function loadCompanyState(client) {
  const { data, error } = await client
    .from("company_state")
    .select("state, updated_at")
    .eq("id", "main")
    .single();
  if (error) throw error;
  return data?.state;
}

export async function saveCompanyState(client, state) {
  const { error } = await client
    .from("company_state")
    .upsert({ id: "main", state, updated_at: new Date().toISOString() });
  if (error) throw error;
  return state;
}
