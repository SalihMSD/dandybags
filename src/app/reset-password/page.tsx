"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLinks, AuthShell } from "@/components/AuthShell";
import { PasswordField } from "@/components/PasswordField";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
      }),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    router.push("/login");
  }

  return (
    <AuthShell title="Reset Password">
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <PasswordField name="password" label="New Password" autoComplete="new-password" />
        <PasswordField name="confirmPassword" label="Confirm Password" autoComplete="new-password" />
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || !token}
          className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
        >
          {pending ? "Resetting password..." : "Reset password"}
        </button>
      </form>
      <AuthLinks />
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
