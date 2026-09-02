"use client";

import { useState } from "react";

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="font-serif text-xl">Site Configuration</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Site-wide settings are managed via environment variables and the Prisma schema.
          Contact settings, social links, and static content are defined in{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">src/lib/site.ts</code>.
        </p>
      </div>

      <div className="rounded border border-ink/10 bg-paper p-6">
        <h3 className="font-serif text-lg">About This Store</h3>
        <div className="mt-4 space-y-3 text-sm">
          <p><span className="text-ink-soft">Store:</span> DANDY Bags</p>
          <p><span className="text-ink-soft">Tagline:</span> BAGS FOR EVERY JOURNEY</p>
          <p><span className="text-ink-soft">Location:</span> Karur, Tamil Nadu, India</p>
        </div>
      </div>

      <div className="rounded border border-ink/10 bg-paper p-6">
        <h3 className="font-serif text-lg">Admin Account</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Admin accounts are provisioned via environment variables (ADMIN_EMAIL / ADMIN_PASSWORD).
          Password changes require updating environment configuration and redeploying.
        </p>
      </div>

      <div className="rounded border border-ink/10 bg-paper p-6">
        <h3 className="font-serif text-lg">Payment Provider</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Payment integration uses Razorpay. API keys are configured via environment
          variables (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Webhook endpoint:{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">/api/payments/webhook</code>
        </p>
      </div>

      <div className="rounded border border-ink/10 bg-paper p-6">
        <h3 className="font-serif text-lg">Database</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Database is PostgreSQL via Prisma. Connection managed through{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">DATABASE_URL</code> and{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">DIRECT_URL</code>
          {" "} environment variables.
        </p>
      </div>

      {!saved ? (
        <button
          onClick={() => setSaved(true)}
          className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper"
        >
          Note: Settings are read-only from this panel
        </button>
      ) : (
        <p className="text-sm text-green-800">Settings are managed via configuration.</p>
      )}
    </div>
  );
}
