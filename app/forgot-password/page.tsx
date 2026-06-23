"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import BrandLogo from "../components/BrandLogo";
import PasswordField from "../components/PasswordField";

type Step = "email" | "reset" | "done";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-medium text-black placeholder:text-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#84a300]";
const passwordInputClass =
  "w-full rounded-xl border border-gray-200 py-3.5 pl-4 pr-12 text-sm font-medium text-black placeholder:text-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#84a300]";
const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-base font-bold text-black shadow-md transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not send the reset code.");
      }

      setStatus(data.message || "Reset code sent. Check your inbox.");
      setStep("reset");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the reset code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not reset the password.");
      }

      setStatus(data.message || "Password updated. You can sign in now.");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setStep("done");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not reset the password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-white font-sans text-black">
      <div className="relative hidden w-[55%] overflow-hidden border-r border-gray-200/60 bg-gradient-to-br from-[#f9fafb] via-[#f0fdf4] to-[#e4ff66]/30 px-14 py-12 lg:flex lg:flex-col">
        <div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full border-[40px] border-[#d4ff00]/10 opacity-50 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full border-[30px] border-green-500/5 opacity-50 blur-2xl" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-12">
            <BrandLogo className="h-12 w-44" preload sizes="176px" />
          </div>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-success">Secure Account Recovery</span>
            </div>

            <h1 className="mb-5 text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground">
              Get back into your <span className="text-primary">TractionFlo</span> workspace.
            </h1>
            <p className="max-w-lg text-lg font-medium leading-relaxed text-gray-600">
              Reset access with a short-lived email code and keep your Instagram automation moving.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex w-full flex-col bg-[#fcfcfc] lg:w-[45%]">
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-[480px] rounded-[1.5rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
            <div className="mb-8 text-center">
              <div className="mb-6 flex justify-center lg:hidden">
                <BrandLogo className="h-12 w-44" preload sizes="176px" />
              </div>
              <h2 className="mb-2 text-[28px] font-extrabold text-foreground">
                {step === "done" ? "Password Updated" : "Forgot Password?"}
              </h2>
              <p className="text-sm font-medium text-foreground-muted">
                {step === "email" && "Enter your login email and we will send a 6-digit reset code."}
                {step === "reset" && "Add the code from your inbox and choose a new password."}
                {step === "done" && "Your account is ready for sign in with the new password."}
              </p>
            </div>

            {step === "email" && (
              <form onSubmit={requestOtp} className="space-y-4">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email Address"
                  autoComplete="email"
                  className={inputClass}
                />

                <button type="submit" disabled={isSubmitting} className={buttonClass}>
                  {isSubmitting ? "Sending Code" : "Send Reset Code"}
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={resetPassword} className="space-y-4">
                <input type="email" value={email} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} />
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  autoComplete="one-time-code"
                  className={inputClass}
                />
                <div className="relative">
                  <PasswordField
                    id="new-password"
                    name="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="New password"
                    autoComplete="new-password"
                    className={passwordInputClass}
                  />
                </div>
                <div className="relative">
                  <PasswordField
                    id="confirm-password"
                    name="confirm-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className={passwordInputClass}
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className={buttonClass}>
                  {isSubmitting ? "Updating Password" : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setStatus("");
                    setError("");
                  }}
                  className="w-full text-sm font-bold text-success hover:underline"
                >
                  Use a different email
                </button>
              </form>
            )}

            {step === "done" && (
              <Link href="/login" className={buttonClass}>
                Back to Login
              </Link>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            {status && (
              <div className="mt-4 rounded-lg border border-success/20 bg-secondary p-3 text-sm font-medium text-success">
                {status}
              </div>
            )}

            <div className="mt-8 border-t border-gray-100 pt-6 text-center text-sm font-medium text-gray-500">
              Remembered your password?{" "}
              <Link href="/login" className="font-bold text-[#15803d] hover:underline">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
