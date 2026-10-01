const params = new URLSearchParams(location.search);
const studentId = params.get('id');

async function loadStudent() {
  if (!studentId) {
    document.getElementById('profileHeader').innerHTML = '<div class="text-muted">No student selected.</div>';
    return;
  }

  const res = await fetch(`/api/students/${studentId}`);
  if (!res.ok) {
    document.getElementById('profileHeader').innerHTML = '<div class="text-muted">Student not found.</div>';
    return;
  }
  const { student, stats, history } = await res.json();

  document.getElementById('profileHeader').innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <img src="${stats?.avatar || 'https://leetcode.com/static/images/LeetCode_logo_rvs.png'}"
           style="width:64px;height:64px;border-radius:50%;object-fit:cover;background:#0f1420" onerror="this.style.display='none'">
      <div>
        <h4 class="mb-0">${student.name}</h4>
        <div class="text-muted small">${student.register_no} · @${student.leetcode_username}
          ${stats?.country ? ' · ' + stats.country : ''}${stats?.school ? ' · ' + stats.school : ''}</div>
      </div>
    </div>
    <div class="row g-3 mt-3">
      ${miniStat('Rating', stats?.rating ? Math.round(stats.rating) : '—')}
      ${miniStat('Global Rank', stats?.ranking ? stats.ranking.toLocaleString() : '—')}
      ${miniStat('Total Solved', stats?.total_solved ?? '—')}
      ${miniStat('Status', stats?.fetch_status ?? 'pending')}
    </div>
    ${stats?.fetch_status === 'error' ? `<div class="alert alert-danger mt-3 py-2 small mb-0">Last fetch error: ${stats.fetch_error}</div>` : ''}
  `;

  new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [{
        data: [stats?.easy_solved || 0, stats?.medium_solved || 0, stats?.hard_solved || 0],
        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444']
      }]
    },
    options: { plugins: { legend: { labels: { color: '#e8ecf7' } } } }
  });

  new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: history.map((h) => h.contest_title.replace('Weekly Contest ', 'W').replace('Biweekly Contest ', 'B')),
      datasets: [{
        label: 'Rating',
        data: history.map((h) => Math.round(h.rating)),
        borderColor: '#4f8cff',
        backgroundColor: 'rgba(79,140,255,0.15)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b93ab' }, grid: { color: '#262e45' } },
        y: { ticks: { color: '#8b93ab' }, grid: { color: '#262e45' } }
      }
    }
  });

  document.getElementById('historyBody').innerHTML = history.length
    ? history
        .slice()
        .reverse()
        .map(
          (h) => `
      <tr>
        <td>${h.contest_title}</td>
        <td>${h.ranking ? h.ranking.toLocaleString() : '—'}</td>
        <td>${h.problems_solved ?? '—'} / ${h.total_problems ?? '—'}</td>
        <td>${h.rating ? Math.round(h.rating) : '—'}</td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="4" class="text-muted">No contest history yet.</td></tr>';
}

function miniStat(label, value) {
  return `
    <div class="col-6 col-md-3">
      <div class="card-stat">
        <div class="label">${label}</div>
        <div class="value" style="font-size:1.3rem">${value}</div>
      </div>
    </div>`;
}

loadStudent();
