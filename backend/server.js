const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { parseStudentList, buildReportBuffer, createSampleTemplateBuffer } = require('./services/excelService');
const leetcodeService = require('./services/leetcodeService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory file upload handler (never saves to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/parse-excel or /api/upload
 * Accepts an Excel file in-memory and returns the parsed students list:
 * [{ name, registerNo, username }]
 */
const handleUpload = async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'No Excel file provided. Upload a file under field "file".' });
  }
  try {
    const students = await parseStudentList(req.file.buffer);
    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'No valid student rows found in the Excel sheet.' });
    }
    res.json({
      message: 'File parsed successfully',
      count: students.length,
      students
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

app.post('/api/parse-excel', upload.single('file'), handleUpload);
app.post('/api/upload', upload.single('file'), handleUpload);

/**
 * POST /api/fetch-student
 * Fetches profile and contest stats for a single LeetCode username.
 * Used by the frontend client loop to provide real-time live progress.
 */
app.post('/api/fetch-student', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  try {
    const data = await leetcodeService.fetchStudentData(username);
    res.json({ success: true, ...data });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      username
    });
  }
});

/**
 * POST /api/export
 * Accepts students array with their stats and generates a styled Excel file in-memory.
 */
app.post('/api/export', async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided to export.' });
    }

    const buffer = await buildReportBuffer(students);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="Advisor_Report.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sample-template
 * Returns a downloadable starter Excel template.
 */
app.get('/api/sample-template', async (req, res) => {
  try {
    const buffer = await createSampleTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="Student_List_Template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LeetCode Advisor Dashboard running at http://localhost:${PORT}`);
  });
}

module.exports = app;
