"use client";

import { useState } from "react";
import { fieldClass } from "@/components/AuthShell";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/customer/profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
      }),
    });
    const data = (await res.json()) as { error?: string; emailChanged?: boolean };
    setPending(false);
    if (!res.ok) {
      setMessage(data.error || "Something went wrong. Please try again.");
      return;
    }
    await refresh();
    setMessage(
      data.emailChanged
        ? "Profile updated. Please verify your new email before the next login."
        : "Profile updated.",
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">My Profile</h1>
      <form key={user.email} onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block text-sm">
          Full Name
          <input name="fullName" defaultValue={user.fullName} required className={fieldClass} />
        </label>
        <label className="block text-sm">
          Email
          <input name="email" type="email" defaultValue={user.email} required className={fieldClass} />
        </label>
        <label className="block text-sm">
          Mobile Number
          <input name="phone" defaultValue={user.phone} required className={fieldClass} />
        </label>
        {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-12 bg-ink px-8 text-[12px] tracking-[0.18em] text-paper uppercase disabled:opacity-60"
        >
          {pending ? "Updating profile..." : "Save"}
        </button>
      </form>
    </div>
  );
}
