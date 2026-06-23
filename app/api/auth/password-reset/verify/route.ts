import { NextResponse } from "next/server";
import { sendPasswordResetAlertEmail } from "@/lib/mailer";
import {
  PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  clearPasswordResetOtpMetadata,
  findAuthUserByEmail,
  getPasswordResetOtpMetadata,
  getUserMetadata,
  isPasswordResetOtpExpired,
  isValidEmail,
  normalizeEmail,
  sanitizeOtp,
  setPasswordResetOtpMetadata,
  verifyPasswordResetOtp,
} from "@/lib/password-reset";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

function invalidCodeResponse() {
  return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      email?: string;
      otp?: string;
      password?: string;
    };
    const email = normalizeEmail(payload.email);
    const otp = sanitizeOtp(payload.otp);
    const password = typeof payload.password === "string" ? payload.password.trim() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (otp.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit reset code." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const user = await findAuthUserByEmail(supabase, email);

    if (!user) {
      return invalidCodeResponse();
    }

    const reset = getPasswordResetOtpMetadata(getUserMetadata(user));

    if (!reset || isPasswordResetOtpExpired(reset) || reset.attempts >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
      await clearPasswordResetOtpMetadata(supabase, user).catch((clearError) => {
        console.error("Password reset expired OTP cleanup error:", clearError);
      });
      return invalidCodeResponse();
    }

    if (!verifyPasswordResetOtp(email, otp, reset.hash)) {
      await setPasswordResetOtpMetadata(supabase, user, {
        ...reset,
        attempts: reset.attempts + 1,
      });
      return invalidCodeResponse();
    }

    await clearPasswordResetOtpMetadata(supabase, user, password);

    await sendPasswordResetAlertEmail({
      email,
      event: "completed",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || "",
    }).catch((alertError) => {
      console.error("Password reset completion alert email error:", alertError);
    });

    return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reset the password.";
    console.error("Password reset verify error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
