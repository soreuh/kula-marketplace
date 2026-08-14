import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";

export const metadata = {
  title: "faq - kula",
  description:
    "How buying, selling, payouts, refunds, and content protection work on kula - the teacher-to-teacher marketplace for yoga content.",
};

/**
 * FAQ - written for a NON-technical audience (her teachers, not devs).
 *
 * THE ONE RULE, same as /terms and /privacy: every answer describes
 * mechanics that actually exist and match the built behavior verified
 * 2026-08-14 (fees, payouts, library/lifetime access, update emails,
 * archive semantics, review gating). The refund answer mirrors terms §6
 * EXACTLY - the FAQ must never promise more than the terms do. If a
 * mechanic changes, change the answer in the same PR.
 *
 * `plain` is the JSON-LD copy of each answer (FAQPage structured data) -
 * keep it in sync with the JSX.
 */

type QA = { q: string; a: React.ReactNode; plain: string };

const BUYING: QA[] = [
  {
    q: "what do i get when i buy something?",
    a: (
      <>
        the file downloads instantly, and it lives in{" "}
        <Link href="/library" className="underline">your library</Link> forever -
        re-download it any time, on any device. lifetime access includes
        updates: when a teacher improves their file, your library always has
        the latest version, and you&apos;ll get an email letting you know.
      </>
    ),
    plain:
      "The file downloads instantly and stays in your kula library forever - re-download any time. Lifetime access includes updates: when a teacher improves their file, your library has the latest version and you get an email.",
  },
  {
    q: "can i use what i buy in my own classes?",
    a: (
      <>
        yes - that&apos;s the whole point. everything on kula is licensed for
        your own teaching: classes, workshops, trainings, including paid ones.
        what the license doesn&apos;t cover is passing the file itself along -
        no re-selling, re-posting, or sharing the download with other teachers.
      </>
    ),
    plain:
      "Yes - everything on kula is licensed for your own teaching, including paid classes and workshops. The license doesn't cover re-selling or sharing the file itself with other teachers.",
  },
  {
    q: "how do free listings work?",
    a: (
      <>
        some teachers share content free. you&apos;ll need an account (that&apos;s
        the whole &quot;price&quot;) - claim it and it&apos;s in your library for
        good, exactly like a purchase. if the teacher later puts a price on it,
        you keep it. early support counts.
      </>
    ),
    plain:
      "Claim a free listing with your account and it's in your library for good, exactly like a purchase - even if the teacher later puts a price on it.",
  },
  {
    q: "why is the preview blurred?",
    a: (
      <>
        the preview shows the real first page of the file, blurred to protect
        the teacher&apos;s work - enough to see what kind of resource it is,
        not enough to teach from. the full file unlocks the moment it&apos;s
        yours.
      </>
    ),
    plain:
      "The preview is the real first page, blurred to protect the teacher's work. The full file unlocks the moment it's yours.",
  },
  {
    q: "what if something is wrong with my purchase?",
    a: (
      <>
        because everything here is a digital file, sales are final once
        downloaded - but if a file is corrupted, significantly different from
        its description, or fails to download, email{" "}
        <a href={CONTACT_MAILTO} className="underline">{CONTACT_EMAIL}</a>{" "}
        within 24 hours of purchase and we&apos;ll review it (within 7 days).
        please reach out to us before disputing a charge with your bank -
        we&apos;re quick, and human.
      </>
    ),
    plain:
      "Digital sales are final once downloaded, but if a file is corrupted, misrepresented, or fails to download, email us within 24 hours and we'll review it within 7 days. Contact us before disputing a charge with your bank.",
  },
  {
    q: "can i trust the reviews?",
    a: (
      <>
        only people who actually own a listing can review it - there&apos;s no
        way to rate something you haven&apos;t bought or claimed. teachers can
        reply to reviews publicly, and that&apos;s it: no editing other
        people&apos;s words, no paid placement in ratings.
      </>
    ),
    plain:
      "Only people who actually own a listing can review it. Teachers can reply publicly; nobody can edit or buy reviews.",
  },
];

