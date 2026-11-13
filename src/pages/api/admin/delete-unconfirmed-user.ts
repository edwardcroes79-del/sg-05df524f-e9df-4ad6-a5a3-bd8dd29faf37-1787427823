import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { evaluateUnconfirmedUser } from "@/lib/server/unconfirmedUserEligibility";

type DeleteSummary = {
  accountType: string;
  businessRowsDeleted: number;
  customerRowsDeleted: number;
  profileRowsDeleted: number;
  authUserDeleted: boolean;
  auditLogged: boolean;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServiceClient();

  try {
    const adminUserId = await requireSuperAdmin(req);
    const { userId: rawUserId, emailConfirmation } = req.body as { userId?: unknown; emailConfirmation?: unknown };

    if (!isUuid(rawUserId)) {
      return res.status(400).json({ error: "A valid target user ID is required." });
    }

    const userId = rawUserId.trim();
    const typedEmail = normalizeEmail(emailConfirmation);

    if (!typedEmail) {
      return res.status(400).json({ error: "Type the user's email address to confirm deletion." });
    }

    if (userId === adminUserId) {
      return res.status(400).json({ error: "A Super Admin cannot delete their own authenticated account through this action." });
    }

    const { data: targetResult, error: targetError } = await supabase.auth.admin.getUserById(userId);

    if (targetError || !targetResult?.user?.email) {
      return res.status(404).json({ error: "User account was not found." });
    }

    const targetUser = targetResult.user;
    const serverEmail = normalizeEmail(targetUser.email);

    if (typedEmail !== serverEmail) {
      return res.status(400).json({ error: "The typed email address does not match the account being deleted." });
    }

    if (targetUser.email_confirmed_at || targetUser.confirmed_at) {
      return res.status(409).json({ error: "Deletion blocked because this account has already confirmed its email address." });
    }

    if (targetUser.last_sign_in_at) {
      return res.status(409).json({ error: "Deletion blocked because this account has successfully signed in before." });
    }

    const eligibility = await evaluateUnconfirmedUser(supabase, targetUser);

    if (!eligibility.eligible) {
      return res.status(409).json({
        error: eligibility.blockReason,
        accountType: eligibility.accountType,
        blockingCounts: eligibility.blockingCounts,
      });
    }

    const summary: DeleteSummary = {
      accountType: eligibility.accountType,
      businessRowsDeleted: 0,
      customerRowsDeleted: 0,
      profileRowsDeleted: 0,
      authUserDeleted: false,
      auditLogged: false,
    };

    for (const businessId of eligibility.ownedBusinessIds) {
      const { error: membershipError } = await supabase
        .from("business_users")
        .delete()
        .eq("business_id", businessId)
        .eq("user_id", userId);

      if (membershipError) {
        throw new Error(`Could not remove owner membership of empty business: ${membershipError.message}`);
      }

      const { count: deletedBusinessCount, error: businessError } = await supabase
        .from("businesses")
        .delete({ count: "exact" })
        .eq("id", businessId)
        .eq("owner_id", userId);

      if (businessError) {
        throw new Error(`Could not delete empty business registration: ${businessError.message}`);
      }

      summary.businessRowsDeleted += deletedBusinessCount || 0;
    }

    if (eligibility.customerIds.length > 0) {
      const { count: deletedCustomerCount, error: deleteCustomerError } = await supabase
        .from("customers")
        .delete({ count: "exact" })
        .in("id", eligibility.customerIds);

      if (deleteCustomerError) {
        throw new Error(`Could not delete orphaned customer record: ${deleteCustomerError.message}`);
      }

      summary.customerRowsDeleted = deletedCustomerCount || 0;
    }

    const { count: deletedProfileCount, error: deleteProfileError } = await supabase
      .from("profiles")
      .delete({ count: "exact" })
      .eq("id", userId);

    if (deleteProfileError) {
      throw new Error(`Could not delete orphaned profile record: ${deleteProfileError.message}`);
    }

    summary.profileRowsDeleted = deletedProfileCount || 0;

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      throw new Error(`Could not delete Auth user: ${deleteAuthError.message}`);
    }

    summary.authUserDeleted = true;

    const { error: auditError } = await supabase.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "unconfirmed_auth_user_deleted",
      target_type: "auth_user",
      target_id: userId,
      metadata: {
        deleted_auth_user_id: userId,
        deleted_email: serverEmail,
        account_type: eligibility.accountType,
        deletion_action_type: "unconfirmed_auth_user_permanent_delete",
        deleted_at: new Date().toISOString(),
        business_rows_deleted: summary.businessRowsDeleted,
        customer_rows_deleted: summary.customerRowsDeleted,
        profile_rows_deleted: summary.profileRowsDeleted,
      },
    });

    if (auditError) {
      throw new Error(`Auth user was deleted, but audit logging failed: ${auditError.message}`);
    }

    summary.auditLogged = true;

    return res.status(200).json({
      success: true,
      message: `${targetUser.email} (${eligibility.accountType}) was permanently deleted.`,
      summary,
    });
  } catch (error: any) {
    const message = error.message || "Unconfirmed user deletion failed.";
    const status = message.includes("Super Admin")
      ? 403
      : message.includes("authenticated") || message.includes("authorization") || message.includes("Missing authorization")
        ? 401
        : 500;

    return res.status(status).json({ error: message });
  }
}