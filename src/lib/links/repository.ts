import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDatabase } from "../firebase/admin.ts";

export interface StoredLink {
  code: string;
  destinationUrl: string;
  createdAt: Timestamp;
}

function getLinkReference(code: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) {
    throw new Error("El código del enlace debe tener entre 1 y 64 caracteres alfanuméricos, guiones o guiones bajos.");
  }
  return getDatabase().collection("links").doc(code);
}

export async function createLink(code: string, destinationUrl: string): Promise<void> {
  const url = new URL(destinationUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("El destino debe ser una URL HTTP o HTTPS.");
  }
  await getLinkReference(code).create({
    destinationUrl: url.href,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function findLink(code: string): Promise<StoredLink | null> {
  const snapshot = await getLinkReference(code).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data();
  if (typeof data?.destinationUrl !== "string" || !(data.createdAt instanceof Timestamp)) {
    throw new Error("El documento del enlace tiene un formato inválido.");
  }
  return { code: snapshot.id, destinationUrl: data.destinationUrl, createdAt: data.createdAt };
}
