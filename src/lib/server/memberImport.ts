import { createHash, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import type { NextApiRequest } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const IMPORT_REQUIRED_HEADERS = [
  "Member Name",
  "Email Address",
  "Phone Number",
  "Registration Date",
  "Loyalty Program",
  "Membership Status",
  "Card Created Date",
  "Last Updated Date",
  "Current Stamps",
  "Total Stamps",
  "Rewards Earned",
  "Stamp Target",
  "Reward Title",
] as const;

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;

export type ImportStatus = "valid" | "invalid" | "duplicate" | "existing" | "ambiguous";

export type ParsedImportRow = {
  rowNumber: number;
  memberName: string;
  emailAddress: string;
  phoneNumber: string;
  loyaltyProgram: string;
};

export type ImportPreviewRow = ParsedImportRow & {
  status: ImportStatus;
  messages: string[];
};

export type ImportPreviewPayload = {
  rows: ImportPreviewRow[];
  targetProgramId: string;
  targetProgramName: string;
  targetProgramRequired: boolean;
  programsInFile: string[];
  summary: Record<ImportStatus, number>;
  importToken: string;
};

export function createServiceClient() {
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

export function makeHttpError(message: string, statusCode: number) {
  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = statusCode;
  return error;
}

export async function resolveBusinessForUser(authorization: string) {
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

export async function requireExcelImportEntitlement(admin: any, businessId: string) {
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
    .eq("key", "excel_member_import")
    .limit(1);

  if (entitlementError) {
    throw makeHttpError("Unable to verify import entitlement.", 500);
  }

  const enabled = (entitlementRows || []).some((entitlement: any) =>
    entitlement.key === "excel_member_import"
    && entitlement.value_type === "boolean"
    && entitlement.boolean_value === true
  );

  if (!enabled) {
    throw makeHttpError("Excel member import is not enabled for this subscription plan.", 403);
  }
}

export async function readRequestBuffer(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > MAX_IMPORT_BYTES) {
      throw makeHttpError(`Import file is too large. The current safe limit is ${(MAX_IMPORT_BYTES / 1024 / 1024).toLocaleString()} MB.`, 413);
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw makeHttpError("Upload a valid .xlsx file before previewing import rows.", 400);
  }

  return Buffer.concat(chunks);
}

function getCellText(cell: ExcelJS.Cell) {
  const raw = cell.value;

  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") {
    if ("formula" in raw) return "";
    if ("text" in raw && typeof raw.text === "string") return raw.text.trim();
    if ("richText" in raw && Array.isArray(raw.richText)) {
      return raw.richText.map((part: any) => String(part.text || "")).join("").trim();
    }
    if ("result" in raw) return "";
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  }

  return String(raw).replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function parseWorkbookRows(buffer: Buffer): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();

  try {
    const workbookBuffer = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(workbookBuffer);
  } catch {
    throw makeHttpError("The uploaded file is not a readable .xlsx workbook.", 400);
  }

  const worksheet = workbook.getWorksheet("Members") || workbook.worksheets[0];

  if (!worksheet) {
    throw makeHttpError("The workbook does not contain a worksheet.", 400);
  }

  if (worksheet.rowCount < 2) {
    throw makeHttpError("The workbook does not contain any member rows to import.", 400);
  }

  const headerRow = worksheet.getRow(1);
  const headers = IMPORT_REQUIRED_HEADERS.map((_, index) => normalizeHeader(getCellText(headerRow.getCell(index + 1))));
  const missingHeaders = IMPORT_REQUIRED_HEADERS.filter((header, index) => headers[index] !== normalizeHeader(header));

  if (missingHeaders.length > 0) {
    throw makeHttpError(`The workbook must use the Royalty Stamp export format. Missing or mismatched headers: ${missingHeaders.join(", ")}.`, 400);
  }

  const rows: ParsedImportRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const memberName = getCellText(row.getCell(1));
    const emailAddress = normalizeEmail(getCellText(row.getCell(2)));
    const phoneNumber = normalizePhone(getCellText(row.getCell(3)));
    const loyaltyProgram = getCellText(row.getCell(5));

    if (!memberName && !emailAddress && !phoneNumber && !loyaltyProgram) {
      continue;
    }

    rows.push({
      rowNumber,
      memberName,
      emailAddress,
      phoneNumber,
      loyaltyProgram,
    });

    if (rows.length > MAX_IMPORT_ROWS) {
      throw makeHttpError(`Import row limit exceeded. The current safe limit is ${MAX_IMPORT_ROWS.toLocaleString()} member rows.`, 413);
    }
  }

  if (rows.length === 0) {
    throw makeHttpError("The workbook does not contain any member rows to import.", 400);
  }

  return rows;
}

