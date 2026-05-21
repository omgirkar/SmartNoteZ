import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
import { supabase, requireSession } from "./supabaseClient.js";
import { API_BASE_URL } from "./config.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

const state = {
  session: null,
  currentNoteId: null,
  currentTestId: null,
  quiz: null,
  timer: null,
  remainingSeconds: 0,
  chart: null
};

const els = {
  userEmail: document.querySelector("#userEmail"),
  logoutBtn: document.querySelector("#logoutBtn"),
  savedTestsCount: document.querySelector("#savedTestsCount"),
  attemptCount: document.querySelector("#attemptCount"),
  bestAccuracy: document.querySelector("#bestAccuracy"),
  noteFile: document.querySelector("#noteFile"),
  noteTitle: document.querySelector("#noteTitle"),
  noteText: document.querySelector("#noteText"),
  questionCount: document.querySelector("#questionCount"),
  durationMinutes: document.querySelector("#durationMinutes"),
  generateBtn: document.querySelector("#generateBtn"),
  generatorMessage: document.querySelector("#generatorMessage"),
  testTitle: document.querySelector("#testTitle"),
  timerPill: document.querySelector("#timerPill"),
  emptyState: document.querySelector("#emptyState"),
  quizForm: document.querySelector("#quizForm"),
  testActions: document.querySelector("#testActions"),
  resetBtn: document.querySelector("#resetBtn"),
  submitTestBtn: document.querySelector("#submitTestBtn"),
  resultEmpty: document.querySelector("#resultEmpty"),
  resultContent: document.querySelector("#resultContent"),
  scoreText: document.querySelector("#scoreText"),
  accuracyText: document.querySelector("#accuracyText"),
  reviewList: document.querySelector("#reviewList"),
  accuracyChart: document.querySelector("#accuracyChart"),
  historyList: document.querySelector("#historyList")
};

init();

async function init() {
  state.session = await requireSession();
  if (!state.session) return;

  els.userEmail.textContent = state.session.user.email;
  bindEvents();
  await refreshDashboardData();
}

function bindEvents() {
  els.logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  els.noteFile.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  });

  els.generateBtn.addEventListener("click", generateTest);
  els.submitTestBtn.addEventListener("click", submitTest);
  els.resetBtn.addEventListener("click", () => {
    els.quizForm.reset();
    setMessage("Answers cleared.");
  });

  const uploadBox = document.querySelector(".upload-box");
  ["dragenter", "dragover"].forEach((type) => {
    uploadBox.addEventListener(type, (event) => {
      event.preventDefault();
      uploadBox.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    uploadBox.addEventListener(type, () => uploadBox.classList.remove("dragging"));
  });
  uploadBox.addEventListener("drop", async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  });
}

async function handleFile(file) {
  setMessage(`Reading ${file.name}...`);
  els.noteTitle.value = els.noteTitle.value || cleanTitle(file.name);

  try {
    let text = "";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      text = await extractPdfText(file);
    } else if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) {
      text = await file.text();
    } else {
      throw new Error("Only PDF, TXT and MD files are supported in this starter version.");
    }

    text = normalizeText(text).slice(0, 12000);
    els.noteText.value = text;
    setMessage(`Extracted ${text.length.toLocaleString()} characters. Ready to generate.`);
  } catch (error) {
    setMessage(error.message || "Could not read this file.");
  }
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const chunks = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    chunks.push(pageText);
  }

  return chunks.join("\n\n");
}

async function generateTest() {
  const title = els.noteTitle.value.trim() || "SmartNoteZ Quiz";
  const studyText = normalizeText(els.noteText.value);
  const questionCount = Number(els.questionCount.value);
  const durationMinutes = Number(els.durationMinutes.value);

  if (studyText.length < 250) {
    setMessage("Add at least 250 characters of notes before generating a test.");
    return;
  }

  setLoading(true, "Generating test with Gemini...");

  try {
    state.currentNoteId = await saveNote({ title, studyText });

    const response = await fetch(`${API_BASE_URL}/api/generate-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.session.access_token}`
      },
      body: JSON.stringify({ title, studyText, questionCount, durationMinutes })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not generate test.");

    state.quiz = payload;
    state.currentTestId = await saveTest(payload, state.currentNoteId);
    renderQuiz(payload);
    startTimer(payload.duration_minutes * 60);
    setMessage("Test generated and saved.");
    await refreshDashboardData();
  } catch (error) {
    setMessage(error.message || "Something went wrong while generating the test.");
  } finally {
    setLoading(false);
  }
}

