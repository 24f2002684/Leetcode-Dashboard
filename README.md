# 📊 LeetCode Advisor — Live Ephemeral Dashboard

A fast, privacy-focused, zero-database online tool for faculty advisors and educators to track student LeetCode performance — solved problems, global rankings, and weekly contest history.

> **Calculator-Style Ephemeral Model**:
> - Open the website and drop in your Excel sheet.
> - The app fetches live statistics directly from LeetCode with real-time progress.
> - Displays charts, rankings, contest breakdowns, and student profiles.
> - Export a department-ready Excel report.
> - **Refresh the browser or close the tab, and everything is completely gone.** Zero persistent storage, no server database, and total privacy for student rosters.

---

## 🚀 How to Deploy Online (Free on Render.com)

Deploying takes about 2 minutes with GitHub and Render:

### Step 1: Push your code to GitHub
```bash
git add .
git commit -m "feat: ephemeral in-memory dashboard with Render deployment"
git push origin main
```

### Step 2: Create a Free Web Service on Render
1. Go to [render.com](https://render.com) and sign in (using your GitHub account).
2. Click **New +** in the top right and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your repo: `https://github.com/24f2002684/Leetcode-Dashboard`.
4. Configure the settings:
   - **Name**: `leetcode-dashboard` (or any name you like)
   - **Region**: Closest to your users (e.g., Singapore, Frankfurt, Oregon)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Click **Create Web Service**.

Render will automatically build and deploy your app. Within 1–2 minutes, you will get a public live URL like:
`https://leetcode-dashboard-xxxx.onrender.com`

*(A `render.yaml` blueprint is also included in this repo if you prefer Render Blueprints).*

---

## 💻 Running Locally

To run the app on your local machine:

```bash
# Clone the repository
git clone https://github.com/24f2002684/Leetcode-Dashboard.git
cd Leetcode-Dashboard

# Install dependencies (root and backend)
npm install

# Start the server
npm start
```

Open **http://localhost:4000** in your browser.

---

## 📋 Excel File Format

Your Excel file (`.xlsx` or `.xls`) only needs 3 columns with these headers (in any order):

| Student Name | Register No | Leetcode ID |
|---|---|---|
| Rahul S | 23CS001 | rahul123 |
| Arun K | 23CS002 | arun_vit |
| Priya M | 23CS003 | priya_dev |

- You can click **Download Starter Template** directly on the dashboard homepage to get a pre-formatted template.
- You can also click **Test with Sample Students** to demo the dashboard immediately without uploading a file.

---

## 🛠️ Architecture

- **Frontend**: Vanilla JS, Bootstrap 5.3, Chart.js 4.4, Plus Jakarta Sans. Completely in-memory state.
- **Backend**: Lightweight Node.js + Express proxy:
  - `POST /api/parse-excel`: In-memory parsing using `ExcelJS` (no disk writes).
  - `POST /api/fetch-student`: Fetches profile and contest stats from LeetCode GraphQL with rate-limiting respect.
  - `POST /api/export`: In-memory generation of styled `Advisor_Report.xlsx`.
  - `GET /api/sample-template`: Generates downloadable Excel starter template.
- **Zero Persistent Storage**: No SQLite, no database files, no cookies, no tracking. Every session is ephemeral.
