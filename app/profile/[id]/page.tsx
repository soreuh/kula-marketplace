import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InstructorRating from "@/components/instructor-rating";
import { coverUrl } from "@/lib/covers";
import { fetchProductRatings } from "@/lib/ratings";
import { priceLabel } from "@/lib/fees";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { presentSocials, type SocialKey } from "@/lib/socials";
import type { Instructor, Product } from "@/lib/types";
import {
  Avatar,
  EmptyState,
  ProductCard,
  VerifiedBadge,
  btnSmallOutline,
  publicName,
} from "@/components/ui";
import ProfileEdit from "./profile-edit";

export const dynamic = "force-dynamic";

/* Social chip glyphs — inlined monochrome paths from the open Simple Icons
   set (CC0), NOT an icon CDN: zero network requests, nothing external to
   break or track, and they inherit the chip's sage via currentColor. Keys
   mirror lib/socials.ts SOCIAL_NETWORKS — adding a network there means
   adding its path here (build breaks loudly if you forget: Record is
   keyed by SocialKey). */
const SOCIAL_ICON_PATHS: Record<SocialKey, string> = {
  instagram:
    "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  pinterest:
    "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z",
  x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
};

function SocialIcon({ k }: { k: SocialKey }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <path d={SOCIAL_ICON_PATHS[k]} />
    </svg>
  );
}

/** Stroke globe for the website chip — matches the header icons' stroke
 *  style; no equivalent in the brand-glyph set above. */
function GlobeIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: inst }, { count: listingCount }] = await Promise.all([
    supabase
      .from("instructors")
      .select("display_name, shop_name, bio")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", id)
      .eq("status", "active"),
  ]);
  if (!inst) return {};
  const name = publicName(inst);
  const bio = inst.bio?.replace(/\s+/g, " ").trim();
  return {
    title: name,
    description: bio
      ? bio.length > 155
        ? bio.slice(0, 152).trimEnd() + "…"
        : bio
      : `yoga teaching content by ${name} on kula.`,
    alternates: { canonical: `/profile/${id}` },
    // 029: every account has a page, but only profiles with published
    // content belong in search — empty ones (buyers) stay reachable by
    // shared URL and nothing more. Pairs with the sitemap restriction.
    ...(listingCount ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function InstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: instructor }, { data: products }, { data: auth }, ratings] =
    await Promise.all([
      supabase.from("instructors").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("products")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase.auth.getUser(),
      fetchProductRatings(supabase),
    ]);

  if (!instructor) notFound();
  const inst = instructor as Instructor;
  const listings = (products as Product[] | null) ?? [];
  const isOwner = auth.user?.id === inst.id;
  const name = publicName(inst);

  // The overall rating is rendered by <InstructorRating/>, which owns the
  // instructor_ratings lookup (migration 017) — every review the teacher has
  // ever earned, including on listings now unpublished or archived. Deliberately
  // NOT re-derived from `listings` below: that set is active-only, and deriving
  // it there is precisely the bug 017 fixed.

  // External links, scheme-guarded at render as well as on save: a stored
  // value that somehow isn't http(s) gets https:// prepended, so it can
  // never become a javascript: href.
  const website = inst.website_url
    ? /^https?:\/\//i.test(inst.website_url)
      ? inst.website_url
      : `https://${inst.website_url}`
    : null;
  const websiteLabel = website
    ? website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "")
    : null;

  const memberSince = new Date(inst.created_at)
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toLowerCase();

  // Curated social chips (lib/socials.ts, migration 027) — every href is
  // built by us from a bare handle, so nothing stored can carry a scheme.
  const links = presentSocials(inst.socials);

  // "Ask a question" relays through the kula inbox — seller emails stay
  // private (Etsy-style direct messaging is a later build; this is the
  // honest startup version of the contact path every comparable has).
  const askHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `question for ${name} (via kula)`
  )}&body=${encodeURIComponent(
    `teacher: ${SITE_URL}/profile/${id}\n\nmy question:\n`
  )}`;

  const linkChip =
    "inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sage-700 hover:bg-sage-100";

  return (
    <div>
      <section className="bg-mist/60 px-5 py-12">
        <div className="mx-auto max-w-5xl">
          {inst.banner_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl(inst.banner_path) ?? ""}
              alt=""
              className="mb-6 h-40 w-full rounded-2xl object-cover shadow-sm sm:h-52"
            />
          )}
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={name} size={76} imagePath={inst.avatar_path} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl font-bold">{name}</h1>
              {inst.stripe_charges_enabled && <VerifiedBadge />}
            </div>
            <InstructorRating instructorId={id} className="mt-1.5 inline-block" />
            <p className="mt-1 text-sm text-fog">
              {listings.length} published listing{listings.length === 1 ? "" : "s"}
              {inst.specialisations.length > 0 &&
                ` · ${inst.specialisations.length} specialisation${inst.specialisations.length === 1 ? "" : "s"}`}
              {` · on kula since ${memberSince}`}
            </p>
            {(inst.specialisations.length > 0 || website || links.length > 0) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {inst.specialisations.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/70"
                  >
                    {s}
                  </span>
                ))}
                {/* Icons carry the platform identity, so the chips shed
                    their "label:" prefixes and the ↗ (M12) — icon + handle
                    is the whole chip now. */}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className={linkChip}
                  >
                    <GlobeIcon /> {websiteLabel}
                  </a>
                )}
                {links.map((l) => (
                  <a
                    key={l.key}
                    href={l.url}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className={linkChip}
                    title={l.label}
                  >
                    <SocialIcon k={l.key} />
                    {l.key === "instagram" || l.key === "tiktok" || l.key === "x"
                      ? `@${l.handle}`
                      : l.handle}
                  </a>
                ))}
              </div>
            )}
            {inst.bio && <p className="mt-3 max-w-2xl text-fog">{inst.bio}</p>}
            {/* only when there's content to ask about (029: buyers have
                profiles too, and "this teacher's content" needs content) */}
            {!isOwner && listings.length > 0 && (
              <p className="mt-3 text-xs">
                <a
                  href={askHref}
                  className="lowercase text-fog underline hover:text-ink"
                >
                  ask a question about this teacher&apos;s content
                </a>
              </p>
            )}
          </div>
          {isOwner && (
            <Link href="/dashboard" className={btnSmallOutline}>
              + add content
            </Link>
          )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {isOwner && (
          <ProfileEdit
            initial={{
              shop_name: inst.shop_name ?? "",
              bio: inst.bio ?? "",
              specialisations: inst.specialisations,
              avatar_path: inst.avatar_path,
              website_url: inst.website_url ?? "",
              socials: inst.socials ?? {},
              banner_path: inst.banner_path ?? null,
            }}
          />
        )}

        <h2 className="mb-4 mt-6 font-display text-2xl font-bold lowercase">
          published content
        </h2>
        {!listings.length ? (
          <EmptyState>
            nothing published yet
            {isOwner ? " — your first listing is waiting in the dashboard." : "."}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                priceLabel={priceLabel(p.price_cents)}
                rating={ratings[p.id]?.avg ?? null}
                reviewCount={ratings[p.id]?.count ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
