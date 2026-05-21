import { supabase } from "./supabaseClient.js";

const form = document.querySelector("#authForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#authSubmit");
const message = document.querySelector("#authMessage");
const tabButtons = document.querySelectorAll(".tab-btn");

let mode = window.location.hash === "#signup" ? "signup" : "login";

function setMessage(text) {
  if (message) message.textContent = text;
}

function setMode(nextMode) {
  mode = nextMode === "signup" ? "signup" : "login";

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  if (submitButton) {
    submitButton.textContent = mode === "signup" ? "Create account" : "Login";
  }

  setMessage(
    mode === "signup"
      ? "Create a student account to save tests."
      : "Login to open your dashboard."
  );
}

setMode(mode);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedMode = button.dataset.mode;
    setMode(selectedMode);
    window.location.hash = selectedMode;
  });
});

window.addEventListener("hashchange", () => {
  setMode(window.location.hash === "#signup" ? "signup" : "login");
});

const existingSession = await supabase.auth.getSession();

if (existingSession.data.session) {
  window.location.href = "dashboard.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitButton.disabled = true;
  setMessage("Working on it...");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      setMessage("Account created. Check your email if Supabase asks for confirmation.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      window.location.href = "dashboard.html";
    }
  } catch (error) {
    setMessage(error.message || "Something went wrong.");
  } finally {
    submitButton.disabled = false;
  }
});