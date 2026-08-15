// Netlify scheduled function — the TRIGGER only. All real logic lives in
// /api/cron/review-sweep (Next route: normal imports, service role, email
// shell). This stays a dumb, repo-versioned alarm clock: it deploys with
// every push, reads CRON_SECRET from the same Netlify env panel as every
// other secret, and if kula ever leaves Netlify these ten lines are the
// only thing to re-create.
//
// process.env.URL is Netlify's own "this site's primary URL".
// Schedule: daily 15:00 UTC ≈ 11:00 ET — mid-morning inbox time.
const runSweep = async () => {
  await fetch(`${process.env.URL}/api/cron/review-sweep`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  }).catch(() => null);
};

export default runSweep;

export const config = { schedule: "0 15 * * *" };
