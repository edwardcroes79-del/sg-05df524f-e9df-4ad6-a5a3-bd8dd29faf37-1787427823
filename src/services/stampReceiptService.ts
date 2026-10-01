import { supabase } from "@/integrations/supabase/client";

export type StampReceiptDeliveryResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

export async function sendStampReceiptForTransaction(transactionId: string): Promise<StampReceiptDeliveryResult> {
  if (!transactionId) {
    return { sent: false, skipped: true, reason: "Missing transaction ID" };
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    return { sent: false, skipped: true, reason: "No authenticated session" };
  }

  try {
    const response = await fetch("/api/customer/stamp-receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactionId }),
    });

    const result = (await response.json().catch(() => ({}))) as StampReceiptDeliveryResult;

    if (!response.ok) {
      return {
        sent: false,
        error: result.error || "Receipt email request failed",
      };
    }

    return result;
  } catch (error: any) {
    return {
      sent: false,
      error: error.message || "Receipt email request failed",
    };
  }
}