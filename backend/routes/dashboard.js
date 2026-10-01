const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/dashboard', (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) c FROM students').get().c;

  const participated = db
    .prepare(
      `SELECT COUNT(*) c FROM stats WHERE fetch_status = 'ok' AND total_solved IS NOT NULL AND total_solved > 0`
    )
    .get().c;

  const absent = totalStudents - participated;

  const avgSolved = db
    .prepare(
      `SELECT AVG(total_solved) a FROM stats WHERE fetch_status = 'ok'`
    )
    .get().a;

  const topPerformer = db
    .prepare(
      `SELECT s.name, st.total_solved FROM stats st
       JOIN students s ON s.id = st.student_id
       WHERE st.fetch_status = 'ok'
       ORDER BY st.total_solved DESC LIMIT 1`
    )
    .get();

  const highestRating = db
    .prepare(
      `SELECT s.name, st.rating FROM stats st
       JOIN students s ON s.id = st.student_id
       WHERE st.rating IS NOT NULL
       ORDER BY st.rating DESC LIMIT 1`
    )
    .get();

  const lowestRating = db
    .prepare(
      `SELECT s.name, st.rating FROM stats st
       JOIN students s ON s.id = st.student_id
       WHERE st.rating IS NOT NULL
       ORDER BY st.rating ASC LIMIT 1`
    )
    .get();

  const avgEasy = db.prepare(`SELECT AVG(easy_solved) a FROM stats WHERE fetch_status='ok'`).get().a;
  const avgMedium = db.prepare(`SELECT AVG(medium_solved) a FROM stats WHERE fetch_status='ok'`).get().a;
  const avgHard = db.prepare(`SELECT AVG(hard_solved) a FROM stats WHERE fetch_status='ok'`).get().a;

  const topTen = db
    .prepare(
      `SELECT s.name, st.rating FROM stats st
       JOIN students s ON s.id = st.student_id
       WHERE st.rating IS NOT NULL
       ORDER BY st.rating DESC LIMIT 10`
    )
    .all();

  const latestContest = db
    .prepare(
      `SELECT contest_title, COUNT(*) participants, AVG(problems_solved) avg_solved, MAX(start_time) start_time
       FROM contest_history
       GROUP BY contest_title
       ORDER BY start_time DESC LIMIT 1`
    )
    .get();

  const lastRefresh = db
    .prepare('SELECT * FROM refresh_log ORDER BY id DESC LIMIT 1')
    .get();

  res.json({
    totalStudents,
    participated,
    absent,
    avgSolved: avgSolved ? Number(avgSolved.toFixed(2)) : 0,
    avgEasy: avgEasy ? Number(avgEasy.toFixed(2)) : 0,
    avgMedium: avgMedium ? Number(avgMedium.toFixed(2)) : 0,
    avgHard: avgHard ? Number(avgHard.toFixed(2)) : 0,
    topPerformer: topPerformer || null,
    highestRating: highestRating || null,
    lowestRating: lowestRating || null,
    topTen,
    latestContest: latestContest || null,
    lastRefresh: lastRefresh || null
  });
});

module.exports = router;
