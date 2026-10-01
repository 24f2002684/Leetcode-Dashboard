# LeetCode Advisor Dashboard

A single-login (no-login) internal tool for a CSE advisor to track their
section's LeetCode activity — problems solved and weekly contest
performance — without any manual data entry.

Upload the student list once. Click **Refresh Data** whenever you want
current numbers. Click **Download Excel** for a department-ready report.

---

## 1. Requirements

- **Node.js 18+** (check with `node -v`). Get it from https://nodejs.org if needed.
- Internet access to `leetcode.com` (the app calls LeetCode's public GraphQL
  endpoint directly from your machine/server — it is **not** proxied through
  any third party).

No paid APIs, no external services, no build step for the frontend.

## 2. Setup

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:4000** in your browser.

The server creates its own SQLite database file automatically at
`backend/data/advisor.db` the first time it runs — nothing else to
configure.

## 3. First-time use

1. Go to **Upload Student List** in the top nav.
   (There's also a **Contest Report** page in the nav — see step 5 below.)
2. Upload an `.xlsx` file with these column headers (any order):

   | Student Name | Register No | Leetcode ID |
   |---|---|---|
   | Rahul | 23CS001 | rahul123 |
   | Arun | 23CS002 | arun_vit |

   A sample file is included at the project root: `sample_student_list.xlsx`.
3. Go back to the dashboard and click **Refresh Data**. The first refresh
   pulls each student's profile + contest history from LeetCode — this can
   take a minute or two for a full section since we deliberately pace the
   requests to avoid getting rate-limited by LeetCode.
4. Re-uploading the same file later updates existing students (matched by
   Register No) and adds any new ones — it never duplicates.

## 4. Weekly contest report

The **Contest Report** page (linked in the top nav) shows, per contest:

- who attended vs who didn't (with an explicit "Did Not Attend" list)
- rank, problems solved, finish time, rating, and **rating change** vs
  their previous contest — computed automatically from history, no manual
  entry needed
- a dropdown to switch between any past contest you have data for

This is populated automatically the moment `Refresh Data` pulls in a
student's contest history — nothing to configure.

## 5. Weekly automation

`backend/cron/weeklyRefresh.js` runs the same refresh logic automatically
**every Sunday at 6:00 PM**, as long as the Node process is left running
(e.g. via `pm2`, a systemd service, or just a terminal left open on a lab
machine). Change the schedule by editing the cron expression there —
format is `minute hour day-of-month month day-of-week`.

## 6. The one file to touch if LeetCode changes their API

Everything that talks to LeetCode lives in **one file**:

```
backend/services/leetcodeService.js
```

It uses LeetCode's public (unofficial) GraphQL endpoint at
`https://leetcode.com/graphql`. If LeetCode changes their schema or
endpoint, this is the only place you need to update — no other part of
the app depends on LeetCode directly. It currently fetches:

- **Profile query** — ranking, reputation, country, school, avatar, and
  Easy/Medium/Hard/Total solved counts.
- **Contest query** — current rating, global contest ranking, and full
  per-contest history (rank, problems solved, rating after that contest).

If a student's username doesn't exist or their profile is private, the
error is caught per-student, stored on their row (`fetch_status = 'error'`,
with a message in `fetch_error`), and the refresh continues for everyone
else — a single bad username never blocks the whole batch.

## 7. Project structure

```
leetcode-advisor/
├── sample_student_list.xlsx     ← template you can upload right away
├── backend/
│   ├── server.js                ← Express entry point
│   ├── db/database.js           ← SQLite schema + connection (better-sqlite3)
│   ├── services/
│   │   ├── leetcodeService.js   ← ALL LeetCode GraphQL calls live here
│   │   └── excelService.js      ← reads uploaded xlsx, writes report xlsx
│   ├── routes/
│   │   ├── upload.js            ← POST /api/upload
│   │   ├── students.js          ← GET /api/students, /api/students/:id
│   │   ├── refresh.js           ← POST /api/refresh (also used by cron)
│   │   ├── dashboard.js         ← GET /api/dashboard (aggregate cards)
│   │   ├── export.js            ← GET /api/export (Advisor_Report.xlsx)
│   │   └── contests.js          ← GET /api/contests, /api/contests/:title
│   ├── cron/weeklyRefresh.js    ← Sunday 6 PM auto-refresh
│   ├── uploads/                 ← temp storage for uploaded xlsx (auto-cleared)
│   ├── reports/                 ← generated Advisor_Report.xlsx lands here
│   └── data/advisor.db          ← the SQLite database (created on first run)
└── frontend/                    ← plain HTML/Bootstrap/vanilla JS, no build step
    ├── index.html               ← main dashboard
    ├── upload.html              ← student list upload
    ├── contests.html            ← weekly contest report (attendance, rank, rating change)
    ├── student.html             ← individual student profile + graphs
    └── js/, css/
```

## 8. API reference

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload student list (`multipart/form-data`, field name `file`) |
| GET | `/api/students` | List all students with latest stats |
| GET | `/api/students/:id` | One student's full profile + contest history |
| DELETE | `/api/students/:id` | Remove a student |
| POST | `/api/refresh` | Fetch fresh data for every student from LeetCode |
| GET | `/api/refresh/progress` | Poll refresh progress (`{ total, done, running }`) |
| GET | `/api/dashboard` | Aggregate cards (totals, averages, top performer, etc.) |
| GET | `/api/export` | Download `Advisor_Report.xlsx` |
| GET | `/api/contests` | List every contest with data, most recent first |
| GET | `/api/contests/:title` | Full per-student breakdown for one contest (rank, solved, rating change, absentees) |

## 9. Notes on scale

SQLite comfortably handles a single section (60 students) or the full
department (18 sections × 60 ≈ 1080 students) — it's one file, no server
setup. If you later extend this to multiple advisors each seeing only
their own section, add an `advisor_id` / `section` column to `students`
and filter by it in the routes — the schema already has a `section`
column ready for this.

## 10. Ideas for Phase 2 (not built yet)

- Multiple advisors, each scoped to their own section(s)
- Department-wide leaderboard across all 18 sections
- Automatic email report every Monday morning
- "Students inactive for N weeks" alert list
- PDF summary export alongside the existing Excel export

## 11. Deploying (Vercel)

This repository includes `api/index.js` and `vercel.json` for deployment from
the Vercel dashboard:

1. Import the GitHub repository into Vercel.
2. Leave the framework preset as **Other** and the root directory as the repository root.
3. Leave the build command blank and deploy.

The Express server runs as a Vercel Node function and serves the existing
frontend and API routes. Vercel's filesystem is ephemeral, so the SQLite
database, uploaded files, and generated reports are stored in `/tmp` and can
be lost when a function instance is replaced. Use a persistent database or a
host with persistent storage for production student data.

## 12. Deploying (Railway)

This app needs a host that keeps a real process running (for the Sunday
cron job) and gives you persistent disk (for the SQLite file) — that
rules out plain Vercel, which is serverless-only. **Railway** works well
and has a free trial.

### Option A — Railway CLI (fastest, no GitHub needed)

1. Install the CLI: `npm install -g @railway/cli`
2. From the project root (`leetcode-advisor/`), run:
   ```bash
   railway login
   railway init
   ```
   Follow the prompts to create a new project.
3. Deploy:
   ```bash
   railway up
   ```
4. Add a persistent volume so your student data survives redeploys:
   - Go to your project on https://railway.app
   - Click your service → **Settings** → **Volumes** → **New Volume**
   - Mount path: `/app/backend/data`
5. Set the `DATA_DIR` environment variable so the app writes into that volume:
   - Service → **Variables** → add `DATA_DIR` = `/app/backend/data`
6. Generate a public URL: Service → **Settings** → **Networking** → **Generate Domain**
7. Redeploy so the new env var takes effect: `railway up`
8. Open the generated `*.up.railway.app` URL — you should see the dashboard.

### Option B — GitHub + Railway dashboard (better for ongoing updates)

1. Push this project to a GitHub repo (`git init && git add . && git commit -m "init" && git remote add origin <your-repo-url> && git push -u origin main`)
2. On https://railway.app → **New Project** → **Deploy from GitHub repo** → select your repo
3. Railway auto-detects Node via the root `package.json` and runs `npm install` → `npm start`
4. Add the Volume and `DATA_DIR` variable exactly as in steps 4–5 above
5. Generate a domain as in step 6 above
6. From now on, every `git push` auto-redeploys — your data stays put because it lives on the Volume, not in the app's code directory

### Notes

- `PORT` is set automatically by Railway — the app already reads `process.env.PORT`, nothing to configure there.
- The uploaded-file (`uploads/`) and generated-report (`reports/`) folders don't need to be on the volume — they're temporary/regenerated on demand. Only `data/` (the SQLite file) needs to persist.
- If you'd rather deploy to **Render** instead: same steps apply (Root Directory can stay blank since the root `package.json` handles it), but add a **paid** Persistent Disk mounted at `/app/backend/data` — Render's free tier disk is not guaranteed to survive restarts, which would silently lose your student data.


---

Built for tracking a CSE section's LeetCode progress with zero manual
data entry — upload once, refresh whenever you like.
