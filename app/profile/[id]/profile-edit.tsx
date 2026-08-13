"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STYLES } from "@/lib/categories";
import { inputCls } from "@/components/ui";

export default function ProfileEdit({
  initial,
}: {
  initial: { shop_name: string; bio: string; specialisations: string[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState(initial.shop_name);
  const [bio, setBio] = useState(initial.bio);
  const [specs, setSpecs] = useState<string[]>(initial.specialisations);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleSpec(s: string) {
    setSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setMessage("Please log in.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        shop_name: shopName.trim() || null,
        bio: bio.trim() || null,
        specialisations: specs,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return setMessage(error.message);
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-ink/15 bg-white px-5 py-2 font-display text-sm font-semibold lowercase hover:border-ink/40"
      >
        edit profile
      </button>
    );

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-3 rounded-2xl border border-ink/5 bg-white p-6 text-sm shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold lowercase">edit profile</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-fog hover:text-ink">
          cancel
        </button>
      </div>
      <label className="text-fog">
        shop name (shown instead of your display name)
        <input
          className={inputCls + " mt-1"}
          placeholder="e.g. moon & mat studio"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />
      </label>
      <label className="text-fog">
        bio
        <textarea
          className={inputCls + " mt-1"}
          rows={3}
          placeholder="who you are, how you teach, what you make"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </label>
      <div>
        <span className="text-fog">specialisations</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpec(s)}
              className={
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition " +
                (specs.includes(s)
                  ? "bg-sage-500 text-white"
                  : "bg-mist text-ink/70 hover:bg-sage-100")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <button
        disabled={busy}
        className="mt-1 self-start rounded-full bg-sage-500 px-6 py-2.5 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
      >
        {busy ? "saving…" : "save profile"}
      </button>
      {message && <p className="text-red-600">{message}</p>}
    </form>
  );
}
