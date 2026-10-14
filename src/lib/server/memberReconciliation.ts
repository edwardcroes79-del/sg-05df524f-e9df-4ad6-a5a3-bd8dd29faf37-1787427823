import { createHash } from "crypto";
import type { ImportPreviewRow, ParsedImportRow } from "@/lib/server/memberImport";
import { getBusinessPrograms, makeHttpError } from "@/lib/server/memberImport";

export type ReconcileRowStatus = "retained" | "invalid" | "duplicate" | "ambiguous" | "outside_program";

export type ReconcilePreviewRow = ParsedImportRow & {
  status: ReconcileRowStatus;
  matchedMembershipId: string | null;
  messages: string[];
};

export type ReconcileRemovalCandidate = {
  membershipId: string;
  customerId: string | null;
  memberName: string;
  emailAddress: string;
  phoneNumber: string;
  membershipStatus: string;
  currentStamps: number;
  totalStamps: number;
  rewardsEarned: number;
  cardCreatedDate: string;
  lastUpdatedDate: string;
  preselected: boolean;
  reason: string;
};

export type ReconcilePreviewPayload = {
  rows: ReconcilePreviewRow[];
  targetProgramId: string;
  targetProgramName: string;
  currentMemberships: ReconcileRemovalCandidate[];
  retainedMemberships: ReconcileRemovalCandidate[];
  removalCandidates: ReconcileRemovalCandidate[];
  skippedMemberships: ReconcileRemovalCandidate[];
  summary: {
    current: number;
    retained: number;
    proposedRemoval: number;
    skipped: number;
    duplicateRows: number;
    invalidRows: number;
    ambiguousRows: number;
    outsideProgramRows: number;
    headersOnlyWorkbook: boolean;
  };
  reconcileToken: string;
};

