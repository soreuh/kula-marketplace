"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Tasks = {
  toReview: { productId: string; title: string }[];
  toReply: { productId: string; title: string; rating: number }[];
};

/**
 * The header bell — a DERIVED to-do badge, not a notifications inbox.
 * Count = things you can act on right now (reviews to leave, reviews to
 * reply to), computed by /api/me/tasks from existing data; acting is what
 * clears it, so there is no read/unread state to maintain. Renders
 * nothing at all while empty — a zero-count bell is just clutter.
 *
 * Fetches once per mount (layout mounts it once per full page load).
 * Future derived task types simply become new sections here.
 */
export default function BellMenu() {
  const [tasks, setTasks] = useState<Tasks | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => alive && t && setTasks(t))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const count = (tasks?.toReview.length ?? 0) + (tasks?.toReply.length ?? 0);
  if (!count) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${count} things waiting`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink hover:bg-sage-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-sage-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-72 overflow-hidden rounded-2xl border border-ink/5 bg-white py-2 shadow-lg">
          {tasks!.toReview.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold lowercase text-fog">
                waiting on your review
              </p>
              {tasks!.toReview.map((t) => (
                <Link
                  key={t.productId}
                  href={`/products/${t.productId}`}
                  onClick={() => setOpen(false)}
                  className="block truncate px-4 py-2 text-sm hover:bg-mist"
                >
                  {t.title}
                </Link>
              ))}
            </>
          )}
          {tasks!.toReply.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold lowercase text-fog">
                reviews to reply to
              </p>
              {tasks!.toReply.map((t, i) => (
                <Link
                  key={`${t.productId}-${i}`}
                  href={`/products/${t.productId}`}
                  onClick={() => setOpen(false)}
                  className="block truncate px-4 py-2 text-sm hover:bg-mist"
                >
                  <span className="text-sage-600">{"★".repeat(t.rating)}</span>{" "}
                  on {t.title}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
