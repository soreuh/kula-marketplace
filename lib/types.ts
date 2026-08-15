export type UserRole = "buyer" | "seller" | "admin";
export type ProductStatus = "draft" | "active" | "suspended" | "archived";
export type OrderStatus = "pending" | "paid" | "refunded";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  stripe_account_id: string | null;
  created_at: string;
  // v2
  shop_name: string | null;
  bio: string | null;
  specialisations: string[];
  sale_notifications: boolean;
  marketing_consent: boolean | null;
  ip_agreement_accepted_at: string | null;
  stripe_charges_enabled: boolean;
  /** Partner rate: custom commission percent; null = platform default.
   *  Private. "Partner" is DERIVED from this (023): non-null = partner —
   *  there is no stored partner flag. */
  commission_override: number | null;
  /** Partner status; auto-set when a rate override exists. */
  /** Moderation: paused = buying blocked + listings ghosted; deleted = also login-banned. Data always retained. */
  account_status: "active" | "paused" | "deleted";
  /** Profile picture path in the public covers bucket (own folder). */
  avatar_path: string | null;
  /** Migration 021 — last page view, stamped by the layout (1/hour). */
  last_seen_at?: string | null;
  /** Migration 022 — buyer pref: email me when content I own is updated. */
  content_update_emails?: boolean | null;
}

/** Public-safe instructor info (the `instructors` view). */
export interface Instructor {
  id: string;
  display_name: string | null;
  shop_name: string | null;
  bio: string | null;
  specialisations: string[];
  stripe_charges_enabled: boolean;
  created_at: string;
  avatar_path: string | null;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string | null; // yoga style
  price_cents: number;
  file_path: string | null;
  /** Migration 022 — sha256 of the sale file; gates buyer update emails. */
  file_sha256?: string | null;
  /** Migration 024 — auto-captured at upload, never typed by the seller.
   *  Pages from the pdf.js doc that bakes the preview (PDFs only, else
   *  null); bytes from the File object. Both null on pre-024 rows. */
  file_pages?: number | null;
  file_bytes?: number | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  // v2
  content_type: string | null;
  level: string | null;
  duration_minutes: number | null;
  teachability: "ready" | "adapt" | "inspiration" | null;
  theme: string | null;
  props: string | null;
  anatomy_focus: string | null;
  usage_notes: string | null;
  peak_pose: string | null;
  sequence_breakdown: string | null;
  target_audience: string | null;
  cover_path: string | null;
  preview_path: string | null;
  views: number;
  /** Admin curation: non-null = featured on the homepage (migration 013). */
  featured_at: string | null;
}

export interface Order {
  id: string;
  buyer_id: string;
  product_id: string;
  amount_cents: number;
  fee_cents: number;
  seller_amount_cents: number;
  currency: string;
  stripe_payment_intent: string | null;
  stripe_checkout_session: string | null;
  status: OrderStatus;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  rating: number;
  body: string | null;
  reviewer_name: string | null;
  /** The seller's one public response (migration 010). */
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface PlatformSettings {
  id: boolean;
  fee_percent: number;
  fee_flat_cents: number;
  updated_at: string;
  /** Migration 020 — undefined until it runs (tolerant read). */
  launch_date?: string | null;
  /** Migration 020 — driver overrides for lib/growth-model.ts; null = Mid defaults. */
  growth_model?: Record<string, number> | null;
  /** Migration 022 — platform kill switch for buyer file-update emails. */
  notify_content_updates?: boolean | null;
  /** Migration 022 — platform kill switch for seller sale emails. */
  notify_sale_emails?: boolean | null;
  /** Migration 025 — platform kill switch for buyer purchase confirmations
   *  ("it's in your library", paid + free claims). */
  notify_purchase_emails?: boolean | null;
}
