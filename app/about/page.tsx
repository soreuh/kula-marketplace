import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export const metadata = { title: "about — kula" };

// Copy is verbatim from the owner's spec (fix list item 6 / Appendix C).
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold lowercase">about kula</h1>
      <div className="mt-6 flex flex-col gap-5 text-lg leading-relaxed text-fog">
        <p>
          kula is where yoga teachers share their work and find the work of
          other teachers they trust.
        </p>
        <p>
          class plans, sequences, workshops, guided meditations. the things
          that take real time to create and that the wider teaching community
          could genuinely use.
        </p>
        <p>a place to offer what you&apos;ve made and find what you need.</p>
      </div>
      <div className="mt-8">
        <Link href="/explore" className={btnPrimary}>
          explore content <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
