'use strict';

const BIKE_MAKES = {
  'Aprilia':   ['RS 660', 'RSV4', 'RSV4 Factory', 'RSV4 1100'],
  'BMW':       ['S 1000 RR', 'M 1000 RR'],
  'Ducati':    ['Panigale V2', 'Panigale V4', 'Panigale V4S', 'Panigale V4R'],
  'Honda':     ['CBR300R', 'CBR500R', 'CBR600RR', 'CBR1000RR-R Fireblade', 'CBR1000RR-R Fireblade SP'],
  'Kawasaki':  ['Ninja 400', 'Ninja ZX-4RR', 'Ninja ZX-6R', 'Ninja ZX-10R', 'Ninja ZX-10RR'],
  'KTM':       ['RC 390', 'RC 8C'],
  'MV Agusta': ['F3 800 RR', 'F4 RR'],
  'Suzuki':    ['GSX-R600', 'GSX-R750', 'GSX-R1000', 'GSX-R1000R'],
  'Triumph':   ['Daytona 660', 'Street Triple R', 'Street Triple RS'],
  'Yamaha':    ['YZF-R3', 'YZF-R7', 'YZF-R1', 'YZF-R1M'],
};

// ── Auth integration ──────────────────────────────────────────────
// auth.js (ES module) runs in parallel and fires 'auth-ready' when done.
// Until then we show nothing on protected pages.
let authReady = false;

window.addEventListener('auth-ready', async e => {
  authReady = true;
  const { currentUser, userSessions, userBikes, userProfile } = await import('./auth.js');
  // Sync auth data into local state
  sessions = userSessions.length ? userSessions : sessions;
  bikes    = userBikes.length    ? userBikes    : bikes;
  profile  = (userProfile && userProfile.name !== 'Rider') ? userProfile : profile;

  // If we were waiting on a protected page, render it now
  const active = document.querySelector('.nav-link.active');
  if (active) goTo(active.dataset.page);
});

// ── Storage (localStorage fallback when not logged in) ────────────
const K = {
  sessions:  'tl_sessions',
  bikes:     'tl_bikes',
  profile:   'tl_profile',
  community: 'tl_community',
};

// ── State ─────────────────────────────────────────────────────────
let sessions  = load(K.sessions,  []);
let bikes     = load(K.bikes,     []);
let profile   = load(K.profile,   { name: 'Rider', location: '' });
let community = load(K.community, seedCommunity());
let lapTimes  = [];
let pendingPhotos = [];
let chart     = null;

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Navigation ────────────────────────────────────────────────────
const pages    = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');

const PROTECTED_PAGES = ['profile', 'logbook'];

async function goTo(pageId) {
  // Check auth for protected pages
  if (PROTECTED_PAGES.includes(pageId)) {
    const { requireAuth, hideLoginOverlay, currentUser } = await import('./auth.js');
    if (!requireAuth(pageId)) return; // shows login overlay, stops here
    hideLoginOverlay();
    // Sync latest data from auth module
    const mod = await import('./auth.js');
    if (mod.userSessions.length) sessions = mod.userSessions;
    if (mod.userBikes.length)    bikes    = mod.userBikes;
    if (mod.userProfile)         profile  = mod.userProfile;
  }

  pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + pageId));
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
  if (pageId === 'home')      renderHome();
  if (pageId === 'profile')   renderProfile();
  if (pageId === 'logbook')   renderLogbook();
  if (pageId === 'community') renderCommunity();
  if (pageId === 'store')     renderStore();
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', () => goTo(el.dataset.page));
});

