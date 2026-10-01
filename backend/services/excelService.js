const ExcelJS = require('exceljs');

/**
 * Parse the uploaded "Student Name | Register No | Leetcode ID" excel file.
 * Returns an array of { name, registerNo, username }.
 * Header row detection is case-insensitive and tolerant of column order.
 */
async function parseStudentList(input) {
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(input)) {
    await workbook.xlsx.load(input);
  } else {
    await workbook.xlsx.readFile(input);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Excel file does not contain any worksheets.');
  }

  const headerRow = sheet.getRow(1);
  const colMap = {}; // normalized header -> column index
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').trim().toLowerCase();
    if (val.includes('name')) colMap.name = colNumber;
    else if (val.includes('register') || val.includes('reg') || val.includes('roll')) colMap.registerNo = colNumber;
    else if (val.includes('leetcode') || val.includes('username') || val.includes('id') || val.includes('handle')) {
      colMap.username = colNumber;
    }
  });

  if (!colMap.name || !colMap.registerNo || !colMap.username) {
    throw new Error(
      'Could not detect required columns. Please ensure your headers include "Student Name", "Register No", and "Leetcode ID".'
    );
  }

  const students = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const name = row.getCell(colMap.name).value;
    const registerNo = row.getCell(colMap.registerNo).value;
    const username = row.getCell(colMap.username).value;
    if (!name || !registerNo || !username) return; // skip blank rows
    students.push({
      name: String(name).trim(),
      registerNo: String(registerNo).trim(),
      username: String(username).trim()
    });
  });

  return students;
}

/**
 * Build the "Advisor_Report.xlsx" workbook from joined student+stats rows.
 */
async function buildReport(students) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Advisor Report');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Register No', key: 'register_no', width: 16 },
    { header: 'Username', key: 'leetcode_username', width: 20 },
    { header: 'Rating', key: 'rating', width: 12 },
    { header: 'Global Rank', key: 'ranking', width: 14 },
    { header: 'Easy', key: 'easy_solved', width: 10 },
    { header: 'Medium', key: 'medium_solved', width: 10 },
    { header: 'Hard', key: 'hard_solved', width: 10 },
    { header: 'Total Solved', key: 'total_solved', width: 14 },
    { header: 'Contests Attended', key: 'attended_contests', width: 18 },
    { header: 'Status', key: 'fetch_status', width: 12 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };

  students.forEach((s) => sheet.addRow(s));

  sheet.autoFilter = { from: 'A1', to: 'K1' };
  return workbook;
}

async function buildReportBuffer(students) {
  const workbook = await buildReport(students);
  return await workbook.xlsx.writeBuffer();
}

async function createSampleTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');

  sheet.columns = [
    { header: 'Student Name', key: 'name', width: 20 },
    { header: 'Register No', key: 'registerNo', width: 16 },
    { header: 'Leetcode ID', key: 'username', width: 20 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };

  sheet.addRow({ name: 'Rahul S', registerNo: '23CS001', username: 'rahul123' });
  sheet.addRow({ name: 'Arun K', registerNo: '23CS002', username: 'arun_vit' });
  sheet.addRow({ name: 'Priya M', registerNo: '23CS003', username: 'priya_dev' });

  return await workbook.xlsx.writeBuffer();
}

module.exports = { parseStudentList, buildReport, buildReportBuffer, createSampleTemplateBuffer };
