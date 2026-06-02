// ── Firebase Setup ─────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBCOHkV0UI8qguc3cT3FcY38uJW50-ldFM",
  authDomain:        "budget-vision-4a7d2.firebaseapp.com",
  projectId:         "budget-vision-4a7d2",
  storageBucket:     "budget-vision-4a7d2.firebasestorage.app",
  messagingSenderId: "92227249944",
  appId:             "1:92227249944:web:7a94d002f2b0f7fc6c206d",
  measurementId:     "G-77R1SQQ94C"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const provider    = new GoogleAuthProvider();

// ── Sign in with Google popup ──────────────────────────────────
window.signInWithGoogle = async function () {
  const errEl = document.getElementById('auth-error');
  const errMsg = document.getElementById('auth-error-msg');
  const btns   = document.getElementById('auth-buttons');
  try {
    btns.classList.add('hidden');
    errEl.classList.add('hidden');
    document.getElementById('auth-loading').classList.remove('hidden');
    await signInWithPopup(auth, provider);
    // onAuthStateChanged below handles the rest
  } catch (err) {
    document.getElementById('auth-loading').classList.add('hidden');
    btns.classList.remove('hidden');
    errMsg.textContent = err.message.includes('popup-closed') 
      ? 'Sign-in cancelled. Please try again.' 
      : 'Sign-in failed: ' + err.message;
    errEl.classList.remove('hidden');
  }
};

// ── Sign out ───────────────────────────────────────────────────
window.handleLogout = async function () {
  await signOut(auth);
  // onAuthStateChanged handles UI reset
};

// ── Auth state listener ────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in — show app
    window.currentUser = user;
    window.showAppForUser(user);
  } else {
    // Not signed in — show login
    window.currentUser = null;
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-loading').classList.add('hidden');
    document.getElementById('auth-buttons').classList.remove('hidden');
  }
});