export async function getBusinessPrograms(admin: any, businessId: string) {
  const { data, error } = await admin
    .from("loyalty_programs")
    .select("id, name, active")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) {
    throw makeHttpError("Unable to load loyalty programs.", 500);
  }

  return Array.isArray(data) ? data : [];
}

async function findExistingCustomers(admin: any, emails: string[], phones: string[]) {
  const byEmail = new Map<string, any>();
  const byPhone = new Map<string, any>();

  if (emails.length > 0) {
    const { data, error } = await admin
      .from("customers")
      .select("id, name, email, phone")
      .in("email", emails);

    if (error) throw makeHttpError("Unable to validate existing customers.", 500);
    (data || []).forEach((customer: any) => {
      if (customer.email) byEmail.set(normalizeEmail(customer.email), customer);
    });
  }

  if (phones.length > 0) {
    const { data, error } = await admin
      .from("customers")
      .select("id, name, email, phone")
      .in("phone", phones);

    if (error) throw makeHttpError("Unable to validate existing customers.", 500);
    (data || []).forEach((customer: any) => {
      if (customer.phone) byPhone.set(normalizePhone(customer.phone), customer);
    });
  }

  return { byEmail, byPhone };
}

async function findExistingMemberships(admin: any, businessId: string, programId: string, customerIds: string[]) {
  if (customerIds.length === 0) return new Set<string>();

  const { data, error } = await admin
    .from("customer_loyalty_cards")
    .select("customer_id")
    .eq("business_id", businessId)
    .eq("loyalty_program_id", programId)
    .in("customer_id", customerIds);

  if (error) throw makeHttpError("Unable to validate existing memberships.", 500);

  return new Set((data || []).map((row: any) => row.customer_id).filter(Boolean));
}

export async function buildImportPreview(admin: any, businessId: string, rows: ParsedImportRow[], targetProgramId?: string): Promise<ImportPreviewPayload> {
  const programs = await getBusinessPrograms(admin, businessId);
  const targetProgram = targetProgramId
    ? programs.find((program: any) => program.id === targetProgramId)
    : null;

  if (targetProgramId && !targetProgram) {
    throw makeHttpError("The selected loyalty program does not belong to this business.", 400);
  }

  const programsInFile = Array.from(new Set(rows.map((row) => row.loyaltyProgram).filter(Boolean)));
  const targetProgramRequired = !targetProgramId && programsInFile.length !== 1;

  if (!targetProgramId && programsInFile.length === 1) {
    const matchedProgram = programs.find((program: any) => String(program.name || "").trim().toLowerCase() === programsInFile[0].trim().toLowerCase());
    if (!matchedProgram) {
      throw makeHttpError("Select a target loyalty program before importing this workbook.", 400);
    }
  }

  const resolvedProgram = targetProgram || (
    programsInFile.length === 1
      ? programs.find((program: any) => String(program.name || "").trim().toLowerCase() === programsInFile[0].trim().toLowerCase())
      : null
  );

  if (!resolvedProgram) {
    throw makeHttpError("Select a target loyalty program before importing this workbook.", 400);
  }

  const seenSheetKeys = new Set<string>();
  const emails = Array.from(new Set(rows.map((row) => row.emailAddress).filter(Boolean)));
  const phones = Array.from(new Set(rows.map((row) => row.phoneNumber).filter(Boolean)));
  const existing = await findExistingCustomers(admin, emails, phones);

  const matchedCustomerIds = new Set<string>();
  const rowCustomerId = new Map<number, string>();

  const previewRows = rows.map((row): ImportPreviewRow => {
    const messages: string[] = [];
    let status: ImportStatus = "valid";

    if (!row.memberName || row.memberName.length < 2) {
      messages.push("Member name is required.");
      status = "invalid";
    }

    if (!row.emailAddress && !row.phoneNumber) {
      messages.push("Email address or phone number is required.");
      status = "invalid";
    }

    if (row.emailAddress && !isValidEmail(row.emailAddress)) {
      messages.push("Email address is invalid.");
      status = "invalid";
    }

    const duplicateKey = row.emailAddress ? `email:${row.emailAddress}` : `phone:${row.phoneNumber}`;
    if (seenSheetKeys.has(duplicateKey)) {
      messages.push("Duplicate row in this workbook.");
      status = status === "invalid" ? status : "duplicate";
    }
    seenSheetKeys.add(duplicateKey);

    const emailCustomer = row.emailAddress ? existing.byEmail.get(row.emailAddress) : null;
    const phoneCustomer = row.phoneNumber ? existing.byPhone.get(row.phoneNumber) : null;

    if (emailCustomer && phoneCustomer && emailCustomer.id !== phoneCustomer.id) {
      messages.push("Email and phone match different existing customers.");
      status = status === "invalid" ? status : "ambiguous";
    } else {
      const customer = emailCustomer || phoneCustomer;
      if (customer?.id) {
        matchedCustomerIds.add(customer.id);
        rowCustomerId.set(row.rowNumber, customer.id);
      }
    }

    return {
      ...row,
      status,
      messages,
    };
  });

  const existingMemberships = await findExistingMemberships(admin, businessId, resolvedProgram.id, Array.from(matchedCustomerIds));

  const finalRows = previewRows.map((row) => {
    if (row.status === "invalid" || row.status === "duplicate" || row.status === "ambiguous") {
      return row;
    }

    const customerId = rowCustomerId.get(row.rowNumber);
    if (customerId && existingMemberships.has(customerId)) {
      return {
        ...row,
        status: "existing" as ImportStatus,
        messages: [...row.messages, "Membership already exists for the selected program."],
      };
    }

    return row;
  });

  const summary = finalRows.reduce<Record<ImportStatus, number>>((acc, row) => {
    acc[row.status] += 1;
    return acc;
  }, {
    valid: 0,
    invalid: 0,
    duplicate: 0,
    existing: 0,
    ambiguous: 0,
  });

  const importToken = createHash("sha256")
    .update(JSON.stringify({ businessId, targetProgramId: resolvedProgram.id, rows: finalRows }))
    .digest("hex");

  return {
    rows: finalRows,
    targetProgramId: resolvedProgram.id,
    targetProgramName: resolvedProgram.name,
    targetProgramRequired,
    programsInFile,
    summary,
    importToken,
  };
}

