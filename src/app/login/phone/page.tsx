"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createRecaptchaVerifier, sendPhoneOtp, type ConfirmationResult } from "@/lib/firebase/client";
import { AuthShell, AuthLinks, fieldClass } from "@/components/AuthShell";
import { guestCartPayload, useAuth } from "@/components/AuthProvider";

function PhoneOtpForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<ReturnType<typeof createRecaptchaVerifier> | null>(null);
  const recaptchaContainerId = "phone-otp-recaptcha";

  useEffect(() => {
    if (step !== "phone") return;
    if (typeof window === "undefined") return;
    if (recaptchaVerifierRef.current) return;

    try {
      recaptchaVerifierRef.current = createRecaptchaVerifier(recaptchaContainerId);
    } catch {
      /* Firebase not configured; will surface on send. */
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);

    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setPending(false);
      return;
    }

    const e164 = `+91${digits}`;
    const verifier = recaptchaVerifierRef.current;
    if (!verifier) {
      setError("reCAPTCHA is not ready. Please refresh and try again.");
      setPending(false);
      return;
    }

    try {
      const confirmationResult = await sendPhoneOtp(e164, verifier);
      confirmationResultRef.current = confirmationResult;
      setStep("otp");
      setResendCooldown(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send OTP. Please try again.";
      setError(message);
      try {
        verifier.clear();
      } catch {
        /* ignore */
      }
      recaptchaVerifierRef.current = createRecaptchaVerifier(recaptchaContainerId);
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);

    const confirmationResult = confirmationResultRef.current;
    if (!confirmationResult) {
      setError("Session expired. Please request a new OTP.");
      setStep("phone");
      setPending(false);
      return;
    }

    try {
      const credential = await confirmationResult.confirm(otp.trim());
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, guestCart: guestCartPayload() }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid OTP or phone number.");
        setPending(false);
        return;
      }

      await refresh();
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid OTP or phone number.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || pending) return;
    setStep("phone");
    setOtp("");
    setError("");
    confirmationResultRef.current = null;

    try {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    } catch {
      /* ignore */
    }
    recaptchaVerifierRef.current = createRecaptchaVerifier(recaptchaContainerId);
  }

  return (
    <>
      <h1 className="font-serif text-4xl">Login with Phone</h1>
      {step === "phone" ? (
        <form onSubmit={(e) => void handleSendOtp(e)} className="mt-8 space-y-4">
          <label className="block text-sm">
            Mobile Number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={fieldClass}
              placeholder="10-digit mobile number"
              autoComplete="tel"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {pending ? "Sending OTP..." : "Send OTP"}
          </button>
          <div id={recaptchaContainerId} className="hidden" />
        </form>
      ) : (
        <form onSubmit={(e) => void handleVerifyOtp(e)} className="mt-8 space-y-4">
          <p className="text-sm text-ink-soft">
            Enter the 6-digit OTP sent to +91{phone}
          </p>
          <label className="block text-sm">
            OTP
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={fieldClass}
              placeholder="6-digit OTP"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {pending ? "Verifying..." : "Verify & Login"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || pending}
            className="h-12 w-full border border-ink/15 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </form>
      )}
      <div className="mt-6 text-center text-sm">
        <p>
          Prefer password login?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Login with password
          </Link>
        </p>
      </div>
      <AuthLinks />
    </>
  );
}

export default function PhoneLoginPage() {
  return (
    <Suspense fallback={<div className="font-serif text-4xl">Loading...</div>}>
      <PhoneOtpForm />
    </Suspense>
  );
}
