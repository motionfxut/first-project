import {
  auth, db, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, collection, getDocs, query, orderBy
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
    // Notify app.js that data is ready
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
    // onAuthStateChanged will fire and handle the rest
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

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#user-menu')) {
    document.getElementById('user-dropdown').classList.add('hidden');
  }
});

// ── Show / hide the login overlay ───────────────────────────────
export function requireAuth(pageName) {
  if (!PROTECTED.includes(pageName)) return true; // not protected
  if (currentUser) return true; // logged in
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

// ── Firestore data loading ───────────────────────────────────────
async function loadUserData(uid) {
  try {
    // Profile
    const profileDoc = await getDoc(doc(db, 'users', uid));
    if (profileDoc.exists()) {
      const data = profileDoc.data();
      userProfile  = data.profile  || { name: 'Rider', location: '' };
      userBikes    = data.bikes    || [];
    }

    // Sessions (subcollection)
    const sessQ    = query(collection(db, 'users', uid, 'sessions'), orderBy('date', 'desc'));
    const sessSnap = await getDocs(sessQ);
    userSessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Firestore not ready yet — fall back to localStorage
    console.warn('Firestore load failed, using localStorage:', err.message);
    userProfile  = JSON.parse(localStorage.getItem('tl_profile')  || '{"name":"Rider","location":""}');
    userBikes    = JSON.parse(localStorage.getItem('tl_bikes')     || '[]');
    userSessions = JSON.parse(localStorage.getItem('tl_sessions')  || '[]');
  }
}

// ── Firestore data saving ────────────────────────────────────────
export async function saveProfile(profile) {
  userProfile = profile;
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), { profile }, { merge: true });
  } catch (err) { console.warn('Firestore save failed:', err.message); }
}

export async function saveBikes(bikes) {
  userBikes = bikes;
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), { bikes }, { merge: true });
  } catch (err) { console.warn('Firestore save failed:', err.message); }
}

export async function saveSession(session) {
  userSessions.unshift(session);
  if (!currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid, 'sessions', String(session.id));
    await setDoc(ref, session);
  } catch (err) { console.warn('Firestore save failed:', err.message); }
}

export async function deleteSession(id) {
  userSessions = userSessions.filter(s => s.id !== id);
  if (!currentUser) return;
  try {
    await deleteDoc ? null : null; // imported above if needed
    const { deleteDoc: del } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await del(doc(db, 'users', currentUser.uid, 'sessions', String(id)));
  } catch (err) { console.warn('Firestore delete failed:', err.message); }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
