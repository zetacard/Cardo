
import {
  getBackendStatus,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  saveDesign,
  loadDesigns,
  deleteDesign,
} from "./backend.js";

import { showError, showSuccess } from "./error-handler.js";

const app = document.getElementById("app");

if (!app) {
  throw new Error('Cardo could not start: missing element with id="app".');
}

let currentUser = null;
let editingDesignId = null;
let designs = [];
let activeView = "login";
let busy = false;

const DESIGN_TYPES = [
  { value: "business_card", label: "Business / Visiting Card" },
  { value: "invitation", label: "Wedding & Event Invitation" },
  { value: "menu", label: "Menu Card" },
  { value: "poster", label: "Poster / Flyer" },
  { value: "social_post", label: "Social Media Post" },
];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function notify(message, type = "success") {
  const notice = document.getElementById("cardo-notice");

  if (notice) {
    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.hidden = false;
  }

  if (type === "error") {
    try {
      showError(new Error(message));
    } catch {
      console.error(message);
    }
  } else {
    try {
      showSuccess(message);
    } catch {
      console.info(message);
    }
  }
}

function setBusy(value) {
  busy = value;

  document.querySelectorAll("[data-busy]").forEach((element) => {
    element.disabled = value;
  });
}

function formatDate(value) {
  if (!value) return "Not saved yet";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Recently updated"
    : date.toLocaleString();
}

function getTypeLabel(value) {
  return DESIGN_TYPES.find((type) => type.value === value)?.label
    || "Design";
}

function injectStyles() {
  if (document.getElementById("cardo-runtime-styles")) return;

  const style = document.createElement("style");
  style.id = "cardo-runtime-styles";

  style.textContent = `
    :root {
      color-scheme: dark;
      --cardo-bg: #090b12;
      --cardo-panel: #111522;
      --cardo-border: rgba(255,255,255,.10);
      --cardo-text: #f5f5ff;
      --cardo-muted: #a5abc1;
      --cardo-accent: #a78bfa;
      --cardo-accent-2: #6d5dfc;
    }

    #app { min-height: 100vh; color: var(--cardo-text); }
    #app * { box-sizing: border-box; }
    .cardo-shell {
      width: min(1120px, 100%);
      margin: auto;
      padding: 26px 20px 64px;
    }
    .cardo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 42px;
    }
    .cardo-brand { font-size: 27px; font-weight: 800; letter-spacing: -1px; }
    .cardo-brand span { color: var(--cardo-accent); }
    .cardo-tagline { color: var(--cardo-muted); font-size: 13px; margin-top: 5px; }
    .cardo-hero { margin-bottom: 28px; }
    .cardo-eyebrow {
      color: var(--cardo-accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .cardo-title {
      font-size: clamp(30px, 5vw, 48px);
      letter-spacing: -1.8px;
      line-height: 1.1;
      margin: 12px 0;
    }
    .cardo-muted { color: var(--cardo-muted); line-height: 1.6; }
    .cardo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    .cardo-panel {
      min-width: 0;
      background: linear-gradient(145deg, #141827, #0e111b);
      border: 1px solid var(--cardo-border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 18px 60px rgba(0,0,0,.15);
    }
    .cardo-panel h2 { font-size: 19px; margin: 0 0 8px; }
    .cardo-field { display: block; margin-top: 17px; }
    .cardo-field > span {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: #d5d8e8;
    }
    .cardo-input, .cardo-select, .cardo-textarea {
      width: 100%;
      border: 1px solid var(--cardo-border);
      border-radius: 11px;
      padding: 13px 14px;
      color: var(--cardo-text);
      background: #090c15;
      font: inherit;
      outline: none;
    }
    .cardo-input:focus, .cardo-select:focus, .cardo-textarea:focus {
      border-color: var(--cardo-accent);
      box-shadow: 0 0 0 3px rgba(167,139,250,.12);
    }
    .cardo-textarea { min-height: 130px; resize: vertical; }
    .cardo-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 17px;
      min-height: 43px;
      border: 1px solid var(--cardo-border);
      border-radius: 11px;
      background: #1b2030;
      color: var(--cardo-text);
      font: inherit;
      font-weight: 650;
      cursor: pointer;
      text-decoration: none;
      transition: transform .15s, border-color .15s;
    }
    .cardo-button:hover { transform: translateY(-1px); border-color: var(--cardo-accent); }
    .cardo-button:disabled { opacity: .55; cursor: wait; transform: none; }
    .cardo-primary {
      background: linear-gradient(110deg, #8065f5, #a78bfa);
      border-color: transparent;
      color: #fff;
    }
    .cardo-danger { color: #ffb4be; }
    .cardo-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    .cardo-nav { display: flex; gap: 8px; flex-wrap: wrap; }
    .cardo-account {
      border: 1px solid var(--cardo-border);
      border-radius: 13px;
      padding: 15px;
      margin-bottom: 20px;
      overflow-wrap: anywhere;
    }
    .cardo-account strong { display: block; margin-bottom: 5px; }
    .cardo-notice {
      padding: 13px 15px;
      margin-bottom: 20px;
      border-radius: 12px;
      border: 1px solid var(--cardo-border);
      line-height: 1.5;
    }
    .notice.success { background: rgba(52,211,153,.08); color: #9df2d1; }
    .notice.error { background: rgba(248,113,113,.08); color: #ffb4be; }
    .notice[hidden] { display: none; }
    .cardo-design-list { display: grid; gap: 12px; margin-top: 20px; }
    .cardo-design {
      padding: 16px;
      border: 1px solid var(--cardo-border);
      border-radius: 14px;
      background: rgba(255,255,255,.025);
      min-width: 0;
    }
    .cardo-design h3 { margin: 0 0 8px; overflow-wrap: anywhere; }
    .cardo-design p { color: var(--cardo-muted); font-size: 13px; line-height: 1.5; }
    .cardo-design-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .cardo-empty { text-align: center; padding: 30px 12px; color: var(--cardo-muted); }
    .cardo-status { font-size: 12px; color: var(--cardo-muted); }
    .cardo-footer { margin-top: 34px; font-size: 12px; color: var(--cardo-muted); }
    @media (max-width: 720px) {
      .cardo-grid { grid-template-columns: 1fr; }
      .cardo-shell { padding: 20px 14px 42px; }
      .cardo-panel { padding: 19px; }
      .cardo-header { align-items: flex-start; margin-bottom: 30px; }
      .cardo-title { letter-spacing: -1px; }
    }
  `;

  document.head.appendChild(style);
}

