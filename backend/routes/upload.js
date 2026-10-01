const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { parseStudentList } = require('../services/excelService');

const router = express.Router();

const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Field name must be "file".' });
  }

  try {
    const students = await parseStudentList(req.file.path);

    if (students.length === 0) {
      return res.status(400).json({ error: 'No valid student rows found in the file.' });
    }

    const insertStudent = db.prepare(`
      INSERT INTO students (name, register_no, leetcode_username)
      VALUES (@name, @registerNo, @username)
      ON CONFLICT(register_no) DO UPDATE SET
        name = excluded.name,
        leetcode_username = excluded.leetcode_username
    `);

    const insertMany = db.transaction((rows) => {
      let inserted = 0;
      for (const row of rows) {
        insertStudent.run(row);
        inserted++;
      }
      return inserted;
    });

    const count = insertMany(students);

    // Ensure every student has a placeholder stats row so the dashboard
    // shows them as "pending" before the first refresh.
    const ensureStats = db.prepare(`
      INSERT OR IGNORE INTO stats (student_id, fetch_status)
      SELECT id, 'pending' FROM students WHERE register_no IN (${students.map(() => '?').join(',')})
    `);
    ensureStats.run(...students.map((s) => s.registerNo));

    fs.unlink(req.file.path, () => {});

    res.json({ message: 'Student list uploaded successfully.', count });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
