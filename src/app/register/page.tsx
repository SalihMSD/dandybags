"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLinks, AuthShell, fieldClass } from "@/components/AuthShell";
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
    <AuthShell title="Create Your DANDY Account">
      {done ? (
        <div className="mt-8 text-sm leading-relaxed text-ink-soft">
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
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-sm">
            Full Name *
            <input name="fullName" required className={fieldClass} autoComplete="name" />
          </label>
          <label className="block text-sm">
            Email Address *
            <input name="email" type="email" required className={fieldClass} autoComplete="email" />
          </label>
          <label className="block text-sm">
            Mobile Number *
            <input name="phone" required className={fieldClass} autoComplete="tel" />
          </label>
          <PasswordField name="password" label="Password *" autoComplete="new-password" />
          <PasswordField name="confirmPassword" label="Confirm Password *" autoComplete="new-password" />
          <label className="flex items-start gap-3 text-sm text-ink-soft">
            <input name="terms" type="checkbox" required className="mt-1" />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="underline">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {pending ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Login
        </Link>
      </p>
      <AuthLinks />
    </AuthShell>
  );
}
