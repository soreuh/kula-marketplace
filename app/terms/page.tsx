export const metadata = { title: "terms of service — kula" };

/*
 * Template terms drafted to the product spec — have a lawyer (or a
 * lawyer-reviewed template service) look this over before real launch.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold lowercase">
        terms of service
      </h1>
      <p className="mt-2 text-sm text-fog">last updated: august 2026</p>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed text-ink/90">
        <section>
          <h2 className="font-display text-xl font-bold lowercase">1. what kula is</h2>
          <p className="mt-2 text-fog">
            kula is a marketplace where yoga teachers (&quot;sellers&quot;) offer
            digital teaching materials for sale and other teachers
            (&quot;buyers&quot;) purchase them. kula facilitates the transaction;
            content is created and owned by sellers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase">2. seller obligations</h2>
          <p className="mt-2 text-fog">
            By listing content you confirm that it is your original work and
            that you own or control all rights needed to sell it. Prohibited:
            content you do not own, content copied from other teachers or
            publications, and any unlawful, harmful, or misleading material.
            Listings must be priced at $1.00 or more. kula charges a commission
            of 30% of the sale price plus $0.25 per transaction; the remainder
            is paid to you via Stripe on a monthly schedule once your balance
            reaches $5.00. Payment disputes and chargebacks are deducted from
            the seller&apos;s balance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase">3. buyer rights (licensing)</h2>
          <p className="mt-2 text-fog">
            A purchase grants you a personal, non-transferable license to use
            the content in your own teaching and study. It is a one-time
            payment with lifetime access for you. You may not resell,
            redistribute, share, sublicense, or republish purchased content, in
            whole or in part, in any form.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase">4. refunds</h2>
          <p className="mt-2 text-fog">
            Products on kula are digital files delivered instantly. Once a file
            has been downloaded, purchases are generally non-refundable. If a
            file is corrupted, materially misdescribed, or you were charged in
            error, contact us and we&apos;ll make it right.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase">5. copyright &amp; dmca takedowns</h2>
          <p className="mt-2 text-fog">
            If you believe content on kula infringes your copyright, email{" "}
            <a href="mailto:discoverkula@gmail.com" className="underline">
              discoverkula@gmail.com
            </a>{" "}
            with: your contact information, a description and link to the
            infringing listing, a description of the original work, and a
            statement made in good faith that the use is unauthorized. We will
            review promptly, remove infringing content, and may suspend repeat
            infringers&apos; accounts.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase">6. accounts &amp; the platform</h2>
          <p className="mt-2 text-fog">
            You are responsible for your account and for the accuracy of what
            you post. We may suspend listings or accounts that violate these
            terms. Payments are processed by Stripe; kula never stores your
            card details. The platform is provided &quot;as is&quot; without
            warranties; kula&apos;s liability is limited to the amount you paid
            through the platform in the previous 12 months.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase">7. contact</h2>
          <p className="mt-2 text-fog">
            Questions about these terms:{" "}
            <a href="mailto:discoverkula@gmail.com" className="underline">
              discoverkula@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
