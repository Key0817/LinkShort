import "server-only";

import { randomBytes } from "node:crypto";
import { createLink } from "./repository.ts";

export class CodeGenerationError extends Error {}

export async function createShortLink(destinationUrl: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomBytes(6).toString("base64url");
    try {
      await createLink(code, destinationUrl);
      return code;
    } catch (error) {
      // Firestore usa el estado gRPC 6 para ALREADY_EXISTS.
      if (!(error instanceof Object && "code" in error && error.code === 6)) {
        throw error;
      }
    }
  }
  throw new CodeGenerationError("No se pudo reservar un código disponible.");
}
