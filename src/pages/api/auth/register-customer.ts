import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestIp, verifyTurnstileToken } from "@/lib/server/turnstile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, password, name, turnstileToken } = req.body ?? {};

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedPassword = typeof password === "string" ? password : "";

    if (!normalizedName) {
      return res.status(400).json({ error: "Please enter your full name." });
    }

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (normalizedPassword.length < 6) {
      return res.status(400).json({ error: "Please choose a password with at least 6 characters." });
    }

    const turnstileResult = await verifyTurnstileToken(turnstileToken, getRequestIp(req));

    if (!turnstileResult.ok) {
      return res.status(turnstileResult.status).json({ error: turnstileResult.error });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Customer registration Turnstile verification failed:", message);
    return res.status(500).json({ error: "Security verification could not be completed. Please try again." });
  }
}