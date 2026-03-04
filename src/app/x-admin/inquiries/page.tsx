import { createSupabaseServiceClient } from "@/lib/supabase-service";
import InquiriesClient from "./InquiriesClient";

async function getInquiries() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("contacts")
    .select(
      "id, name, email, product, quantity, description, cart_items, is_read, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export const metadata = {
  title: "Inquiries — PuraVida Admin",
};

export default async function InquiriesPage() {
  const inquiries = await getInquiries();
  return <InquiriesClient initialInquiries={inquiries} />;
}
