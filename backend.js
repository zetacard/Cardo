
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// STEP 1: Replace these two placeholders with your Cardo project values.
const SUPABASE_URL = "https://hllyxtpdnqtmbhdqxkds.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_mnwLIapJtIDwM-DwmI4hRA_7FU9FhlB";

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
        detectSessionInUrl: true,
      },
    })
  : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Cardo backend is not configured. Add your Supabase URL and publishable key in backend.js."
    );
  }

  return supabase;
}

function validateDesignType(type) {
  const allowed = [
    "business_card",
    "invitation",
    "menu",
    "poster",
    "social_post",
  ];

  if (!allowed.includes(type)) {
    throw new Error("Invalid design type.");
  }
}

function validateTitle(title) {
  const cleanTitle = String(title || "Untitled design").trim();

  if (!cleanTitle) {
    return "Untitled design";
  }

  if (cleanTitle.length > 120) {
    throw new Error("Design title must be 120 characters or fewer.");
  }

  return cleanTitle;
}

function validateContent(content) {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("Design content must be a JSON object.");
  }

  // Prevent accidentally storing excessively large documents.
  if (JSON.stringify(content).length > 500_000) {
    throw new Error("This design is too large to save.");
  }

  return content;
}

// BACKEND STATUS
export function getBackendStatus() {
  return {
    configured: Boolean(supabase),
    provider: "Supabase",
    message: supabase
      ? "Cardo backend is configured."
      : "Add your Supabase URL and publishable key in backend.js.",
  };
}

// AUTHENTICATION
export async function signUp(email, password, displayName = "") {
  const client = requireSupabase();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(displayName || "").trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (String(password || "").length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  if (cleanName.length > 80) {
    throw new Error("Name must be 80 characters or fewer.");
  }

  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        display_name: cleanName,
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function signIn(email, password) {
  const client = requireSupabase();

  const { data, error } = await client.auth.signInWithPassword({
    email: String(email || "").trim().toLowerCase(),
    password,
  });

  if (error) throw error;

  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) throw error;

  return true;
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

// PROFILE
export async function getMyProfile() {
  const client = requireSupabase();
  const user = await getCurrentUser();

  if (!user) throw new Error("Please sign in first.");

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateMyProfile(updates = {}) {
  const client = requireSupabase();
  const user = await getCurrentUser();

  if (!user) throw new Error("Please sign in first.");

  const safeUpdates = {};

  if (typeof updates.display_name === "string") {
    safeUpdates.display_name = updates.display_name.trim().slice(0, 80);
  }

  if (typeof updates.username === "string") {
    const username = updates.username.trim().toLowerCase();

    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      throw new Error(
        "Username must be 3–30 characters and contain only letters, numbers, or underscores."
      );
    }

    safeUpdates.username = username || null;
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw new Error("No valid profile changes were provided.");
  }

  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("profiles")
    .update(safeUpdates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// SAVE A NEW DESIGN OR UPDATE AN EXISTING DESIGN
export async function saveDesign({
  id = null,
  title = "Untitled design",
  design_type = "business_card",
  content = {},
  is_public = false,
} = {}) {
  const client = requireSupabase();
  const user = await getCurrentUser();

  if (!user) throw new Error("Please sign in to save designs.");

  validateDesignType(design_type);

  const record = {
    user_id: user.id,
    title: validateTitle(title),
    design_type,
    content: validateContent(content),
    // Public sharing must not be enabled accidentally.
    is_public: is_public === true,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await client
      .from("designs")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await client
    .from("designs")
    .insert(record)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// LOAD THE SIGNED-IN USER'S DESIGNS
export async function loadDesigns({
  design_type = null,
  limit = 50,
} = {}) {
  const client = requireSupabase();
  const user = await getCurrentUser();

  if (!user) throw new Error("Please sign in to view your designs.");

  const safeLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 50)
  );

  let query = client
    .from("designs")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (design_type) {
    validateDesignType(design_type);
    query = query.eq("design_type", design_type);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

// LOAD ONE DESIGN
export async function getDesign(id) {
  const client = requireSupabase();
  const user = await getCurrentUser();

  if (!user) throw new Error("Please sign in first.");
  if (!id) throw new Error("Design ID is required.");

  const { data, error } = await client
    .from("designs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) throw error;

  return data;
}

// DELETE A DESIGN
export async function deleteDesign(id) {
  const client = requireSupabase();
  const user = await getCurrentUser();

  if (!user) throw new Error("Please sign in first.");
  if (!id) throw new Error("Design ID is required.");

  const { data, error } = await client
    .from("designs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Design not found or you do not have permission to delete it.");
  }

  return true;
}