const SELLING: QA[] = [
  {
    q: "what does it cost to sell on kula?",
    a: (
      <>
        nothing to join, no monthly fee, no listing fee. kula keeps 30% + 25¢
        of each sale and you keep the rest - on a $10 listing, $6.75 lands
        with you. you see the exact &quot;you&apos;ll net&quot; number while
        setting your price, before you publish.
      </>
    ),
    plain:
      "Free to join, no monthly or listing fees. kula keeps 30% + 25 cents per sale; on a $10 listing you keep $6.75. You see your exact net while setting the price.",
  },
  {
    q: "when and how do i get paid?",
    a: (
      <>
        monthly, straight to your bank account, via stripe - the same payment
        company behind most of the internet&apos;s checkouts. your earnings tab
        shows every sale and your running net as they happen.
      </>
    ),
    plain:
      "Monthly, straight to your bank via Stripe. Your earnings tab shows every sale and your running net.",
  },
  {
    q: "why does 'connect stripe' ask for my id and bank details?",
    a: (
      <>
        that step is stripe verifying <em>you</em> - identity, bank account,
        and tax paperwork - the same checks any payment platform runs before
        sending people money. kula never sees or stores your banking
        information; it goes to stripe directly.
      </>
    ),
    plain:
      "Stripe verifies your identity, bank account and tax paperwork - standard for any platform that sends you money. kula never sees or stores your banking information.",
  },
  {
    q: "do i need a business or llc to sell?",
    a: (
      <>
        no - most teachers join as individuals. stripe asks its identity
        questions either way, and handles the tax forms that come with getting
        paid. (what selling means for your own taxes is between you and your
        tax person.)
      </>
    ),
    plain:
      "No - most teachers join as individuals. Stripe handles the payout-related tax forms; your own tax situation is yours to manage.",
  },
  {
    q: "what can i sell, and for how much?",
    a: (
      <>
        PDF, PPT, or PPTX files up to 50MB - sequences, class plans, workshop
        outlines, teacher training materials, guided meditations. price is
        yours to set: $1.00 minimum, or free if you&apos;re building an
        audience. it has to be your own original work.
      </>
    ),
    plain:
      "PDF, PPT, or PPTX up to 50MB - sequences, class plans, workshops, meditations. $1 minimum, or free. It must be your own original work.",
  },
  {
    q: "can i change a listing after it's live?",
    a: (
      <>
        yes - everything&apos;s editable: title, description, price, cover,
        even the file itself. when you upload an improved file, everyone who
        owns the listing automatically has the new version in their library,
        and they get an email telling them their content got better. updates
        are a reason to buy from you, not a hassle.
      </>
    ),
    plain:
      "Yes - title, description, price, cover, and the file itself are editable. When you upload an improved file, every owner automatically has the new version and gets an email.",
  },
  {
    q: "what if i want to take something off the marketplace?",
    a: (
      <>
        archive it - one click in your dashboard. it comes off the marketplace
        immediately and can&apos;t be bought again, but nothing is deleted:
        everyone who already owns it keeps their copy, its reviews still count
        toward your rating, and you can restore it whenever you like.
      </>
    ),
    plain:
      "Archive it - it leaves the marketplace immediately, but prior buyers keep their copies, its reviews still count toward your rating, and you can restore it any time.",
  },
  {
    q: "who can see my sales numbers?",
    a: (
      <>
        you and kula - nobody else. buyers see your listings, your ratings,
        and your profile. they never see how much you&apos;ve sold or earned.
      </>
    ),
    plain:
      "Only you and kula. Buyers see your listings, ratings and profile - never your sales or earnings.",
  },
];

const TRUST: QA[] = [
  {
    q: "is my content safe from being copied?",
    a: (
      <>
        files live in private storage - the only way to a download is owning
        the listing. previews are blurred, and every buyer agrees to the
        license (own teaching yes, re-sharing no) at checkout. if you ever
        find your work re-posted somewhere, our{" "}
        <Link href="/terms" className="underline">terms</Link> cover takedowns -
        email <a href={CONTACT_MAILTO} className="underline">{CONTACT_EMAIL}</a>.
      </>
    ),
    plain:
      "Files live in private storage - only owners can download. Previews are blurred and every buyer agrees to the license at checkout. Takedown requests: see the terms.",
  },
  {
    q: "is this stuff ai-generated?",
    a: (
      <>
        kula exists for the opposite: real plans from real teachers who are
        actually teaching. the platform itself never generates or alters
        content, and sellers certify the work is their own when they publish.
        handcrafted is the whole idea.
      </>
    ),
    plain:
      "kula is built for human-made teaching content. The platform never generates or alters content, and sellers certify the work is their own when they publish.",
  },
  {
    q: "what happens with my email address?",
    a: (
      <>
        it runs your account (receipts, password resets, updates to content
        you own) and the occasional kula update you agreed to at signup -
        every one has an unsubscribe link. the details live in the{" "}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </>
    ),
    plain:
      "It runs your account - receipts, password resets, updates to content you own - plus occasional kula updates you agreed to at signup, each with an unsubscribe link. Details in the privacy policy.",
  },
];

const GROUPS: [string, QA[]][] = [
  ["buying on kula", BUYING],
  ["selling on kula", SELLING],
  ["trust & safety", TRUST],
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GROUPS.flatMap(([, qas]) =>
      qas.map((qa) => ({
        "@type": "Question",
        name: qa.q,
        acceptedAnswer: { "@type": "Answer", text: qa.plain },
      }))
    ),
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <script
        type="application/ld+json"
        // `<` escaped so no future answer text can close the script tag
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <h1 className="font-display text-4xl font-bold lowercase">
        questions, answered
      </h1>
      <p className="mt-2 text-fog">
        the short version of how kula works. anything else -{" "}
        <a href={CONTACT_MAILTO} className="underline">{CONTACT_EMAIL}</a>{" "}
        reaches a human.
      </p>

      {GROUPS.map(([title, qas]) => (
        <section key={title} className="mt-10">
          <h2 className="font-display text-2xl font-bold lowercase text-sage-700">
            {title}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {qas.map((qa) => (
              <details
                key={qa.q}
                className="group rounded-2xl border border-ink/5 bg-white p-5 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display font-semibold lowercase [&::-webkit-details-marker]:hidden">
                  {qa.q}
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-fog transition-transform group-open:rotate-180"
                    aria-hidden
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-fog">{qa.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
