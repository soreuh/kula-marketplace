import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export const metadata = { title: "about — kula" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold lowercase">about kula</h1>
      <p className="mt-6 text-lg leading-relaxed text-fog">
        kula — Sanskrit for community — is a peer-to-peer marketplace for yoga
        teachers. Teachers spend years developing their material: the sequences,
        class plans, workshops, and meditations that make their classes theirs.
        kula is built on a simple idea — that work deserves to be compensated
        when others use it. Teachers upload the plans they&apos;ve already
        built; other teachers buy them to teach with, study, or adapt. One
        payment, lifetime access, and the person who made it gets paid. One
        more way of supporting each other, the way this practice has always
        asked us to.
      </p>
      <div className="mt-8">
        <Link href="/explore" className={btnPrimary}>
          explore content <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
