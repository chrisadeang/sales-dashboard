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
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