type CurrentMembership = {
  id: string;
  customer_id: string | null;
  current_stamps: number | null;
  total_stamps: number | null;
  rewards_earned: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

function normalizeText(value: string) {
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

function toDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function candidateFromMembership(membership: CurrentMembership, preselected: boolean, reason: string): ReconcileRemovalCandidate {
  return {
    membershipId: membership.id,
    customerId: membership.customer_id,
    memberName: membership.customer?.name || "Unnamed member",
    emailAddress: membership.customer?.email || "",
    phoneNumber: membership.customer?.phone || "",
    membershipStatus: membership.status || "active",
    currentStamps: Number(membership.current_stamps || 0),
    totalStamps: Number(membership.total_stamps || 0),
    rewardsEarned: Number(membership.rewards_earned || 0),
    cardCreatedDate: toDate(membership.created_at),
    lastUpdatedDate: toDate(membership.updated_at),
    preselected,
    reason,
  };
}

function createReconcileToken(businessId: string, targetProgramId: string, rows: ReconcilePreviewRow[], candidates: ReconcileRemovalCandidate[]) {
  return createHash("sha256")
    .update(JSON.stringify({
      businessId,
      targetProgramId,
      rows: rows.map((row) => ({
        rowNumber: row.rowNumber,
        emailAddress: normalizeEmail(row.emailAddress),
        phoneNumber: normalizePhone(row.phoneNumber),
        loyaltyProgram: normalizeText(row.loyaltyProgram),
        status: row.status,
        matchedMembershipId: row.matchedMembershipId,
      })),
      candidates: candidates.map((candidate) => candidate.membershipId).sort(),
    }))
    .digest("hex");
}

export async function requireBulkMemberRemovalEntitlement(admin: any, businessId: string) {
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
    .eq("key", "bulk_member_removal")
    .limit(1);

  if (entitlementError) {
    throw makeHttpError("Unable to verify reconciliation entitlement.", 500);
  }

  const enabled = (entitlementRows || []).some((entitlement: any) =>
    entitlement.key === "bulk_member_removal"
    && entitlement.value_type === "boolean"
    && entitlement.boolean_value === true
  );

  if (!enabled) {
    throw makeHttpError("Bulk member removal is not enabled for this subscription plan.", 403);
  }
}

async function loadCurrentMemberships(admin: any, businessId: string, targetProgramId: string): Promise<CurrentMembership[]> {
  const { data, error } = await admin
    .from("customer_loyalty_cards")
    .select(`
      id,
      customer_id,
      current_stamps,
      total_stamps,
      rewards_earned,
      status,
      created_at,
      updated_at,
      customer:customers (
        id,
        name,
        email,
        phone
      )
    `)
    .eq("business_id", businessId)
    .eq("loyalty_program_id", targetProgramId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw makeHttpError("Unable to load current memberships for reconciliation.", 500);
  }

  return (Array.isArray(data) ? data : []) as unknown as CurrentMembership[];
}

export async function buildReconcilePreview(admin: any, businessId: string, rows: ParsedImportRow[], targetProgramId: string): Promise<ReconcilePreviewPayload> {
  const programs = await getBusinessPrograms(admin, businessId);
  const targetProgram = programs.find((program: any) => program.id === targetProgramId);

  if (!targetProgram) {
    throw makeHttpError("The selected loyalty program does not belong to this business.", 400);
  }

  const currentMemberships = await loadCurrentMemberships(admin, businessId, targetProgramId);
  const byEmail = new Map<string, CurrentMembership[]>();
  const byPhone = new Map<string, CurrentMembership[]>();

  currentMemberships.forEach((membership) => {
    const email = normalizeEmail(membership.customer?.email || "");
    const phone = normalizePhone(membership.customer?.phone || "");

    if (email) byEmail.set(email, [...(byEmail.get(email) || []), membership]);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) || []), membership]);
  });

  const targetProgramName = normalizeText(String(targetProgram.name || ""));
  const seenRowKeys = new Set<string>();
  const retainedIds = new Set<string>();

  const previewRows: ReconcilePreviewRow[] = rows.map((row) => {
    const messages: string[] = [];
    const rowProgramName = normalizeText(row.loyaltyProgram);
    const programLabelMatches = rowProgramName === targetProgramName;

    if (!row.emailAddress && !row.phoneNumber) {
      messages.push("Email address or phone number is required for reconciliation.");
    }

    if (row.emailAddress && !isValidEmail(row.emailAddress)) {
      messages.push("Email address is invalid.");
    }

    const rowKey = row.emailAddress ? `email:${normalizeEmail(row.emailAddress)}` : `phone:${normalizePhone(row.phoneNumber)}`;
    if (seenRowKeys.has(rowKey)) {
      return {
        ...row,
        status: "duplicate",
        matchedMembershipId: null,
        messages: [...messages, "Duplicate member identifier in this workbook."],
      };
    }
    seenRowKeys.add(rowKey);

    if (messages.length > 0) {
      return {
        ...row,
        status: "invalid",
        matchedMembershipId: null,
        messages,
      };
    }

    const matches = new Map<string, CurrentMembership>();
    const emailMatches = row.emailAddress ? byEmail.get(normalizeEmail(row.emailAddress)) || [] : [];
    const phoneMatches = row.phoneNumber ? byPhone.get(normalizePhone(row.phoneNumber)) || [] : [];
    [...emailMatches, ...phoneMatches].forEach((membership) => matches.set(membership.id, membership));

    if (rowProgramName && !programLabelMatches && matches.size === 0) {
      return {
        ...row,
        status: "outside_program",
        matchedMembershipId: null,
        messages: ["This row belongs to a different loyalty program and will not affect the selected program."],
      };
    }

    if (matches.size > 1) {
      return {
        ...row,
        status: "ambiguous",
        matchedMembershipId: null,
        messages: ["This row matches more than one current membership and will not be used for automatic removal decisions."],
      };
    }

    const matched = Array.from(matches.values())[0] || null;
    if (!matched) {
      return {
        ...row,
        status: "invalid",
        matchedMembershipId: null,
        messages: ["This row does not match a current membership in the selected program."],
      };
    }

    retainedIds.add(matched.id);

    return {
      ...row,
      status: "retained",
      matchedMembershipId: matched.id,
      messages: [
        programLabelMatches || !rowProgramName
          ? "Matched current membership to retain."
          : "Matched current membership to retain by email or phone in the selected program.",
      ],
    };
  });

  const hasRetainedRows = previewRows.some((row) => row.status === "retained");
  const hasTargetProgramRows = rows.some((row) => normalizeText(row.loyaltyProgram) === targetProgramName);
  const hasProgramLabels = rows.some((row) => Boolean(normalizeText(row.loyaltyProgram)));

  if (rows.length > 0 && currentMemberships.length > 0 && !hasRetainedRows && !hasTargetProgramRows && hasProgramLabels) {
    throw makeHttpError("This workbook does not contain rows for the selected loyalty program, so reconciliation is blocked.", 400);
  }

  const ambiguousCurrentIds = new Set<string>();
  [...byEmail.values(), ...byPhone.values()].forEach((memberships) => {
    if (memberships.length > 1) memberships.forEach((membership) => ambiguousCurrentIds.add(membership.id));
  });

  const current = currentMemberships.map((membership) => candidateFromMembership(membership, false, "Current active membership."));
  const retained = currentMemberships
    .filter((membership) => retainedIds.has(membership.id))
    .map((membership) => candidateFromMembership(membership, false, "Present in uploaded workbook."));
  const removalCandidates: ReconcileRemovalCandidate[] = [];
  const skippedMemberships: ReconcileRemovalCandidate[] = [];

  currentMemberships.forEach((membership) => {
    if (retainedIds.has(membership.id)) return;

    const hasIdentifier = Boolean(normalizeEmail(membership.customer?.email || "") || normalizePhone(membership.customer?.phone || ""));

    if (!hasIdentifier) {
      skippedMemberships.push(candidateFromMembership(membership, false, "Skipped because this membership has no email or phone identifier."));
      return;
    }

    if (ambiguousCurrentIds.has(membership.id)) {
      skippedMemberships.push(candidateFromMembership(membership, false, "Skipped because this member identifier is ambiguous."));
      return;
    }

    removalCandidates.push(candidateFromMembership(membership, true, "Missing from uploaded workbook for the selected program."));
  });

  return {
    rows: previewRows,
    targetProgramId,
    targetProgramName: targetProgram.name,
    currentMemberships: current,
    retainedMemberships: retained,
    removalCandidates,
    skippedMemberships,
    summary: {
      current: current.length,
      retained: retained.length,
      proposedRemoval: removalCandidates.length,
      skipped: skippedMemberships.length,
      duplicateRows: previewRows.filter((row) => row.status === "duplicate").length,
      invalidRows: previewRows.filter((row) => row.status === "invalid").length,
      ambiguousRows: previewRows.filter((row) => row.status === "ambiguous").length,
      outsideProgramRows: previewRows.filter((row) => row.status === "outside_program").length,
      headersOnlyWorkbook: rows.length === 0,
    },
    reconcileToken: createReconcileToken(businessId, targetProgramId, previewRows, removalCandidates),
  };
}