function renderAuth() {
  const status = getBackendStatus();

  app.innerHTML = `
    <div class="cardo-shell">
      <header class="cardo-header">
        <div>
          <div class="cardo-brand">car<span>do</span>.</div>
          <div class="cardo-tagline">Your premium creative studio</div>
        </div>
        <span class="cardo-status">${status.configured ? "Backend configured" : "Setup required"}</span>
      </header>

      <section class="cardo-hero">
        <div class="cardo-eyebrow">One studio. Many possibilities.</div>
        <h1 class="cardo-title">Your ideas.<br>Without limits.</h1>
        <p class="cardo-muted">Create, save and manage your creative projects in one place.</p>
      </section>

      <div id="cardo-notice" class="cardo-notice notice success" role="status" hidden></div>

      ${!status.configured ? `
        <div class="cardo-panel">
          <h2>Connect your backend</h2>
          <p class="cardo-muted">${escapeHtml(status.message)}</p>
          <p class="cardo-muted">Open <code>backend.js</code>, add your Supabase project URL and publishable key, then commit the file.</p>
        </div>
      ` : `
        <div class="cardo-grid">
          <section class="cardo-panel">
            <h2>Create your account</h2>
            <p class="cardo-muted">Start building your creative workspace.</p>
            <form id="signup-form">
              <label class="cardo-field">
                <span>Your name</span>
                <input class="cardo-input" name="name" maxlength="80" autocomplete="name" required>
              </label>
              <label class="cardo-field">
                <span>Email address</span>
                <input class="cardo-input" name="email" type="email" autocomplete="email" required>
              </label>
              <label class="cardo-field">
                <span>Password (at least 8 characters)</span>
                <input class="cardo-input" name="password" type="password" minlength="8" autocomplete="new-password" required>
              </label>
              <div class="cardo-actions">
                <button class="cardo-button cardo-primary" type="submit" data-busy>Create account</button>
              </div>
            </form>
          </section>

          <section class="cardo-panel">
            <h2>Welcome back</h2>
            <p class="cardo-muted">Sign in to access your saved designs.</p>
            <form id="login-form">
              <label class="cardo-field">
                <span>Email address</span>
                <input class="cardo-input" name="email" type="email" autocomplete="email" required>
              </label>
              <label class="cardo-field">
                <span>Password</span>
                <input class="cardo-input" name="password" type="password" autocomplete="current-password" required>
              </label>
              <div class="cardo-actions">
                <button class="cardo-button cardo-primary" type="submit" data-busy>Sign in</button>
              </div>
            </form>
          </section>
        </div>
      `}

      <footer class="cardo-footer">Cardo Studio · Your creative workspace</footer>
    </div>
  `;

  document.getElementById("signup-form")?.addEventListener("submit", handleSignUp);
  document.getElementById("login-form")?.addEventListener("submit", handleSignIn);
}

