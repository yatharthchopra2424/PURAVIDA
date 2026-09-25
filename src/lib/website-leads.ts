export const WEBSITE_LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;
export type WebsiteLeadStatus = (typeof WEBSITE_LEAD_STATUSES)[number];

export const WEBSITE_LEAD_COLUMNS =
  "id, created_at, updated_at, name, company, email, phone, country, market, buyer_type, items, message, wants_samples, status, quote_notes, quoted_at, source_page, referrer, utm_source, utm_medium, utm_campaign, ip_country, lead_id, confirmation_sent, notification_sent, email_error";
