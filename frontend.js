
import {
  getBackendStatus,
  signIn,
  signUp,
  signOut,
  getCurrentUser
} from "./backend.js";

import {
  showError,
  showSuccess
} from "./error-handler.js";

const main = document.querySelector("#main-content");

if (main) {
  main.innerHTML = `
    <header class="cardo-header">
      <a class="cardo-brand" href="./">
        <span class="cardo-logo">C</span><span>Cardo</span>
      </a>
      <span class="cardo-status">Private beta</span>
    </header>

    <section class="cardo-hero">
      <p class="cardo-eyebrow">Nexora Technologies presents</p>
      <h1>Your ideas.<br><span class="cardo-gradient-text">Without limits.</span></h1>
      <p>Your all-in-one creative studio starts here.</p>
    </section>

    <section class="cardo-section cardo-grid">
      <article class="cardo-panel">
        <h2>Welcome to Cardo</h2>
        <p>Create an account or sign in to continue.</p>

        <form id="signup-form">
          <label for="signup-name">Your name</label>
          <input id="signup-name" name="name" required maxlength="80"
                 autocomplete="name" placeholder="Your name">

          <label for="signup-email">Email</label>
          <input id="signup-email" name="email" type="email" required
                 autocomplete="email" placeholder="you@example.com">

          <label for="signup-password">Password</label>
          <input id="signup-password" name="password" type="password"
                 required minlength="8" autocomplete="new-password"
                 placeholder="At least 8 characters">

          <button class="cardo-button cardo-button-primary" type="submit">
            Create account
          </button>
        </form>
      </article>

      <article class="cardo-panel">
        <h2>Already registered?</h2>
        <p>Sign in to your Cardo account.</p>

        <form id="login-form">
          <label for="login-email">Email</label>
          <input id="login-email" name="email" type="email" required
                 autocomplete="email" placeholder="you@example.com">

          <label for="login-password">Password</label>
          <input id="login-password" name="password" type="password"
                 required autocomplete="current-password"
                 placeholder="Your password">

          <button class="cardo-button cardo-button-primary" type="submit">
            Sign in
          </button>
        </form>

        <button id="logout-button" class="cardo-button" type="button" hidden>
          Sign out
        </button>
      </article>
    </section>

    <section class="cardo-panel cardo-section">
      <h2>Account status</h2>
      <p id="account-status" role="status" aria-live="polite">
        Checking connection...
      </p>
      <p id="cardo-notice" class="cardo-notice" role="status"
         aria-live="polite">Cardo is starting.</p>
    </section>

    <footer class="cardo-footer">
      Cardo · Nexora Technologies
    </footer>
  `;

  const signupForm = document.querySelector("#signup-form");
  const loginForm = document.querySelector("#login-form");
  const logoutButton = document.querySelector("#logout-button");
  const accountStatus = document.querySelector("#account-status");
  const notice = document.querySelector("#cardo-notice");

  function setBusy(form, busy) {
    form.querySelectorAll("button").forEach(button => {
      button.disabled = busy;
    });
  }

  async function refreshAccount() {
    const status = getBackendStatus();

    if (!status.configured) {
      accountStatus.textContent = "Supabase configuration required.";
      return;
    }

    try {
      const user = await getCurrentUser();

      if (user) {
        accountStatus.textContent = `Signed in as ${user.email || "Cardo user"}.`;
        logoutButton.hidden = false;
      } else {
        accountStatus.textContent = "Connected. No user signed in.";
        logoutButton.hidden = true;
      }
    } catch (error) {
      accountStatus.textContent = "Unable to verify the current session.";
      showError(error);
    }
  }

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    setBusy(signupForm, true);

    try {
      const form = new FormData(signupForm);
      const name = String(form.get("name")).trim();
      const email = String(form.get("email")).trim();
      const password = String(form.get("password"));

      const result = await signUp(email, password);

      if (result.session) {
        showSuccess("Account created successfully.");
      } else {
        showSuccess("Account created. Check your email if verification is required.");
      }

      signupForm.reset();
      await refreshAccount();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(signupForm, false);
    }
  });

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setBusy(loginForm, true);

    try {
      const form = new FormData(loginForm);
      const email = String(form.get("email")).trim();
      const password = String(form.get("password"));

      await signIn(email, password);
      showSuccess("Signed in successfully.");
      loginForm.reset();
      await refreshAccount();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(loginForm, false);
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await signOut();
      showSuccess("Signed out successfully.");
      await refreshAccount();
    } catch (error) {
      showError(error);
    } finally {
      logoutButton.disabled = false;
    }
  });

  if (getBackendStatus().configured) {
    notice.textContent = "Supabase client configured.";
    refreshAccount();
  } else {
    notice.textContent =
      "Add your Supabase project URL and publishable key in backend.js.";
    accountStatus.textContent = "Not connected yet.";
  }
}
