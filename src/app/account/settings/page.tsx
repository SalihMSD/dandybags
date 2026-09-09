"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!message) return;
    if (!message.startsWith("Password updated successfully")) return;
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setPending(true);
    try {
      const res = await fetch("/api/customer/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
      setMessage("Password updated successfully. For your security, you have been logged out. Please log in again with your new password.");
      setPending(false);
      await logout();
    } catch {
      setMessage("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">Account Settings</h1>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5">
        <PasswordField
          name="currentPassword"
          label="Current Password"
          autoComplete="current-password"
          className="rounded-xl"
        />

        <PasswordField
          name="newPassword"
          label="New Password"
          autoComplete="new-password"
          className="rounded-xl"
        />

        <PasswordField
          name="confirmPassword"
          label="Confirm New Password"
          autoComplete="new-password"
          className="rounded-xl"
        />

        {message ? (
          <p
            className={`text-sm rounded-lg px-4 py-2.5 ${
              message.startsWith("Password updated successfully")
                ? "text-green-800 bg-green-50"
                : "text-red-800 bg-red-50"
            }`}
            role="alert"
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-camel text-[12px] tracking-[0.2em] text-ink uppercase font-medium transition hover:bg-camel-dark disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Updating..." : "Update Password"}
        </button>
      </form>

      <div className="mt-10 border-t border-ink/10 pt-6">
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex h-11 items-center justify-center border border-ink/15 px-6 text-[12px] tracking-[0.16em] uppercase text-ink-soft transition hover:border-ink hover:text-ink"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
