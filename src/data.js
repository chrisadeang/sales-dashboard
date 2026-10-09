import { createClient } from '@supabase/supabase-js';

/*
  DATA LOADING — the only file that knows where the data comes from.
  Reads the `outlet_weeks` table from Supabase.

  Configure in .env (local) or Vercel > Settings > Environment Variables:
    VITE_SUPABASE_URL=https://<project-ref>.supabase.co
    VITE_SUPABASE_ANON_KEY=<publishable / anon key>

  The anon key is safe in the browser: Row Level Security on the table
  only allows read access.
*/
// Environment variables win. The fallbacks are this project's public URL and
// read-only (publishable) key, so the app still works if the variables are not set.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://jqwpbjhmeyqituhczqnm.supabase.co';
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Cw2s1I4P-I_jl6-OKrkqyg_5jhS6kV2';

const supabase = url && key ? createClient(url, key) : null;

/** @returns {Promise<{outlet:string, week:string, sales:number, target:number, orders:number, returns:number}[]>} */
export async function loadData() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
    );
  }
  const { data, error } = await supabase
    .from('outlet_weeks')
    .select('outlet, week, sales, target, orders, returns')
    .order('week', { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || !data.length) throw new Error('The outlet_weeks table has no rows yet.');

  return data.map(r => ({
    outlet: r.outlet,
    week: String(r.week).slice(0, 10),
    sales: Number(r.sales),
    target: Number(r.target),
    orders: Number(r.orders),
    returns: Number(r.returns),
  }));
}


/**
 * Live updates: calls onChange() whenever a row in outlet_weeks is inserted,
 * updated or deleted, and onStatus(status) as the realtime connection changes
 * ('SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED').
 * Returns a function that stops listening.
 */
export function subscribeToChanges(onChange, onStatus) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('outlet_weeks_live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'outlet_weeks' }, () => onChange())
    .subscribe(status => onStatus(status));
  return () => supabase.removeChannel(channel);
}
