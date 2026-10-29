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
      <a class="cardo-brand" href="./" aria-label="Cardo home">
        <span class="cardo-logo" aria-hidden="true">C</span>
        <span>Cardo</span>
      </a>
      <span class="cardo-status">Early access build</span>
    </header>

    <section class="cardo-hero">
      <p class="cardo-eyebrow">Your creative workspace</p>
      <h1>Ideas deserve a <span class="cardo-gradient-text">better canvas.</span></h1>
      <p>
        Create professional designs in one focused, modern studio.
        Your creative tools, brought together.
      </p>
      <div class="cardo-actions">
        <button class="cardo-button cardo-button-primary" id="explore-tools">
          Explore the studio
        </button>
        <button class="cardo-button" id="show-status">
          System status
        </button>
      </div>
      <div class="cardo-notice" id="cardo-notice" role="status" aria-live="polite">
        Welcome to Cardo. The workspace foundation is ready.
      </div>
    </section>

    <section class="cardo-section" id="studio">
      <p class="cardo-eyebrow">The studio</p>
      <h2>One platform. Multiple creative tools.</h2>
      <div class="cardo-grid">
        <article class="cardo-panel">
          <h3>Digital cards</h3>
          <p>Create professional digital visiting cards and shareable profiles.</p>
          <span class="cardo-status">In development</span>
        </article>
        <article class="cardo-panel">
          <h3>Event designs</h3>
          <p>Plan invitations, wedding stationery and event materials.</p>
          <span class="cardo-status">In development</span>
        </article>
        <article class="cardo-panel">
          <h3>Design workspace</h3>
          <p>Build a unified workspace for creating and managing designs.</p>
          <span class="cardo-status">In development</span>
        </article>
      </div>
    </section>

    <footer class="cardo-footer">
      Cardo · A creative platform by Nexora Technologies
    </footer>
  `;

  const notice = document.querySelector("#cardo-notice");

  document.querySelector("#explore-tools")?.addEventListener("click", () => {
    document.querySelector("#studio")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  document.querySelector("#show-status")?.addEventListener("click", () => {
    if (notice) {
      notice.textContent =
        "Frontend loaded successfully. Backend and database checks will be connected in the next steps.";
    }
  });
}
