import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";
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

function createPasswordVerificationClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables. Please check your .env.local file.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Dynamic URL Helper
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
  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? {
      id: user.id,
      email: user.email || "",
      user_metadata: user.user_metadata,
      created_at: user.created_at
    } : null;
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign up with email and password
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

  // Sign in with email and password
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

  // Sign out
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

  // Reset password
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
    try {
      const verificationClient = createPasswordVerificationClient();
      const { data, error } = await verificationClient.auth.signInWithPassword({
        email,
        password,
      });

      await verificationClient.auth.signOut();

      if (error || !data.user || data.user.id !== expectedUserId) {
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

  async updateCurrentUserPassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return {
        error: { message: "An unexpected error occurred during password update" },
      };
    }
  },

  // Confirm email (REQUIRED)
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

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
