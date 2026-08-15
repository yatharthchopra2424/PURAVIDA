import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Server-only client used for public catalog reads.
// TODO (P2-4): once RLS is verified in production, switch this to
// NEXT_PUBLIC_SUPABASE_ANON_KEY so public reads are subject to RLS
// and the service-role key is reserved for /api/admin/* and /api/contact.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getSupabaseServerClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const getProductImageUrl = (imagePath: string) => {
  if (!supabaseUrl) return imagePath;
  return `${supabaseUrl}/storage/v1/object/public/product-images/${imagePath}`;
};