// ── HOME ─────────────────────────────────────────────────────────
const NEWS = [
  { tag:'MotoGP', tagColor:'red', color:['#cc0000','#7a0000'],
    title:'Marc Marquez Dominates at Jerez to Extend Championship Lead',
    body:'The Ducati factory rider claimed a commanding victory at the Gran Premio de España, pulling away from Francesco Bagnaia in the closing stages to open a 19-point gap at the top.',
    date:'May 5, 2026', href:'https://www.motogp.com/en/news' },
  { tag:'WorldSBK', tagColor:'blue', color:['#1a3a8f','#0d2260'],
    title:'Toprak Razgatlioglu Takes Assen Race 1 in Style for BMW',
    body:'The defending WSBK champion extended his points lead at TT Circuit Assen, delivering a flawless performance on the M 1000 RR ahead of Nicolo Bulega\'s Ducati.',
    date:'May 3, 2026', href:'https://www.worldsbk.com/en/news' },
  { tag:'Moto America', tagColor:'green', color:['#1a5c2a','#0d3a1a'],
    title:'Moto America Superbike Heads to The Ridge Motorsports Park',
    body:'Round 3 of the 2026 Moto America Superbike Championship visits one of the most technical layouts on the calendar. Championship leader and last year\'s winner are both expected to contend.',
    date:'Apr 29, 2026', href:'https://motoamerica.com/news/' },
  { tag:'Track Day', tagColor:'', color:['#111110','#2a2a28'],
    title:'N2 Track Days Adds Oregon Raceway Park and New HPR Dates',
    body:'N2 expands its Pacific Northwest and Colorado schedules with additional intermediate and open sessions. Early registration for July events opens May 15 — spots fill fast.',
    date:'Apr 25, 2026', href:'https://www.n2trackdays.com' },
  { tag:'WorldSBK', tagColor:'blue', color:['#1a3a8f','#0d2260'],
    title:'Jonathan Rea Confirms Return to Full WorldSBK Calendar',
    body:'The six-time world champion confirms he will rejoin the Pata Prometeon Yamaha team from the Misano round following his early-season injury, looking to recapture championship form.',
    date:'Apr 21, 2026', href:'https://www.worldsbk.com/en/news' },
  { tag:'Gear', tagColor:'green', color:['#1a8f52','#0d5c35'],
    title:'Michelin Power Cup 2 EVO: Updated Compound for 2026',
    body:'Michelin\'s revised track day tire features improved heat cycle resilience and faster warm-up times. Available at RevZilla, Cycle Gear, and major dealers beginning June.',
    date:'Apr 16, 2026', href:'https://www.revzilla.com/motorcycle/sport-tires' },
];

function renderHome() {
  // Hero stats
  const heroStats = document.getElementById('hero-stats');
  const total     = sessions.length;
  const allBests  = sessions.map(s => bestLap(s.laps)).filter(Boolean);
  const overall   = bestLap(allBests);
  const trackSet  = new Set(sessions.map(s => s.track).filter(Boolean));
  heroStats.innerHTML = [
    { val: total,              cls: '',       lbl: 'Sessions Logged' },
    { val: trackSet.size || 0, cls: '',       lbl: 'Tracks Visited'  },
    { val: overall || '—',    cls: 'green',  lbl: 'Best Lap Ever'   },
    { val: bikes.length || 0, cls: 'orange', lbl: 'Bikes in Garage' },
  ].map(s => `
    <div class="hero-stat">
      <div class="hero-stat-val ${s.cls}">${s.val}</div>
      <div class="hero-stat-lbl">${s.lbl}</div>
    </div>`).join('');

  // News
  document.getElementById('news-grid').innerHTML = NEWS.map(n => `
    <a class="news-card" href="${n.href}" target="_blank" rel="noopener">
      <div class="news-img" style="background:linear-gradient(135deg,${n.color[0]},${n.color[1]})">
        <span class="news-source">${n.tag}</span>
      </div>
      <span class="news-tag ${n.tagColor}">${n.tag}</span>
      <div class="news-title">${n.title}</div>
      <div class="news-body">${n.body}</div>
      <div class="news-date">${n.date}</div>
    </a>`).join('');
}

