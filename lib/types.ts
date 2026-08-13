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
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string | null;
  price_cents: number;
  file_path: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
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

export interface PlatformSettings {
  id: boolean;
  fee_percent: number;
  fee_flat_cents: number;
  updated_at: string;
}
