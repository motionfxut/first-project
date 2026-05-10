const STORAGE_KEY = 'tracklog_sessions';
const HERO_KEY    = 'tracklog_hero';
let sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let lapTimes  = [];
let chart     = null;

// ── DOM refs ──────────────────────────────────────────────────────
const form         = document.getElementById('session-form');
const lapInput     = document.getElementById('lap-input');
const addLapBtn    = document.getElementById('add-lap-btn');
const lapListEl    = document.getElementById('lap-list');
const modal        = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const toastEl      = document.getElementById('toast');

// ── Navigation ────────────────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'sessions') { renderSessions(); buildChart(); }
  if (name === 'home')     renderHome();
}

document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', () => switchView(el.dataset.view));
});

// ── Hero photo ────────────────────────────────────────────────────
const heroEl     = document.getElementById('hero');
const heroUpload = document.getElementById('hero-upload');

function applyHero(src) {
  heroEl.style.backgroundImage = `url('${src}')`;
}

const savedHero = localStorage.getItem(HERO_KEY);
if (savedHero) applyHero(savedHero);

heroUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    localStorage.setItem(HERO_KEY, ev.target.result);
    applyHero(ev.target.result);
    toast('Hero photo updated');
  };
  reader.readAsDataURL(file);
});

// ── Default date ──────────────────────────────────────────────────
document.getElementById('date').value = todayStr();

// ── Lap times ─────────────────────────────────────────────────────
function addLap() {
  const val = lapInput.value.trim();
  if (!val) return;
  lapTimes.push(val);
  lapInput.value = '';
  renderLapChips();
  lapInput.focus();
}

addLapBtn.addEventListener('click', addLap);
lapInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addLap(); } });

function parseLapSec(str) {
  const m = str.match(/^(\d+):(\d{2})\.(\d+)$/);
  if (m) return +m[1] * 60 + +m[2] + parseFloat('0.' + m[3]);
  const n = parseFloat(str);
  return isNaN(n) ? Infinity : n;
}

function bestLap(laps) {
  if (!laps || !laps.length) return null;
  return laps.reduce((b, l) => parseLapSec(l) < parseLapSec(b) ? l : b);
}

function renderLapChips() {
  const best = bestLap(lapTimes);
  lapListEl.innerHTML = '';
  lapTimes.forEach((lap, i) => {
    const chip = document.createElement('div');
    chip.className = 'lap-chip' + (lap === best && lapTimes.length > 1 ? ' best' : '');
    chip.innerHTML = `${lap}${lapTimes.length > 1 && lap === best ? ' ★' : ''} <span class="remove-lap" data-i="${i}">&times;</span>`;
    lapListEl.appendChild(chip);
  });
  lapListEl.querySelectorAll('.remove-lap').forEach(btn => {
    btn.addEventListener('click', () => {
      lapTimes.splice(+btn.dataset.i, 1);
      renderLapChips();
    });
  });
}

// ── Save session ──────────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const session = {
    id:          Date.now(),
    date:        document.getElementById('date').value,
    track:       document.getElementById('track').value.trim(),
    bike:        document.getElementById('bike').value.trim(),
    group:       document.getElementById('group').value,
    conditions:  document.getElementById('conditions').value,
    tireWarmers: document.getElementById('tire-warmers').value,
    laps:        [...lapTimes],
    wentWell:    document.getElementById('went-well').value.trim(),
    improve:     document.getElementById('improve').value.trim(),
    notes:       document.getElementById('notes').value.trim(),
  };
  sessions.unshift(session);
  save();
  form.reset();
  document.getElementById('date').value = todayStr();
  lapTimes = [];
  renderLapChips();
  toast('Session saved ✓');
  // Switch to sessions view and highlight new row
  switchView('sessions');
  requestAnimationFrame(() => {
    const firstRow = document.querySelector('#session-tbody tr');
    if (firstRow) {
      firstRow.classList.add('new-row');
      firstRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
});

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }

// ── Home view ─────────────────────────────────────────────────────
function renderHome() {
  const statsEl  = document.getElementById('home-stats');
  const recentEl = document.getElementById('home-recent');
  const total    = sessions.length;
  const allBests = sessions.map(s => bestLap(s.laps)).filter(Boolean);
  const overall  = bestLap(allBests);
  const tracks   = new Set(sessions.map(s => s.track)).size;

  statsEl.innerHTML = [
    { val: total,              label: 'Sessions',      green: false },
    { val: tracks || 0,       label: 'Tracks',         green: false },
    { val: overall || '—',    label: 'Best Lap Ever',  green: !!overall },
  ].map(s => `
    <div class="home-stat-card">
      <div class="home-stat-value${s.green ? ' green' : ''}">${s.val}</div>
      <div class="home-stat-label">${s.label}</div>
    </div>`).join('');

  if (!sessions.length) {
    recentEl.innerHTML = '<div class="home-empty">No sessions yet — log your first track day.</div>';
    return;
  }

  const recent = sessions.slice(0, 6);
  recentEl.innerHTML = `<div class="home-recent-row">${recent.map(s => {
    const best = bestLap(s.laps);
    return `<div class="recent-card" data-id="${s.id}">
      <div>
        <div class="recent-track">${s.track || '—'}</div>
        <div class="recent-meta">${fmtDate(s.date)}${s.bike ? ' · ' + s.bike : ''}</div>
      </div>
      ${best ? `<div><div class="recent-best">${best}</div><div class="recent-best-label">Best</div></div>` : ''}
    </div>`;
  }).join('')}</div>`;

  recentEl.querySelectorAll('.recent-card').forEach(card => {
    card.addEventListener('click', () => {
      const s = sessions.find(x => x.id === +card.dataset.id);
      if (s) openModal(s);
    });
  });
}