export async function confirmReconcileRemoval(admin: any, businessId: string, targetProgramId: string, rows: ImportPreviewRow[], selectedMembershipIds: string[], reconcileToken: string) {
  const reparsedRows = rows.map((row) => ({
    rowNumber: row.rowNumber,
    memberName: row.memberName,
    emailAddress: normalizeEmail(row.emailAddress),
    phoneNumber: normalizePhone(row.phoneNumber),
    loyaltyProgram: row.loyaltyProgram,
  }));

  const preview = await buildReconcilePreview(admin, businessId, reparsedRows, targetProgramId);

  if (preview.reconcileToken !== reconcileToken) {
    throw makeHttpError("Reconciliation preview expired or memberships changed. Preview the workbook again before confirming removals.", 400);
  }

  const safeIds = new Set(preview.removalCandidates.map((candidate) => candidate.membershipId));
  const uniqueSelectedIds = Array.from(new Set(selectedMembershipIds));
  const idsToRemove = uniqueSelectedIds.filter((id) => safeIds.has(id));
  const skipped = uniqueSelectedIds
    .filter((id) => !safeIds.has(id))
    .map((id) => ({ membershipId: id, reason: "Membership was not a safe removal candidate." }));

  const removed: { membershipId: string }[] = [];
  const failed: { membershipId: string; reason: string }[] = [];

  for (const membershipId of idsToRemove) {
    const { data, error } = await admin
      .from("customer_loyalty_cards")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId)
      .eq("business_id", businessId)
      .eq("loyalty_program_id", targetProgramId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (error || !data?.id) {
      failed.push({ membershipId, reason: "Membership could not be removed safely or was already changed." });
    } else {
      removed.push({ membershipId: data.id });
    }
  }

  return {
    removedCount: removed.length,
    retainedCount: preview.retainedMemberships.length,
    skippedCount: skipped.length + preview.skippedMemberships.length + (preview.removalCandidates.length - idsToRemove.length),
    failedCount: failed.length,
    removed,
    skipped,
    failed,
    retained: preview.retainedMemberships,
  };
}