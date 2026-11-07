import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getDatabase() {
  const existingApp = getApps().find((app) => app.name === "link-short");
  if (existingApp) return getFirestore(existingApp);

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("Configura FIREBASE_PROJECT_ID en el entorno del servidor.");
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Configura FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en el entorno del servidor.");
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  }, "link-short");

  return getFirestore(app);
}