// ── Sessions table ────────────────────────────────────────────────
function renderSessions() {
  const tbody    = document.getElementById('session-tbody');
  const emptyEl  = document.getElementById('table-empty');
  const statsBar = document.getElementById('stats-bar');

  // stats
  const total   = sessions.length;
  const allBests = sessions.map(s => bestLap(s.laps)).filter(Boolean);
  const overall  = bestLap(allBests);
  statsBar.innerHTML = `
    <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Sessions</div></div>
    ${overall ? `<div class="stat"><div class="stat-value green">${overall}</div><div class="stat-label">Best Lap Ever</div></div>` : ''}
  `;

  if (!sessions.length) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    document.getElementById('chart-card').classList.add('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  document.getElementById('chart-card').classList.remove('hidden');

  tbody.innerHTML = sessions.map(s => {
    const best = bestLap(s.laps);
    return `<tr data-id="${s.id}">
      <td>${fmtDate(s.date)}</td>
      <td class="td-track">${esc(s.track) || '—'}</td>
      <td>${esc(s.bike) || '—'}</td>
      <td>${esc(s.group) || '—'}</td>
      <td>${esc(s.conditions) || '—'}</td>
      <td class="best-lap-cell">${best || '—'}</td>
      <td><span class="lap-count">${s.laps.length}</span></td>
      <td class="td-actions"><button title="View" data-id="${s.id}">↗</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.td-actions')) return;
      const s = sessions.find(x => x.id === +row.dataset.id);
      if (s) openModal(s);
    });
  });

  tbody.querySelectorAll('.td-actions button').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const s = sessions.find(x => x.id === +btn.dataset.id);
      if (s) openModal(s);
    });
  });

  // rebuild chart track filter
  buildChartFilter();
}

// ── Chart ─────────────────────────────────────────────────────────
function buildChartFilter() {
  const sel    = document.getElementById('chart-track-filter');
  const tracks = [...new Set(sessions.map(s => s.track).filter(Boolean))];
  sel.innerHTML = `<option value="">All Tracks</option>` +
    tracks.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  sel.onchange = buildChart;
}

function buildChart() {
  const sel      = document.getElementById('chart-track-filter');
  const filter   = sel ? sel.value : '';
  const filtered = filter ? sessions.filter(s => s.track === filter) : sessions;
  const data     = filtered.map(s => ({ date: s.date, best: bestLap(s.laps) }))
    .filter(d => d.best)
    .reverse();

  const ctx = document.getElementById('lap-chart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => fmtDateShort(d.date)),
      datasets: [{
        label: 'Best Lap',
        data: data.map(d => parseLapSec(d.best)),
        borderColor: '#e84c00',
        backgroundColor: 'rgba(232,76,0,0.07)',
        pointBackgroundColor: '#e84c00',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + secToLap(ctx.parsed.y),
          }
        }
      },
      scales: {
        y: {
          grid: { color: '#e4e1da' },
          ticks: {
            color: '#888580',
            font: { size: 11 },
            callback: v => secToLap(v),
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#888580', font: { size: 11 } }
        }
      }
    }
  });
}

// ── Modal ─────────────────────────────────────────────────────────
function openModal(s) {
  const best = bestLap(s.laps);
  const meta = [s.bike, s.group, s.conditions, s.tireWarmers ? `Warmers: ${s.tireWarmers}` : ''].filter(Boolean).join(' · ');

  const lapsHTML = s.laps.length ? `
    <div class="modal-section">
      <div class="modal-section-label">Lap Times (${s.laps.length})</div>
      <div class="modal-laps">${s.laps.map(l =>
        `<div class="lap-chip${l === best && s.laps.length > 1 ? ' best' : ''}">${l}${l === best && s.laps.length > 1 ? ' ★' : ''}</div>`
      ).join('')}</div>
    </div>` : '';

  const textSec = (label, val) => val
    ? `<div class="modal-section"><div class="modal-section-label">${label}</div><div class="modal-text">${esc(val)}</div></div>` : '';

  modalContent.innerHTML = `
    <div class="modal-track">${esc(s.track) || '—'}</div>
    <div class="modal-sub">${fmtDate(s.date)}${meta ? ' · ' + esc(meta) : ''}</div>
    ${lapsHTML}
    ${textSec('What went well', s.wentWell)}
    ${textSec('What to improve', s.improve)}
    ${textSec('Notes', s.notes)}
    <div class="modal-footer">
      <button class="btn-danger" id="delete-btn">Delete session</button>
    </div>
  `;

  document.getElementById('delete-btn').addEventListener('click', () => {
    sessions = sessions.filter(x => x.id !== s.id);
    save();
    closeModal();
    renderSessions();
    renderHome();
    toast('Session deleted');
  });

  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }
document.querySelector('.modal-close').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

// ── Helpers ───────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function secToLap(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const rem = (s - m * 60).toFixed(3).padStart(6, '0');
  return `${m}:${rem}`;
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ── Init ──────────────────────────────────────────────────────────
renderHome();
