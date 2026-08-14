import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";

export const metadata = { title: "privacy policy — kula" };

/*
 * Text is VERBATIM from the owner's finalized policy (fix list item 5 /
 * Appendix B), with three factual corrections — the appendix was written
 * for the earlier Replit prototype:
 *   1. §1: "kula.app" → kula-marketplace.com
 *   2. §2: "when you sign in via Replit, we receive your name and email
 *      address" → account creation collects email + display name (auth is
 *      email/password via Supabase; there is no Replit sign-in)
 *   3. §4: "we use Replit for infrastructure and authentication" → Supabase
 *      (infrastructure & authentication), Stripe (payments), Netlify
 *      (hosting)
 *   4. §7: cookie wording discloses Google Analytics (owner-approved —
 *      required before NEXT_PUBLIC_GA_MEASUREMENT_ID goes live)
 * Section numbering (two sections numbered 2) is as in the source document.
 */

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold lowercase text-ink">
        {n}. {title}
      </h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold lowercase">
        privacy policy
      </h1>
      <p className="mt-2 text-sm text-fog">last updated: June 2, 2025</p>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed text-fog">
        <Section n="1" title="Who We Are">
          kula (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is an
          online marketplace where yoga instructors can publish, sell, and
          purchase digital content including class sequences, workshops,
          meditations, and class plans. this privacy policy explains how we
          collect, use, and protect your personal information when you use our
          platform at kula-marketplace.com (the &quot;service&quot;).
        </Section>

        <Section n="2" title="Information We Collect — provided directly">
          Account information: when you create your account, we collect your
          email address and display name. Profile information: shop name, bio,
          and teaching specializations you add to your instructor profile.
          Content you upload: yoga sequences, class plans, cover images, and
          downloadable files you list for sale. Waitlist email: if you submit
          your email on our homepage, we store it to keep you informed about
          kula updates. Reviews: any ratings or written reviews you submit for
          content purchases.
        </Section>

        <Section n="2" title="Information We Collect — automatically">
          Usage data: pages visited, product views, and general interaction
          patterns to improve the platform. Session data: a session cookie is
          used to keep you signed in securely.
        </Section>

        <Section n="3" title="How We Use Your Information">
          To create and manage your account and profile; to facilitate
          purchases and deliver digital content to buyers; to display your
          public instructor profile to potential buyers; to calculate and
          display seller earnings; to send sale notification emails (if you
          opt in); to send platform updates to waitlist subscribers (if you
          signed up); to detect fraud and keep the platform secure; to comply
          with legal obligations.
        </Section>

        <Section n="4" title="How We Share Your Information">
          We do not sell your personal information. we may share it only in
          these circumstances — Public profile: your instructor name, bio,
          specializations, and published listings are visible to all visitors.
          Service providers: we use Supabase for infrastructure and
          authentication, Stripe for payment processing, and Netlify for
          hosting, and may use email services to deliver notifications. these
          providers access data only as necessary to deliver services to us.
          Legal requirements: if required by law, court order, or to protect
          the rights and safety of kula and its users. Business transfers: in
          the event of a merger or acquisition, your data may transfer as part
          of the business.
        </Section>

        <Section n="5" title="Data Retention">
          We retain your account information for as long as your account is
          active. if you delete your account, we will delete your personal
          information within 30 days, except where retention is required by
          law or for legitimate business purposes (e.g., records of completed
          transactions).
        </Section>

        <Section n="6" title="Your Rights">
          Depending on your location, you may have the right to: access the
          personal information we hold about you; correct inaccurate
          information; request deletion of your data; opt out of marketing
          communications; data portability. to exercise any of these rights,
          email us at{" "}
          <a href={CONTACT_MAILTO} className="underline text-ink">
            {CONTACT_EMAIL}
          </a>
          .
        </Section>

        <Section n="7" title="Cookies">
          We use a session cookie to keep you signed in, and Google Analytics
          cookies to understand how the site is used. we do not use
          advertising cookies. you can disable cookies in your browser
          settings, but this will prevent you from staying signed in.
        </Section>

        <Section n="8" title="Children's Privacy">
          kula is not directed to children under 13. we do not knowingly
          collect personal information from children. if you believe we have
          inadvertently collected such information, please contact us
          immediately.
        </Section>

        <Section n="9" title="Changes to This Policy">
          We may update this policy from time to time. when we do, we will
          update the &quot;last updated&quot; date at the top and, for
          material changes, notify registered users by email.
        </Section>

        <Section n="10" title="Contact">
          Questions about this privacy policy? contact us at{" "}
          <a href={CONTACT_MAILTO} className="underline text-ink">
            {CONTACT_EMAIL}
          </a>
          .
        </Section>
      </div>
    </div>
  );
}
