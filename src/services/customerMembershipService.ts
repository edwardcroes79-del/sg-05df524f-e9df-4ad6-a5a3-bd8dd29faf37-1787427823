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

export async function ensureCustomerRecord(user: User, nameOverride?: string): Promise<EnsureCustomerRecordResult> {
  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<CustomerRow>();

  if (existingCustomerError) {
    throw existingCustomerError;
  }

  if (existingCustomer?.id) {
    return {
      customerId: existingCustomer.id,
      created: false,
    };
  }

  const customerName = deriveCustomerName(user, nameOverride);

  const { data: createdCustomer, error: createdCustomerError } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name: customerName,
      email: user.email || null,
    })
    .select("id")
    .single<CustomerRow>();

  if (createdCustomer?.id) {
    return {
      customerId: createdCustomer.id,
      created: true,
    };
  }

  if (isDuplicateError(createdCustomerError || null)) {
    const { data: duplicateCustomer, error: duplicateCustomerError } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle<CustomerRow>();

    if (duplicateCustomerError) {
      throw duplicateCustomerError;
    }

    if (duplicateCustomer?.id) {
      return {
        customerId: duplicateCustomer.id,
        created: false,
      };
    }
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

  const { data: existingCard, error: existingCardError } = await supabase
    .from("customer_loyalty_cards")
    .select("id")
    .eq("customer_id", customer.customerId)
    .eq("loyalty_program_id", program.id)
    .maybeSingle<LoyaltyCardRow>();

  if (existingCardError) {
    throw existingCardError;
  }

  if (existingCard?.id) {
    return {
      customerId: customer.customerId,
      cardId: existingCard.id,
      businessId: program.business_id,
      createdCustomer: customer.created,
      createdCard: false,
    };
  }

  const { data: createdCard, error: createdCardError } = await supabase
    .from("customer_loyalty_cards")
    .insert({
      customer_id: customer.customerId,
      business_id: program.business_id,
      loyalty_program_id: program.id,
      user_id: params.user.id,
      total_stamps: program.stamp_target || 0,
    })
    .select("id")
    .single<LoyaltyCardRow>();

  if (createdCard?.id) {
    return {
      customerId: customer.customerId,
      cardId: createdCard.id,
      businessId: program.business_id,
      createdCustomer: customer.created,
      createdCard: true,
    };
  }

  if (isDuplicateError(createdCardError || null)) {
    const { data: duplicateCard, error: duplicateCardError } = await supabase
      .from("customer_loyalty_cards")
      .select("id")
      .eq("customer_id", customer.customerId)
      .eq("loyalty_program_id", program.id)
      .maybeSingle<LoyaltyCardRow>();

    if (duplicateCardError) {
      throw duplicateCardError;
    }

    if (duplicateCard?.id) {
      return {
        customerId: customer.customerId,
        cardId: duplicateCard.id,
        businessId: program.business_id,
        createdCustomer: customer.created,
        createdCard: false,
      };
    }
  }

  throw createdCardError || new Error("Your loyalty card could not be created.");
}