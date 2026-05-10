import {
  auth, db, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  ref, set, get, push, remove
} from './firebase.js';

// ── Exported state (app.js reads these) ─────────────────────────
export let currentUser  = null;
export let userSessions = [];
export let userBikes    = [];
export let userProfile  = { name: 'Rider', location: '' };

// Pages that require login
const PROTECTED = ['profile', 'logbook'];

// ── Auth state listener ──────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (user) {
    showUserMenu(user);
    await loadUserData(user.uid);
    window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
  } else {
    hideUserMenu();
    resetUserData();
    window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
  }
});

// ── Sign in / out ────────────────────────────────────────────────
document.getElementById('google-signin-btn').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Sign-in error:', err);
    showToast('Sign-in failed — please try again');
  }
});

document.getElementById('signout-btn').addEventListener('click', async () => {
  await signOut(auth);
  document.getElementById('user-dropdown').classList.add('hidden');
  showToast('Signed out');
});

document.getElementById('user-avatar').addEventListener('click', () => {
  document.getElementById('user-dropdown').classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!e.target.closest('#user-menu')) {
    document.getElementById('user-dropdown').classList.add('hidden');
  }
});

// ── Show / hide the login overlay ───────────────────────────────
export function requireAuth(pageName) {
  if (!PROTECTED.includes(pageName)) return true;
  if (currentUser) return true;
  document.getElementById('login-overlay').classList.remove('hidden');
  return false;
}

export function hideLoginOverlay() {
  document.getElementById('login-overlay').classList.add('hidden');
}

// ── User menu UI ─────────────────────────────────────────────────
function showUserMenu(user) {
  const menu   = document.getElementById('user-menu');
  const avatar = document.getElementById('user-avatar');
  menu.classList.remove('hidden');
  avatar.src = user.photoURL || '';
  avatar.alt = user.displayName || 'User';
  document.getElementById('user-name-display').textContent  = user.displayName || '';
  document.getElementById('user-email-display').textContent = user.email || '';
  hideLoginOverlay();
}

function hideUserMenu() {
  document.getElementById('user-menu').classList.add('hidden');
}

function resetUserData() {
  userSessions = [];
  userBikes    = [];
  userProfile  = { name: 'Rider', location: '' };
}

// ── Realtime Database: load ──────────────────────────────────────
async function loadUserData(uid) {
  try {
    const snap = await get(ref(db, 'users/' + uid));
    if (snap.exists()) {
      const data = snap.val();
      userProfile  = data.profile  || { name: 'Rider', location: '' };
      userBikes    = data.bikes    ? Object.values(data.bikes)    : [];
      // Sessions stored as object keyed by id — convert to array sorted desc by date
      if (data.sessions) {
        userSessions = Object.values(data.sessions)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      } else {
        userSessions = [];
      }
    }
  } catch (err) {
    console.warn('Realtime DB load failed, using localStorage:', err.message);
    userProfile  = JSON.parse(localStorage.getItem('tl_profile')  || '{"name":"Rider","location":""}');
    userBikes    = JSON.parse(localStorage.getItem('tl_bikes')     || '[]');
    userSessions = JSON.parse(localStorage.getItem('tl_sessions')  || '[]');
  }
}

// ── Realtime Database: save ──────────────────────────────────────
export async function saveProfile(profile) {
  userProfile = profile;
  if (!currentUser) return;
  try {
    await set(ref(db, 'users/' + currentUser.uid + '/profile'), profile);
  } catch (err) { console.warn('DB save failed:', err.message); }
}

export async function saveBikes(bikes) {
  userBikes = bikes;
  if (!currentUser) return;
  try {
    await set(ref(db, 'users/' + currentUser.uid + '/bikes'), bikes);
  } catch (err) { console.warn('DB save failed:', err.message); }
}

export async function saveSession(session) {
  userSessions.unshift(session);
  if (!currentUser) return;
  try {
    await set(ref(db, 'users/' + currentUser.uid + '/sessions/' + session.id), session);
  } catch (err) { console.warn('DB save failed:', err.message); }
}

export async function deleteSession(id) {
  userSessions = userSessions.filter(s => s.id !== id);
  if (!currentUser) return;
  try {
    await remove(ref(db, 'users/' + currentUser.uid + '/sessions/' + id));
  } catch (err) { console.warn('DB delete failed:', err.message); }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
