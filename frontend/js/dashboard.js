let allStudents = [];
let sortKey = 'name';
let sortDir = 1;
let pieChart, barChart;
let modalPieChart, modalLineChart;
let activeTab = 'studentsTab';

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const progressSection = document.getElementById('progressSection');
const dashboardSection = document.getElementById('dashboardSection');
const fileInput = document.getElementById('fileInput');
const navFileInput = document.getElementById('navFileInput');
const dropzone = document.getElementById('dropzone');
const navUploadBtn = document.getElementById('navUploadBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const sampleDemoBtn = document.getElementById('sampleDemoBtn');

// File selection / drag-and-drop
if (dropzone) {
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
}

if (navUploadBtn) {
  navUploadBtn.addEventListener('click', () => navFileInput.click());
  navFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset session? All current in-memory student data will be cleared.')) {
      clearSession();
    }
  });
}

if (sampleDemoBtn) {
  sampleDemoBtn.addEventListener('click', () => {
    const demoStudents = [
      { name: 'Rahul S', registerNo: '23CS001', username: 'tourist' },
      { name: 'Arun K', registerNo: '23CS002', username: 'neal_wu' },
      { name: 'Priya M', registerNo: '23CS003', username: 'lee215' }
    ];
    startBatchFetch(demoStudents);
  });
}

// Upload & Parse
async function handleFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  showSection('progress');
  document.getElementById('progressTitle').textContent = 'Parsing Excel File...';
  document.getElementById('progressStatus').textContent = 'Extracting student list...';
  document.getElementById('progressBar').style.width = '5%';

  try {
    const res = await fetch('/api/parse-excel', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to parse Excel file');

    startBatchFetch(data.students);
  } catch (err) {
    alert('Upload error: ' + err.message);
    showSection('upload');
  }
}

// Fetch loop with live progress
async function startBatchFetch(rawStudents) {
  showSection('progress');
  allStudents = [];
  const total = rawStudents.length;

  document.getElementById('progressTitle').textContent = 'Fetching LeetCode Stats...';

  for (let i = 0; i < total; i++) {
    const raw = rawStudents[i];
    const percent = Math.round(((i + 1) / total) * 100);

    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressCount').textContent = `${i + 1} / ${total} fetched`;
    document.getElementById('progressStatus').textContent = `Querying: ${raw.name} (${raw.username})...`;

    try {
      const res = await fetch('/api/fetch-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: raw.username })
      });
      const data = await res.json();

      if (data.success) {
        allStudents.push({
          id: i + 1,
          name: raw.name,
          register_no: raw.registerNo,
          leetcode_username: raw.username,
          rating: data.contest ? data.contest.currentRating : null,
          ranking: data.profile ? data.profile.ranking : null,
          total_solved: data.profile ? data.profile.totalSolved : 0,
          easy_solved: data.profile ? data.profile.easySolved : 0,
          medium_solved: data.profile ? data.profile.mediumSolved : 0,
          hard_solved: data.profile ? data.profile.hardSolved : 0,
          reputation: data.profile ? data.profile.reputation : null,
          avatar: data.profile ? data.profile.avatar : null,
          country: data.profile ? data.profile.country : null,
          school: data.profile ? data.profile.school : null,
          contests: (data.contest && data.contest.history) || [],
          attended_contests: (data.contest && data.contest.attendedContestsCount) || 0,
          fetch_status: 'ok',
          fetch_error: null
        });
      } else {
        allStudents.push({
          id: i + 1,
          name: raw.name,
          register_no: raw.registerNo,
          leetcode_username: raw.username,
          rating: null,
          ranking: null,
          total_solved: 0,
          easy_solved: 0,
          medium_solved: 0,
          hard_solved: 0,
          reputation: null,
          avatar: null,
          country: null,
          school: null,
          contests: [],
          attended_contests: 0,
          fetch_status: 'error',
          fetch_error: data.error || 'User not found'
        });
      }
    } catch (err) {
      allStudents.push({
        id: i + 1,
        name: raw.name,
        register_no: raw.registerNo,
        leetcode_username: raw.username,
        rating: null,
        ranking: null,
        total_solved: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        contests: [],
        attended_contests: 0,
        fetch_status: 'error',
        fetch_error: err.message
      });
    }

    // Small delay between requests to avoid LeetCode rate limits
    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  renderDashboard();
  showSection('dashboard');
}

