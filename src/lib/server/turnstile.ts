import type { NextApiRequest } from "next";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export interface TurnstileVerifyResult {
  ok: boolean;
  status: number;
  error: string;
}

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 5000;

export async function verifyTurnstileToken(token: unknown, remoteIp?: string): Promise<TurnstileVerifyResult> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret || !secret.trim()) {
    return {
      ok: false,
      status: 503,
      error: "Security verification is temporarily unavailable. Please try again later.",
    };
  }

  if (typeof token !== "string" || !token.trim() || token.length > 4096) {
    return {
      ok: false,
      status: 400,
      error: "Security verification is required. Please refresh and try again.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIp) {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 503,
        error: "Security verification could not be completed. Please try again.",
      };
    }

    const result = (await response.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      return {
        ok: false,
        status: 400,
        error: "Security verification failed. Please refresh and try again.",
      };
    }

    return {
      ok: true,
      status: 200,
      error: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Turnstile verification failed:", message);

    return {
      ok: false,
      status: 503,
      error: "Security verification could not be completed. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function getRequestIp(req: NextApiRequest): string | undefined {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(",")[0]?.trim();
  }

  return req.socket.remoteAddress;
}