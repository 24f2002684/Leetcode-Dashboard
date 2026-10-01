const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/students', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.register_no, s.leetcode_username,
              st.rating, st.ranking, st.total_solved, st.easy_solved,
              st.medium_solved, st.hard_solved, st.fetch_status, st.updated_at
       FROM students s
       LEFT JOIN stats st ON st.student_id = s.id
       ORDER BY s.name COLLATE NOCASE ASC`
    )
    .all();
  res.json(rows);
});

router.get('/students/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const stats = db.prepare('SELECT * FROM stats WHERE student_id = ?').get(req.params.id);
  const history = db
    .prepare(
      'SELECT * FROM contest_history WHERE student_id = ? ORDER BY start_time ASC'
    )
    .all(req.params.id);

  res.json({ student, stats, history });
});

router.delete('/students/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