export async function createImportedMemberships(admin: any, businessId: string, targetProgramId: string, rows: ImportPreviewRow[], importToken?: string) {
  const reparsedRows = rows.map((row) => ({
    rowNumber: row.rowNumber,
    memberName: row.memberName,
    emailAddress: normalizeEmail(row.emailAddress),
    phoneNumber: normalizePhone(row.phoneNumber),
    loyaltyProgram: row.loyaltyProgram,
  }));

  const preview = await buildImportPreview(admin, businessId, reparsedRows, targetProgramId);

  if (importToken && preview.importToken !== importToken) {
    throw makeHttpError("Import preview expired or changed. Preview the workbook again before confirming.", 400);
  }

  const created: any[] = [];
  const skipped: any[] = [];
  const failed: any[] = [];

  const validRows = preview.rows.filter((row) => row.status === "valid");

  for (const row of validRows) {
    try {
      const email = row.emailAddress || null;
      const phone = row.phoneNumber || null;
      let customer: any = null;

      if (email) {
        const { data, error } = await admin
          .from("customers")
          .select("id, user_id, name, email, phone")
          .eq("email", email)
          .maybeSingle();

        if (error) throw error;
        customer = data;
      }

      if (!customer && phone) {
        const { data, error } = await admin
          .from("customers")
          .select("id, user_id, name, email, phone")
          .eq("phone", phone)
          .maybeSingle();

        if (error) throw error;
        customer = data;
      }

      if (!customer) {
        const { data: insertedCustomer, error: customerError } = await admin
          .from("customers")
          .insert({
            id: randomUUID(),
            user_id: null,
            name: row.memberName,
            email,
            phone,
          })
          .select("id, user_id, name, email, phone")
          .single();

        if (customerError) throw customerError;
        customer = insertedCustomer;
      }

      const { error: cardError } = await admin
        .from("customer_loyalty_cards")
        .insert({
          customer_id: customer.id,
          user_id: customer.user_id || null,
          business_id: businessId,
          loyalty_program_id: targetProgramId,
          current_stamps: 0,
          total_stamps: 0,
          rewards_earned: 0,
          status: "active",
        });

      if (cardError) {
        if (String(cardError.code) === "23505") {
          skipped.push({ rowNumber: row.rowNumber, reason: "Membership already exists." });
          continue;
        }

        throw cardError;
      }

      created.push({ rowNumber: row.rowNumber, customerId: customer.id });
    } catch {
      failed.push({ rowNumber: row.rowNumber, reason: "Could not import this row safely." });
    }
  }

  preview.rows
    .filter((row) => row.status !== "valid")
    .forEach((row) => skipped.push({ rowNumber: row.rowNumber, reason: row.messages.join(" ") || row.status }));

  return {
    createdCount: created.length,
    skippedCount: skipped.length,
    failedCount: failed.length,
    created,
    skipped,
    failed,
    summary: preview.summary,
  };
}