// Compute metrics and render dashboard
function renderDashboard() {
  const d = computeStats();

  document.getElementById('statCards').innerHTML = `
    ${statCard('Total Students', d.totalStudents, '')}
    ${statCard('Participated', d.participated, `${d.absent} inactive / 0 solved`)}
    ${statCard('Average Solved', d.avgSolved, 'problems / student')}
    ${statCard('Top Performer', d.topPerformer ? d.topPerformer.name : '—', d.topPerformer ? `${d.topPerformer.total_solved} solved` : '')}
  `;

  document.getElementById('statCards2').innerHTML = `
    ${statCard('Highest Rating', d.highestRating ? Math.round(d.highestRating.rating) : '—', d.highestRating ? d.highestRating.name : '')}
    ${statCard('Lowest Rating', d.lowestRating ? Math.round(d.lowestRating.rating) : '—', d.lowestRating ? d.lowestRating.name : '')}
    ${statCard('Avg Easy / Medium / Hard', `${d.avgEasy} / ${d.avgMedium} / ${d.avgHard}`, '')}
    ${statCard('Storage Status', 'In-Memory Only', 'Ephemeral • Zero saved to disk')}
  `;

  renderPieChart(d.avgEasy, d.avgMedium, d.avgHard);
  renderBarChart(d.topTen);
  renderLatestContest(d.latestContest);

  document.getElementById('studentCountBadge').textContent = allStudents.length;
  renderTable();
  setupContestReport();
}

function computeStats() {
  const totalStudents = allStudents.length;
  const okStudents = allStudents.filter((s) => s.fetch_status === 'ok');
  const participated = okStudents.filter((s) => s.total_solved > 0).length;
  const absent = totalStudents - participated;

  const solvedSum = okStudents.reduce((acc, s) => acc + (s.total_solved || 0), 0);
  const easySum = okStudents.reduce((acc, s) => acc + (s.easy_solved || 0), 0);
  const medSum = okStudents.reduce((acc, s) => acc + (s.medium_solved || 0), 0);
  const hardSum = okStudents.reduce((acc, s) => acc + (s.hard_solved || 0), 0);

  const count = okStudents.length || 1;
  const avgSolved = (solvedSum / count).toFixed(1);
  const avgEasy = (easySum / count).toFixed(1);
  const avgMedium = (medSum / count).toFixed(1);
  const avgHard = (hardSum / count).toFixed(1);

  const topPerformer = [...okStudents].sort((a, b) => (b.total_solved || 0) - (a.total_solved || 0))[0] || null;

  const ratedStudents = okStudents.filter((s) => typeof s.rating === 'number' && s.rating > 0);
  ratedStudents.sort((a, b) => b.rating - a.rating);

  const highestRating = ratedStudents[0] || null;
  const lowestRating = ratedStudents[ratedStudents.length - 1] || null;
  const topTen = ratedStudents.slice(0, 10);

  // Compute latest contest across all students
  const contestMap = {};
  allStudents.forEach((s) => {
    (s.contests || []).forEach((c) => {
      if (!contestMap[c.contestTitle]) {
        contestMap[c.contestTitle] = {
          contest_title: c.contestTitle,
          startTime: c.startTime,
          participants: 0,
          totalSolved: 0
        };
      }
      contestMap[c.contestTitle].participants++;
      contestMap[c.contestTitle].totalSolved += c.problemsSolved || 0;
    });
  });

  const contestsList = Object.values(contestMap).sort((a, b) => b.startTime - a.startTime);
  const latestContest = contestsList[0]
    ? {
        contest_title: contestsList[0].contest_title,
        participants: contestsList[0].participants,
        avg_solved: (contestsList[0].totalSolved / contestsList[0].participants).toFixed(1)
      }
    : null;

  return {
    totalStudents,
    participated,
    absent,
    avgSolved,
    avgEasy,
    avgMedium,
    avgHard,
    topPerformer,
    highestRating,
    lowestRating,
    topTen,
    latestContest
  };
}

function statCard(label, value, sub) {
  return `
    <div class="col-6 col-lg-3">
      <div class="card-stat">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="sub">${sub}</div>
      </div>
    </div>`;
}

function renderPieChart(easy, medium, hard) {
  const ctx = document.getElementById('pieChart');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [{ data: [easy, medium, hard], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#e8ecf7', boxWidth: 12 } } }
    }
  });
}

function renderBarChart(topTen) {
  const ctx = document.getElementById('barChart');
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topTen.map((t) => t.name),
      datasets: [{ label: 'Rating', data: topTen.map((t) => Math.round(t.rating)), backgroundColor: '#4f8cff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b93ab' }, grid: { color: '#262e45' } },
        y: { ticks: { color: '#e8ecf7' }, grid: { color: '#262e45' } }
      }
    }
  });
}

function renderLatestContest(c) {
  const box = document.getElementById('latestContestBox');
  if (!c) {
    box.innerHTML = '<span class="text-muted">No contest data found for these students.</span>';
    return;
  }
  box.innerHTML = `
    <div class="fw-bold text-light mb-2">${c.contest_title}</div>
    <div class="d-flex justify-content-between mb-1"><span>Participants</span><span>${c.participants} students</span></div>
    <div class="d-flex justify-content-between"><span>Avg Problems Solved</span><span>${c.avg_solved}</span></div>
  `;
}