// ── PROFILE ───────────────────────────────────────────────────────
function renderProfile() {
  document.getElementById('profile-name-display').textContent = profile.name || 'Rider';
  const loc = profile.location ? `📍 ${profile.location}` : 'Add your location';
  document.getElementById('profile-meta-display').textContent = loc;
  document.getElementById('profile-name-input').value     = profile.name || '';
  document.getElementById('profile-location-input').value = profile.location || '';
  // Profile photo
  const avatarWrap = document.getElementById('profile-avatar-display');
  if (avatarWrap) {
    const existing = avatarWrap.querySelector('img.profile-pic');
    if (profile.photo) {
      if (!existing) {
        const img = document.createElement('img');
        img.className = 'profile-pic';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;';
        avatarWrap.insertBefore(img, avatarWrap.firstChild);
      }
      avatarWrap.querySelector('img.profile-pic').src = profile.photo;
      const svgEl = avatarWrap.querySelector('svg');
      if (svgEl) svgEl.style.display = 'none';
    }
  }
  renderGarage();
  renderPhotoReel();
}

document.getElementById('edit-profile-btn').addEventListener('click', () => {
  document.getElementById('edit-profile-form').classList.remove('hidden');
  document.getElementById('edit-profile-btn').classList.add('hidden');
});

document.getElementById('cancel-profile-btn').addEventListener('click', () => {
  document.getElementById('edit-profile-form').classList.add('hidden');
  document.getElementById('edit-profile-btn').classList.remove('hidden');
});

document.getElementById('profile-photo-input').addEventListener('change', async () => {
  const file = document.getElementById('profile-photo-input').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    profile.photo = ev.target.result;
    save(K.profile, profile);
    const { saveProfile } = await import('./auth.js');
    saveProfile(profile);
    renderProfile();
    toast('Profile photo updated');
  };
  reader.readAsDataURL(file);
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  profile.name     = document.getElementById('profile-name-input').value.trim() || 'Rider';
  profile.location = document.getElementById('profile-location-input').value.trim();
  save(K.profile, profile);
  const { saveProfile } = await import('./auth.js');
  saveProfile(profile);
  document.getElementById('edit-profile-form').classList.add('hidden');
  document.getElementById('edit-profile-btn').classList.remove('hidden');
  renderProfile();
  toast('Profile saved');
});

// Garage
document.getElementById('add-bike-btn').addEventListener('click', () => {
  document.getElementById('add-bike-form').classList.remove('hidden');
  document.getElementById('add-bike-btn').classList.add('hidden');
});

document.getElementById('cancel-bike-btn').addEventListener('click', () => {
  document.getElementById('add-bike-form').classList.add('hidden');
  document.getElementById('add-bike-btn').classList.remove('hidden');
});

// Populate bike make dropdown
const bikeMakeEl  = document.getElementById('bike-make');
const bikeModelEl = document.getElementById('bike-model');
Object.keys(BIKE_MAKES).forEach(make => {
  const o = document.createElement('option');
  o.value = o.textContent = make;
  bikeMakeEl.appendChild(o);
});
bikeMakeEl.addEventListener('change', () => {
  const models = BIKE_MAKES[bikeMakeEl.value] || [];
  bikeModelEl.innerHTML = '<option value="">— Select model —</option>';
  models.forEach(m => {
    const o = document.createElement('option');
    o.value = o.textContent = m;
    bikeModelEl.appendChild(o);
  });
  bikeModelEl.disabled = !models.length;
});

