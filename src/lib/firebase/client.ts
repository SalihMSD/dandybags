"use client";

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function ensureFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (typeof window === "undefined") {
    throw new Error("Firebase client cannot be initialized on the server.");
  }
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(ensureFirebaseApp());
  return auth;
}

export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("RecaptchaVerifier can only be created in the browser.");
  }
  const authInstance = getFirebaseAuth();
  const verifier = new RecaptchaVerifier(authInstance, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved — allow phone auth to proceed.
    },
  });
  verifier.render();
  return verifier;
}

export async function sendPhoneOtp(
  phone: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const authInstance = getFirebaseAuth();
  const confirmationResult = await signInWithPhoneNumber(authInstance, phone, verifier);
  return confirmationResult;
}

export { type ConfirmationResult };
