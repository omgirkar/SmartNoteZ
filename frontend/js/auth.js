import { supabase } from "./supabaseClient.js";

const form = document.querySelector("#authForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#authSubmit");
const message = document.querySelector("#authMessage");
const tabButtons = document.querySelectorAll(".tab-btn");

let mode = window.location.hash === "#signup" ? "signup" : "login";

setMode(mode);

const existingSession = await supabase.auth.getSession();

if (existingSession.data.session) {
  window.location.href = "dashboard.html";
}

tabButtons.forEach((button) => {
  button.setAttribute("type", "button");

  button.addEventListener("click", () => {
    const selectedMode = button.dataset.mode;
    setMode(selectedMode);
    window.location.hash = selectedMode;
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMessage("Working on it...");
  submitButton.disabled = true;

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

function setMode(nextMode) {
  mode = nextMode === "signup" ? "signup" : "login";

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  submitButton.textContent = mode === "signup" ? "Create account" : "Login";

  setMessage(
    mode === "signup"
      ? "Create a student account to save tests."
      : "Login to open your dashboard."
  );
}
  
function setMessage(text) {
  message.textContent = text;
}