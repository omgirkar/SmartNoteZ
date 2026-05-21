# SmartNoteZ

SmartNoteZ is a calm, aesthetic portfolio project for students. Students can sign up, upload notes, extract text from `.pdf`, `.txt`, and `.md` files, generate timed tests with the Gemini API, attempt the test, and view score + accuracy.

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Auth + Database: Supabase
- AI: Gemini API
- PDF reading: PDF.js in the browser
- Result chart: Chart.js

## How it works

```txt
Student login with Supabase
↓
Student uploads PDF/TXT/MD notes
↓
Browser extracts text using PDF.js or FileReader
↓
Frontend sends text to Express backend
↓
Backend sends structured prompt to Gemini
↓
Gemini returns clean JSON questions
↓
Frontend renders timed quiz
↓
Result + accuracy is saved in Supabase
```

## Setup steps

### 1. Create a Supabase project

1. Go to Supabase and create a new project.
2. Go to **Project Settings → API**.
3. Copy:
   - Project URL
   - anon public key
4. Go to **SQL Editor**.
5. Paste and run the SQL from `database/schema.sql`.

### 2. Add frontend config

Copy the example config:

```bash
cp frontend/js/config.example.js frontend/js/config.js
```

Open `frontend/js/config.js` and add your Supabase details:

```js
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-key";
export const API_BASE_URL = "http://localhost:8787";
```

### 3. Add backend environment variables

```bash
cd backend
cp .env.example .env
npm install
```

Open `backend/.env`:

```env
PORT=8787
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ALLOWED_ORIGIN=http://localhost:5500
```

Keep `GEMINI_API_KEY` private. Never put it inside frontend JavaScript.

### 4. Run the project

From the root folder:

```bash
npm install
npm run dev
```

Or run separately:

```bash
cd backend
npm run dev
```

Then open a new terminal:

```bash
npx http-server frontend -p 5500 -c-1
```

Open:

```txt
http://localhost:5500
```

## Free usage tips

- Use Gemini Flash models for lower-cost/free-tier friendly usage.
- Limit extracted notes to around 12,000 characters in the frontend.
- Generate 5–10 questions first.
- Do not allow unlimited quiz generations without login.

## Suggested portfolio upgrades

- Flashcard mode
- Weak-topic analytics
- Pomodoro timer
- Subject folders
- Leaderboard
- AI summary before test
- PDF original upload to Supabase Storage
- GitHub login with Supabase OAuth

## Important note

Gemini and Supabase free-tier limits can change, so check your dashboards before deploying publicly.
