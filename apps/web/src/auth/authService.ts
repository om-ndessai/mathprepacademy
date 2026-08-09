import type { AuthUser } from "@mathprep/core";

import { isFirebaseConfigured } from "../config/firebase";

// One auth surface with two backends: Firebase (Google popup + Firestore
// user record) when credentials are configured, otherwise a local dev
// sign-in so the flow stays usable and testable without a Firebase project.

const DEV_USER_KEY = "mathprep.devUser.v1";

/** Whether the UI should offer Google (true) or the dev name+email form. */
export function isGoogleSignInAvailable(): boolean {
  return isFirebaseConfigured();
}

function readDevUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(DEV_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Report the signed-in user (or null) now and on every later change.
 * Returns an unsubscribe function.
 */
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback(readDevUser());
    return () => {};
  }
  let unsubscribe = () => {};
  let cancelled = false;
  void Promise.all([import("./firebase"), import("firebase/auth")]).then(
    ([{ getFirebaseAuth, toAuthUser }, { onAuthStateChanged }]) => {
      if (cancelled) {
        return;
      }
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
        callback(user ? toAuthUser(user) : null);
      });
    },
  );
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const { googlePopupSignIn } = await import("./firebase");
  return googlePopupSignIn();
}

export function signInDev(name: string, email: string): Promise<AuthUser> {
  if (isFirebaseConfigured()) {
    return Promise.reject(new Error("Use Google sign-in"));
  }
  const user: AuthUser = {
    id: `dev-${email.toLowerCase()}`,
    name,
    email: email.toLowerCase(),
    picture: null,
  };
  localStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
  return Promise.resolve(user);
}

export async function signOutUser(): Promise<void> {
  if (!isFirebaseConfigured()) {
    localStorage.removeItem(DEV_USER_KEY);
    return;
  }
  const [{ getFirebaseAuth }, { signOut }] = await Promise.all([
    import("./firebase"),
    import("firebase/auth"),
  ]);
  await signOut(getFirebaseAuth());
}
