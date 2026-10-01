const cron = require('node-cron');
const { refreshAllStudents } = require('../routes/refresh');

/**
 * Runs every Sunday at 6:00 PM server time.
 * Cron format: minute hour day-of-month month day-of-week
 */
function startWeeklyRefreshJob() {
  cron.schedule('0 18 * * 0', async () => {
    console.log('[cron] Weekly refresh started:', new Date().toISOString());
    try {
      const result = await refreshAllStudents('cron');
      console.log('[cron] Weekly refresh finished:', result);
    } catch (err) {
      console.error('[cron] Weekly refresh failed:', err.message);
    }
  });

  console.log('[cron] Weekly refresh job scheduled: every Sunday at 6:00 PM');
}

module.exports = { startWeeklyRefreshJob };
