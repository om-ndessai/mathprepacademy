import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import type { Auth, User } from "firebase/auth";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

import type { AuthUser } from "@mathprep/core";

import { FIREBASE_CONFIG } from "../config/firebase";

let app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  app ??= initializeApp(FIREBASE_CONFIG);
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.uid,
    name: user.displayName ?? user.email ?? "Student",
    email: user.email ?? "",
    picture: user.photoURL,
  };
}

/**
 * Open the Google sign-in popup and mirror the account into the `users`
 * collection so every sign-in creates or refreshes the user record.
 */
export async function googlePopupSignIn(): Promise<AuthUser> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  const user = credential.user;
  await setDoc(
    doc(getFirestore(getApp()), "users", user.uid),
    {
      name: user.displayName ?? user.email ?? "Student",
      email: user.email ?? "",
      picture: user.photoURL,
      createdAt: user.metadata.creationTime ?? null,
      lastSignInAt: serverTimestamp(),
    },
    { merge: true },
  );
  return toAuthUser(user);
}
