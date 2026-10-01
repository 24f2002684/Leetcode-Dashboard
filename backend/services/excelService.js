const ExcelJS = require('exceljs');

/**
 * Parse the uploaded "Student Name | Register No | Leetcode ID" excel file.
 * Returns an array of { name, registerNo, username }.
 * Header row detection is case-insensitive and tolerant of column order.
 */
async function parseStudentList(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1);
  const colMap = {}; // normalized header -> column index
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').trim().toLowerCase();
    if (val.includes('name')) colMap.name = colNumber;
    else if (val.includes('register')) colMap.registerNo = colNumber;
    else if (val.includes('leetcode') || val.includes('username') || val.includes('id')) {
      colMap.username = colNumber;
    }
  });

  if (!colMap.name || !colMap.registerNo || !colMap.username) {
    throw new Error(
      'Could not detect required columns. Expected headers: "Student Name", "Register No", "Leetcode ID".'
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
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'Global Rank', key: 'ranking', width: 14 },
    { header: 'Easy', key: 'easy_solved', width: 8 },
    { header: 'Medium', key: 'medium_solved', width: 10 },
    { header: 'Hard', key: 'hard_solved', width: 8 },
    { header: 'Total Solved', key: 'total_solved', width: 14 },
    { header: 'Contests Attended', key: 'attended_contests', width: 18 },
    { header: 'Last Updated', key: 'updated_at', width: 20 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2C3E50' }
  };

  students.forEach((s) => sheet.addRow(s));

  sheet.autoFilter = { from: 'A1', to: 'K1' };
  return workbook;
}

module.exports = { parseStudentList, buildReport };
