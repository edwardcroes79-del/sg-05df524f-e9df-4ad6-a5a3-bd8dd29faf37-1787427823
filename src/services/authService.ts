import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SESSION_EXPIRED_ERROR: AuthError = {
  message: "Your session has expired. Please sign in again and retry.",
  code: "session_expired",
};

const SESSION_MISMATCH_ERROR: AuthError = {
  message: "The signed-in account does not match this request. Please sign in again and retry.",
  code: "session_mismatch",
};

function createPasswordVerificationClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables. Please check your .env.local file.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "rs-password-verification",
    },
  });
}

function isSessionAuthError(error: { name?: string; code?: string; status?: number; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.name === "AuthSessionMissingError" ||
    error.code === "session_not_found" ||
    error.code === "session_expired" ||
    error.code === "refresh_token_not_found" ||
    error.code === "bad_jwt" ||
    error.status === 401 ||
    error.message === "Auth session missing!"
  );
}

async function getValidatedActiveSession(
  expectedUserId?: string
): Promise<{ session: Session | null; error: AuthError | null }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    return { session: null, error: SESSION_EXPIRED_ERROR };
  }

  if (expectedUserId && session.user.id !== expectedUserId) {
    return { session: null, error: SESSION_MISMATCH_ERROR };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userError && userData.user?.id) {
    if (expectedUserId && userData.user.id !== expectedUserId) {
      return { session: null, error: SESSION_MISMATCH_ERROR };
    }
    return { session, error: null };
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshed.session?.user?.id) {
    return { session: null, error: SESSION_EXPIRED_ERROR };
  }

  if (expectedUserId && refreshed.session.user.id !== expectedUserId) {
    return { session: null, error: SESSION_MISMATCH_ERROR };
  }

  return { session: refreshed.session, error: null };
}

export const getURL = () => {
  const productionUrl = "https://royaltystamp.com";
  let url = productionUrl;

  if (typeof window !== "undefined" && window.location.origin) {
    url = window.location.origin;
  } else if (process?.env?.NEXT_PUBLIC_SITE_URL) {
    url = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process?.env?.NEXT_PUBLIC_VERCEL_URL) {
    url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  const isPreviewOrLocal =
    url.includes("softgen.dev") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1");

  const isLegacyDomain = url.includes("arubaroyaltystamp.com");

  if (isPreviewOrLocal || isLegacyDomain) {
    url = productionUrl;
  }

  return url.endsWith("/") ? url : `${url}/`;
}

export const authService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? {
      id: user.id,
      email: user.email || "",
      user_metadata: user.user_metadata,
      created_at: user.created_at
    } : null;
  },

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/login?confirmed=true`
        }
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return {
        user: null,
        error: { message: "An unexpected error occurred during sign up" }
      };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return {
        user: null,
        error: { message: "An unexpected error occurred during sign in" }
      };
    }
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return {
        error: { message: "An unexpected error occurred during sign out" }
      };
    }
  },

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/update-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return {
        error: { message: "An unexpected error occurred during password reset" }
      };
    }
  },

  async verifyCurrentPassword(
    email: string,
    password: string,
    expectedUserId: string
  ): Promise<{ valid: boolean; error: AuthError | null }> {
    const active = await getValidatedActiveSession(expectedUserId);

    if (active.error) {
      return { valid: false, error: active.error };
    }

    try {
      const verificationClient = createPasswordVerificationClient();
      const { data, error } = await verificationClient.auth.signInWithPassword({
        email,
        password,
      });

      if (data.session) {
        await verificationClient.auth.signOut({ scope: "local" }).catch(() => undefined);
      }

      if (error) {
        if (error.status === 429) {
          return {
            valid: false,
            error: { message: "Too many attempts. Please wait a moment and try again." },
          };
        }

        if (error.status === 400 || error.code === "invalid_credentials") {
          return {
            valid: false,
            error: { message: "The current password you entered is incorrect." },
          };
        }

        return {
          valid: false,
          error: { message: "Unable to verify your current password right now." },
        };
      }

      if (!data.user || data.user.id !== expectedUserId) {
        return {
          valid: false,
          error: { message: "The current password you entered is incorrect." },
        };
      }

      return { valid: true, error: null };
    } catch (error) {
      return {
        valid: false,
        error: { message: "Unable to verify your current password right now." },
      };
    }
  },

  async updateCurrentUserPassword(
    password: string,
    expectedUserId?: string
  ): Promise<{ error: AuthError | null }> {
    try {
      const active = await getValidatedActiveSession(expectedUserId);

      if (active.error) {
        return { error: active.error };
      }

      let { error } = await supabase.auth.updateUser({ password });

      if (error && isSessionAuthError(error)) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshed.session) {
          return { error: SESSION_EXPIRED_ERROR };
        }

        ({ error } = await supabase.auth.updateUser({ password }));
      }

      if (error) {
        if (isSessionAuthError(error)) {
          return { error: SESSION_EXPIRED_ERROR };
        }

        if (error.code === "same_password") {
          return { error: { message: "Your new password must be different from your current password.", code: error.code } };
        }

        if (error.code === "reauthentication_needed") {
          return {
            error: {
              message: "For security, please sign out and sign in again, then change your password.",
              code: error.code,
            },
          };
        }

        return { error: { message: error.message, code: error.code } };
      }

      return { error: null };
    } catch (error) {
      return {
        error: { message: "An unexpected error occurred during password update" },
      };
    }
  },

  async confirmEmail(token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return {
        user: null,
        error: { message: "An unexpected error occurred during email confirmation" }
      };
    }
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};