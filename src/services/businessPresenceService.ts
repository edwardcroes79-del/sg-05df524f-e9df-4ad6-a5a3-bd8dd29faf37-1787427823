import { supabase } from "@/integrations/supabase/client";

export const BUSINESS_PRESENCE_HEARTBEAT_INTERVAL_MS = 60 * 1000;
export const BUSINESS_PRESENCE_STALE_AFTER_MS = 5 * 60 * 1000;

export type BusinessPresenceRow = {
  user_id: string;
  business_id: string;
  last_seen_at: string;
  is_online: boolean;
  signed_out_at: string | null;
  updated_at: string;
};

export type BusinessPresenceStatus = {
  isOnline: boolean;
  lastSeenAt: string | null;
  onlineUserCount: number;
};

export async function sendBusinessPresenceHeartbeat() {
  const { data, error } = await (supabase as any).rpc("upsert_business_user_presence");

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return (row || null) as BusinessPresenceRow | null;
}

export async function setBusinessPresenceOffline() {
  const { error } = await (supabase as any).rpc("set_business_user_presence_offline");

  if (error) {
    throw error;
  }
}

export function isBusinessPresenceRowOnline(row: BusinessPresenceRow, nowMs = Date.now()) {
  if (!row.is_online || !row.last_seen_at) {
    return false;
  }

  const lastSeenAtMs = new Date(row.last_seen_at).getTime();
  if (!Number.isFinite(lastSeenAtMs)) {
    return false;
  }

  return lastSeenAtMs >= nowMs - BUSINESS_PRESENCE_STALE_AFTER_MS;
}

export function deriveBusinessPresenceMap(rows: BusinessPresenceRow[], nowMs = Date.now()) {
  return rows.reduce<Record<string, BusinessPresenceStatus>>((accumulator, row) => {
    const current = accumulator[row.business_id] || {
      isOnline: false,
      lastSeenAt: null,
      onlineUserCount: 0,
    };

    const rowIsOnline = isBusinessPresenceRowOnline(row, nowMs);
    const lastSeenAtMs = row.last_seen_at ? new Date(row.last_seen_at).getTime() : Number.NaN;
    const currentLastSeenAtMs = current.lastSeenAt ? new Date(current.lastSeenAt).getTime() : Number.NaN;

    if (rowIsOnline) {
      current.isOnline = true;
      current.onlineUserCount += 1;
    }

    if (Number.isFinite(lastSeenAtMs) && (!Number.isFinite(currentLastSeenAtMs) || lastSeenAtMs > currentLastSeenAtMs)) {
      current.lastSeenAt = row.last_seen_at;
    }

    accumulator[row.business_id] = current;
    return accumulator;
  }, {});
}