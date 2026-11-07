import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Timestamp } from "firebase-admin/firestore";
import { getDatabase } from "../firebase/admin.ts";

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000;

// Devuelve 0 si reserva una solicitud, o los segundos restantes si se agotó la cuota.
export async function consumeCreateQuota(request: Request): Promise<number> {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Configura RATE_LIMIT_SECRET con al menos 32 caracteres.");
  }

  let identity = "local";
  if (process.env.VERCEL === "1") {
    // Vercel establece esta cabecera. En local no se confía en cabeceras del cliente.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
    if (!ip || !isIP(ip)) {
      throw new Error("No se pudo identificar la IP proporcionada por Vercel.");
    }
    identity = ip;
  }

  const id = createHmac("sha256", secret).update(identity).digest("hex");
  const database = getDatabase();
  const reference = database.collection("linkRateLimits").doc(id);

  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const now = Date.now();
    let count = 0;
    let resetAt = now + WINDOW_MS;

    if (snapshot.exists) {
      const data = snapshot.data();
      if (
        !data || !Number.isInteger(data.count) || data.count < 0 ||
        !(data.resetAt instanceof Timestamp)
      ) {
        throw new Error("El contador de solicitudes tiene un formato inválido.");
      }
      if (data.resetAt.toMillis() > now) {
        count = data.count;
        resetAt = data.resetAt.toMillis();
      }
    }

    if (count >= MAX_REQUESTS) {
      return Math.ceil((resetAt - now) / 1000);
    }

    transaction.set(reference, {
      count: count + 1,
      resetAt: Timestamp.fromMillis(resetAt),
    });
    return 0;
  });
}
