import { createClient } from "@/lib/supabase/server";
import { STYLES, CONTENT_TYPES, LEVELS } from "@/lib/categories";

/**
 * Listing option lists (yoga style / content type / level), curated by the
 * admin in the `product_options` table (migration 009). The hardcoded
 * arrays in lib/categories.ts are the FALLBACK — used only when the table
 * is missing (migration not run yet) or empty, so deploys never break on
 * ordering. Server-side only; client components receive these as props.
 */
export type ProductOptions = {
  styles: string[];
  contentTypes: string[];
  levels: string[];
};

export async function getProductOptions(): Promise<ProductOptions> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("product_options")
      .select("kind, label, sort")
      .order("sort")
      .order("label");
    if (data?.length) {
      const pick = (kind: string) =>
        (data as { kind: string; label: string }[])
          .filter((o) => o.kind === kind)
          .map((o) => o.label);
      const styles = pick("style");
      const contentTypes = pick("content_type");
      const levels = pick("level");
      if (styles.length && contentTypes.length && levels.length)
        return { styles, contentTypes, levels };
    }
  } catch {
    // table not there yet — fall through to the built-in lists
  }
  return {
    styles: [...STYLES],
    contentTypes: [...CONTENT_TYPES],
    levels: [...LEVELS],
  };
}
