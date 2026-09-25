import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type DeleteSummary = {
  stampTransactions: number;
  rewardQrTokens: number;
  rewards: number;
  loyaltyCards: number;
  paymentTransactions: number;
  customerDeleted: boolean;
  profileDeleted: boolean;
  publicUserDeleted: boolean;
  authUserDeleted: boolean;
  authUserAlreadyMissing: boolean;
};

const isNotFoundAuthError = (message?: string) => {
  const normalized = (message || "").toLowerCase();
  return normalized.includes("not found") || normalized.includes("user not found");
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { customerId } = req.body as { customerId?: string };

  if (!customerId || typeof customerId !== "string") {
    return res.status(400).json({ error: "Missing customerId" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase admin configuration is missing on the server" });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({ error: "Unauthorized token" });
    }

    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin, role")
      .eq("id", authData.user.id)
      .single();

    if (adminProfileError || (!adminProfile?.is_super_admin && adminProfile?.role !== "super_admin")) {
      return res.status(403).json({ error: "Permission denied. Super Admin role required." });
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, user_id, name, email")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (customer.user_id === authData.user.id) {
      return res.status(400).json({ error: "A Super Admin cannot delete their own authenticated account through customer deletion." });
    }

    let authUserAlreadyMissing = false;

    if (customer.user_id) {
      const [
        { data: ownedBusinesses, error: ownedBusinessError },
        { data: staffMemberships, error: staffMembershipError },
        { data: customerProfile, error: customerProfileError },
        { data: authUserLookup, error: authUserLookupError },
      ] = await Promise.all([
        supabaseAdmin.from("businesses").select("id").eq("owner_id", customer.user_id).limit(1),
        supabaseAdmin.from("business_users").select("id").eq("user_id", customer.user_id).limit(1),
        supabaseAdmin.from("profiles").select("role, is_super_admin").eq("id", customer.user_id).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(customer.user_id),
      ]);

      if (ownedBusinessError) throw ownedBusinessError;
      if (staffMembershipError) throw staffMembershipError;
      if (customerProfileError) throw customerProfileError;

      if (authUserLookupError && isNotFoundAuthError(authUserLookupError.message)) {
        authUserAlreadyMissing = true;
      } else if (authUserLookupError) {
        throw authUserLookupError;
      }

      const hasBusinessOwnership = Boolean(ownedBusinesses?.length);
      const hasStaffMembership = Boolean(staffMemberships?.length);
      const hasPrivilegedProfile = Boolean(customerProfile?.is_super_admin) || Boolean(customerProfile?.role && customerProfile.role !== "customer");

      if (hasBusinessOwnership || hasStaffMembership || hasPrivilegedProfile) {
        return res.status(409).json({
          error: "This Auth user is connected to a business, staff, or admin role. Customer deletion was blocked to protect unrelated business data.",
        });
      }

      if (!authUserLookup?.user && !authUserAlreadyMissing) {
        authUserAlreadyMissing = true;
      }
    }

    const summary: DeleteSummary = {
      stampTransactions: 0,
      rewardQrTokens: 0,
      rewards: 0,
      loyaltyCards: 0,
      paymentTransactions: 0,
      customerDeleted: false,
      profileDeleted: false,
      publicUserDeleted: false,
      authUserDeleted: false,
      authUserAlreadyMissing,
    };

    const deleteByCustomerId = async (table: string) => {
      const { count, error } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .eq("customer_id", customer.id);

      if (error) {
        throw new Error(`Failed to delete ${table}: ${error.message}`);
      }

      return count || 0;
    };

    summary.stampTransactions = await deleteByCustomerId("stamp_transactions");
    summary.rewardQrTokens = await deleteByCustomerId("reward_qr_tokens");
    summary.rewards = await deleteByCustomerId("rewards");
    summary.loyaltyCards = await deleteByCustomerId("customer_loyalty_cards");
    summary.paymentTransactions = await deleteByCustomerId("payment_transactions");

    const { count: customerDeleteCount, error: customerDeleteError } = await supabaseAdmin
      .from("customers")
      .delete({ count: "exact" })
      .eq("id", customer.id);

    if (customerDeleteError) {
      throw new Error(`Failed to delete customer profile: ${customerDeleteError.message}`);
    }

    summary.customerDeleted = (customerDeleteCount || 0) === 1;

    if (!summary.customerDeleted) {
      throw new Error("Customer delete did not remove exactly one customer record.");
    }

    if (customer.user_id) {
      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", customer.user_id);

      if (profileDeleteError) {
        throw new Error(`Failed to delete customer profile row: ${profileDeleteError.message}`);
      }

      summary.profileDeleted = true;

      const { error: publicUserDeleteError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", customer.user_id);

      if (publicUserDeleteError) {
        throw new Error(`Failed to delete public user row: ${publicUserDeleteError.message}`);
      }

      summary.publicUserDeleted = true;

      if (!authUserAlreadyMissing) {
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(customer.user_id);

        if (deleteAuthError && !isNotFoundAuthError(deleteAuthError.message)) {
          throw new Error(`Database records were removed, but Auth deletion failed: ${deleteAuthError.message}`);
        }

        summary.authUserDeleted = !deleteAuthError;
        summary.authUserAlreadyMissing = Boolean(deleteAuthError && isNotFoundAuthError(deleteAuthError.message));
      }
    }

    const [
      { data: remainingCustomer, error: verifyCustomerError },
      { count: remainingStampTransactions, error: verifyStampError },
      { count: remainingRewards, error: verifyRewardsError },
      { count: remainingCards, error: verifyCardsError },
      { count: remainingPaymentTransactions, error: verifyPaymentsError },
      { count: remainingRewardQrTokens, error: verifyQrError },
    ] = await Promise.all([
      supabaseAdmin.from("customers").select("id").eq("id", customer.id).maybeSingle(),
      supabaseAdmin.from("stamp_transactions").select("*", { count: "exact", head: true }).eq("customer_id", customer.id),
      supabaseAdmin.from("rewards").select("*", { count: "exact", head: true }).eq("customer_id", customer.id),
      supabaseAdmin.from("customer_loyalty_cards").select("*", { count: "exact", head: true }).eq("customer_id", customer.id),
      supabaseAdmin.from("payment_transactions").select("*", { count: "exact", head: true }).eq("customer_id", customer.id),
      supabaseAdmin.from("reward_qr_tokens").select("*", { count: "exact", head: true }).eq("customer_id", customer.id),
    ]);

    if (verifyCustomerError) throw verifyCustomerError;
    if (verifyStampError) throw verifyStampError;
    if (verifyRewardsError) throw verifyRewardsError;
    if (verifyCardsError) throw verifyCardsError;
    if (verifyPaymentsError) throw verifyPaymentsError;
    if (verifyQrError) throw verifyQrError;

    const hasRemainingDatabaseRecords = Boolean(
      remainingCustomer ||
      remainingStampTransactions ||
      remainingRewards ||
      remainingCards ||
      remainingPaymentTransactions ||
      remainingRewardQrTokens
    );

    if (hasRemainingDatabaseRecords) {
      throw new Error("Backend verification failed: customer-owned records still exist after deletion.");
    }

    if (customer.user_id && !summary.authUserAlreadyMissing) {
      const { data: authVerification, error: authVerificationError } = await supabaseAdmin.auth.admin.getUserById(customer.user_id);

      if (!authVerificationError && authVerification.user) {
        throw new Error("Backend verification failed: customer Auth user still exists after deletion.");
      }

      if (authVerificationError && !isNotFoundAuthError(authVerificationError.message)) {
        throw authVerificationError;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${customer.name || customer.email || "customer"} and verified database/Auth removal.`,
      summary,
    });
  } catch (err: any) {
    console.error("Secure customer deletion error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete customer" });
  }
}