function renderDesignCards() {
  if (!designs.length) {
    return `<div class="cardo-empty">No saved designs yet.<br>Create your first draft on the left.</div>`;
  }

  return designs.map((design) => {
    const preview = typeof design.content?.text === "string"
      ? design.content.text.slice(0, 180)
      : "";

    return `
      <article class="cardo-design">
        <h3>${escapeHtml(design.title)}</h3>
        <div class="cardo-status">${escapeHtml(getTypeLabel(design.design_type))}</div>
        <p>${escapeHtml(preview || "No text preview available.")}</p>
        <div class="cardo-status">Updated: ${escapeHtml(formatDate(design.updated_at))}</div>
        <div class="cardo-design-actions">
          <button class="cardo-button" type="button" data-edit="${escapeHtml(design.id)}">Edit draft</button>
          <button class="cardo-button cardo-danger" type="button" data-delete="${escapeHtml(design.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderDashboard() {
  const email = currentUser?.email || "Signed-in user";

  app.innerHTML = `
    <div class="cardo-shell">
      <header class="cardo-header">
        <div>
          <div class="cardo-brand">car<span>do</span>.</div>
          <div class="cardo-tagline">Your premium creative studio</div>
        </div>
        <button class="cardo-button" id="logout-button" type="button" data-busy>Sign out</button>
      </header>

      <section class="cardo-hero">
        <div class="cardo-eyebrow">Your workspace</div>
        <h1 class="cardo-title">Create something<br>remarkable.</h1>
        <p class="cardo-muted">Draft your project, save it securely, and return to it whenever you're ready.</p>
      </section>

      <div id="cardo-notice" class="cardo-notice notice success" role="status" hidden></div>

      <div class="cardo-account">
        <strong>Account connected</strong>
        <span class="cardo-muted">${escapeHtml(email)}</span>
      </div>

      <div class="cardo-grid">
        <section class="cardo-panel">
          <h2 id="editor-heading">New design draft</h2>
          <p class="cardo-muted">Create a draft and save it to your account.</p>

          <form id="design-form">
            <label class="cardo-field">
              <span>Design title</span>
              <input class="cardo-input" id="design-title" maxlength="120" value="Untitled design" required>
            </label>

            <label class="cardo-field">
              <span>Design category</span>
              <select class="cardo-select" id="design-type">
                ${DESIGN_TYPES.map((type) => `
                  <option value="${type.value}">${escapeHtml(type.label)}</option>
                `).join("")}
              </select>
            </label>

            <label class="cardo-field">
              <span>Draft text / content</span>
              <textarea class="cardo-textarea" id="design-content" maxlength="20000" placeholder="Add the text and ideas for your design..."></textarea>
            </label>

            <div class="cardo-actions">
              <button class="cardo-button cardo-primary" id="save-design-button" type="submit" data-busy>Save design</button>
              <button class="cardo-button" id="new-design-button" type="button">New draft</button>
            </div>
            <p class="cardo-status">Your drafts are private by default.</p>
          </form>
        </section>

        <section class="cardo-panel">
          <h2>My designs</h2>
          <p class="cardo-muted">Your saved projects, newest first.</p>
          <div class="cardo-actions">
            <button class="cardo-button" id="refresh-designs-button" type="button" data-busy>Refresh designs</button>
          </div>
          <div id="design-list" class="cardo-design-list">
            <div class="cardo-empty">Loading your designs…</div>
          </div>
        </section>
      </div>

      <footer class="cardo-footer">Cardo Studio · Secure account-based drafts</footer>
    </div>
  `;

  document.getElementById("logout-button")?.addEventListener("click", handleSignOut);
  document.getElementById("design-form")?.addEventListener("submit", handleSaveDesign);
  document.getElementById("new-design-button")?.addEventListener("click", resetEditor);
  document.getElementById("refresh-designs-button")?.addEventListener("click", refreshDesigns);

  document.getElementById("design-list")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
      const design = designs.find((item) => item.id === editButton.dataset.edit);
      if (design) populateEditor(design);
    }

    if (deleteButton) {
      const design = designs.find((item) => item.id === deleteButton.dataset.delete);
      if (design) await handleDeleteDesign(design);
    }
  });

  refreshDesigns();
}

async function handleSignUp(event) {
  event.preventDefault();
  if (busy) return;

  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  setBusy(true);

  try {
    const result = await signUp(email, password, name);

    if (result.session) {
      currentUser = result.user;
      notify("Account created successfully.");
      renderDashboard();
    } else {
      notify(
        "Account created. Check your email to verify your account, then sign in.",
        "success"
      );
    }
  } catch (error) {
    console.error("Cardo signup failed:", error);
    notify(error?.message || "Could not create your account.", "error");
  } finally {
    setBusy(false);
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  if (busy) return;

  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  setBusy(true);

  try {
    const result = await signIn(email, password);
    currentUser = result.user;
    renderDashboard();
    notify("Signed in successfully.");
  } catch (error) {
    console.error("Cardo sign-in failed:", error);
    notify(error?.message || "Could not sign in.", "error");
  } finally {
    setBusy(false);
  }
}

async function handleSignOut() {
  if (busy) return;

  setBusy(true);

  try {
    await signOut();
    currentUser = null;
    designs = [];
    editingDesignId = null;
    renderAuth();
    notify("You have signed out.");
  } catch (error) {
    console.error("Cardo sign-out failed:", error);
    notify(error?.message || "Could not sign out.", "error");
  } finally {
    setBusy(false);
  }
}

async function handleSaveDesign(event) {
  event.preventDefault();
  if (busy) return;

  const title = document.getElementById("design-title").value.trim();
  const design_type = document.getElementById("design-type").value;
  const text = document.getElementById("design-content").value;

  setBusy(true);

  try {
    const saved = await saveDesign({
      id: editingDesignId,
      title,
      design_type,
      content: { text },
      is_public: false,
    });

    editingDesignId = saved.id;
    document.getElementById("editor-heading").textContent = "Edit design draft";
    document.getElementById("save-design-button").textContent = "Update design";

    await refreshDesigns(false);
    notify("Design saved successfully.");
  } catch (error) {
    console.error("Cardo save design failed:", error);
    notify(error?.message || "Could not save this design.", "error");
  } finally {
    setBusy(false);
  }
}

async function refreshDesigns(showMessage = true) {
  if (!currentUser) return;

  setBusy(true);

  try {
    designs = await loadDesigns({ limit: 100 });

    const list = document.getElementById("design-list");
    if (list) list.innerHTML = renderDesignCards();

    if (showMessage) notify("Your designs have been refreshed.");
  } catch (error) {
    console.error("Cardo load designs failed:", error);

    const list = document.getElementById("design-list");
    if (list) {
      list.innerHTML = `<div class="cardo-empty">Could not load designs. Check your connection and database permissions.</div>`;
    }

    notify(error?.message || "Could not load your designs.", "error");
  } finally {
    setBusy(false);
  }
}

function populateEditor(design) {
  editingDesignId = design.id;

  document.getElementById("editor-heading").textContent = "Edit design draft";
  document.getElementById("design-title").value = design.title || "Untitled design";
  document.getElementById("design-type").value = design.design_type || "business_card";
  document.getElementById("design-content").value =
    typeof design.content?.text === "string" ? design.content.text : "";

  document.getElementById("save-design-button").textContent = "Update design";

  document.getElementById("editor-heading").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function resetEditor() {
  editingDesignId = null;

  document.getElementById("design-form").reset();
  document.getElementById("design-title").value = "Untitled design";
  document.getElementById("design-type").value = "business_card";
  document.getElementById("design-content").value = "";
  document.getElementById("editor-heading").textContent = "New design draft";
  document.getElementById("save-design-button").textContent = "Save design";
}

async function handleDeleteDesign(design) {
  if (busy) return;

  const confirmed = window.confirm(
    `Delete "${design.title}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  setBusy(true);

  try {
    await deleteDesign(design.id);

    if (editingDesignId === design.id) resetEditor();

    await refreshDesigns(false);
    notify("Design deleted.");
  } catch (error) {
    console.error("Cardo delete design failed:", error);
    notify(error?.message || "Could not delete this design.", "error");
  } finally {
    setBusy(false);
  }
}

async function startCardo() {
  injectStyles();

  if (!getBackendStatus().configured) {
    renderAuth();
    return;
  }

  try {
    currentUser = await getCurrentUser();
  } catch (error) {
    console.error("Cardo session check failed:", error);
    currentUser = null;
  }

  if (currentUser) {
    renderDashboard();
  } else {
    renderAuth();
  }
}

startCardo();
