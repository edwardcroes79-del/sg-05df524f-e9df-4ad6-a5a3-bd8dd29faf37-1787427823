import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type PreferenceResponse = {
  emailReceiptsEnabled?: boolean;
  error?: string;
};

function getBearerToken(req: NextApiRequest) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PreferenceResponse>) {
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ error: userError?.message || "Invalid session" });
    }

    if (req.method === "GET") {
      const { data: customer, error } = await supabaseAdmin
        .from("customers")
        .select("email_receipts_enabled")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) throw error;
      if (!customer) return res.status(404).json({ error: "Customer profile was not found" });

      return res.status(200).json({
        emailReceiptsEnabled: Boolean(customer.email_receipts_enabled),
      });
    }

    const { emailReceiptsEnabled } = req.body as { emailReceiptsEnabled?: unknown };
    if (typeof emailReceiptsEnabled !== "boolean") {
      return res.status(400).json({ error: "emailReceiptsEnabled must be a boolean" });
    }

    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .update({ email_receipts_enabled: emailReceiptsEnabled })
      .eq("user_id", userData.user.id)
      .select("email_receipts_enabled")
      .maybeSingle();

    if (error) throw error;
    if (!customer) return res.status(404).json({ error: "Customer profile was not found" });

    return res.status(200).json({
      emailReceiptsEnabled: Boolean(customer.email_receipts_enabled),
    });
  } catch (error: any) {
    console.error("Email receipt preference error:", error);
    return res.status(500).json({ error: error.message || "Failed to save email receipt preference" });
  }
}