async function saveNote({ title, studyText }) {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: state.session.user.id,
      title,
      extracted_text: studyText
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function saveTest(quiz, noteId) {
  const { data, error } = await supabase
    .from("tests")
    .insert({
      user_id: state.session.user.id,
      note_id: noteId,
      title: quiz.title,
      questions: quiz.questions,
      duration_minutes: quiz.duration_minutes,
      question_count: quiz.questions.length
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

function renderQuiz(quiz) {
  els.emptyState.classList.add("hidden");
  els.quizForm.classList.remove("hidden");
  els.testActions.classList.remove("hidden");
  els.quizForm.innerHTML = "";
  els.testTitle.textContent = quiz.title || "SmartNoteZ Quiz";

  quiz.questions.forEach((question, index) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.innerHTML = `
      <div class="question-meta">
        <span>Question ${index + 1}</span>
        <span>${escapeHtml(question.difficulty || "medium")}</span>
      </div>
      <h3>${escapeHtml(question.question)}</h3>
      <div class="option-list">
        ${question.options.map((option) => `
          <label class="option-item">
            <input type="radio" name="${question.id}" value="${escapeAttr(option)}" />
            <span>${escapeHtml(option)}</span>
          </label>
        `).join("")}
      </div>
    `;
    els.quizForm.appendChild(card);
  });
}

async function submitTest() {
  if (!state.quiz) return;
  stopTimer();

  const answers = {};
  let score = 0;

  state.quiz.questions.forEach((question) => {
    const checked = els.quizForm.querySelector(`input[name="${question.id}"]:checked`);
    const selected = checked?.value || "";
    answers[question.id] = selected;
    if (selected === question.correct_answer) score += 1;
  });

  const total = state.quiz.questions.length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const timeTaken = Math.max((state.quiz.duration_minutes * 60) - state.remainingSeconds, 0);

  await saveAttempt({ score, total, accuracy, timeTaken, answers });
  renderResults({ score, total, accuracy, answers });
  await refreshDashboardData();
}

async function saveAttempt({ score, total, accuracy, timeTaken, answers }) {
  if (!state.currentTestId) return;

  const { error } = await supabase.from("attempts").insert({
    user_id: state.session.user.id,
    test_id: state.currentTestId,
    score,
    total,
    accuracy,
    time_taken_seconds: timeTaken,
    answers
  });

  if (error) console.warn(error.message);
}

function renderResults({ score, total, accuracy, answers }) {
  els.resultEmpty.classList.add("hidden");
  els.resultContent.classList.remove("hidden");
  els.scoreText.textContent = `${score}/${total}`;
  els.accuracyText.textContent = `${accuracy}% accuracy`;

  els.reviewList.innerHTML = state.quiz.questions.map((question, index) => {
    const selected = answers[question.id] || "Not answered";
    const correct = selected === question.correct_answer;
    return `
      <div class="review-item">
        <strong>${correct ? "Correct" : "Review"}: Q${index + 1}</strong>
        <p><b>Your answer:</b> ${escapeHtml(selected)}</p>
        <p><b>Correct:</b> ${escapeHtml(question.correct_answer)}</p>
        <p>${escapeHtml(question.explanation)}</p>
      </div>
    `;
  }).join("");

  if (state.chart) state.chart.destroy();
  state.chart = new Chart(els.accuracyChart, {
    type: "doughnut",
    data: {
      labels: ["Correct", "Incorrect"],
      datasets: [{ data: [score, Math.max(total - score, 0)] }]
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      cutout: "70%"
    }
  });
}

function startTimer(seconds) {
  stopTimer();
  state.remainingSeconds = seconds;
  updateTimerDisplay();

  state.timer = setInterval(() => {
    state.remainingSeconds -= 1;
    updateTimerDisplay();

    if (state.remainingSeconds <= 0) {
      submitTest();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function updateTimerDisplay() {
  const minutes = Math.floor(Math.max(state.remainingSeconds, 0) / 60);
  const seconds = Math.max(state.remainingSeconds, 0) % 60;
  els.timerPill.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function refreshDashboardData() {
  await Promise.all([loadStats(), loadHistory()]);
}

async function loadStats() {
  const userId = state.session.user.id;

  const [{ count: testsCount }, { count: attemptsCount }, { data: attempts }] = await Promise.all([
    supabase.from("tests").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("attempts").select("accuracy").eq("user_id", userId).order("accuracy", { ascending: false }).limit(1)
  ]);

  els.savedTestsCount.textContent = testsCount || 0;
  els.attemptCount.textContent = attemptsCount || 0;
  els.bestAccuracy.textContent = attempts?.[0]?.accuracy ? `${Math.round(attempts[0].accuracy)}%` : "0%";
}

async function loadHistory() {
  const { data, error } = await supabase
    .from("tests")
    .select("id,title,question_count,duration_minutes,created_at")
    .eq("user_id", state.session.user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    els.historyList.innerHTML = `<p class="muted">No saved tests yet.</p>`;
    return;
  }

  els.historyList.innerHTML = data.map((item) => `
    <div class="history-item">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${item.question_count} questions · ${item.duration_minutes} min · ${new Date(item.created_at).toLocaleDateString()}</p>
    </div>
  `).join("");
}

function setLoading(isLoading, text = "") {
  els.generateBtn.disabled = isLoading;
  els.generateBtn.textContent = isLoading ? "Generating..." : "Generate test";
  if (text) setMessage(text);
}

function setMessage(text) {
  els.generatorMessage.textContent = text;
}

function cleanTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
}

function normalizeText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
