import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

type ActivityCounts = Record<string, number>;

type DeleteSummary = {
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

function getMetadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasMeaningfulActivity(activityCounts: ActivityCounts) {
  return Object.values(activityCounts).some((count) => count > 0);
}

async function countByCustomerIds(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  column: string,
  customerIds: string[]
) {
  if (customerIds.length === 0) return 0;

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(column, customerIds);

  if (error) {
    throw new Error(`Could not inspect ${table}: ${error.message}`);
  }

  return count || 0;
}

async function countByUserId(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  column: string,
  userId: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, userId);

  if (error) {
    throw new Error(`Could not inspect ${table}: ${error.message}`);
  }

  return count || 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServiceClient();

  try {
    const adminUserId = await requireSuperAdmin(req);
    const { userId, emailConfirmation } = req.body as { userId?: unknown; emailConfirmation?: unknown };

    if (!isUuid(userId)) {
      return res.status(400).json({ error: "A valid target user ID is required." });
    }

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

    const metadata = getMetadataObject(targetUser.user_metadata);
    const metadataRole = getMetadataText(metadata, "role");
    const metadataRegistrationType = getMetadataText(metadata, "registration_type");
    const hasBusinessMetadata = typeof metadata.phone === "string" || metadataRegistrationType === "business";

    const [
      { data: customerRows, error: customerError },
      { data: profile, error: profileError },
      { data: ownedBusinesses, error: ownedBusinessesError },
      { data: staffMemberships, error: staffMembershipsError },
    ] = await Promise.all([
      supabase.from("customers").select("id, user_id, name, email").eq("user_id", userId),
      supabase.from("profiles").select("role, is_super_admin").eq("id", userId).maybeSingle(),
      supabase.from("businesses").select("id").eq("owner_id", userId).limit(1),
      supabase.from("business_users").select("id, role").eq("user_id", userId).limit(1),
    ]);

    if (customerError) throw customerError;
    if (profileError) throw profileError;
    if (ownedBusinessesError) throw ownedBusinessesError;
    if (staffMembershipsError) throw staffMembershipsError;

    const hasPrivilegedProfile = Boolean(profile?.is_super_admin) || Boolean(profile?.role && profile.role !== "customer");
    const hasBusinessOwnership = Boolean(ownedBusinesses?.length);
    const hasStaffMembership = Boolean(staffMemberships?.length);
    const hasPrivilegedMetadata = Boolean(metadataRole && metadataRole !== "customer") || Boolean(metadataRegistrationType && metadataRegistrationType !== "customer") || hasBusinessMetadata;

    if (hasPrivilegedProfile || hasBusinessOwnership || hasStaffMembership || hasPrivilegedMetadata) {
      return res.status(409).json({
        error: "Deletion blocked because this account is connected to a business, staff, admin, or non-customer role.",
      });
    }

    const hasCustomerEvidence = Boolean(customerRows?.length) ||
      profile?.role === "customer" ||
      metadataRole === "customer" ||
      metadataRegistrationType === "customer" ||
      typeof metadata.full_name === "string";

    if (!hasCustomerEvidence) {
      return res.status(409).json({
        error: "Deletion blocked because this account is not verified as a customer registration.",
      });
    }

    const customerIds = (customerRows || []).map((row) => row.id).filter(Boolean);

    const activityCounts: ActivityCounts = {
      customer_loyalty_cards: await countByCustomerIds(supabase, "customer_loyalty_cards", "customer_id", customerIds),
      customer_loyalty_cards_by_user: await countByUserId(supabase, "customer_loyalty_cards", "user_id", userId),
      stamp_transactions: await countByCustomerIds(supabase, "stamp_transactions", "customer_id", customerIds),
      rewards: await countByCustomerIds(supabase, "rewards", "customer_id", customerIds),
      reward_qr_tokens: await countByCustomerIds(supabase, "reward_qr_tokens", "customer_id", customerIds),
      payment_transactions: await countByCustomerIds(supabase, "payment_transactions", "customer_id", customerIds),
      customer_birthdays: await countByCustomerIds(supabase, "customer_birthdays", "customer_id", customerIds),
      customer_birthday_corrections: await countByCustomerIds(supabase, "customer_birthday_corrections", "customer_id", customerIds),
      birthday_reward_awards: await countByCustomerIds(supabase, "birthday_reward_awards", "customer_id", customerIds),
      anti_fraud_security_alerts: await countByCustomerIds(supabase, "anti_fraud_security_alerts", "customer_id", customerIds),
      anti_fraud_blocked_attempts: await countByCustomerIds(supabase, "anti_fraud_blocked_attempts", "customer_id", customerIds),
    };

    if (hasMeaningfulActivity(activityCounts)) {
      return res.status(409).json({
        error: "Deletion blocked because this account has loyalty, reward, payment, birthday, or anti-fraud activity that must be preserved.",
        activityCounts,
      });
    }

    const summary: DeleteSummary = {
      customerRowsDeleted: 0,
      profileRowsDeleted: 0,
      authUserDeleted: false,
      auditLogged: false,
    };

    if (customerIds.length > 0) {
      const { count: deletedCustomerCount, error: deleteCustomerError } = await supabase
        .from("customers")
        .delete({ count: "exact" })
        .in("id", customerIds);

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

    const deletedAt = new Date().toISOString();
    const { error: auditError } = await supabase.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "unconfirmed_auth_user_deleted",
      target_type: "auth_user",
      target_id: userId,
      metadata: {
        deleted_auth_user_id: userId,
        deleted_email: serverEmail,
        deletion_action_type: "unconfirmed_auth_user_permanent_delete",
        deleted_at: deletedAt,
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
      message: `${targetUser.email} was permanently deleted.`,
      summary,
    });
  } catch (error: any) {
    const message = error.message || "Unconfirmed user deletion failed.";
    const status = message.includes("Super Admin")
      ? 403
      : message.includes("authenticated") || message.includes("authorization") || message.includes("Missing authorization")
        ? 401
        : 500;

    return res.status(status).json({ error: status === 500 ? message : message });
  }
}