let pendingBikePhoto = null;
document.getElementById('bike-photo-input').addEventListener('change', () => {
  const file = document.getElementById('bike-photo-input').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingBikePhoto = e.target.result;
    document.getElementById('bike-photo-preview').innerHTML =
      `<img class="photo-thumb" src="${pendingBikePhoto}" alt="Bike preview">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('save-bike-btn').addEventListener('click', async () => {
  const make  = document.getElementById('bike-make').value;
  const model = document.getElementById('bike-model').value;
  if (!make || !model) { toast('Select make and model'); return; }
  bikes.push({
    id:    Date.now(),
    year:  document.getElementById('bike-year').value.trim(),
    make,  model,
    color: document.getElementById('bike-color').value.trim(),
    notes: document.getElementById('bike-notes').value.trim(),
    photo: pendingBikePhoto,
  });
  save(K.bikes, bikes);
  document.getElementById('add-bike-form').classList.add('hidden');
  document.getElementById('add-bike-btn').classList.remove('hidden');
  ['bike-year','bike-color','bike-notes'].forEach(id => document.getElementById(id).value = '');
  bikeMakeEl.value = '';
  bikeModelEl.innerHTML = '<option value="">— Select model —</option>';
  bikeModelEl.disabled = true;
  pendingBikePhoto = null;
  document.getElementById('bike-photo-preview').innerHTML = '';
  const { saveBikes } = await import('./auth.js');
  saveBikes(bikes);
  renderGarage();
  refreshBikeSelect();
  toast('Bike added to garage');
});

function renderGarage() {
  const el = document.getElementById('garage-grid');
  if (!bikes.length) {
    el.innerHTML = '<div class="empty-state">No bikes yet. Add your first bike above.</div>';
    return;
  }
  el.innerHTML = bikes.map(b => `
    <div class="bike-card">
      ${b.photo ? `<div class="bike-photo"><img src="${b.photo}" alt="${esc(b.make)} ${esc(b.model)}"></div>` : ''}
      <div class="bike-actions">
        <button class="btn-icon del-bike" data-id="${b.id}" title="Remove">✕</button>
      </div>
      <div class="bike-year">${b.year || '—'}</div>
      <div class="bike-name">${esc(b.make)} ${esc(b.model)}</div>
      ${b.color ? `<div class="bike-color">${esc(b.color)}</div>` : ''}
      ${b.notes ? `<div class="bike-notes">${esc(b.notes)}</div>` : ''}
    </div>`).join('');

  el.querySelectorAll('.del-bike').forEach(btn => {
    btn.addEventListener('click', async () => {
      bikes = bikes.filter(b => b.id !== +btn.dataset.id);
      save(K.bikes, bikes);
      const { saveBikes } = await import('./auth.js');
      saveBikes(bikes);
      renderGarage();
      refreshBikeSelect();
    });
  });
}

function renderPhotoReel() {
  const reel = document.getElementById('photo-reel');
  const photos = sessions.flatMap(s => (s.photos || []).map(p => ({ src: p, track: s.track, date: s.date })));
  if (!photos.length) {
    reel.innerHTML = '<div class="empty-state">Photos you upload to sessions will appear here.</div>';
    return;
  }
  reel.innerHTML = photos.map(p => `
    <div class="reel-item">
      <img src="${p.src}" alt="${esc(p.track)} – ${fmtDate(p.date)}" loading="lazy">
    </div>`).join('');
}

// ── LOG BOOK ──────────────────────────────────────────────────────
function renderLogbook() {
  refreshBikeSelect();
  renderLogTable();
  buildChart();
  buildTrackChart();
  rebuildChartFilter();
}

function refreshBikeSelect() {
  const sel = document.getElementById('log-bike');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Select bike —</option>' +
    bikes.map(b => `<option value="${b.id}">${b.year ? b.year + ' ' : ''}${esc(b.make)} ${esc(b.model)}</option>`).join('');
  if (cur) sel.value = cur;
}

// Set default date
document.getElementById('log-date').value = todayStr();

// Lap chips
const lapInput    = document.getElementById('log-lap-input');
const lapChipList = document.getElementById('lap-chip-list');

function addLap() {
  const v = lapInput.value.trim();
  if (!v) return;
  lapTimes.push(v);
  lapInput.value = '';
  renderChips();
  lapInput.focus();
}

document.getElementById('add-lap-btn').addEventListener('click', addLap);
lapInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addLap(); } });

function renderChips() {
  const best = bestLap(lapTimes);
  lapChipList.innerHTML = '';
  lapTimes.forEach((t, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip' + (lapTimes.length > 1 && t === best ? ' best' : '');
    chip.innerHTML = `${t}${lapTimes.length > 1 && t === best ? ' ★' : ''} <button class="chip-remove" data-i="${i}">×</button>`;
    lapChipList.appendChild(chip);
  });
  lapChipList.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', () => { lapTimes.splice(+btn.dataset.i, 1); renderChips(); });
  });
}

// Photo handling
const photoInput   = document.getElementById('log-photos');
const photoPreview = document.getElementById('log-photo-preview');

photoInput.addEventListener('change', () => {
  const files = [...photoInput.files];
  pendingPhotos = [];
  photoPreview.innerHTML = '';
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      pendingPhotos.push(e.target.result);
      const img = document.createElement('img');
      img.className = 'photo-thumb';
      img.src = e.target.result;
      photoPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// Form submit
document.getElementById('log-form').addEventListener('submit', e => {
  e.preventDefault();
  const bikeId = document.getElementById('log-bike').value;
  const bike   = bikes.find(b => b.id === +bikeId);
  const session = {
    id:       Date.now(),
    date:     document.getElementById('log-date').value,
    track:    document.getElementById('log-track').value.trim(),
    bikeId:   bikeId || null,
    bikeName: bike ? `${bike.year ? bike.year + ' ' : ''}${bike.make} ${bike.model}` : document.getElementById('log-bike').value,
    frontPsi: document.getElementById('log-front-psi').value,
    rearPsi:  document.getElementById('log-rear-psi').value,
    weather:  document.getElementById('log-weather').value,
    temp:     document.getElementById('log-temp').value,
    laps:     [...lapTimes],
    wentWell: document.getElementById('log-well').value.trim(),
    improve:  document.getElementById('log-improve').value.trim(),
    notes:    document.getElementById('log-notes').value.trim(),
    photos:   [...pendingPhotos],
  };
  sessions.unshift(session);
  save(K.sessions, sessions);
  import('./auth.js').then(m => m.saveSession(session));

  // reset
  document.getElementById('log-form').reset();
  document.getElementById('log-date').value = todayStr();
  lapTimes = [];
  pendingPhotos = [];
  renderChips();
  photoPreview.innerHTML = '';

  toast('Session saved ✓');
  renderLogTable(true);
  rebuildChartFilter();
  buildChart();
  buildTrackChart();
});

document.getElementById('log-reset-btn').addEventListener('click', () => {
  lapTimes = [];
  pendingPhotos = [];
  renderChips();
  photoPreview.innerHTML = '';
});

function renderLogTable(animateFirst = false) {
  const tbody      = document.getElementById('log-tbody');
  const empty      = document.getElementById('log-empty');
  const chart      = document.getElementById('chart-card');
  const trackCard  = document.getElementById('chart-track-card');

  if (!sessions.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    chart.classList.add('hidden');
    if (trackCard) trackCard.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  chart.classList.remove('hidden');
  if (trackCard) trackCard.classList.remove('hidden');

  tbody.innerHTML = sessions.map((s, idx) => {
    const best = bestLap(s.laps);
    return `<tr data-id="${s.id}"${idx === 0 && animateFirst ? ' class="new-row"' : ''}>
      <td>${fmtDate(s.date)}</td>
      <td class="cell-track">${esc(s.track) || '—'}</td>
      <td>${esc(s.bikeName) || '—'}</td>
      <td>${s.frontPsi ? s.frontPsi + ' psi' : '—'}</td>
      <td>${s.rearPsi  ? s.rearPsi  + ' psi' : '—'}</td>
      <td>${s.weather  || '—'}</td>
      <td>${s.temp     ? s.temp + '°F' : '—'}</td>
      <td class="cell-best">${best || '—'}</td>
      <td><span class="cell-count">${s.laps.length}</span></td>
      <td><button class="btn-icon view-btn" data-id="${s.id}">↗</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.view-btn')) return;
      openModal(sessions.find(s => s.id === +row.dataset.id));
    });
  });

  tbody.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(sessions.find(s => s.id === +btn.dataset.id)));
  });

  if (animateFirst) {
    const first = tbody.querySelector('tr');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Chart
function rebuildChartFilter() {
  const sel    = document.getElementById('chart-filter');
  const tracks = [...new Set(sessions.map(s => s.track).filter(Boolean))];
  sel.innerHTML = '<option value="">All Tracks</option>' +
    tracks.map(t => `<option>${esc(t)}</option>`).join('');
  sel.onchange = buildChart;
}

function buildChart() {
  const track    = document.getElementById('chart-filter').value;
  const filtered = (track ? sessions.filter(s => s.track === track) : sessions)
    .filter(s => bestLap(s.laps))
    .map(s => ({ date: s.date, val: parseLapSec(bestLap(s.laps)) }))
    .reverse();

  const ctx = document.getElementById('lap-chart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: filtered.map(d => fmtDateShort(d.date)),
      datasets: [{
        data: filtered.map(d => d.val),
        borderColor: '#e84c00',
        backgroundColor: 'rgba(232,76,0,.07)',
        pointBackgroundColor: '#e84c00',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: .35,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + secToLap(c.parsed.y) } },
      },
      scales: {
        y: {
          grid: { color: '#e8e8e5' },
          ticks: { color: '#999', font: { size: 11 }, callback: v => secToLap(v) },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#999', font: { size: 11 } },
        },
      },
    },
  });
}

