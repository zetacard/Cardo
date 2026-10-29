
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * Cardo — Backend connection
 * Copyright (c) 2026 Cardo. All rights reserved.
 *
 * IMPORTANT:
 * Replace BOTH configuration placeholders below with your actual
 * Supabase Project URL and publishable (or legacy anon) key.
 *
 * NEVER put a Supabase service_role or secret key in frontend code.
 */

const SUPABASE_URL = "https://hllyxtpdnqtmbhdqxkds.supabase.co
".trim();
const SUPABASE_ANON_KEY =
  "sb_publishable_mnwLIapJtIDwM-DwmI4hRA_7FU9FhlB".trim();

function validateConfiguration(url, key) {
  if (!url || !key) return false;

  if (
    url.includes("https://hllyxtpdnqtmbhdqxkds.supabase.co") ||
    key.includes("sb_publishable_mnwLIapJtIDwM-DwmI4hRA_7FU9FhlB") ||
    key.length < 20
  ) {
    return false;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

const isConfigured = validateConfiguration(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL.replace(/\/+$/, ""), SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getBackendStatus() {
  return {
    configured: Boolean(isConfigured && supabase),
    provider: "Supabase",
    message:
      isConfigured && supabase
        ? "Supabase configuration is present."
        : "Add your real Supabase project URL and publishable key in backend.js."
  };
}

function requireBackend() {
  if (!supabase) {
    throw new Error(
      "Cardo cannot connect because Supabase is not configured. " +
      "Check the URL and publishable key in backend.js."
    );
  }

  return supabase;
}

function throwIfError(error) {
  if (error) {
    throw new Error(error.message || "The Supabase request failed.");
  }
}

function validateEmail(email) {
  const value = String(email ?? "").trim().toLowerCase();

  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Enter a valid email address.");
  }

  return value;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Your password must contain at least 8 characters.");
  }

  return password;
}

function cleanText(value, maxLength, fallback = "") {
  return String(value ?? fallback).trim().slice(0, maxLength);
}

function validateDesignType(type) {
  const allowed = [
    "business_card",
    "invitation",
    "menu",
    "poster",
    "social_post"
  ];

  if (!allowed.includes(type)) {
    throw new Error("Choose a supported Cardo design category.");
  }

  return type;
}

async function requireUser() {
  const client = requireBackend();
  const { data, error } = await client.auth.getUser();

  throwIfError(error);

  if (!data?.user) {
    throw new Error("Please sign in to continue.");
  }

  return data.user;
}

/* =========================
   AUTHENTICATION
========================= */

export async function signUp(email, password, displayName = "") {
  const client = requireBackend();
  const cleanEmail = validateEmail(email);
  const cleanPassword = validatePassword(password);
  const cleanName = cleanText(displayName, 80);

  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        display_name: cleanName
      }
    }
  });

  throwIfError(error);

  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    needsEmailConfirmation: Boolean(data?.user && !data?.session)
  };
}

export async function signIn(email, password) {
  const client = requireBackend();
  const cleanEmail = validateEmail(email);

  if (!password) {
    throw new Error("Enter your password.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  throwIfError(error);

  if (!data?.session || !data?.user) {
    throw new Error("Sign-in did not return an active session.");
  }

  return data.user;
}

export async function signOut() {
  const client = requireBackend();
  const { error } = await client.auth.signOut();

  throwIfError(error);
  return true;
}

export async function getCurrentUser() {
  const client = requireBackend();
  const { data, error } = await client.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    throwIfError(error);
  }

  return data?.user ?? null;
}

export async function getCurrentSession() {
  const client = requireBackend();
  const { data, error } = await client.auth.getSession();

  throwIfError(error);
  return data?.session ?? null;
}

/* =========================
   USER PROFILE
========================= */

export async function getMyProfile() {
  const client = requireBackend();
  const user = await requireUser();

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  throwIfError(error);

  if (data) return data;

  // The profile trigger may not have run for an older account.
  const { data: created, error: createError } = await client
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: cleanText(
          user.user_metadata?.display_name,
          80
        )
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  throwIfError(createError);
  return created;
}

export async function updateMyProfile({ display_name, username } = {}) {
  const client = requireBackend();
  const user = await requireUser();
  const updates = {
    updated_at: new Date().toISOString()
  };

  if (display_name !== undefined) {
    updates.display_name = cleanText(display_name, 80);
  }

  if (username !== undefined) {
    const cleanUsername = cleanText(username, 30).toLowerCase();

    if (
      cleanUsername &&
      !/^[a-z0-9_]{3,30}$/.test(cleanUsername)
    ) {
      throw new Error(
        "Username must be 3–30 characters using letters, numbers, or underscores."
      );
    }

    updates.username = cleanUsername || null;
  }

  const { data, error } = await client
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single();

  throwIfError(error);
  return data;
}

/* =========================
   DESIGNS
========================= */

export async function saveDesign({
  id,
  title,
  design_type = "business_card",
  content = {},
  is_public = false
} = {}) {
  const client = requireBackend();
  const user = await requireUser();

  const cleanTitle = cleanText(title, 120, "Untitled design");

  if (!cleanTitle) {
    throw new Error("Enter a title for your design.");
  }

  const cleanType = validateDesignType(design_type);

  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("Design content must be a valid object.");
  }

  let serialized;

  try {
    serialized = JSON.stringify(content);
  } catch {
    throw new Error("Design content could not be processed.");
  }

  if (serialized.length > 500_000) {
    throw new Error("This design is too large to save.");
  }

  const payload = {
    user_id: user.id,
    title: cleanTitle,
    design_type: cleanType,
    content,
    is_public: Boolean(is_public),
    updated_at: new Date().toISOString()
  };

  if (id) {
    const { data, error } = await client
      .from("designs")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    throwIfError(error);
    return data;
  }

  const { data, error } = await client
    .from("designs")
    .insert(payload)
    .select("*")
    .single();

  throwIfError(error);
  return data;
}

export async function loadDesigns({
  design_type,
  limit = 100
} = {}) {
  const client = requireBackend();
  const user = await requireUser();

  const safeLimit = Math.max(
    1,
    Math.min(100, Number.parseInt(limit, 10) || 100)
  );

  let query = client
    .from("designs")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (design_type) {
    query = query.eq(
      "design_type",
      validateDesignType(design_type)
    );
  }

  const { data, error } = await query;

  throwIfError(error);
  return data ?? [];
}

export async function getDesign(id) {
  if (!id) throw new Error("A design ID is required.");

  const client = requireBackend();
  const user = await requireUser();

  const { data, error } = await client
    .from("designs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    throw new Error("Design not found or you do not have access.");
  }

  return data;
}

export async function deleteDesign(id) {
  if (!id) throw new Error("A design ID is required.");

  const client = requireBackend();
  const user = await requireUser();

  const { data, error } = await client
    .from("designs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  throwIfError(error);

  if (!data?.length) {
    throw new Error("Design not found or it could not be deleted.");
  }

  return true;
}
