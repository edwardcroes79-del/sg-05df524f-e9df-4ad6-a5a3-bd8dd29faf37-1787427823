import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

type SafeUnconfirmedUser = {
  id: string;
  email: string;
  created_at: string;
  confirmation_sent_at: string | null;
  last_sign_in_at: string | null;
  audience: "business" | "customer" | "general";
  display_name: string | null;
};

function getAudience(metadata: Record<string, unknown>, customerUserIds: Set<string>, userId: string): SafeUnconfirmedUser["audience"] {
  if (customerUserIds.has(userId) || typeof metadata.full_name === "string") return "customer";
  if (typeof metadata.phone === "string") return "business";
  return "general";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    await requireSuperAdmin(req);
    const supabase = createServiceClient();

    const { data: userPage, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      return res.status(500).json({ error: "Unable to load authentication users." });
    }

    const users = userPage?.users || [];
    const unconfirmedIds = users
      .filter((user) => user.email && !user.email_confirmed_at && !user.confirmed_at)
      .map((user) => user.id);

    const customerUserIds = new Set<string>();
    if (unconfirmedIds.length > 0) {
      const { data: customerRows } = await supabase
        .from("customers")
        .select("user_id")
        .in("user_id", unconfirmedIds);

      (customerRows || []).forEach((row) => {
        if (row.user_id) customerUserIds.add(row.user_id);
      });
    }

    const safeUsers: SafeUnconfirmedUser[] = users
      .filter((user) => user.email && !user.email_confirmed_at && !user.confirmed_at)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map((user) => {
        const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata as Record<string, unknown> : {};
        const displayName = typeof metadata.full_name === "string" ? metadata.full_name : null;

        return {
          id: user.id,
          email: user.email || "",
          created_at: user.created_at,
          confirmation_sent_at: user.confirmation_sent_at || null,
          last_sign_in_at: user.last_sign_in_at || null,
          audience: getAudience(metadata, customerUserIds, user.id),
          display_name: displayName,
        };
      });

    return res.status(200).json({ users: safeUsers });
  } catch (error: any) {
    const message = error.message || "Unable to load unconfirmed users.";
    const status = message.includes("Super Admin") ? 403 : message.includes("authenticated") || message.includes("authorization") ? 401 : 500;
    return res.status(status).json({ error: message });
  }
}