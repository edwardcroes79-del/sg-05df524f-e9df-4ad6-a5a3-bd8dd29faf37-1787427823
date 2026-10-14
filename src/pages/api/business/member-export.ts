import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const EXPORT_BATCH_SIZE = 1000;
const MAX_EXPORT_ROWS = 10000;

type ExportCardRow = {
  id: string;
  current_stamps: number | null;
  total_stamps: number | null;
  rewards_earned: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
  } | null;
  loyalty_programs: {
    name: string | null;
    stamp_target: number | null;
    reward_title: string | null;
  } | null;
};

function createServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is incomplete.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function createUserClient(authorization: string) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase client configuration is incomplete.");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

function makeHttpError(message: string, statusCode: number) {
  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = statusCode;
  return error;
}

async function resolveBusinessForUser(authorization: string) {
  const userClient = createUserClient(authorization);
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    throw makeHttpError("Not authenticated.", 401);
  }

  const { data: workspaceRows, error: workspaceError } = await (userClient as any).rpc("get_business_dashboard_access_status");

  if (workspaceError) {
    throw makeHttpError("Business access required.", 403);
  }

  const workspace = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

  if (!workspace?.id) {
    throw makeHttpError("Business access required.", 403);
  }

  const { data: ownerMembership, error: ownerMembershipError } = await userClient
    .from("business_users")
    .select("id")
    .eq("business_id", workspace.id)
    .eq("user_id", userData.user.id)
    .eq("role", "owner")
    .eq("status", "active")
    .maybeSingle();

  if (ownerMembershipError || !ownerMembership) {
    throw makeHttpError("Business owner access required.", 403);
  }

  return {
    userId: userData.user.id as string,
    businessId: workspace.id as string,
  };
}

async function requireExcelExportEntitlement(admin: any, businessId: string) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    throw makeHttpError("Unable to verify subscription access.", 500);
  }

  if (!business?.subscription_plan) {
    throw makeHttpError("Subscription plan required.", 403);
  }

  const { data: entitlementRows, error: entitlementError } = await admin
    .from("plan_entitlements")
    .select("key, value_type, boolean_value")
    .eq("plan_id", business.subscription_plan)
    .eq("key", "excel_member_export")
    .limit(1);

  if (entitlementError) {
    throw makeHttpError("Unable to verify export entitlement.", 500);
  }

  const enabled = (entitlementRows || []).some((entitlement: any) =>
    entitlement.key === "excel_member_export"
    && entitlement.value_type === "boolean"
    && entitlement.boolean_value === true
  );

  if (!enabled) {
    throw makeHttpError("Excel member export is not enabled for this subscription plan.", 403);
  }
}

function sanitizeWorksheetText(value: unknown) {
  if (value === null || value === undefined) return "";

  const text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!text) return "";

  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function formatDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function numberOrZero(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

async function countExportRows(admin: any, businessId: string) {
  const { count, error } = await admin
    .from("customer_loyalty_cards")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (error) {
    throw makeHttpError("Unable to prepare member export.", 500);
  }

  return Number(count || 0);
}

async function fetchExportRows(admin: any, businessId: string, start: number, end: number) {
  const { data, error } = await admin
    .from("customer_loyalty_cards")
    .select(`
      id,
      current_stamps,
      total_stamps,
      rewards_earned,
      status,
      created_at,
      updated_at,
      customer:customers (
        name,
        email,
        phone,
        created_at
      ),
      loyalty_programs (
        name,
        stamp_target,
        reward_title
      )
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .range(start, end);

  if (error) {
    throw makeHttpError("Unable to load member export data.", 500);
  }

  return (Array.isArray(data) ? data : []) as unknown as ExportCardRow[];
}

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Royalty Stamp";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Members", {
    properties: {
      defaultRowHeight: 20,
    },
  });

  worksheet.columns = [
    { header: "Member Name", key: "memberName", width: 28 },
    { header: "Email Address", key: "emailAddress", width: 34 },
    { header: "Phone Number", key: "phoneNumber", width: 18 },
    { header: "Registration Date", key: "registrationDate", width: 18 },
    { header: "Loyalty Program", key: "loyaltyProgram", width: 28 },
    { header: "Membership Status", key: "membershipStatus", width: 18 },
    { header: "Card Created Date", key: "cardCreatedDate", width: 18 },
    { header: "Last Updated Date", key: "lastUpdatedDate", width: 18 },
    { header: "Current Stamps", key: "currentStamps", width: 16 },
    { header: "Total Stamps", key: "totalStamps", width: 14 },
    { header: "Rewards Earned", key: "rewardsEarned", width: 16 },
    { header: "Stamp Target", key: "stampTarget", width: 14 },
    { header: "Reward Title", key: "rewardTitle", width: 28 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: "M1",
  };

  return { workbook, worksheet };
}

function addExportRow(worksheet: ExcelJS.Worksheet, row: ExportCardRow) {
  worksheet.addRow({
    memberName: sanitizeWorksheetText(row.customer?.name),
    emailAddress: sanitizeWorksheetText(row.customer?.email),
    phoneNumber: sanitizeWorksheetText(row.customer?.phone),
    registrationDate: formatDate(row.customer?.created_at || null),
    loyaltyProgram: sanitizeWorksheetText(row.loyalty_programs?.name),
    membershipStatus: sanitizeWorksheetText(row.status),
    cardCreatedDate: formatDate(row.created_at),
    lastUpdatedDate: formatDate(row.updated_at),
    currentStamps: numberOrZero(row.current_stamps),
    totalStamps: numberOrZero(row.total_stamps),
    rewardsEarned: numberOrZero(row.rewards_earned),
    stampTarget: numberOrZero(row.loyalty_programs?.stamp_target),
    rewardTitle: sanitizeWorksheetText(row.loyalty_programs?.reward_title),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "Missing authorization header." });
    }

    const { businessId } = await resolveBusinessForUser(authorization);
    const admin = createServiceClient();

    await requireExcelExportEntitlement(admin, businessId);

    const totalRows = await countExportRows(admin, businessId);
    if (totalRows > MAX_EXPORT_ROWS) {
      return res.status(413).json({
        error: `Member export limit exceeded. This export contains ${totalRows.toLocaleString()} memberships; the current safe limit is ${MAX_EXPORT_ROWS.toLocaleString()}.`,
      });
    }

    const { workbook, worksheet } = createWorkbook();

    for (let start = 0; start < totalRows; start += EXPORT_BATCH_SIZE) {
      const end = Math.min(start + EXPORT_BATCH_SIZE - 1, totalRows - 1);
      const rows = await fetchExportRows(admin, businessId, start, end);
      rows.forEach((row) => addExportRow(worksheet, row));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filenameDate = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="royalty-stamp-members-${filenameDate}.xlsx"`);
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(Buffer.from(buffer));
  } catch (error: any) {
    const statusCode = Number(error.statusCode || 500);
    const safeStatus = [400, 401, 403, 405, 413].includes(statusCode) ? statusCode : 500;
    const safeMessage = safeStatus === 500 ? "Failed to export members." : error.message || "Unable to export members.";

    return res.status(safeStatus).json({ error: safeMessage });
  }
}