export type UserRole = "buyer" | "seller" | "admin";
export type ProductStatus = "draft" | "active" | "suspended";
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
  /** Partner rate: custom commission percent; null = platform default. Private. */
  commission_override: number | null;
  /** Partner status; auto-set when a rate override exists. */
  partner: boolean;
  /** Moderation: paused = buying blocked + listings ghosted; deleted = also login-banned. Data always retained. */
  account_status: "active" | "paused" | "deleted";
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
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string | null; // yoga style
  price_cents: number;
  file_path: string | null;
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
}
