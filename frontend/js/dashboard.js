let allStudents = [];
let sortKey = 'name';
let sortDir = 1;
let pieChart, barChart;

async function loadDashboard() {
  const res = await fetch('/api/dashboard');
  const d = await res.json();

  document.getElementById('statCards').innerHTML = `
    ${statCard('Total Students', d.totalStudents, '')}
    ${statCard('Participated', d.participated, `${d.absent} absent`)}
    ${statCard('Average Solved', d.avgSolved, 'problems / student')}
    ${statCard('Top Performer', d.topPerformer ? d.topPerformer.name : '—', d.topPerformer ? `${d.topPerformer.total_solved} solved` : '')}
  `;

  document.getElementById('statCards2').innerHTML = `
    ${statCard('Highest Rating', d.highestRating ? Math.round(d.highestRating.rating) : '—', d.highestRating ? d.highestRating.name : '')}
    ${statCard('Lowest Rating', d.lowestRating ? Math.round(d.lowestRating.rating) : '—', d.lowestRating ? d.lowestRating.name : '')}
    ${statCard('Avg Easy / Medium / Hard', `${d.avgEasy} / ${d.avgMedium} / ${d.avgHard}`, '')}
    ${statCard('Last Refresh', d.lastRefresh ? timeAgo(d.lastRefresh.finished_at || d.lastRefresh.started_at) : 'Never', d.lastRefresh ? `${d.lastRefresh.success_count} ok, ${d.lastRefresh.fail_count} failed` : '')}
  `;

  renderPieChart(d.avgEasy, d.avgMedium, d.avgHard);
  renderBarChart(d.topTen);
  renderLatestContest(d.latestContest);
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

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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
    options: { plugins: { legend: { labels: { color: '#e8ecf7' } } } }
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
    box.innerHTML = '<span class="text-muted">No contest data yet. Run a refresh after students have attended a contest.</span>';
    return;
  }
  box.innerHTML = `
    <div class="fw-bold text-light mb-2">${c.contest_title}</div>
    <div class="d-flex justify-content-between mb-1"><span>Participants</span><span>${c.participants}</span></div>
    <div class="d-flex justify-content-between"><span>Avg Solved</span><span>${Number(c.avg_solved).toFixed(1)}</span></div>
  `;
}

async function loadStudents() {
  const res = await fetch('/api/students');
  allStudents = await res.json();
  renderTable();
}

function renderTable() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const minRating = Number(document.getElementById('ratingFilter').value);
  const status = document.getElementById('statusFilter').value;

  let rows = allStudents.filter((s) => {
    const matchesSearch =
      !search || s.name.toLowerCase().includes(search) || s.leetcode_username.toLowerCase().includes(search);
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
  tbody.innerHTML = rows
    .map(
      (s) => `
    <tr onclick="location.href='student.html?id=${s.id}'">
      <td>${s.name}</td>
      <td>${s.register_no}</td>
      <td>${s.leetcode_username}</td>
      <td>${s.rating ? Math.round(s.rating) : '—'}</td>
      <td>${s.ranking ? s.ranking.toLocaleString() : '—'}</td>
      <td><span class="badge badge-easy">${s.easy_solved ?? '—'}</span></td>
      <td><span class="badge badge-medium">${s.medium_solved ?? '—'}</span></td>
      <td><span class="badge badge-hard">${s.hard_solved ?? '—'}</span></td>
      <td>${s.total_solved ?? '—'}</td>
      <td class="status-${s.fetch_status}">${s.fetch_status}</td>
    </tr>`
    )
    .join('');
}

document.querySelectorAll('#studentTable thead th').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = 1; }
    renderTable();
  });
});

document.getElementById('searchBox').addEventListener('input', renderTable);
document.getElementById('ratingFilter').addEventListener('change', renderTable);
document.getElementById('statusFilter').addEventListener('change', renderTable);

document.getElementById('refreshBtn').addEventListener('click', async () => {
  const overlay = document.getElementById('spinnerOverlay');
  overlay.style.display = 'flex';
  document.getElementById('spinnerText').textContent = 'Fetching latest data from LeetCode...';
  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Refresh failed');
    await loadDashboard();
    await loadStudents();
    document.getElementById('spinnerText').textContent = `Done: ${data.successCount} ok, ${data.failCount} failed`;
    setTimeout(() => (overlay.style.display = 'none'), 1200);
  } catch (err) {
    alert('Refresh failed: ' + err.message);
    overlay.style.display = 'none';
  }
});

loadDashboard();
loadStudents();
