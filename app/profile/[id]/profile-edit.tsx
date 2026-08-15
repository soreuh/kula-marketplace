"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STYLES } from "@/lib/categories";
import { coverUrl } from "@/lib/covers";
import { Avatar, inputCls } from "@/components/ui";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // covers bucket limit

/** website: trim; force an http(s) scheme so a stored value can never be
 *  a javascript: url. instagram: accept "@handle", a pasted profile URL,
 *  or a bare handle — store the bare handle. */
function normalizeWebsite(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
function normalizeInstagram(v: string): string | null {
  const t = v
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
  return t || null;
}

export default function ProfileEdit({
  initial,
}: {
  initial: {
    shop_name: string;
    bio: string;
    specialisations: string[];
    avatar_path: string | null;
    website_url: string;
    instagram_handle: string;
    banner_path: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState(initial.shop_name);
  const [bio, setBio] = useState(initial.bio);
  const [specs, setSpecs] = useState<string[]>(initial.specialisations);
  const [website, setWebsite] = useState(initial.website_url);
  const [instagram, setInstagram] = useState(initial.instagram_handle);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleSpec(s: string) {
    setSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function pickImage(
    f: File | null,
    what: "Profile photo" | "Banner",
    setFile: (f: File) => void,
    setPreview: (u: string) => void
  ) {
    if (!f) return;
    if (!f.type.startsWith("image/"))
      return setMessage(`${what} must be an image (jpg, png, or webp).`);
    if (f.size > AVATAR_MAX_BYTES)
      return setMessage(`${what} must be under 5MB.`);
    setMessage(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
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

    // upload new images first (own folder in the public covers bucket),
    // then clean up the old ones — losing an orphan beats losing the image
    async function swapImage(
      file: File | null,
      oldPath: string | null,
      prefix: "avatar" | "banner"
    ): Promise<string | null | undefined> {
      if (!file) return oldPath;
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const newPath = `${user!.id}/${prefix}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("covers")
        .upload(newPath, file);
      if (upErr) return undefined; // signal failure
      if (oldPath) await supabase.storage.from("covers").remove([oldPath]);
      return newPath;
    }

    const avatarPath = await swapImage(avatarFile, initial.avatar_path, "avatar");
    if (avatarPath === undefined) {
      setBusy(false);
      return setMessage("Photo upload failed — try again.");
    }
    const bannerPath = await swapImage(bannerFile, initial.banner_path, "banner");
    if (bannerPath === undefined) {
      setBusy(false);
      return setMessage("Banner upload failed — try again.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        shop_name: shopName.trim() || null,
        bio: bio.trim() || null,
        specialisations: specs,
        avatar_path: avatarPath,
        banner_path: bannerPath,
        website_url: normalizeWebsite(website),
        instagram_handle: normalizeInstagram(instagram),
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

      <div className="flex items-center gap-4">
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <Avatar
            name={shopName || "kula"}
            size={64}
            imagePath={initial.avatar_path}
          />
        )}
        <label className="flex-1 text-fog">
          profile photo (jpg/png/webp, up to 5MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block w-full text-xs"
            onChange={(e) =>
              pickImage(
                e.target.files?.[0] ?? null,
                "Profile photo",
                setAvatarFile,
                setAvatarPreview
              )
            }
          />
        </label>
      </div>

      <div>
        {(bannerPreview || initial.banner_path) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerPreview ?? coverUrl(initial.banner_path) ?? ""}
            alt=""
            className="mb-2 h-24 w-full rounded-xl object-cover"
          />
        )}
        <label className="block text-fog">
          banner (wide image across the top of your profile — jpg/png/webp, up
          to 5MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block w-full text-xs"
            onChange={(e) =>
              pickImage(
                e.target.files?.[0] ?? null,
                "Banner",
                setBannerFile,
                setBannerPreview
              )
            }
          />
        </label>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-fog">
          website
          <input
            className={inputCls + " mt-1"}
            placeholder="yourstudio.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
        <label className="text-fog">
          instagram
          <input
            className={inputCls + " mt-1"}
            placeholder="@yourhandle"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </label>
      </div>

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
