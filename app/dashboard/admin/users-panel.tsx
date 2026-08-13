"use client";

import { useMemo, useState } from "react";
import { changeUserRole } from "./actions";
import type { Profile } from "@/lib/types";

type RoleFilter = "all" | "buyer" | "seller" | "admin" | "partner";
type SortKey = "newest" | "oldest" | "name" | "email";

/** People panel with search, filters, and sort. */
export default function UsersPanel({ users }: { users: Profile[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (q && !`${u.display_name ?? ""} ${u.shop_name ?? ""} ${u.email}`.toLowerCase().includes(q))
        return false;
      if (filter === "partner") return u.partner;
      if (filter !== "all" && u.role !== filter) return false;
      return true;
    });
    const byName = (u: Profile) =>
      (u.display_name ?? u.email).toLowerCase();
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "name":
          return byName(a).localeCompare(byName(b));
        case "email":
          return a.email.localeCompare(b.email);
      }
    });
  }, [users, query, filter, sort]);

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "all" },
    { key: "buyer", label: "buyers" },
    { key: "seller", label: "sellers" },
    { key: "admin", label: "admins" },
    { key: "partner", label: "partners" },
  ];

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold lowercase">people</h2>

      {/* search + sort */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex min-w-56 flex-1 items-center gap-2.5 rounded-xl border border-ink/10 bg-white px-3.5 py-2 text-sm shadow-sm focus-within:border-sage-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-fog" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search name, shop, or email…"
            className="w-full bg-transparent outline-none placeholder:text-fog"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="newest">newest first</option>
          <option value="oldest">oldest first</option>
          <option value="name">name a–z</option>
          <option value="email">email a–z</option>
        </select>
      </div>

      {/* filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition " +
              (filter === f.key
                ? "bg-sage-500 text-white"
                : "bg-white text-ink/70 shadow-sm hover:bg-sage-100")
            }
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-fog">
          {visible.length} of {users.length}
        </span>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-ink/5 bg-white text-sm shadow-sm">
        {!visible.length && (
          <li className="p-4 text-fog">nobody matches that search.</li>
        )}
        {visible.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center gap-3 border-b border-ink/5 p-3.5 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {u.display_name ?? u.email}
                {u.partner && (
                  <span className="ml-2 rounded-full bg-sage-100 px-2 py-0.5 text-xs font-semibold text-sage-700">
                    partner
                  </span>
                )}
              </div>
              <div className="truncate text-fog">
                {u.email} · joined {new Date(u.created_at).toLocaleDateString()}
              </div>
            </div>
            <form action={changeUserRole} className="flex items-center gap-2">
              <input type="hidden" name="user_id" value={u.id} />
              <select
                name="role"
                defaultValue={u.role}
                className="rounded-xl border border-ink/10 px-2.5 py-1.5"
              >
                <option value="buyer">buyer</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
              <button className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30">
                set
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
