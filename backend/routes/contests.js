const express = require('express');
const db = require('../db/database');

const router = express.Router();

// List every contest we have data for, most recent first, with a quick
// participation count so the dropdown can show "Weekly Contest 501 (52)".
router.get('/contests', (req, res) => {
  const rows = db
    .prepare(
      `SELECT contest_title, MAX(start_time) start_time, COUNT(*) participants
       FROM contest_history
       GROUP BY contest_title
       ORDER BY start_time DESC`
    )
    .all();
  res.json(rows);
});

// Full per-student breakdown for one contest: rank, solved, rating,
// rating change vs their previous contest, and finish time.
router.get('/contests/:title', (req, res) => {
  const title = req.params.title;

  const totalStudents = db.prepare('SELECT COUNT(*) c FROM students').get().c;

  const rows = db
    .prepare(
      `SELECT s.id as student_id, s.name, s.register_no, s.leetcode_username,
              ch.ranking, ch.problems_solved, ch.total_problems, ch.rating,
              ch.finish_time_seconds, ch.start_time,
              (SELECT ch2.rating FROM contest_history ch2
                WHERE ch2.student_id = ch.student_id
                  AND ch2.start_time < ch.start_time
                ORDER BY ch2.start_time DESC LIMIT 1) as prev_rating
       FROM contest_history ch
       JOIN students s ON s.id = ch.student_id
       WHERE ch.contest_title = ?
       ORDER BY ch.ranking ASC`
    )
    .all(title);

  const participants = rows.map((r) => ({
    ...r,
    rating_change: r.prev_rating !== null && r.rating !== null ? r.rating - r.prev_rating : null
  }));

  const attended = participants.length;
  const avgSolved = attended
    ? participants.reduce((sum, p) => sum + (p.problems_solved || 0), 0) / attended
    : 0;

  // Everyone who did NOT attend this particular contest.
  const attendedIds = participants.map((p) => p.student_id);
  const absentees = db
    .prepare(
      `SELECT id, name, register_no, leetcode_username FROM students
       WHERE id NOT IN (${attendedIds.length ? attendedIds.map(() => '?').join(',') : '0'})
       ORDER BY name COLLATE NOCASE ASC`
    )
    .all(...attendedIds);

  res.json({
    contestTitle: title,
    totalStudents,
    attended,
    absent: totalStudents - attended,
    avgSolved: Number(avgSolved.toFixed(2)),
    participants,
    absentees
  });
});

module.exports = router;
