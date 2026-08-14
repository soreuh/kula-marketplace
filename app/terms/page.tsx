import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";

export const metadata = { title: "terms & conditions — kula" };

/*
 * Text is VERBATIM from the owner's finalized terms (fix list item 4 /
 * Appendix A), with two owner-directed changes:
 *   1. the domain (the appendix said "kula.com"; the platform lives at
 *      kula-marketplace.com)
 *   2. §4.6 amended for the free-listings feature: "all listings must be
 *      priced at a minimum of $1.00" → paid listings min $1.00, free
 *      resources allowed (per Aleks, Aug 2026 — for the owner's lawyer
 *      pass before launch)
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
      <h2 className="font-display text-xl font-bold lowercase">
        {n}. {title}
      </h2>
      <p className="mt-2 text-fog">{children}</p>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold lowercase">
        terms &amp; conditions
      </h1>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed">
        <Section n="1" title="Acceptance of Terms">
          By accessing or using the kula marketplace (kula-marketplace.com),
          you agree to be bound by these terms and conditions. if you do not
          agree, do not use the platform. kula reserves the right to update
          these terms at any time. continued use following notice of changes
          constitutes acceptance.
        </Section>

        <Section n="2" title="The kula Marketplace">
          kula is a peer-to-peer digital marketplace that enables yoga and
          wellness teachers (sellers) to sell original content to other yoga
          and wellness teachers (buyers). kula does not create, own, or
          endorse any content listed on the platform. kula is a technology
          platform, not a publisher or content creator.
        </Section>

        <Section n="3" title="Account Registration">
          To buy or sell on kula, you must create an account using accurate
          information. you are responsible for maintaining the security of
          your account. accounts are non-transferable. users must be 18 years
          of age or older.
        </Section>

        <Section n="4.1" title="Original Content">
          Sellers represent and warrant that all content uploaded to kula is
          their original work, does not infringe any third-party intellectual
          property rights, and complies with all applicable laws.
        </Section>

        <Section n="4.2" title="Licence to kula">
          By uploading content, sellers grant kula a non-exclusive,
          royalty-free licence to host, display, and distribute the content to
          buyers on the platform.
        </Section>

        <Section n="4.3" title="Intellectual Property Ownership">
          Sellers retain full copyright and ownership of all content they
          upload. kula does not claim ownership of seller content.
        </Section>

        <Section n="4.4" title="Prohibited Content">
          Sellers may not upload content that: infringes third-party
          copyright, trademark, or other IP rights; contains third-party
          audio, video, or images without appropriate licences; is misleading,
          fraudulent, or misrepresented; violates any applicable law or
          regulation; is hateful, discriminatory, or harmful.
        </Section>

        <Section n="4.5" title="Commission — 30% + $0.25">
          kula retains a commission of 30% of each sale price, plus a $0.25
          transaction fee per resource. the remaining amount is paid to the
          seller via Stripe Connect on a monthly basis, subject to a minimum
          payout threshold of $5.00.
        </Section>

        <Section n="4.6" title="Pricing">
          Sellers set their own prices. paid listings must be priced at a
          minimum of $1.00, and sellers may also offer resources free of
          charge. kula reserves the right to remove any paid listing priced
          below this threshold.
        </Section>

        <Section n="4.7" title="Indemnification">
          Sellers agree to indemnify, defend, and hold harmless kula and its
          officers, directors, employees, and agents from and against any
          claims, liabilities, damages, losses, or expenses (including legal
          fees) arising from seller&apos;s content, breach of these terms, or
          violation of any third-party rights.
        </Section>

        <Section n="5.1" title="Personal Use Licence">
          Upon purchase, buyers receive a non-exclusive, non-transferable
          licence to use the purchased content for personal teaching purposes
          only. this licence permits: teaching the content in live or online
          classes; minor adaptations for personal use.
        </Section>

        <Section n="5.2" title="Prohibited Buyer Actions">
          Buyers may not: resell, redistribute, or sublicence purchased
          content; share purchased files with others; reproduce content in
          publications or other products; remove or alter copyright notices.
        </Section>

        <Section n="5.3" title="Digital Downloads">
          All purchases are digital downloads. kula is not responsible for
          compatibility issues with the buyer&apos;s device or software.
        </Section>

        <Section n="6" title="Refund Policy">
          Due to the digital nature of all products, kula does not offer
          refunds once a file has been downloaded. if a file is corrupted,
          significantly misrepresented, or fails to download, buyers may
          request a refund within 24 hours of purchase by contacting{" "}
          <a href={CONTACT_MAILTO} className="underline">
            {CONTACT_EMAIL}
          </a>
          . kula reviews all refund requests within 7 days and has sole
          discretion in granting refunds.
        </Section>

        <Section n="7" title="Intellectual Property &amp; DMCA">
          kula respects intellectual property rights. if you believe content
          on kula infringes your copyright, submit a DMCA takedown notice to{" "}
          <a href={CONTACT_MAILTO} className="underline">
            {CONTACT_EMAIL}
          </a>{" "}
          including: identification of the infringing content; your contact
          information; a statement of good faith belief; your signature. kula
          will respond following a review period and remove infringing content
          if the claim is valid.
        </Section>

        <Section n="8" title="Payments &amp; Taxes">
          All payments are processed by Stripe. kula does not store payment
          card information. sellers are responsible for reporting and paying
          all taxes on their earnings. buyers are responsible for any
          applicable sales tax in their jurisdiction. kula may collect and
          remit taxes where required by law.
        </Section>

        <Section n="9" title="Content Moderation">
          kula reviews all content submissions before publication. kula
          reserves the right to reject, remove, or modify any listing at its
          sole discretion. repeated violations may result in account
          suspension or termination without notice.
        </Section>

        <Section n="10" title="Disclaimer of Warranties">
          kula is provided &apos;as is&apos; without warranties of any kind,
          express or implied. kula does not warrant that the platform will be
          uninterrupted, error-free, or that content will meet any specific
          standard of quality.
        </Section>

        <Section n="11" title="Limitation of Liability">
          To the maximum extent permitted by law, kula&apos;s liability for
          any claim arising from use of the platform is limited to the amount
          paid by the user in the 12 months preceding the claim, or $100,
          whichever is lower.
        </Section>

        <Section n="12" title="Governing Law">
          These terms are governed by the laws of the State of Wisconsin,
          United States. any disputes shall be resolved in the courts of
          Wisconsin.
        </Section>

        <Section n="13" title="Contact">
          For questions about these terms, contact:{" "}
          <a href={CONTACT_MAILTO} className="underline">
            {CONTACT_EMAIL}
          </a>
        </Section>
      </div>
    </div>
  );
}
