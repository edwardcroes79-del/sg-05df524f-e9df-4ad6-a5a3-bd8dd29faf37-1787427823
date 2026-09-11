import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // We can execute raw SQL using the Postgres meta-query endpoint or a specific RPC if one existed,
    // but since we need the function signature, let's just query the function definitions directly.
    const { data: redeemFuncs, error: rpcError } = await supabase.rpc('execute_sql_query', {
      query: `
        SELECT p.proname as name, pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname LIKE '%redeem%';
      `
    });
    
    res.status(200).json({ funcs: redeemFuncs, error: rpcError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}