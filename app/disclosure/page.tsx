export const metadata = {
  title: "Disclosure | MadProps.com",
  description:
    "Affiliate disclosure and general terms for MadProps.com — transparency for users comparing proprietary trading firms.",
};

export default function DisclosurePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-zinc-300 leading-relaxed">
      <section className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-zinc-100 text-primary">
          Affiliate Disclosure
        </h1>

        <p className="mb-4">
          MadProps.com may receive affiliate commissions from certain proprietary
          trading firms featured on this site. These commissions support the
          operation and ongoing development of MadProps.com but do{" "}
          <em>not</em> influence our scoring, reviews, or data presentation.
        </p>

        <p className="mb-4">
          We strive to maintain accuracy and transparency across all listings.
          Firm information, including payout percentages, scaling rules, and
          funding models, may change without notice. Users are encouraged to
          verify details directly with each proprietary trading firm before
          making financial commitments.
        </p>

        <p className="mb-4">
          MadProps.com provides information strictly for educational and
          informational purposes. No information on this site constitutes
          financial advice. Trading involves risk and may result in loss of
          capital.
        </p>

        <p className="mt-8 italic text-sm text-zinc-500">
          Last updated: October 2025
        </p>
      </section>
    </main>
  );
}
