/**
 * Firebase project credentials — fill these in from the Firebase console:
 * Project settings → General → Your apps → SDK setup and configuration.
 *
 * These values are public app identifiers (they ship in the bundle by
 * design), so committing them is fine. While `apiKey` is empty the app runs
 * in dev sign-in mode: a name + email form instead of Google, and no
 * Firestore writes — which is also what the e2e suite uses.
 *
 * Firebase console checklist for Google sign-in to work:
 *  1. Authentication → Sign-in method → enable Google.
 *  2. Authentication → Settings → Authorized domains → add the deployed
 *     Cloudflare domain (…workers.dev or …pages.dev) and any custom domain.
 *  3. Firestore Database → create database (user records land in `users/`).
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDRs76C5GnCGzzPEeTXuZQCxKlHuzBNduw",
  authDomain: "mathprepacademy-56ab5.firebaseapp.com",
  projectId: "mathprepacademy-56ab5",
  storageBucket: "mathprepacademy-56ab5.firebasestorage.app",
  messagingSenderId: "503277962779",
  appId: "1:503277962779:web:fa0d40fe3ab48acc965abe",
};

export function isFirebaseConfigured(): boolean {
  return FIREBASE_CONFIG.apiKey !== "" && FIREBASE_CONFIG.projectId !== "";
}
