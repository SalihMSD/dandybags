"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Logo } from "@/components/Logo";
import { AssetImage } from "@/components/AssetImage";
import { PasswordField } from "@/components/PasswordField";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
        terms: form.get("terms") === "on",
      }),
    });
    const data = (await res.json()) as { error?: string; verifyUrl?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setVerifyUrl(data.verifyUrl || "");
    setDone(true);
  }

  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-8rem)]">
      {/* LEFT — Brand panel (desktop only) */}
      <div className="relative hidden lg:flex lg:flex-col bg-cream">
        <div className="p-8">
          <Logo variant="wordmark" />
        </div>
        <div className="flex-1 relative px-8 pb-6">
          <div className="relative h-full min-h-[360px] rounded-2xl overflow-hidden">
            <AssetImage
              src="/products/dummy/hero-collection.png"
              alt="DANDY bags collection"
              fill
              className="object-cover object-center"
              sizes="50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p className="font-serif text-3xl text-white italic">More Than Bags</p>
              <p className="mt-2 text-[11px] tracking-[0.28em] text-white/80 uppercase">
                Bags for every journey
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 pt-2">
          <div className="flex flex-wrap gap-6">
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Premium Quality</p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Designed for Every Journey</p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Stylish & Practical</p>
          </div>
        </div>
      </div>

      {/* RIGHT — Register panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12 bg-paper">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          {/* Register card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-ink/5">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-[11px] tracking-[0.28em] text-camel uppercase font-medium">
                JOIN DANDY
              </p>
              <h1 className="mt-3 font-serif text-3xl text-ink">Create Your DANDY Account</h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                Create an account to make your shopping experience simpler.
              </p>
            </div>

            {/* Form */}
            {done ? (
              <div className="text-sm leading-relaxed text-ink-soft">
                <p>Your DANDY account is created. Verify your email to log in.</p>
                {verifyUrl ? (
                  <p className="mt-4">
                    Email delivery is not connected yet. Open this link to verify:
                    <br />
                    <a href={verifyUrl} className="mt-2 inline-block break-all text-ink underline">
                      Verify my account
                    </a>
                  </p>
                ) : (
                  <p className="mt-4">Please check your inbox for the verification email.</p>
                )}
              </div>
            ) : (
              <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
                <label className="block text-sm">
                  <span className="text-ink">Full Name *</span>
                  <input
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-paper px-4 text-base outline-none transition focus:border-camel focus:ring-1 focus:ring-camel/30"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-ink">Email Address *</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-paper px-4 text-base outline-none transition focus:border-camel focus:ring-1 focus:ring-camel/30"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-ink">Mobile Number *</span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-paper px-4 text-base outline-none transition focus:border-camel focus:ring-1 focus:ring-camel/30"
                  />
                </label>

                <PasswordField
                  name="password"
                  label="Password *"
                  autoComplete="new-password"
                  className="rounded-xl"
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm Password *"
                  autoComplete="new-password"
                  className="rounded-xl"
                />

                <label className="flex items-start gap-3 text-sm text-ink-soft">
                  <input name="terms" type="checkbox" required className="mt-1 h-4 w-4 rounded border-ink/20 text-camel focus:ring-camel" />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" className="text-ink underline underline-offset-4 transition">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-ink underline underline-offset-4 transition">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                {error ? (
                  <p className="text-sm text-red-800 bg-red-50 rounded-lg px-4 py-2.5" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="h-12 w-full rounded-xl bg-camel text-[12px] tracking-[0.2em] text-ink uppercase font-medium transition hover:bg-camel-dark disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}

            {/* Login CTA */}
            <div className="mt-6 rounded-xl border border-camel/20 bg-camel/5 p-4 text-center">
              <p className="text-sm text-ink">Already have an account?</p>
              <Link
                href="/login"
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-camel text-[12px] tracking-[0.2em] text-ink uppercase font-medium transition hover:bg-camel-dark"
              >
                Log In
              </Link>
            </div>

            {/* Security & navigation */}
            <p className="mt-5 text-center text-[11px] text-ink-soft/70">
              Secure registration • Your information is protected
            </p>
            <p className="mt-3 text-center text-sm">
              <Link href="/" className="text-ink-soft hover:text-ink underline underline-offset-4 transition">
                Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