let trackChart = null;

function buildTrackChart() {
  const card = document.getElementById('chart-track-card');
  if (!sessions.length) { card?.classList.add('hidden'); return; }
  card?.classList.remove('hidden');
  const counts = {};
  sessions.forEach(s => { if (s.track) counts[s.track] = (counts[s.track] || 0) + 1; });
  const labels = Object.keys(counts);
  const data   = Object.values(counts);
  const ctx = document.getElementById('track-chart').getContext('2d');
  if (trackChart) trackChart.destroy();
  trackChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(232,76,0,.18)',
        borderColor: '#e84c00',
        borderWidth: 2,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: '#e8e8e5' }, ticks: { color: '#999', font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        x: { grid: { display: false }, ticks: { color: '#999', font: { size: 10 }, maxRotation: 35 } },
      },
    },
  });
}

// Modal
function openModal(s) {
  if (!s) return;
  const best = bestLap(s.laps);
  const meta = [s.bikeName, s.weather, s.temp ? s.temp + '°F' : '', s.frontPsi ? `F: ${s.frontPsi} psi` : '', s.rearPsi ? `R: ${s.rearPsi} psi` : ''].filter(Boolean).join(' · ');

  const lapsHTML = s.laps.length ? `
    <div class="modal-section">
      <div class="modal-label">Lap Times (${s.laps.length})</div>
      <div class="chip-list">${s.laps.map(l =>
        `<span class="chip${l === best && s.laps.length > 1 ? ' best' : ''}">${l}${l === best && s.laps.length > 1 ? ' ★' : ''}</span>`
      ).join('')}</div>
    </div>` : '';

  const textBlock = (lbl, val) => val
    ? `<div class="modal-section"><div class="modal-label">${lbl}</div><div class="modal-text">${esc(val)}</div></div>` : '';

  const photosHTML = s.photos && s.photos.length
    ? `<div class="modal-section"><div class="modal-label">Photos</div><div class="modal-photos">${s.photos.map(p => `<img src="${p}" loading="lazy">`).join('')}</div></div>` : '';

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-track">${esc(s.track) || '—'}</div>
    <div class="modal-sub">${fmtDate(s.date)}${meta ? ' · ' + esc(meta) : ''}</div>
    ${lapsHTML}
    ${textBlock('What went well', s.wentWell)}
    ${textBlock('What to improve', s.improve)}
    ${textBlock('Notes', s.notes)}
    ${photosHTML}
    <div class="modal-footer">
      <button class="btn-danger" id="del-session-btn">Delete session</button>
    </div>`;

  document.getElementById('del-session-btn').addEventListener('click', () => {
    sessions = sessions.filter(x => x.id !== s.id);
    save(K.sessions, sessions);
    closeModal();
    renderLogTable();
    rebuildChartFilter();
    buildChart();
    buildTrackChart();
    toast('Session deleted');
  });

  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

// ── COMMUNITY ─────────────────────────────────────────────────────
function seedCommunity() {
  return [
    { id: 1, author: 'Jake R.', initials: 'JR', track: 'Utah Motorsports Campus', bike: '2022 Yamaha R6', bestLap: '1:58.4', frontPsi: 32, rearPsi: 20, suspension: 'Stock with 2 clicks softer rear compression. Front preload wound out 3 turns.', notes: 'Best day yet at UMC. Tire warmers on Cup 2s made a massive difference first thing in the morning. Finally nailing T8 exit.', date: '2026-05-01', likes: 14, liked: false },
    { id: 2, author: 'Sierra M.', initials: 'SM', track: 'High Plains Raceway', bike: '2021 Kawasaki ZX-6R', bestLap: '2:03.7', frontPsi: 33, rearPsi: 20, suspension: 'Öhlins TTX36 rear. Front: 10 clicks compression, 12 rebound. Rear: 8 comp, 15 rebound, 5mm preload added.', notes: 'Cold morning but the track rubbered in nicely by session 3. HPR is so much fun in the tighter sections. Highly recommend the intermediate group here.', date: '2026-04-28', likes: 9, liked: false },
    { id: 3, author: 'Tom B.', initials: 'TB', track: 'Chuckwalla Valley Raceway', bike: '2023 Honda CBR1000RR-R', bestLap: '1:44.2', frontPsi: 31, rearPsi: 19, suspension: 'Full Öhlins — stock settings as baseline then 2 clicks stiffer front comp for the long sweepers.', notes: 'Hot out there — 98°F by noon. Started 2 psi lower than usual and bled off a bit as temps climbed. Tire management is everything at Chuckwalla.', date: '2026-04-15', likes: 22, liked: false },
    { id: 4, author: 'Dana K.', initials: 'DK', track: 'The Ridge Motorsports Park', bike: '2020 Ducati Panigale V4S', bestLap: '1:52.1', frontPsi: 30, rearPsi: 18, suspension: 'Öhlins factory unit. Dialed in more rebound front to help with the uphill braking zones.', notes: 'The Ridge is incredible. Technical in all the right ways. Getting the V4S settled in braking was the challenge of the day. Worth every mile of the drive up.', date: '2026-04-10', likes: 17, liked: false },
  ];
}

document.getElementById('share-post-btn').addEventListener('click', () => {
  document.getElementById('share-form-card').classList.remove('hidden');
  document.getElementById('share-post-btn').classList.add('hidden');
});

document.getElementById('cancel-share-btn').addEventListener('click', () => {
  document.getElementById('share-form-card').classList.add('hidden');
  document.getElementById('share-post-btn').classList.remove('hidden');
});

document.getElementById('submit-share-btn').addEventListener('click', () => {
  const track = document.getElementById('share-track').value.trim();
  const bike  = document.getElementById('share-bike').value.trim();
  if (!track && !bike) { toast('Add at least a track or bike'); return; }
  const post = {
    id:         Date.now(),
    author:     profile.name || 'You',
    initials:   initials(profile.name || 'Me'),
    track,
    bike,
    bestLap:    document.getElementById('share-lap').value.trim(),
    frontPsi:   document.getElementById('share-fpsi').value,
    rearPsi:    document.getElementById('share-rpsi').value,
    suspension: document.getElementById('share-suspension').value.trim(),
    notes:      document.getElementById('share-notes').value.trim(),
    date:       todayStr(),
    likes:      0,
    liked:      false,
  };
  community.unshift(post);
  save(K.community, community);
  ['share-track','share-bike','share-lap','share-fpsi','share-rpsi','share-suspension','share-notes']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('share-form-card').classList.add('hidden');
  document.getElementById('share-post-btn').classList.remove('hidden');
  renderCommunity();
  toast('Posted to community');
});

function renderCommunity() {
  const feed = document.getElementById('post-feed');
  if (!community.length) {
    feed.innerHTML = '<div class="empty-state">No posts yet. Be the first to share!</div>';
    return;
  }
  feed.innerHTML = community.map(p => `
    <div class="post-card" data-id="${p.id}">
      <div class="post-header">
        <div class="post-avatar">${esc(p.initials)}</div>
        <div>
          <div class="post-author">${esc(p.author)}</div>
          <div class="post-date">${fmtDate(p.date)}</div>
        </div>
      </div>
      <div class="post-body">
        ${p.track ? `<div class="post-track">📍 ${esc(p.track)}</div>` : ''}
        <div class="post-stats">
          ${p.bike     ? `<div class="post-stat"><div class="post-stat-val">${esc(p.bike)}</div><div class="post-stat-lbl">Bike</div></div>` : ''}
          ${p.bestLap  ? `<div class="post-stat"><div class="post-stat-val green">${esc(p.bestLap)}</div><div class="post-stat-lbl">Best Lap</div></div>` : ''}
          ${p.frontPsi ? `<div class="post-stat"><div class="post-stat-val">${p.frontPsi} psi</div><div class="post-stat-lbl">Front</div></div>` : ''}
          ${p.rearPsi  ? `<div class="post-stat"><div class="post-stat-val">${p.rearPsi} psi</div><div class="post-stat-lbl">Rear</div></div>` : ''}
        </div>
        ${p.suspension ? `<div class="post-suspension">⚙️ ${esc(p.suspension)}</div>` : ''}
        ${p.notes      ? `<div class="post-notes">${esc(p.notes)}</div>` : ''}
      </div>
      <div class="post-footer">
        <button class="like-btn${p.liked ? ' liked' : ''}" data-id="${p.id}">
          ${p.liked ? '♥' : '♡'} ${p.likes}
        </button>
      </div>
    </div>`).join('');

  feed.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const post = community.find(p => p.id === +btn.dataset.id);
      if (!post) return;
      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;
      save(K.community, community);
      renderCommunity();
    });
  });
}

// ── STORE ─────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    icon: '🪖',
    cat: 'Helmet',
    name: 'Shoei X-Fifteen',
    badge: 'Top Pick',
    price: 'From $899.99',
    desc: 'The X-Fifteen is Shoei\'s flagship race helmet — used by MotoGP champions. Full carbon shell, dual-layer EPS liner, and Shoei\'s emergency quick-release system. The best helmet money can buy for track day riders.',
    href: 'https://www.revzilla.com/motorcycle/shoei-x-fifteen-helmet',
    retailer: 'RevZilla',
  },
  {
    icon: '⚫',
    cat: 'Tires — Front & Rear',
    name: 'Michelin Power Cup 2',
    badge: 'Recommended',
    price: 'From $149.99 / tire',
    desc: 'Developed directly from MotoGP technology, the Power Cup 2 delivers race-spec grip with enough durability to last a full track day. The go-to tire for intermediate and advanced track day riders out west.',
    href: 'https://www.revzilla.com/motorcycle/michelin-power-cup-2-rear-tire',
    retailer: 'RevZilla',
  },
];

function renderStore() {
  document.getElementById('product-grid').innerHTML = PRODUCTS.map(p => `
    <div class="product-card">
      <div class="product-img">${p.icon}</div>
      <div class="product-body">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-badge">${p.badge}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer">
          <div class="product-price">${p.price}</div>
          <a class="product-link" href="${p.href}" target="_blank" rel="noopener">
            Shop ${p.retailer} →
          </a>
        </div>
      </div>
    </div>`).join('');
}

// ── HELPERS ───────────────────────────────────────────────────────
function parseLapSec(str) {
  if (!str) return Infinity;
  const m = str.match(/^(\d+):(\d{2})\.(\d+)$/);
  if (m) return +m[1] * 60 + +m[2] + parseFloat('0.' + m[3]);
  const n = parseFloat(str);
  return isNaN(n) ? Infinity : n;
}

function bestLap(laps) {
  if (!laps || !laps.length) return null;
  return laps.reduce((b, l) => parseLapSec(l) < parseLapSec(b) ? l : b);
}

function secToLap(s) {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
}

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

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── INIT ──────────────────────────────────────────────────────────
renderHome();
