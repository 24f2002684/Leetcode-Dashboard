const express = require('express');
const db = require('../db/database');
const leetcode = require('../services/leetcodeService');

const router = express.Router();

// In-memory flag so we don't allow overlapping refresh runs.
let isRefreshing = false;
let lastProgress = { total: 0, done: 0, running: false };

async function refreshAllStudents(triggeredBy = 'manual') {
  if (isRefreshing) {
    throw new Error('A refresh is already in progress.');
  }
  isRefreshing = true;

  const students = db.prepare('SELECT * FROM students').all();
  lastProgress = { total: students.length, done: 0, running: true };

  const upsertStats = db.prepare(`
    INSERT INTO stats (
      student_id, rating, ranking, total_solved, easy_solved, medium_solved,
      hard_solved, contribution_points, reputation, avatar, country, school,
      fetch_status, fetch_error, updated_at
    ) VALUES (
      @studentId, @rating, @ranking, @totalSolved, @easySolved, @mediumSolved,
      @hardSolved, @contributionPoints, @reputation, @avatar, @country, @school,
      @fetchStatus, @fetchError, CURRENT_TIMESTAMP
    )
    ON CONFLICT(student_id) DO UPDATE SET
      rating = excluded.rating,
      ranking = excluded.ranking,
      total_solved = excluded.total_solved,
      easy_solved = excluded.easy_solved,
      medium_solved = excluded.medium_solved,
      hard_solved = excluded.hard_solved,
      contribution_points = excluded.contribution_points,
      reputation = excluded.reputation,
      avatar = excluded.avatar,
      country = excluded.country,
      school = excluded.school,
      fetch_status = excluded.fetch_status,
      fetch_error = excluded.fetch_error,
      updated_at = CURRENT_TIMESTAMP
  `);

  const upsertContest = db.prepare(`
    INSERT INTO contest_history (
      student_id, contest_title, start_time, attended, ranking,
      problems_solved, total_problems, rating, finish_time_seconds
    ) VALUES (
      @studentId, @contestTitle, @startTime, 1, @ranking,
      @problemsSolved, @totalProblems, @rating, @finishTimeSeconds
    )
    ON CONFLICT(student_id, contest_title) DO UPDATE SET
      ranking = excluded.ranking,
      problems_solved = excluded.problems_solved,
      total_problems = excluded.total_problems,
      rating = excluded.rating,
      finish_time_seconds = excluded.finish_time_seconds
  `);

  let successCount = 0;
  let failCount = 0;

  const log = db
    .prepare(
      'INSERT INTO refresh_log (total_students, success_count, fail_count, triggered_by) VALUES (?, 0, 0, ?)'
    )
    .run(students.length, triggeredBy);

  for (const student of students) {
    try {
      const { profile, contest } = await leetcode.fetchStudentData(student.leetcode_username);

      upsertStats.run({
        studentId: student.id,
        rating: contest.currentRating,
        ranking: profile.ranking,
        totalSolved: profile.totalSolved,
        easySolved: profile.easySolved,
        mediumSolved: profile.mediumSolved,
        hardSolved: profile.hardSolved,
        contributionPoints: profile.reputation,
        reputation: profile.reputation,
        avatar: profile.avatar,
        country: profile.country,
        school: profile.school,
        fetchStatus: 'ok',
        fetchError: null
      });

      for (const h of contest.history) {
        upsertContest.run({
          studentId: student.id,
          contestTitle: h.contestTitle,
          startTime: h.startTime,
          ranking: h.ranking,
          problemsSolved: h.problemsSolved,
          totalProblems: h.totalProblems,
          rating: h.rating,
          finishTimeSeconds: h.finishTimeSeconds
        });
      }

      successCount++;
    } catch (err) {
      upsertStats.run({
        studentId: student.id,
        rating: null,
        ranking: null,
        totalSolved: null,
        easySolved: null,
        mediumSolved: null,
        hardSolved: null,
        contributionPoints: null,
        reputation: null,
        avatar: null,
        country: null,
        school: null,
        fetchStatus: 'error',
        fetchError: err.message
      });
      failCount++;
    }

    lastProgress.done++;
    // Be gentle with LeetCode's servers between students.
    await leetcode.sleep(300);
  }

  db.prepare(
    'UPDATE refresh_log SET finished_at = CURRENT_TIMESTAMP, success_count = ?, fail_count = ? WHERE id = ?'
  ).run(successCount, failCount, log.lastInsertRowid);

  isRefreshing = false;
  lastProgress.running = false;

  return { total: students.length, successCount, failCount };
}

router.post('/refresh', async (req, res) => {
  try {
    const result = await refreshAllStudents('manual');
    res.json({ message: 'Refresh complete', ...result });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

router.get('/refresh/progress', (req, res) => {
  res.json(lastProgress);
});

module.exports = { router, refreshAllStudents };
