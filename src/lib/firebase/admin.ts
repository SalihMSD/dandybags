import { initializeApp, cert } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

function loadAdminCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

export function requireAdminCredentials() {
  return loadAdminCredentials();
}

let app: ReturnType<typeof initializeApp> | null = null;

function getFirebaseAdminApp() {
  if (app) return app;
  const { projectId, clientEmail, privateKey } = loadAdminCredentials();
  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export async function verifyFirebaseIdToken(idToken: string) {
  const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
  return decoded;
}
