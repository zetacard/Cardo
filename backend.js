
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cardo browser-side Supabase configuration.
// Replace these placeholders after creating your Supabase project.
// Never put a service_role key or other privileged secret here.

const SUPABASE_URL = "https://hllyxtpdnqtmbhdqxkds.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mnwLIapJtIDwM-DwmI4hRA_7FU9FhlB";

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_YOUR") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes("PASTE_YOUR");

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getBackendStatus() {
  return {
    configured: Boolean(supabase),
    service: "Supabase",
    message: supabase
      ? "Supabase client initialized."
      : "Supabase configuration is still required."
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Cardo backend is not configured. Add the Supabase project URL and publishable/anon key."
    );
  }

  return supabase;
}

export async function signUp(email, password) {
  const client = requireSupabase();

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password
  });

  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const client = requireSupabase();

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();

  const { error } = await client.auth.signOut();

  if (error) throw error;
}

export async function getCurrentUser() {
  const client = requireSupabase();

  const { data, error } = await client.auth.getUser();

  if (error) throw error;
  return data.user;
}

export async function getCurrentSession() {
  const client = requireSupabase();

  const { data, error } = await client.auth.getSession();

  if (error) throw error;
  return data.session;
}
