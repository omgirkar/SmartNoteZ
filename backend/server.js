import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireUser } from "./src/auth.js";
import { buildQuizPrompt } from "./src/prompts.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5500";

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "SmartNoteZ API using Groq" });
});

app.post("/api/generate-test", requireUser, async (req, res) => {
  try {
    const { title, studyText, questionCount = 8, durationMinutes = 10 } = req.body || {};

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is missing in backend .env." });
    }

    if (!studyText || typeof studyText !== "string" || studyText.trim().length < 250) {
      return res.status(400).json({
        error: "Please upload notes with at least 250 characters of readable text."
      });
    }

    const safeQuestionCount = Math.min(Math.max(Number(questionCount) || 5, 3), 8);
    const safeDuration = Math.min(Math.max(Number(durationMinutes) || 10, 3), 90);
    const cleanText = studyText.replace(/\s+/g, " ").trim().slice(0, 5000);

    const prompt = buildQuizPrompt({
      title: title || "SmartNoteZ Quiz",
      text: cleanText,
      questionCount: safeQuestionCount,
      durationMinutes: safeDuration
    });

    const rawText = await callGroq(prompt);
    const quiz = parseAIJson(rawText);

    if (!quiz?.questions?.length) {
      return res.status(502).json({ error: "Groq did not return usable quiz JSON." });
    }

    const normalizedQuestions = quiz.questions.slice(0, safeQuestionCount).map((item, index) => {
      const options = Array.isArray(item.options)
        ? item.options.map(String).slice(0, 4)
        : [];

      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }

      const correctAnswer = options.includes(item.correct_answer)
        ? item.correct_answer
        : options[0];

      return {
        id: `q-${index + 1}`,
        question: String(item.question || `Question ${index + 1}`),
        options,
        correct_answer: correctAnswer,
        explanation: String(item.explanation || "Review this part from your notes."),
        difficulty: ["easy", "medium", "hard"].includes(String(item.difficulty).toLowerCase())
          ? String(item.difficulty).toLowerCase()
          : "medium"
      };
    });

    res.json({
      title: quiz.title || title || "SmartNoteZ Quiz",
      duration_minutes: safeDuration,
      questions: normalizedQuestions
    });
  } catch (error) {
    console.error("Groq generation error:", error.message);

    res.status(500).json({
      error: error.message || "Could not generate test. Check your Groq API key, model name, and API limits."
    });
  }
});

async function callGroq(prompt) {
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are SmartNoteZ, an AI study assistant. Generate quizzes from student notes. Return ONLY valid JSON. No markdown. No backticks. No explanation outside JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 1800
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Groq request failed.");
  }

  return data?.choices?.[0]?.message?.content || "";
}

function parseAIJson(rawText = "") {
  const cleaned = String(rawText)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");

    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }

    throw new Error("Invalid JSON returned by Groq.");
  }
}

app.listen(port, () => {
  console.log(`SmartNoteZ API running on http://localhost:${port}`);
});