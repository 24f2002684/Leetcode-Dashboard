let currentParticipants = [];

function fmtFinishTime(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m}m ${s}s`
    : `${m}m ${s}s`;
}

function ratingChangeBadge(change) {
  if (change === null || change === undefined) return '<span class="text-muted">—</span>';
  const rounded = Math.round(change);
  if (rounded > 0) return `<span class="status-ok">▲ +${rounded}</span>`;
  if (rounded < 0) return `<span class="status-error">▼ ${rounded}</span>`;
  return `<span class="text-muted">0</span>`;
}

async function loadContestList() {
  const res = await fetch('/api/contests');
  const contests = await res.json();
  const select = document.getElementById('contestSelect');

  if (!contests.length) {
    select.innerHTML = '<option>No contest data yet — run Refresh Data first</option>';
    document.getElementById('contestCards').innerHTML =
      '<div class="col-12 text-muted small">No contest data has been fetched yet. Go to the dashboard and click "Refresh Data" after your students have attended at least one weekly contest.</div>';
    return;
  }

  select.innerHTML = contests
    .map((c) => `<option value="${encodeURIComponent(c.contest_title)}">${c.contest_title} (${c.participants} attended)</option>`)
    .join('');

  select.addEventListener('change', () => loadContest(decodeURIComponent(select.value)));
  loadContest(contests[0].contest_title);
}

async function loadContest(title) {
  const res = await fetch(`/api/contests/${encodeURIComponent(title)}`);
  const data = await res.json();
  currentParticipants = data.participants;

  document.getElementById('contestCards').innerHTML = `
    ${statCard('Contest', data.contestTitle)}
    ${statCard('Attended', data.attended, `out of ${data.totalStudents} students`)}
    ${statCard('Absent', data.absent)}
    ${statCard('Average Solved', data.avgSolved)}
  `;

  renderParticipants();

  document.getElementById('absenteesBox').innerHTML = data.absentees.length
    ? data.absentees.map((a) => `<span class="badge bg-secondary">${a.name} (${a.register_no})</span>`).join('')
    : '<span class="text-muted small">Everyone attended this contest 🎉</span>';
}

function statCard(label, value, sub = '') {
  return `
    <div class="col-6 col-lg-3">
      <div class="card-stat">
        <div class="label">${label}</div>
        <div class="value" style="font-size:1.4rem">${value}</div>
        <div class="sub">${sub}</div>
      </div>
    </div>`;
}

function renderParticipants() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const rows = currentParticipants.filter(
    (p) => !search || p.name.toLowerCase().includes(search) || p.leetcode_username.toLowerCase().includes(search)
  );

  document.getElementById('participantsBody').innerHTML = rows
    .map(
      (p) => `
    <tr onclick="location.href='student.html?id=${p.student_id}'">
      <td>${p.ranking ? p.ranking.toLocaleString() : '—'}</td>
      <td>${p.name}</td>
      <td>${p.register_no}</td>
      <td>${p.leetcode_username}</td>
      <td>${p.problems_solved ?? '—'} / ${p.total_problems ?? '—'}</td>
      <td>${fmtFinishTime(p.finish_time_seconds)}</td>
      <td>${p.rating ? Math.round(p.rating) : '—'}</td>
      <td>${ratingChangeBadge(p.rating_change)}</td>
    </tr>`
    )
    .join('');
}

document.getElementById('searchBox').addEventListener('input', renderParticipants);

loadContestList();
