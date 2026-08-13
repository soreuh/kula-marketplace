export const metadata = { title: "privacy policy — kula" };

/*
 * Template policy — have a lawyer review before real launch.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold lowercase">
        privacy policy
      </h1>
      <p className="mt-2 text-sm text-fog">last updated: august 2026</p>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed text-fog">
        <section>
          <h2 className="font-display text-xl font-bold lowercase text-ink">
            what we collect
          </h2>
          <p className="mt-2">
            Your account email and display name; listings and files you upload;
            records of purchases and sales; and, if you opt in, your email on
            our mailing list. Payment details (card numbers, bank accounts) are
            collected and stored by Stripe, never by kula. Seller identity
            verification is performed by Stripe.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase text-ink">
            how we use it
          </h2>
          <p className="mt-2">
            To run the marketplace: process purchases, deliver files, pay
            sellers, show your library, and send transactional messages (like
            sale notifications you&apos;ve turned on). Marketing emails are
            sent only if you opted in, and every one includes a way out.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase text-ink">
            who processes it
          </h2>
          <p className="mt-2">
            kula runs on Supabase (database &amp; file storage), Stripe
            (payments &amp; payouts), and Netlify (hosting). Each processes
            data on our behalf under their own security programs. We do not
            sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold lowercase text-ink">
            your choices
          </h2>
          <p className="mt-2">
            You can update your profile any time, turn sale notifications on
            or off in your dashboard, and unsubscribe from marketing email. To
            export or delete your account data, email{" "}
            <a href="mailto:discoverkula@gmail.com" className="underline text-ink">
              discoverkula@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
