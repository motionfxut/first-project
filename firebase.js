import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBwsDA302ANHXtRsxWwkSI3OwfFcfIP7ws",
  authDomain:        "tracklog-app.firebaseapp.com",
  projectId:         "tracklog-app",
  storageBucket:     "tracklog-app.firebasestorage.app",
  messagingSenderId: "628112793220",
  appId:             "1:628112793220:web:2868921010d67f695c2cd1",
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, doc, getDoc, setDoc, collection, getDocs, addDoc,
  deleteDoc, query, orderBy };
