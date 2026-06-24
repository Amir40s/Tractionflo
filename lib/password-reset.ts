import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const PASSWORD_RESET_OTP_METADATA_KEY = "password_reset_otp";
export const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_OTP_RESEND_WINDOW_MS = 60 * 1000;
export const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;

export type PasswordResetOtpMetadata = {
  hash: string;
  expiresAt: string;
  requestedAt: string;
  attempts: number;
};

type ServiceSupabaseClient = ReturnType<typeof createSupabaseServiceClient>;

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeOtp(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : "";
}

export function generatePasswordResetOtp() {
  return randomInt(100000, 1000000).toString();
}

function getOtpSecret() {
  return (
    process.env.PASSWORD_RESET_OTP_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "tractionflo-password-reset-dev-secret"
  );
}

function hashPasswordResetOtp(email: string, otp: string) {
  return createHmac("sha256", getOtpSecret()).update(`${email}:${otp}`).digest("hex");
}

export function verifyPasswordResetOtp(email: string, otp: string, expectedHash: string) {
  const actual = Buffer.from(hashPasswordResetOtp(email, otp), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function buildPasswordResetOtpMetadata(email: string, otp: string): PasswordResetOtpMetadata {
  const requestedAt = new Date();

  return {
    hash: hashPasswordResetOtp(email, otp),
    expiresAt: new Date(requestedAt.getTime() + PASSWORD_RESET_OTP_TTL_MS).toISOString(),
    requestedAt: requestedAt.toISOString(),
    attempts: 0,
  };
}

export function getUserMetadata(user: User) {
  return compactUserAuthMetadata(user.user_metadata);
}

export function getPasswordResetOtpMetadata(metadata: Record<string, unknown>) {
  const value = metadata[PASSWORD_RESET_OTP_METADATA_KEY];

  if (!value || typeof value !== "object") {
    return null;
  }

  const reset = value as Partial<PasswordResetOtpMetadata>;

  if (typeof reset.hash !== "string" || typeof reset.expiresAt !== "string" || typeof reset.requestedAt !== "string") {
    return null;
  }

  return {
    hash: reset.hash,
    expiresAt: reset.expiresAt,
    requestedAt: reset.requestedAt,
    attempts: typeof reset.attempts === "number" ? reset.attempts : 0,
  };
}

export function isPasswordResetOtpExpired(reset: PasswordResetOtpMetadata) {
  return new Date(reset.expiresAt).getTime() <= Date.now();
}

export function isInsidePasswordResetResendWindow(reset: PasswordResetOtpMetadata) {
  const requestedAt = new Date(reset.requestedAt).getTime();
  return Number.isFinite(requestedAt) && Date.now() - requestedAt < PASSWORD_RESET_OTP_RESEND_WINDOW_MS;
}

export async function findAuthUserByEmail(supabase: ServiceSupabaseClient, email: string) {
  const normalizedEmail = normalizeEmail(email);
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const user = (data.users || []).find((item) => normalizeEmail(item.email) === normalizedEmail);

    if (user) {
      return user;
    }

    if (!data.users || data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

export async function setPasswordResetOtpMetadata(
  supabase: ServiceSupabaseClient,
  user: User,
  reset: PasswordResetOtpMetadata
) {
  const metadata = getUserMetadata(user);
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      [PASSWORD_RESET_OTP_METADATA_KEY]: reset,
    },
  });

  if (error) {
    throw error;
  }
}

export async function clearPasswordResetOtpMetadata(supabase: ServiceSupabaseClient, user: User, password?: string) {
  const metadata = getUserMetadata(user);
  const nextMetadata = { ...metadata };
  delete nextMetadata[PASSWORD_RESET_OTP_METADATA_KEY];

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
    ...(password ? { password } : {}),
  });

  if (error) {
    throw error;
  }
}
