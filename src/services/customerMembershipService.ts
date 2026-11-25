import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface CustomerRow {
  id: string;
}

interface LoyaltyCardRow {
  id: string;
}

interface LoyaltyProgramRow {
  id: string;
  business_id: string;
  stamp_target: number | null;
}

export interface EnsureCustomerRecordResult {
  customerId: string;
  created: boolean;
}

export interface EnsureCustomerJoinResult {
  customerId: string;
  cardId: string;
  businessId: string;
  createdCustomer: boolean;
  createdCard: boolean;
}

function isDuplicateError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "23505" || message.includes("duplicate") || message.includes("unique");
}

function deriveCustomerName(user: User, nameOverride?: string) {
  const candidateName =
    nameOverride?.trim() ||
    String(user.user_metadata?.full_name || "").trim() ||
    String(user.user_metadata?.name || "").trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Customer";

  return candidateName;
}

async function pause(milliseconds: number) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function fetchCustomerByUserId(userId: string, attempt = 0): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<CustomerRow>();

  if (!error) {
    return data ?? null;
  }

  if (attempt >= 2) {
    throw error;
  }

  await pause(120 * (attempt + 1));
  return fetchCustomerByUserId(userId, attempt + 1);
}

async function fetchCardByCustomerAndProgram(customerId: string, loyaltyProgramId: string, attempt = 0): Promise<LoyaltyCardRow | null> {
  const { data, error } = await supabase
    .from("customer_loyalty_cards")
    .select("id")
    .eq("customer_id", customerId)
    .eq("loyalty_program_id", loyaltyProgramId)
    .maybeSingle<LoyaltyCardRow>();

  if (!error) {
    return data ?? null;
  }

  if (attempt >= 2) {
    throw error;
  }

  await pause(120 * (attempt + 1));
  return fetchCardByCustomerAndProgram(customerId, loyaltyProgramId, attempt + 1);
}

export async function ensureCustomerRecord(user: User, nameOverride?: string): Promise<EnsureCustomerRecordResult> {
  const existingCustomer = await fetchCustomerByUserId(user.id);

  if (existingCustomer?.id) {
    return {
      customerId: existingCustomer.id,
      created: false,
    };
  }

  const customerName = deriveCustomerName(user, nameOverride);

  const { error: createdCustomerError } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name: customerName,
      email: user.email || null,
    });

  if (createdCustomerError && !isDuplicateError(createdCustomerError)) {
    throw createdCustomerError;
  }

  const createdCustomer = await fetchCustomerByUserId(user.id);

  if (createdCustomer?.id) {
    return {
      customerId: createdCustomer.id,
      created: !createdCustomerError,
    };
  }

  throw createdCustomerError || new Error("Customer profile could not be created.");
}

export async function ensureCustomerJoinForProgram(params: {
  user: User;
  loyaltyProgramId: string;
  nameOverride?: string;
}): Promise<EnsureCustomerJoinResult> {
  const customer = await ensureCustomerRecord(params.user, params.nameOverride);

  const { data: program, error: programError } = await supabase
    .from("loyalty_programs")
    .select("id, business_id, stamp_target")
    .eq("id", params.loyaltyProgramId)
    .eq("active", true)
    .maybeSingle<LoyaltyProgramRow>();

  if (programError) {
    throw programError;
  }

  if (!program?.id || !program.business_id) {
    throw new Error("This loyalty program is no longer available.");
  }

  const existingCard = await fetchCardByCustomerAndProgram(customer.customerId, program.id);

  if (existingCard?.id) {
    return {
      customerId: customer.customerId,
      cardId: existingCard.id,
      businessId: program.business_id,
      createdCustomer: customer.created,
      createdCard: false,
    };
  }

  const { error: createdCardError } = await supabase
    .from("customer_loyalty_cards")
    .insert({
      customer_id: customer.customerId,
      business_id: program.business_id,
      loyalty_program_id: program.id,
      user_id: params.user.id,
      total_stamps: program.stamp_target || 0,
    });

  if (createdCardError && !isDuplicateError(createdCardError)) {
    throw createdCardError;
  }

  const createdCard = await fetchCardByCustomerAndProgram(customer.customerId, program.id);

  if (createdCard?.id) {
    return {
      customerId: customer.customerId,
      cardId: createdCard.id,
      businessId: program.business_id,
      createdCustomer: customer.created,
      createdCard: !createdCardError,
    };
  }

  throw createdCardError || new Error("Your loyalty card could not be created.");
}