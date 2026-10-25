import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function upsertTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    console.log("No transactions to upsert.");
    return { data: null, error: null };
  }

  const mapped = transactions.map(tx => ({
    date: tx.date,
    amount: tx.amount,
    name: tx.description || tx.name || tx.memo || "Transaction",
    category: tx.category || null,
  }));

  const { data, error } = await supabase.from("transactions").insert(mapped);

  if (error) {
    console.error("Error inserting transactions:", error.message);
    throw error;
  }

  console.log(`Successfully inserted ${mapped.length} transactions`);
  return { data, error: null };
}
