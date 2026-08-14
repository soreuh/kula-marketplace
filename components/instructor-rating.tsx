import { createClient } from "@/lib/supabase/server";
import { Stars } from "@/components/ui";

/**
 * A teacher's aggregate rating — THE one place it's computed for display.
 *
 * Reads the `instructor_ratings` view (migration 017), which averages every
 * review across ALL of that teacher's listings regardless of publish status
 * (only admin-'suspended' content is excluded). That matters: reputation is
 * earned by real buyers on real purchases, so unpublishing or archiving a
 * listing must never quietly shrink a teacher's score. Never re-derive this
 * from a page's own product query — doing exactly that is what caused the
 * bug 017 fixed.
 *
 * Server component: drop it anywhere on a server-rendered page. Renders
 * nothing at all when the teacher has no reviews yet, so callers don't need
 * their own empty-state check.
 *
 *   <InstructorRating instructorId={inst.id} />
 */
export default async function InstructorRating({
  instructorId,
  showCount = true,
  className,
}: {
  instructorId: string;
  showCount?: boolean;
  className?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("instructor_ratings")
    .select("avg_rating, review_count")
    .eq("instructor_id", instructorId)
    .maybeSingle();

  const agg = data as
    | { avg_rating: number | string | null; review_count: number | null }
    | null;
  const count = agg?.review_count ?? 0;
  // No reviews — and also the pre-017 case, where the view doesn't exist yet.
  if (!count) return null;

  return (
    <span className={className}>
      <Stars rating={Number(agg?.avg_rating)} count={count} showCount={showCount} />
    </span>
  );
}
