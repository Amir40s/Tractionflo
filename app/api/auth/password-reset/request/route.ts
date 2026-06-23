import { NextResponse } from "next/server";
import { sendPasswordResetAlertEmail, sendPasswordResetOtpEmail } from "@/lib/mailer";
import {
  buildPasswordResetOtpMetadata,
  clearPasswordResetOtpMetadata,
  findAuthUserByEmail,
  generatePasswordResetOtp,
  getPasswordResetOtpMetadata,
  getUserMetadata,
  isInsidePasswordResetResendWindow,
  isPasswordResetOtpExpired,
  isValidEmail,
  normalizeEmail,
  setPasswordResetOtpMetadata,
} from "@/lib/password-reset";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const genericMessage = "If an account exists for that email, a reset code has been sent.";

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { email?: string };
    const email = normalizeEmail(payload.email);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const user = await findAuthUserByEmail(supabase, email);

    if (!user) {
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    const existingReset = getPasswordResetOtpMetadata(getUserMetadata(user));

    if (existingReset && !isPasswordResetOtpExpired(existingReset) && isInsidePasswordResetResendWindow(existingReset)) {
      return NextResponse.json({ ok: true, message: "A reset code was sent recently. Please check your inbox." });
    }

    const otp = generatePasswordResetOtp();
    const reset = buildPasswordResetOtpMetadata(email, otp);

    await setPasswordResetOtpMetadata(supabase, user, reset);

    try {
      await sendPasswordResetOtpEmail(email, otp);
    } catch (error) {
      await clearPasswordResetOtpMetadata(supabase, user).catch((clearError) => {
        console.error("Password reset OTP cleanup error:", clearError);
      });
      throw error;
    }

    await sendPasswordResetAlertEmail({
      email,
      event: "requested",
      occurredAt: reset.requestedAt,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || "",
    }).catch((alertError) => {
      console.error("Password reset alert email error:", alertError);
    });

    return NextResponse.json({ ok: true, message: genericMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the password reset code.";
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