// Student Table & Filtering
function renderTable() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const minRating = Number(document.getElementById('ratingFilter').value);
  const status = document.getElementById('statusFilter').value;

  let rows = allStudents.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search) ||
      s.leetcode_username.toLowerCase().includes(search) ||
      (s.register_no && s.register_no.toLowerCase().includes(search));
    const matchesRating = !minRating || (s.rating && s.rating >= minRating);
    const matchesStatus = status === 'all' || s.fetch_status === status;
    return matchesSearch && matchesRating && matchesStatus;
  });

  rows.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (av === null || av === undefined) av = -Infinity;
    if (bv === null || bv === undefined) bv = -Infinity;
    if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
    return (av - bv) * sortDir;
  });

  const tbody = document.getElementById('studentTableBody');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No students matching the filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (s) => `
    <tr onclick="openStudentModal(${s.id})">
      <td class="fw-semibold">${s.name}</td>
      <td>${s.register_no || '—'}</td>
      <td><code>${s.leetcode_username}</code></td>
      <td>${s.rating ? Math.round(s.rating) : '—'}</td>
      <td>${s.ranking ? s.ranking.toLocaleString() : '—'}</td>
      <td><span class="badge badge-easy">${s.easy_solved ?? 0}</span></td>
      <td><span class="badge badge-medium">${s.medium_solved ?? 0}</span></td>
      <td><span class="badge badge-hard">${s.hard_solved ?? 0}</span></td>
      <td class="fw-bold">${s.total_solved ?? 0}</td>
      <td><span class="badge ${s.fetch_status === 'ok' ? 'bg-success' : 'bg-danger'}">${s.fetch_status}</span></td>
    </tr>`
    )
    .join('');
}

document.querySelectorAll('#studentTable thead th').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (!key) return;
    if (sortKey === key) sortDir *= -1;
    else {
      sortKey = key;
      sortDir = key === 'name' ? 1 : -1;
    }
    renderTable();
  });
});

document.getElementById('searchBox').addEventListener('input', renderTable);
document.getElementById('ratingFilter').addEventListener('change', renderTable);
document.getElementById('statusFilter').addEventListener('change', renderTable);

// Student Detail Modal
function openStudentModal(id) {
  const student = allStudents.find((s) => s.id === id);
  if (!student) return;

  document.getElementById('modalAvatar').src =
    student.avatar || 'https://assets.leetcode.com/users/avatars/default_avatar.png';
  document.getElementById('modalStudentName').textContent = student.name;
  document.getElementById('modalStudentSub').textContent = `${student.register_no || 'No Reg'} • @${student.leetcode_username}`;
  document.getElementById('modalRating').textContent = student.rating ? Math.round(student.rating) : '—';
  document.getElementById('modalRank').textContent = student.ranking ? student.ranking.toLocaleString() : '—';
  document.getElementById('modalSolved').textContent = student.total_solved || 0;
  document.getElementById('modalContests').textContent = (student.contests && student.contests.length) || 0;
  document.getElementById('modalLeetcodeLink').href = `https://leetcode.com/${student.leetcode_username}`;

  // Modal pie chart
  const pieCtx = document.getElementById('modalPieChart');
  if (modalPieChart) modalPieChart.destroy();
  modalPieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [
        {
          data: [student.easy_solved || 0, student.medium_solved || 0, student.hard_solved || 0],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444']
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#e8ecf7', boxWidth: 10 } } }
    }
  });

  // Modal line chart
  const lineCtx = document.getElementById('modalLineChart');
  if (modalLineChart) modalLineChart.destroy();

  const history = student.contests || [];
  modalLineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: history.map((h) => h.contestTitle.replace('Weekly Contest ', 'WC ').replace('Biweekly Contest ', 'BWC ')),
      datasets: [
        {
          label: 'Rating',
          data: history.map((h) => Math.round(h.rating)),
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79, 140, 255, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b93ab' }, grid: { color: '#262e45' } },
        y: { ticks: { color: '#8b93ab' }, grid: { color: '#262e45' } }
      }
    }
  });

  // Modal history table
  const tbody = document.getElementById('modalContestHistoryBody');
  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">No contest attendance recorded.</td></tr>`;
  } else {
    tbody.innerHTML = history
      .map(
        (h) => `
      <tr>
        <td>${h.contestTitle}</td>
        <td>${h.ranking ? h.ranking.toLocaleString() : '—'}</td>
        <td>${h.problemsSolved} / ${h.totalProblems}</td>
        <td>${h.rating ? Math.round(h.rating) : '—'}</td>
      </tr>`
      )
      .join('');
  }

  const modal = new bootstrap.Modal(document.getElementById('studentModal'));
  modal.show();
}

