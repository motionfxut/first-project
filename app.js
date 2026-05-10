const STORAGE_KEY = 'tracklog_sessions';
let sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let lapTimes = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form = document.getElementById('session-form');
const lapInput = document.getElementById('lap-input');
const addLapBtn = document.getElementById('add-lap-btn');
const lapListEl = document.getElementById('lap-list');
const sessionListEl = document.getElementById('session-list');
const statsBar = document.getElementById('stats-bar');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.querySelector('.modal-close');
const modalBackdrop = document.querySelector('.modal-backdrop');

// ── Navigation ────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'sessions') renderSessions();
  });
});

// ── Set default date ──────────────────────────────────────────────────────────
document.getElementById('date').value = new Date().toISOString().split('T')[0];

// ── Lap times ─────────────────────────────────────────────────────────────────
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

function parseLapSeconds(str) {
  const match = str.match(/^(\d+):(\d{2})\.(\d+)$/);
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]) + parseFloat('0.' + match[3]);
  const num = parseFloat(str);
  return isNaN(num) ? Infinity : num;
}

function bestLap(laps) {
  if (!laps.length) return null;
  return laps.reduce((best, lap) => parseLapSeconds(lap) < parseLapSeconds(best) ? lap : best);
}

function renderLapChips() {
  const best = bestLap(lapTimes);
  lapListEl.innerHTML = '';
  lapTimes.forEach((lap, i) => {
    const chip = document.createElement('div');
    chip.className = 'lap-chip' + (lap === best && lapTimes.length > 1 ? ' best' : '');
    chip.innerHTML = `${lap} <span class="remove-lap" data-i="${i}">&times;</span>`;
    lapListEl.appendChild(chip);
  });
  lapListEl.querySelectorAll('.remove-lap').forEach(btn => {
    btn.addEventListener('click', () => {
      lapTimes.splice(parseInt(btn.dataset.i), 1);
      renderLapChips();
    });
  });
}

// ── Save session ──────────────────────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const session = {
    id: Date.now(),
    date: document.getElementById('date').value,
    track: document.getElementById('track').value.trim(),
    bike: document.getElementById('bike').value.trim(),
    group: document.getElementById('group').value,
    conditions: document.getElementById('conditions').value,
    tireWarmers: document.getElementById('tire-warmers').value,
    laps: [...lapTimes],
    wentWell: document.getElementById('went-well').value.trim(),
    improve: document.getElementById('improve').value.trim(),
    notes: document.getElementById('notes').value.trim(),
  };
  sessions.unshift(session);
  save();
  form.reset();
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  lapTimes = [];
  renderLapChips();
  toast('Session saved');
});

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ── Render sessions list ──────────────────────────────────────────────────────
function renderSessions() {
  renderStats();
  sessionListEl.innerHTML = '';
  if (!sessions.length) {
    sessionListEl.innerHTML = '<div class="empty-state">No sessions yet. Log your first track day.</div>';
    return;
  }
  sessions.forEach(s => {
    const card = document.createElement('div');
    card.className = 'session-card';
    const best = bestLap(s.laps);
    const meta = [
      formatDate(s.date),
      s.bike,
      s.group,
      s.conditions,
    ].filter(Boolean).join(' · ');
    card.innerHTML = `
      <div class="card-left">
        <div class="card-track">${s.track || '—'}</div>
        <div class="card-meta">${meta}</div>
      </div>
      <div class="card-right">
        ${best ? `<div class="card-best">${best}</div><div class="card-best-label">Best Lap</div>` : `<div class="card-best-label" style="color:var(--muted2)">No laps</div>`}
      </div>`;
    card.addEventListener('click', () => openModal(s));
    sessionListEl.appendChild(card);
  });
}

function renderStats() {
  const total = sessions.length;
  const allBests = sessions.map(s => bestLap(s.laps)).filter(Boolean);
  const overallBest = bestLap(allBests);
  statsBar.innerHTML = `
    <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Sessions</div></div>
    ${overallBest ? `<div class="stat"><div class="stat-value" style="color:var(--green)">${overallBest}</div><div class="stat-label">Best Lap Ever</div></div>` : ''}
  `;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(s) {
  const best = bestLap(s.laps);
  const meta = [s.bike, s.group, s.conditions, s.tireWarmers ? `Warmers: ${s.tireWarmers}` : ''].filter(Boolean).join(' · ');
  let lapsHTML = '';
  if (s.laps.length) {
    lapsHTML = `<div class="modal-section">
      <div class="modal-section-label">Lap Times</div>
      <div class="modal-laps">${s.laps.map(l => `<div class="lap-chip${l === best && s.laps.length > 1 ? ' best' : ''}">${l}</div>`).join('')}</div>
    </div>`;
  }
  const textSection = (label, val) => val ? `<div class="modal-section"><div class="modal-section-label">${label}</div><div class="modal-text">${val}</div></div>` : '';
  modalContent.innerHTML = `
    <div class="modal-track">${s.track || '—'}</div>
    <div class="modal-sub">${formatDate(s.date)}${meta ? ' · ' + meta : ''}</div>
    ${lapsHTML}
    ${textSection('What went well', s.wentWell)}
    ${textSection('What to improve', s.improve)}
    ${textSection('Notes', s.notes)}
    <div style="margin-top:24px;display:flex;justify-content:flex-end;">
      <button class="btn-primary" style="background:var(--muted2);font-size:0.75rem;padding:8px 16px;" id="delete-session-btn">Delete Session</button>
    </div>
  `;
  document.getElementById('delete-session-btn').addEventListener('click', () => {
    sessions = sessions.filter(x => x.id !== s.id);
    save();
    closeModal();
    renderSessions();
    toast('Session deleted');
  });
  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
