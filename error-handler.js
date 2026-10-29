
export function getErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (!navigator.onLine) {
    return "No internet connection. Please reconnect and try again.";
  }

  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (message.includes("already registered")) {
    return "An account with this email already exists.";
  }

  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    return "Connection failed. Please try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

export function showError(error, target = "#cardo-notice") {
  const element = document.querySelector(target);
  const message = getErrorMessage(error);

  if (element) {
    element.textContent = message;
    element.setAttribute("role", "alert");
  }

  console.error("[Cardo]", message);
  return message;
}

export function showSuccess(message, target = "#cardo-notice") {
  const element = document.querySelector(target);

  if (element) {
    element.textContent = message;
    element.setAttribute("role", "status");
  }
}