// Contest Report View
function setupContestReport() {
  const contestSet = new Set();
  allStudents.forEach((s) => {
    (s.contests || []).forEach((c) => contestSet.add(c.contestTitle));
  });

  const contestSelect = document.getElementById('contestSelect');
  contestSelect.innerHTML = '';

  const contests = Array.from(contestSet);
  if (contests.length === 0) {
    contestSelect.innerHTML = '<option value="">No contests found</option>';
    document.getElementById('contestKpiCards').innerHTML = '';
    document.getElementById('contestParticipantsBody').innerHTML =
      '<tr><td colspan="7" class="text-center py-3 text-muted">No contests found for this student set.</td></tr>';
    document.getElementById('contestAbsenteesBox').innerHTML = '<span class="text-muted">No data.</span>';
    return;
  }

  contests.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    contestSelect.appendChild(opt);
  });

  contestSelect.onchange = () => renderContestReport(contestSelect.value);
  renderContestReport(contests[0]);
}

function renderContestReport(contestTitle) {
  const participants = [];
  const absentees = [];

  allStudents.forEach((s) => {
    const attended = (s.contests || []).find((c) => c.contestTitle === contestTitle);
    if (attended) {
      participants.push({ student: s, contest: attended });
    } else {
      absentees.push(s);
    }
  });

  participants.sort((a, b) => (a.contest.ranking || Infinity) - (b.contest.ranking || Infinity));

  const totalParticipants = participants.length;
  const avgSolved = totalParticipants
    ? (participants.reduce((acc, p) => acc + (p.contest.problemsSolved || 0), 0) / totalParticipants).toFixed(1)
    : 0;
  const topRank = participants[0] ? `#${participants[0].contest.ranking.toLocaleString()} (${participants[0].student.name})` : '—';

  document.getElementById('contestKpiCards').innerHTML = `
    ${statCard('Class Participants', totalParticipants, `${absentees.length} absentees`)}
    ${statCard('Average Solved', avgSolved, 'problems')}
    ${statCard('Best Rank', topRank, '')}
    ${statCard('Attendance Rate', `${Math.round((totalParticipants / (allStudents.length || 1)) * 100)}%`, 'of uploaded roster')}
  `;

  const tbody = document.getElementById('contestParticipantsBody');
  tbody.innerHTML = participants
    .map(
      (p) => `
    <tr onclick="openStudentModal(${p.student.id})">
      <td class="fw-bold">#${p.contest.ranking ? p.contest.ranking.toLocaleString() : '—'}</td>
      <td>${p.student.name}</td>
      <td>${p.student.register_no || '—'}</td>
      <td><code>${p.student.leetcode_username}</code></td>
      <td>${p.contest.problemsSolved} / ${p.contest.totalProblems}</td>
      <td>${p.contest.finishTimeSeconds ? formatTime(p.contest.finishTimeSeconds) : '—'}</td>
      <td>${p.contest.rating ? Math.round(p.contest.rating) : '—'}</td>
    </tr>`
    )
    .join('');

  const absBox = document.getElementById('contestAbsenteesBox');
  if (absentees.length === 0) {
    absBox.innerHTML = '<span class="text-success small">100% attendance! No absentees for this contest.</span>';
  } else {
    absBox.innerHTML = absentees
      .map((s) => `<span class="badge badge-absent">${s.name} (${s.leetcode_username})</span>`)
      .join(' ');
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

// Tab switcher
function switchTab(tabId) {
  activeTab = tabId;
  document.getElementById('studentsTab').classList.toggle('d-none', tabId !== 'studentsTab');
  document.getElementById('contestsTab').classList.toggle('d-none', tabId !== 'contestsTab');

  document.getElementById('studentsTabBtn').classList.toggle('active', tabId === 'studentsTab');
  document.getElementById('contestsTabBtn').classList.toggle('active', tabId === 'contestsTab');
}

// Excel Export
if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    if (allStudents.length === 0) {
      alert('No student data loaded to export.');
      return;
    }
    exportBtn.disabled = true;
    exportBtn.textContent = 'Generating Excel...';

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: allStudents })
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LeetCode_Advisor_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = '📥 Download Excel';
    }
  });
}

// View sections switcher
function showSection(name) {
  uploadSection.classList.toggle('d-none', name !== 'upload');
  progressSection.classList.toggle('d-none', name !== 'progress');
  dashboardSection.classList.toggle('d-none', name !== 'dashboard');

  const inDashboard = name === 'dashboard';
  navUploadBtn.classList.toggle('d-none', !inDashboard);
  exportBtn.classList.toggle('d-none', !inDashboard);
  resetBtn.classList.toggle('d-none', !inDashboard);
}

// Reset / Calculator Wipe
function clearSession() {
  allStudents = [];
  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();
  if (modalPieChart) modalPieChart.destroy();
  if (modalLineChart) modalLineChart.destroy();
  showSection('upload');
}
