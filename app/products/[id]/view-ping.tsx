"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Counts one view per browser session per listing (for seller analytics). */
export default function ViewPing({ productId }: { productId: string }) {
  useEffect(() => {
    const key = `kula-viewed-${productId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // private mode etc — count anyway
    }
    const supabase = createClient();
    supabase.rpc("increment_views", { p_product_id: productId }).then(
      () => {},
      () => {}
    );
  }, [productId]);

  return null;
}
