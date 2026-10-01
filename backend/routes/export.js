const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { buildReport } = require('../services/excelService');

const router = express.Router();

const reportsDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

router.get('/export', async (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.name, s.register_no, s.leetcode_username,
              st.rating, st.ranking, st.easy_solved, st.medium_solved,
              st.hard_solved, st.total_solved, st.updated_at,
              (SELECT COUNT(*) FROM contest_history ch WHERE ch.student_id = s.id) attended_contests
       FROM students s
       LEFT JOIN stats st ON st.student_id = s.id
       ORDER BY s.name COLLATE NOCASE ASC`
    )
    .all();

  try {
    const workbook = await buildReport(rows);
    const filePath = path.join(reportsDir, 'Advisor_Report.xlsx');
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, 'Advisor_Report.xlsx');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
