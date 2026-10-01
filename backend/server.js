const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/upload');
const studentRoutes = require('./routes/students');
const { router: refreshRoutes } = require('./routes/refresh');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const contestRoutes = require('./routes/contests');
const { startWeeklyRefreshJob } = require('./cron/weeklyRefresh');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', uploadRoutes);
app.use('/api', studentRoutes);
app.use('/api', refreshRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', exportRoutes);
app.use('/api', contestRoutes);

// Serve the frontend (plain HTML/JS/Bootstrap - no build step needed)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LeetCode Advisor Dashboard running at http://localhost:${PORT}`);
    startWeeklyRefreshJob();
  });
}

module.exports = app;
